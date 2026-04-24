import type { UIMessage } from "ai";
import { toast } from "svelte-sonner";
import { goto } from "$app/navigation";
import { toUIMessages, type NovaUIMessage } from "./message-parts";
import type { ChatItem } from "./types";

type RunStatus = "queued" | "preparing" | "running" | "completed" | "failed" | "aborted";
type LiveAttachState = "idle" | "attaching" | "attached" | "unavailable";
const ACTIVE_RUN_STATUSES = new Set<RunStatus>(["queued", "preparing", "running"]);

export type TimelineItem = {
  id: string;
  kind: "thinking" | "tool" | "runtime" | "artifact" | "error";
  label: string;
  detail?: string;
  state: "streaming" | "success" | "error" | "complete";
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

type LoadChatsOptions = {
  silent?: boolean;
};

class ChatStore {
  chats = $state<ChatItem[]>([]);
  isLoadingChats = $state(false);

  chatId = $state("");
  chatTitle = $state("");
  messages = $state<NovaUIMessage[]>([]);
  isLoading = $state(false);
  error = $state<Error | null>(null);
  userId = $state<string>("");
  activeRunId = $state<string | null>(null);
  activeRunStatus = $state<RunStatus | null>(null);
  activeRunStreamKey = $state<string | null>(null);
  liveAttachState = $state<LiveAttachState>("idle");
  currentToolName = $state<string | null>(null);
  timelineItems = $state<TimelineItem[]>([]);

  #abortController: AbortController | null = null;
  #streamAbortController: AbortController | null = null;
  #pollTimer: number | null = null;
  #attachRetries = 0;

  #clearPollTimer() {
    if (this.#pollTimer) {
      window.clearTimeout(this.#pollTimer);
      this.#pollTimer = null;
    }
  }

  #syncLoadingState() {
    this.isLoading = !!(this.activeRunStatus && ACTIVE_RUN_STATUSES.has(this.activeRunStatus));
  }

  #cancelInFlightRequests() {
    this.#abortController?.abort();
    this.#abortController = null;
    this.#streamAbortController?.abort();
    this.#streamAbortController = null;
    this.#attachRetries = 0;
    this.#clearPollTimer();
  }

  #finishRun(status: RunStatus, liveAttachState: LiveAttachState) {
    this.activeRunStatus = status;
    this.activeRunId = null;
    this.activeRunStreamKey = null;
    this.liveAttachState = liveAttachState;
    this.currentToolName = null;
    this.#attachRetries = 0;
    this.#syncLoadingState();
    this.#clearPollTimer();
  }

  #resumeActiveRun(activeRun: {
    _id: string;
    status: RunStatus;
    streamKey: string;
    liveAttachable: boolean;
  }) {
    void (async () => {
      if (this.activeRunId !== activeRun._id || this.activeRunStreamKey !== activeRun.streamKey) {
        return;
      }
      await this.#attachToRun(activeRun._id, activeRun.streamKey);
    })().catch((error) => {
      console.error("Failed to resume active run:", error);
      if (this.activeRunId === activeRun._id) {
        this.liveAttachState = "unavailable";
        this.#scheduleRunRefresh(activeRun._id);
      }
    });
  }

  async loadChats(options: LoadChatsOptions = {}) {
    this.isLoadingChats = true;
    try {
      const res = await fetch("/api/chats");
      if (res.ok) {
        const sessions: { _id: string; title: string; updatedAt: number; studioId?: string }[] =
          await res.json();
        this.chats = sessions.map((s) => ({
          id: s._id,
          title: s.title,
          description: "Last updated: " + new Date(s.updatedAt).toLocaleDateString(),
          url: `/app/studios/${s.studioId}/chat/${s._id}`,
          studioId: s.studioId,
        }));
      }
    } catch (e) {
      if (!options.silent) {
        console.error("Failed to load chats:", e);
      }
    } finally {
      this.isLoadingChats = false;
    }
  }

  async createChat(title = "New Chat") {
    const rawStudioId = window.location.pathname.match(/\/app\/studios\/([^/]+)/)?.[1];
    if (!rawStudioId) {
      toast.error("Select a Studio before starting a chat");
      return;
    }
    await this.createChatForStudio(decodeURIComponent(rawStudioId), title);
  }

  async createChatForStudio(studioId: string, title = "New Chat") {
    const normalizedStudioId = studioId.trim();
    if (!normalizedStudioId) {
      toast.error("Select a Studio before starting a chat");
      return null;
    }

    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, studioId: normalizedStudioId }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      toast.error(payload.error || "Failed to create chat");
      return null;
    }

    const chat = await res.json();
    const chatId = typeof chat === "string" ? chat : chat.id;
    if (!chatId) {
      toast.error("Chat was created without a valid id");
      return null;
    }

    await this.loadChats();
    await goto(`/app/studios/${normalizedStudioId}/chat/${chatId}`);
    return chatId;
  }

  async renameChat(id: string, title: string): Promise<boolean> {
    if (!title.trim()) {
      toast.error("Title cannot be empty");
      return false;
    }
    if (title.length > 100) {
      toast.error("Title too long (max 100 characters)");
      return false;
    }
    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const updated = await res.json();
        this.chats = this.chats.map((c) => (c.id === id ? { ...c, title: updated.title } : c));
        if (this.chatId === id) {
          this.chatTitle = updated.title;
          document.title = `${updated.title} - Nova`;
        }
        toast.success("Chat renamed");
        return true;
      }
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Failed to rename chat");
      return false;
    } catch {
      toast.error("Network error");
      return false;
    }
  }

  async deleteChat(id: string) {
    try {
      await fetch(`/api/chats/${id}`, { method: "DELETE" });
      this.chats = this.chats.filter((c) => c.id !== id);
      if (this.chatId === id) {
        const studioId = window.location.pathname.match(/\/app\/studios\/([^/]+)/)?.[1];
        await goto(studioId ? `/app/studios/${studioId}` : "/app");
      }
    } catch (e) {
      console.error("Failed to delete chat:", e);
      toast.error("Failed to delete chat");
    }
  }

  setActiveChat(
    chatId: string,
    chatTitle: string,
    messages: NovaUIMessage[],
    userId: string,
    activeRun?: {
      _id: string;
      status: RunStatus;
      streamKey: string;
      liveAttachable: boolean;
    } | null,
  ) {
    if (this.chatId === chatId) {
      this.chatTitle = chatTitle;
      this.userId = userId;
      const incomingRun = activeRun ?? null;
      const shouldPreserveLiveState = this.#shouldPreserveLiveState(messages, incomingRun);

      if (!shouldPreserveLiveState) {
        this.messages = messages;
        this.#setRunState(incomingRun);
      }

      if (!activeRun || !ACTIVE_RUN_STATUSES.has(activeRun.status)) {
        if (!shouldPreserveLiveState) {
          const lastAssistant = [...messages]
            .reverse()
            .find((message) => message.role === "assistant");
          this.timelineItems = lastAssistant ? this.timelineItemsFromMessage(lastAssistant) : [];
          this.currentToolName = null;
        }
      } else if (!shouldPreserveLiveState && this.liveAttachState === "idle") {
        this.#resumeActiveRun(activeRun);
      }
      return;
    }
    this.#cancelInFlightRequests();
    this.chatId = chatId;
    this.chatTitle = chatTitle;
    this.messages = messages;
    this.userId = userId;
    this.#syncLoadingState();
    this.error = null;
    this.#attachRetries = 0;
    this.currentToolName = null;
    this.timelineItems = [];
    this.#setRunState(activeRun ?? null);
    document.title = `${chatTitle} - Nova`;
    if (activeRun && ACTIVE_RUN_STATUSES.has(activeRun.status)) {
      this.#resumeActiveRun(activeRun);
    }
  }

  #shouldPreserveLiveState(
    messages: NovaUIMessage[],
    activeRun: {
      _id: string;
      status: RunStatus;
      streamKey: string;
      liveAttachable: boolean;
    } | null,
  ) {
    const hasLocalActiveRun = !!(
      this.activeRunStatus && ACTIVE_RUN_STATUSES.has(this.activeRunStatus)
    );
    if (!hasLocalActiveRun) {
      return false;
    }

    const hasIncomingActiveRun = !!(activeRun && ACTIVE_RUN_STATUSES.has(activeRun.status));
    if (hasIncomingActiveRun) {
      return false;
    }

    if (messages.length > this.messages.length) {
      return false;
    }

    const incomingLastMessageId = messages.at(-1)?.id ?? null;
    const localLastMessageId = this.messages.at(-1)?.id ?? null;
    return messages.length < this.messages.length || incomingLastMessageId === localLastMessageId;
  }

  async sendMessage(input: string) {
    if (!input.trim()) return;
    if (this.activeRunStatus && ACTIVE_RUN_STATUSES.has(this.activeRunStatus)) {
      toast.error("Nova is still working on the current request. Please wait for it to finish.");
      return;
    }
    if (this.isLoading) return;

    const userMsg: NovaUIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text: input.trim() }],
      createdAt: Date.now(),
    };
    this.messages = [...this.messages, userMsg];

    const assistantId = crypto.randomUUID();
    const assistantMsg: NovaUIMessage = {
      id: assistantId,
      role: "assistant",
      parts: [],
      createdAt: Date.now(),
    };
    this.messages = [...this.messages, assistantMsg];

    this.isLoading = true;
    this.error = null;
    this.timelineItems = [];
    this.#abortController = new AbortController();

    try {
      const startRunRes = await fetch("/api/chat-runs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: this.chatId,
          content: input.trim(),
        }),
        signal: this.#abortController.signal,
      });
      if (!startRunRes.ok) throw new Error(`Failed to start run: HTTP ${startRunRes.status}`);
      const run = await startRunRes.json();

      this.activeRunId = run.runId;
      this.activeRunStatus = run.status;
      this.activeRunStreamKey = run.streamKey;
      this.#attachRetries = 0;
      this.currentToolName = null;
      this.#clearPollTimer();

      if (run.reused) {
        this.messages = this.messages.filter(
          (message) => message.id !== userMsg.id && message.id !== assistantId,
        );
        toast.error(
          "Nova is still finishing the previous request. Please wait before sending another message.",
        );
      }

      await this.#attachToRun(run.runId, run.streamKey, run.reused ? undefined : assistantId);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        this.messages = this.messages.filter((message) => message.id !== assistantId);
        this.error = e;
        toast.error(e.message || "Failed to send message");
      }
    } finally {
      this.#syncLoadingState();
      this.#abortController = null;
    }
  }

  stopGeneration() {
    const runId = this.activeRunId;
    this.#abortController?.abort();
    this.#streamAbortController?.abort();
    this.#clearPollTimer();
    if (!runId) return;

    void (async () => {
      try {
        const res = await fetch(`/api/internal/chat-runs/${runId}/stop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          throw new Error(`Failed to stop run: HTTP ${res.status}`);
        }

        if (this.activeRunId === runId) {
          await this.#reloadMessages();
          this.#finishRun("aborted", "unavailable");
        }
      } catch (error) {
        console.error("Failed to stop run:", error);

        try {
          const statusRes = await fetch(`/api/chat-runs/${runId}`);
          if (statusRes.ok) {
            const run = await statusRes.json();
            if (
              this.activeRunId === runId &&
              (run?.status === "aborted" || run?.status === "failed" || run?.status === "completed")
            ) {
              await this.#reloadMessages();
              this.#finishRun(run.status, run.status === "completed" ? "idle" : "unavailable");
              return;
            }
          }
        } catch (statusError) {
          console.error("Failed to reconcile stopped run status:", statusError);
        }

        toast.error("Failed to stop the current run.");
      }
    })();
  }

  timelineItemsFromMessage(msg: UIMessage): TimelineItem[] {
    const items: TimelineItem[] = [];
    const parts = msg.parts as any[];
    if (!parts?.length) return items;

    for (const part of parts) {
      if (part.type === "thinking") {
        items.push({
          id: part.id || crypto.randomUUID(),
          kind: "thinking",
          label: part.summary || "Thinking",
          detail: part.detail,
          state: part.state === "done" ? "complete" : "streaming",
        });
      }
      if (part.type === "tool-call") {
        const hasOutput = part.state === "output-available" || part.state === "output-error";
        items.push({
          id: part.toolCallId || crypto.randomUUID(),
          kind: "tool",
          label: `Using ${part.toolName || "tool"}`,
          detail: this.#summarizeToolInput(part.toolName, part.input),
          state: hasOutput
            ? part.state === "output-error"
              ? "error"
              : "success"
            : part.state === "input-available"
              ? "streaming"
              : "complete",
          input: part.input,
          output: part.output,
          errorText: part.errorText,
        });
      }
      if (part.type === "runtime-event") {
        items.push({
          id: part.id || crypto.randomUUID(),
          kind: "runtime",
          label: part.label || "Runtime status",
          detail: part.detail,
          state: part.state ?? "streaming",
          input: part.input,
          output: part.output,
          errorText: part.errorText,
        });
      }
      if (part.type === "error-event") {
        items.push({
          id: part.id || crypto.randomUUID(),
          kind: "error",
          label: part.label || "Run failed",
          detail: part.detail,
          state: "error",
          errorText: part.errorText,
        });
      }
    }

    return items;
  }

  #runtimeTimelineItem(payload: Record<string, unknown>): TimelineItem {
    const action = typeof payload.action === "string" ? payload.action : "status";
    const payloadId = typeof payload.id === "string" ? payload.id : crypto.randomUUID();
    const previewUrl = typeof payload.previewUrl === "string" ? payload.previewUrl : undefined;
    const sandboxId = typeof payload.sandboxId === "string" ? payload.sandboxId : undefined;
    const artifact =
      payload.artifact && typeof payload.artifact === "object"
        ? (payload.artifact as Record<string, unknown>)
        : null;
    if (
      artifact &&
      typeof artifact.kind === "string" &&
      typeof artifact.title === "string" &&
      typeof artifact.status === "string"
    ) {
      return {
        id: payloadId,
        kind: "artifact",
        label: String(artifact.title),
        detail:
          typeof payload.detail === "string"
            ? payload.detail
            : typeof artifact.url === "string"
              ? artifact.url
              : previewUrl,
        state: "success",
        output: {
          artifact,
        },
      };
    }
    if (action === "preview" && previewUrl) {
      return {
        id: payloadId,
        kind: "artifact",
        label: "Preview available",
        detail: typeof payload.detail === "string" ? payload.detail : previewUrl,
        state: "success",
        output: {
          artifact: {
            kind: "preview",
            title: "Primary Preview",
            status: "ready",
            url: previewUrl,
            source: "runtime-stream",
            metadata: {
              sandboxId: sandboxId ?? null,
            },
          },
        },
      };
    }
    return {
      id: payloadId,
      kind: "runtime",
      label:
        action === "start"
          ? "Runtime started"
          : action === "reuse"
            ? "Runtime reused"
            : action === "stop"
              ? "Runtime stopped"
              : action === "preview"
                ? "Preview updated"
                : "Runtime status",
      detail:
        typeof payload.detail === "string"
          ? payload.detail
          : sandboxId
            ? `Sandbox ${sandboxId}`
            : undefined,
      state: action === "stop" ? "complete" : "streaming",
    };
  }

  #setRunState(
    activeRun: {
      _id: string;
      status: RunStatus;
      streamKey: string;
      liveAttachable: boolean;
    } | null,
  ) {
    this.activeRunId = activeRun?._id ?? null;
    this.activeRunStatus = activeRun?.status ?? null;
    this.activeRunStreamKey = activeRun?.streamKey ?? null;
    this.liveAttachState = activeRun?.liveAttachable ? "idle" : "unavailable";
    this.#syncLoadingState();
  }

  #upsertTimelineItem(item: TimelineItem) {
    const existingIdx = this.timelineItems.findIndex((entry) => entry.id === item.id);
    if (existingIdx !== -1) {
      const next = [...this.timelineItems];
      next[existingIdx] = {
        ...next[existingIdx],
        ...item,
      };
      this.timelineItems = next;
      return;
    }
    this.timelineItems = [...this.timelineItems, item];
  }

  async #attachToRun(runId: string, streamKey: string, assistantId?: string): Promise<void> {
    if (this.activeRunId !== runId || this.activeRunStreamKey !== streamKey) {
      return;
    }
    this.#clearPollTimer();
    this.liveAttachState = "attaching";
    this.#streamAbortController?.abort();
    this.#streamAbortController = new AbortController();
    let response: Response;
    try {
      response = await fetch(
        `/api/chat-runs/${runId}/stream?key=${encodeURIComponent(streamKey)}`,
        {
          signal: this.#streamAbortController.signal,
        },
      );
    } catch {
      if (this.activeRunId !== runId) return;
      this.liveAttachState = "unavailable";
      this.#scheduleRunRefresh(runId);
      return;
    }
    if (!response.ok) {
      if (
        response.status === 409 &&
        this.#attachRetries < 6 &&
        (this.activeRunStatus === "queued" ||
          this.activeRunStatus === "preparing" ||
          this.activeRunStatus === "running")
      ) {
        this.#attachRetries += 1;
        await new Promise((resolve) => setTimeout(resolve, 250));
        return this.#attachToRun(runId, streamKey, assistantId);
      }
      if (this.activeRunId !== runId) return;
      await this.#recoverFromExhaustedRetries(runId);
      return;
    }

    this.liveAttachState = "attached";
    const reader = response.body?.getReader();
    if (!reader) {
      this.liveAttachState = "unavailable";
      this.#scheduleRunRefresh(runId);
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          if (this.activeRunId !== runId) {
            return;
          }
          const eventLine = frame.split("\n").find((line) => line.startsWith("event:"));
          const dataLine = frame.split("\n").find((line) => line.startsWith("data:"));
          if (!dataLine) continue;
          const eventName = eventLine?.slice(6).trim() ?? "message";
          const payload = JSON.parse(dataLine.slice(5).trim());

          if (eventName === "start") {
            this.activeRunStatus = payload.status;
            this.#syncLoadingState();
            const index = this.messages.findIndex((message) => message.id === assistantId);
            if (index !== -1) {
              this.messages[index] = this.#applyChunk(this.messages[index], { type: "start" });
              this.messages = [...this.messages];
            }
          }
          if (eventName === "thinking") {
            const existingIdx = this.timelineItems.findIndex((item) => item.id === payload.id);
            const item: TimelineItem = {
              id: payload.id || crypto.randomUUID(),
              kind: "thinking",
              label: payload.label || "Thinking",
              detail: payload.detail,
              state: payload.state === "done" ? "complete" : "streaming",
            };
            if (existingIdx !== -1) {
              this.timelineItems[existingIdx] = item;
            } else {
              this.timelineItems = [...this.timelineItems, item];
            }
            const index = this.messages.findIndex((message) => message.id === assistantId);
            if (index !== -1) {
              this.messages[index] = this.#applyChunk(this.messages[index], {
                type: "thinking",
                id: payload.id,
                summary: payload.label,
                detail: payload.detail,
                state: payload.state,
              });
              this.messages = [...this.messages];
            }
          }
          if (eventName === "text") {
            const index = this.messages.findIndex((message) => message.id === assistantId);
            if (index !== -1) {
              const updated = this.#applyChunk(this.messages[index], {
                type: "text-delta",
                id: assistantId,
                delta: payload.delta,
              });
              this.messages[index] = updated;
              this.messages = [...this.messages];
            }
          }
          if (eventName === "tool") {
            const toolCallId = String(payload.toolCallId);
            const toolName = String(payload.toolName || "tool");
            this.currentToolName = toolName;
            this.#upsertTimelineItem({
              id: toolCallId,
              kind: "tool",
              label: `Using ${toolName}`,
              detail: this.#summarizeToolInput(toolName, payload.input),
              state: "streaming",
              input: payload.input,
            });
            const index = this.messages.findIndex((message) => message.id === assistantId);
            if (index !== -1) {
              this.messages[index] = this.#applyChunk(this.messages[index], {
                type: "tool-input-available",
                toolCallId,
                toolName: payload.toolName,
                input: payload.input,
              });
              this.messages = [...this.messages];
            }
          }
          if (eventName === "runtime") {
            const item = this.#runtimeTimelineItem(payload);
            this.timelineItems = [...this.timelineItems, item];
            const index = this.messages.findIndex((message) => message.id === assistantId);
            if (index !== -1) {
              this.messages[index] = this.#applyChunk(this.messages[index], {
                type: "runtime-event",
                ...item,
              });
              this.messages = [...this.messages];
            }
          }
          if (eventName === "tool-result") {
            const toolCallId = String(payload.toolCallId);
            const toolName = String(payload.toolName || this.currentToolName || "tool");
            const idx = this.timelineItems.findIndex((item) => item.id === toolCallId);
            if (idx !== -1) {
              const updated = [...this.timelineItems];
              updated[idx] = {
                ...updated[idx],
                state: payload.error ? "error" : "success",
                output: payload.output,
                errorText: payload.error,
              };
              this.timelineItems = updated;
            } else {
              this.timelineItems = [
                ...this.timelineItems,
                {
                  id: toolCallId,
                  kind: payload.error ? "error" : "tool",
                  label: payload.error ? `${toolName} failed` : `${toolName} completed`,
                  state: payload.error ? "error" : "success",
                  output: payload.output,
                  errorText: payload.error,
                },
              ];
            }
            this.currentToolName = null;
            const index = this.messages.findIndex((message) => message.id === assistantId);
            if (index !== -1) {
              this.messages[index] = this.#applyChunk(this.messages[index], {
                type: payload.error ? "tool-output-error" : "tool-output-available",
                toolCallId,
                output: payload.output,
                errorText: payload.error,
              });
              this.messages = [...this.messages];
            }
          }
          if (eventName === "done") {
            this.#finishRun(payload.status, "idle");
            this.#streamAbortController = null;
            await this.#reloadMessages();
            if (payload.status === "completed") {
              await this.#refreshChatTitle();
            }
          }
          if (eventName === "error") {
            const item: TimelineItem = {
              id: crypto.randomUUID(),
              kind: "error",
              label: "Run failed",
              detail: String(payload.error || "Nova could not complete the run."),
              state: "error",
            };
            this.timelineItems = [...this.timelineItems, item];
            const index = this.messages.findIndex((message) => message.id === assistantId);
            if (index !== -1) {
              this.messages[index] = this.#applyChunk(this.messages[index], {
                type: "error-event",
                ...item,
                errorText: String(payload.error || "Nova could not complete the run."),
              });
              this.messages = [...this.messages];
            }
            this.#finishRun("failed", "unavailable");
            this.#streamAbortController = null;
          }
        }
      }
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return;
      }
      if (this.activeRunId === runId) {
        this.liveAttachState = "unavailable";
        this.#scheduleRunRefresh(runId);
      }
      return;
    } finally {
      if (this.#streamAbortController?.signal.aborted) {
        this.#streamAbortController = null;
      }
    }
    if (this.activeRunStatus && ACTIVE_RUN_STATUSES.has(this.activeRunStatus)) {
      this.#scheduleRunRefresh(runId);
    }
    if (this.activeRunId === runId) {
      this.#streamAbortController = null;
    }
    this.#syncLoadingState();
  }

  async #recoverFromExhaustedRetries(runId: string) {
    try {
      const res = await fetch(`/api/chat-runs/${runId}`, {
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const run = await res.json();
        if (run?.status === "completed" || run?.status === "failed" || run?.status === "aborted") {
          await this.#reloadMessages();
          this.#finishRun(run.status, run.status === "completed" ? "idle" : "unavailable");
          if (run.status === "completed") {
            await this.#refreshChatTitle();
          }
          return;
        }
      }
    } catch {
      // fall through to unavailable state
    }
    this.liveAttachState = "unavailable";
    this.#scheduleRunRefresh(runId);
  }

  #scheduleRunRefresh(runId: string) {
    this.#clearPollTimer();
    this.#pollTimer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/chat-runs/${runId}`);
        if (!res.ok) return;
        const run = await res.json();
        if (this.activeRunId !== runId) return;
        this.activeRunStatus = run?.status ?? null;
        this.#syncLoadingState();
        if (run?.status === "completed") {
          await this.#reloadMessages();
          await this.#refreshChatTitle();
          this.#finishRun("completed", "idle");
          return;
        }
        if (run?.status === "failed" || run?.status === "aborted") {
          await this.#reloadMessages();
          this.#finishRun(run.status, "unavailable");
          return;
        }
        this.#scheduleRunRefresh(runId);
      } catch (error) {
        console.error("Failed to refresh run status:", error);
      }
    }, 1500);
  }

  async #reloadMessages() {
    if (!this.chatId) return;
    try {
      const res = await fetch(`/api/chats/${this.chatId}/messages`);
      if (!res.ok) return;
      const messages = await res.json();
      this.messages = toUIMessages(messages);

      const lastAssistant = [...this.messages].reverse().find((m) => m.role === "assistant");
      if (lastAssistant) {
        this.timelineItems = this.timelineItemsFromMessage(lastAssistant);
      } else {
        this.timelineItems = [];
      }
    } catch (error) {
      console.error("Failed to reload messages:", error);
    }
  }

  async #refreshChatTitle() {
    if (!this.chatId) return;
    try {
      const res = await fetch(`/api/chats/${this.chatId}`);
      if (!res.ok) return;
      const chat = await res.json();
      if (chat?.title && chat.title !== this.chatTitle) {
        this.chatTitle = chat.title;
        document.title = `${chat.title} - Nova`;
        this.chats = this.chats.map((c) =>
          c.id === this.chatId ? { ...c, title: chat.title } : c,
        );
      }
    } catch (error) {
      console.error("Failed to refresh chat title:", error);
    }
  }

  #summarizeToolInput(toolName: string, input: unknown): string | undefined {
    if (!input || typeof input !== "object") return undefined;
    const obj = input as Record<string, unknown>;
    if (typeof obj.path === "string") return obj.path;
    if (typeof obj.filePath === "string") return obj.filePath;
    if (typeof obj.command === "string") return obj.command;
    if (typeof obj.query === "string") return obj.query.slice(0, 80);
    if (typeof obj.directory === "string") return obj.directory;
    return undefined;
  }

  #finishStreamingTextParts(parts: any[]) {
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      if (part?.type === "text" && part.state === "streaming") {
        parts[index] = { ...part, state: "done" };
      }
    }
  }

  #applyChunk(msg: UIMessage, chunk: any): UIMessage {
    const parts = [...msg.parts];
    switch (chunk.type) {
      case "start":
        break;
      case "thinking": {
        const existingIdx = parts.findIndex(
          (p) => (p as any).type === "thinking" && (p as any).id === chunk.id,
        );
        if (existingIdx !== -1) {
          parts[existingIdx] = {
            ...parts[existingIdx],
            state: chunk.state,
            detail: chunk.detail,
          } as any;
        } else {
          parts.push({
            type: "thinking",
            id: chunk.id,
            summary: chunk.summary,
            detail: chunk.detail,
            state: chunk.state,
            createdAt: Date.now(),
          } as any);
        }
        break;
      }
      case "text-start":
        parts.push({
          type: "text",
          id: chunk.id,
          text: "",
          state: "streaming",
        } as any);
        break;
      case "text-delta": {
        let i = -1;
        for (let index = parts.length - 1; index >= 0; index -= 1) {
          const part = parts[index] as any;
          if (part.type === "text" && part.state === "streaming") {
            i = index;
            break;
          }
        }
        if (i === -1) {
          parts.push({
            type: "text",
            id: crypto.randomUUID(),
            text: "",
            state: "streaming",
          } as any);
          i = parts.length - 1;
        }
        if (i !== -1)
          parts[i] = {
            ...parts[i],
            text: (parts[i] as any).text + chunk.delta,
          } as any;
        break;
      }
      case "text-end": {
        const i = parts.findIndex((p) => p.type === "text" && (p as any).id === chunk.id);
        if (i !== -1) parts[i] = { ...parts[i], state: "done" } as any;
        break;
      }
      case "reasoning-start":
        parts.push({
          type: "reasoning",
          id: chunk.id,
          text: "",
          state: "streaming",
        } as any);
        break;
      case "reasoning-delta": {
        const i = parts.findIndex((p) => p.type === "reasoning" && (p as any).id === chunk.id);
        if (i !== -1)
          parts[i] = {
            ...parts[i],
            text: (parts[i] as any).text + chunk.delta,
          } as any;
        break;
      }
      case "reasoning-end": {
        const i = parts.findIndex((p) => p.type === "reasoning" && (p as any).id === chunk.id);
        if (i !== -1) parts[i] = { ...parts[i], state: "done" } as any;
        break;
      }
      case "tool-input-start":
        this.#finishStreamingTextParts(parts);
        parts.push({
          type: "tool-call",
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          state: "streaming",
          input: {},
          output: undefined,
          errorText: undefined,
        } as any);
        break;
      case "tool-input-available": {
        this.#finishStreamingTextParts(parts);
        const i = parts.findIndex(
          (p) => p.type === "tool-call" && (p as any).toolCallId === chunk.toolCallId,
        );
        if (i !== -1)
          parts[i] = {
            ...parts[i],
            input: chunk.input,
            state: "input-available",
          } as any;
        else
          parts.push({
            type: "tool-call",
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            state: "input-available",
            input: chunk.input,
            output: undefined,
            errorText: undefined,
          } as any);
        break;
      }
      case "tool-output-available": {
        const i = parts.findIndex(
          (p) => p.type === "tool-call" && (p as any).toolCallId === chunk.toolCallId,
        );
        if (i !== -1)
          parts[i] = {
            ...parts[i],
            output: chunk.output,
            state: "output-available",
          } as any;
        break;
      }
      case "tool-output-error": {
        const i = parts.findIndex(
          (p) => p.type === "tool-call" && (p as any).toolCallId === chunk.toolCallId,
        );
        if (i !== -1)
          parts[i] = {
            ...parts[i],
            errorText: chunk.errorText,
            state: "output-error",
          } as any;
        break;
      }
      case "runtime-event":
        parts.push({
          type: "runtime-event",
          id: chunk.id,
          label: chunk.label,
          detail: chunk.detail,
          state: chunk.state,
          input: chunk.input,
          output: chunk.output,
          errorText: chunk.errorText,
        } as any);
        break;
      case "error-event":
        parts.push({
          type: "error-event",
          id: chunk.id,
          label: chunk.label,
          detail: chunk.detail,
          state: "error",
          errorText: chunk.errorText,
        } as any);
        break;
    }
    return { ...msg, parts };
  }
}

export const chatStore = new ChatStore();
