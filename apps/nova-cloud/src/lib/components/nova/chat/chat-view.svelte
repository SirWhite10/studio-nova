<script lang="ts">
	import { ArrowUp, Sparkles } from "@lucide/svelte";
	import ChatDebugSheet from "$lib/components/nova/chat/chat-debug-sheet.svelte";
	import type { UIMessage } from "ai";
	import {
		Conversation,
		ConversationContent,
		ConversationEmptyState,
	} from "$lib/components/ai-elements/conversation";
	import { CopyButton } from "$lib/components/ai-elements/copy-button";
	import ChatPageHeader from "$lib/components/nova/chat/chat-page-header.svelte";
	import ChatTimeline from "$lib/components/nova/chat/chat-timeline.svelte";
	import { DotsLoader } from "$lib/components/prompt-kit/loader";
	import MessageContent from "$lib/components/prompt-kit/message/MessageContent.svelte";
	import PromptInput from "$lib/components/prompt-kit/prompt-input/PromptInput.svelte";
	import PromptInputActions from "$lib/components/prompt-kit/prompt-input/PromptInputActions.svelte";
	import PromptInputTextarea from "$lib/components/prompt-kit/prompt-input/PromptInputTextarea.svelte";
	import SkillPicker from "$lib/components/skills/SkillPicker.svelte";
	import { Button } from "$lib/components/ui/button";
	import { chatStore } from "$lib/nova/chat";
	import { cn } from "$lib/utils";
	import type { TimelineItem } from "$lib/nova/chat/chat-store.svelte";
	import type { NovaUIMessage } from "$lib/nova/chat/message-parts";

	export type ChatViewData = {
		initialMessages: NovaUIMessage[];
		chatId: string;
		chatTitle: string;
		userId: string;
		studioId?: string | null;
		activeRun?: {
			_id: string;
			status: "queued" | "preparing" | "running" | "completed" | "failed" | "aborted";
			streamKey: string;
			liveAttachable: boolean;
		} | null;
		canInspectAgentContext?: boolean;
		invalidChat?: boolean;
	};

	let { data }: { data: ChatViewData } = $props();

	let inputValue = $state("");
	let showSkillPicker = $state(false);
	let showDebugSheet = $state(false);
	const activeRunStatuses = new Set(["queued", "preparing", "running"]);
	type AssistantEntry = { kind: "text"; text: string; key: string } | { kind: "timeline"; item: TimelineItem; key: string };
	type CopyableMessage = UIMessage & { createdAt?: number };
	const serverSyncKey = $derived.by(() => {
		const activeRunKey = data.activeRun
			? `${data.activeRun._id}:${data.activeRun.status}:${data.activeRun.streamKey}:${data.activeRun.liveAttachable}`
			: "none";
		const lastMessage = data.initialMessages.at(-1);
		const lastMessageKey = lastMessage
			? `${lastMessage.id}:${lastMessage.role}:${lastMessage.parts.length}`
			: "none";
		return `${data.chatId}:${data.chatTitle}:${data.userId}:${data.initialMessages.length}:${lastMessageKey}:${activeRunKey}`;
	});
	let runIsActive = $derived(
		!!chatStore.activeRunStatus && activeRunStatuses.has(chatStore.activeRunStatus)
	);
	let activeRunEntry = $derived.by(() => {
		if (!runIsActive) return null;
		if (chatStore.activeRunStatus === "queued") {
			return {
				id: `run-status:${data.chatId}:queued`,
				kind: "runtime",
				label: "Queued",
				detail: "Nova queued the request and is waiting to begin work.",
				state: "streaming"
			} satisfies TimelineItem;
		}
		if (chatStore.activeRunStatus === "preparing") {
			return {
				id: `run-status:${data.chatId}:preparing`,
				kind: "runtime",
				label: "Preparing run",
				detail: chatStore.liveAttachState === "attaching" ? "Reattaching to the live run stream." : "Nova is preparing tools and runtime state.",
				state: "streaming"
			} satisfies TimelineItem;
		}
		return {
			id: `run-status:${data.chatId}:running`,
			kind: "runtime",
			label: "Running",
			detail: chatStore.liveAttachState === "attached" ? "Nova is actively streaming this run." : "Nova is still working on the current request.",
			state: "streaming"
		} satisfies TimelineItem;
	});

	function summarizeToolInput(input: unknown): string | undefined {
		if (!input || typeof input !== "object") return undefined;
		const obj = input as Record<string, unknown>;
		if (typeof obj.path === "string") return obj.path;
		if (typeof obj.filePath === "string") return obj.filePath;
		if (typeof obj.command === "string") return obj.command;
		if (typeof obj.query === "string") return obj.query.slice(0, 80);
		if (typeof obj.directory === "string") return obj.directory;
		return undefined;
	}

	function formatClock(value: Date) {
		return value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
	}

	function formatMessageTime(createdAt?: number): string {
		if (!createdAt) return "";
		const timestamp = new Date(createdAt);
		if (Number.isNaN(timestamp.getTime())) return "";
		const now = new Date();
		const diffMs = now.getTime() - timestamp.getTime();
		if (diffMs >= 0 && diffMs < 60_000) return "Just now";
		if (diffMs >= 0 && diffMs < 60 * 60_000) return `${Math.floor(diffMs / 60_000)}m ago`;

		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
		const messageDay = new Date(
			timestamp.getFullYear(),
			timestamp.getMonth(),
			timestamp.getDate(),
		).getTime();
		if (messageDay === today) return `Today, ${formatClock(timestamp)}`;
		if (messageDay === today - 24 * 60 * 60_000) return `Yesterday, ${formatClock(timestamp)}`;

		return timestamp.toLocaleString([], {
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
	}

	function messageText(msg: UIMessage): string {
		return msg.parts
			.filter((part) => part.type === "text" && typeof (part as any).text === "string")
			.map((part) => (part as any).text)
			.join("")
			.trim();
	}

	function compactValue(value: unknown): string | undefined {
		if (value === undefined || value === null) return undefined;
		if (typeof value === "string") return value.trim() || undefined;
		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}

	function timelineItemToText(item: TimelineItem): string {
		const detail = item.detail ? ` - ${item.detail}` : "";
		if (item.kind === "artifact") {
			const artifact =
				item.output && typeof item.output === "object"
					? ((item.output as Record<string, unknown>).artifact as Record<string, unknown> | undefined)
					: undefined;
			const title = typeof artifact?.title === "string" ? artifact.title : item.label;
			const url = typeof artifact?.url === "string" ? ` - ${artifact.url}` : detail;
			return `Artifact: ${title}${url}`;
		}
		if (item.kind === "runtime") return `Runtime: ${item.label}${detail}`;
		if (item.kind === "error") return `Error: ${item.errorText || item.detail || item.label}`;
		if (item.kind === "thinking") return `Thinking: ${item.label}${detail}`;

		const lines = [`Tool: ${item.label.replace(/^Using\s+/i, "")}${detail}`];
		const input = compactValue(item.input);
		const output = compactValue(item.output);
		if (input) lines.push(`Input: ${input}`);
		if (output) lines.push(`Output: ${output}`);
		if (item.errorText) lines.push(`Error: ${item.errorText}`);
		return lines.join("\n");
	}

	function assistantFullTurnText(msg: UIMessage): string {
		return assistantEntries(msg)
			.map((entry) => (entry.kind === "text" ? entry.text.trim() : timelineItemToText(entry.item)))
			.filter(Boolean)
			.join("\n\n");
	}

	function assistantEntries(msg: UIMessage): AssistantEntry[] {
		const entries: AssistantEntry[] = [];
		for (const [index, part] of msg.parts.entries()) {
			const p = part as any;
			if (p.type === "text" && p.text) {
				entries.push({ kind: "text", text: p.text, key: `text:${msg.id}:${index}` });
				continue;
			}
			if (p.type === "thinking") {
				entries.push({
					kind: "timeline",
					key: `thinking:${p.id || index}:${index}`,
					item: {
						id: String(p.id || `${msg.id}:thinking:${index}`),
						kind: "thinking",
						label: p.summary || "Thinking",
						detail: p.detail,
						state: p.state === "done" ? "complete" : "streaming"
					}
				});
				continue;
			}
			if (p.type === "tool-call") {
				entries.push({
					kind: "timeline",
					key: `tool:${p.toolCallId || index}:${index}`,
					item: {
						id: String(p.toolCallId || `${msg.id}:tool:${index}`),
						kind: "tool",
						label: `Using ${p.toolName || "tool"}`,
						detail: summarizeToolInput(p.input),
						state:
							p.state === "output-error"
								? "error"
								: p.state === "output-available"
									? "success"
									: "streaming",
						input: p.input,
						output: p.output,
						errorText: p.errorText
					}
				});
				continue;
			}
			if (p.type === "runtime-event" || p.type === "error-event") {
				const hasArtifact =
					p.type === "runtime-event" &&
					p.output &&
					typeof p.output === "object" &&
					(p.output as Record<string, unknown>).artifact;
				entries.push({
					kind: "timeline",
					key: `${p.type}:${p.id || index}:${index}`,
					item: {
						id: String(p.id || `${msg.id}:${p.type}:${index}`),
						kind:
							p.type === "runtime-event"
								? hasArtifact
									? "artifact"
									: "runtime"
								: "error",
						label: p.label || (p.type === "runtime-event" ? "Runtime status" : "Run failed"),
						detail: p.detail,
						state: p.state || (p.type === "runtime-event" ? "streaming" : "error"),
						input: p.input,
						output: p.output,
						errorText: p.errorText
					}
				});
			}
		}
		return entries;
	}

	function submitMessage() {
		if (runIsActive) {
			chatStore.stopGeneration();
		} else {
			chatStore.sendMessage(inputValue);
			inputValue = "";
		}
	}

	$effect(() => {
		void serverSyncKey;
		if (data) {
			chatStore.setActiveChat(data.chatId, data.chatTitle, data.initialMessages, data.userId, data.activeRun ?? null);
		}
	});
</script>

{#if data?.invalidChat}
	<div class="flex h-[calc(100vh-1rem)] items-center justify-center p-6">
		<div class="max-w-md rounded-3xl border border-border/70 bg-background/90 p-8 text-center shadow-sm">
			<h1 class="text-2xl font-semibold tracking-tight">Chat unavailable</h1>
			<p class="mt-3 text-sm leading-7 text-muted-foreground">
				This Studio chat URL is missing a valid conversation id. Go back to the Studio overview and create a fresh chat.
			</p>
			<div class="mt-6">
				<Button href={data.studioId ? `/app/studios/${data.studioId}` : '/app'} class="rounded-full px-5">
					Back to Studio
				</Button>
			</div>
		</div>
	</div>
{:else if data}
	<div class="grid h-[100dvh] min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]">
		<ChatPageHeader
			chatId={data.chatId}
			canInspectAgentContext={data.canInspectAgentContext}
			oninspectcontext={() => {
				showDebugSheet = true;
			}}
		/>

		<div class="min-h-0 overflow-hidden">
			{#key data.chatId}
				<Conversation class="h-full">
					<ConversationContent class="mx-auto flex h-full w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-6">
						{#if chatStore.messages.length === 0}
							<ConversationEmptyState />
						{/if}

							{#each chatStore.messages as msg (msg.id)}
								{@const isUser = msg.role === "user"}
								{@const isLast = msg === chatStore.messages[chatStore.messages.length - 1]}
								{@const createdAt = (msg as CopyableMessage).createdAt}
								{@const timestamp = formatMessageTime(createdAt)}
								{@const plainText = messageText(msg)}
								<div class="flex gap-4 {isUser ? 'justify-end' : 'justify-start'}">
									<div class={cn("flex max-w-[82%] flex-col gap-1.5", isUser ? "items-end" : "w-full items-start")}>
										<div class={cn("w-full", isUser ? "bg-muted rounded-3xl px-4 py-2.5" : "")}>
										{#if msg.role === "assistant"}
											{@const renderedEntries = assistantEntries(msg)}
											{@const showLoadingDot = isLast && chatStore.isLoading && renderedEntries.length === 0}
											{@const showRunStatusEntry = isLast && activeRunEntry && !renderedEntries.some((entry) => entry.kind === "timeline" && entry.item.state === "streaming")}

											<div class="space-y-3">
												{#each renderedEntries as entry (entry.key)}
													{#if entry.kind === "timeline"}
														<ChatTimeline entries={[entry.item]} />
													{:else}
														<MessageContent class="text-foreground prose w-full min-w-0 flex-1 rounded-lg bg-transparent p-0" markdown={true} content={entry.text} />
													{/if}
												{/each}

												{#if showRunStatusEntry && activeRunEntry}
													<ChatTimeline entries={[activeRunEntry]} />
												{/if}

												{#if showLoadingDot}
													<div class="min-h-[2rem] py-2">
														<DotsLoader />
													</div>
												{/if}
											</div>
										{:else}
											<div class="whitespace-pre-wrap">
												{messageText(msg)}
											</div>
											{/if}
										</div>

										{#if msg.role === "assistant"}
											{@const fullTurnText = assistantFullTurnText(msg)}
										<div class="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground/70">
											{#if timestamp}
												<span>{timestamp}</span>
												<span aria-hidden="true">·</span>
											{/if}
											<CopyButton text={plainText} size="sm" variant="ghost" class="h-6 px-2 text-[11px]" disabled={!plainText} title="Copy assistant text">
												Copy text
											</CopyButton>
											<CopyButton text={fullTurnText} size="sm" variant="ghost" class="h-6 px-2 text-[11px]" disabled={!fullTurnText} title="Copy assistant response with tool and artifact summary">
												Copy full
											</CopyButton>
										</div>
									{:else}
										<div class="flex flex-wrap items-center justify-end gap-1.5 text-[11px] text-muted-foreground/70">
											{#if timestamp}
												<span>{timestamp}</span>
												<span aria-hidden="true">·</span>
											{/if}
											<CopyButton text={plainText} size="sm" variant="ghost" class="h-6 px-2 text-[11px]" disabled={!plainText} title="Copy message">
												Copy
											</CopyButton>
										</div>
									{/if}
								</div>
							</div>
						{/each}

						{#if chatStore.error}
							<div class="text-destructive p-4">Error: {chatStore.error.message}</div>
						{/if}
					</ConversationContent>
				</Conversation>
			{/key}
		</div>

		<div class="border-t bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
			<div class="mx-auto w-full max-w-3xl">
				<PromptInput
					class="mx-auto w-full"
					isLoading={runIsActive}
					disabled={runIsActive}
					value={inputValue}
					onValueChange={(v) => (inputValue = v)}
					onSubmit={submitMessage}
				>
					{#snippet children()}
						<PromptInputTextarea placeholder={runIsActive ? "Nova is still running. Stop the current run to send another message." : "Ask anything..."} />
						<PromptInputActions class="justify-between">
							<div>
								<Button variant="ghost" size="icon" type="button" onclick={() => (showSkillPicker = true)} title="Insert a skill" disabled={runIsActive}>
									<Sparkles class="h-4 w-4" />
								</Button>
							</div>
							<Button size="icon" class="rounded-full" disabled={!runIsActive && !inputValue.trim()} onclick={submitMessage}>
								{#if runIsActive}
									<span class="h-3 w-3 rounded-xs bg-primary-foreground"></span>
								{:else}
									<ArrowUp size={18} />
								{/if}
							</Button>
						</PromptInputActions>
					{/snippet}
				</PromptInput>
			</div>
		</div>
	</div>

	<SkillPicker
		open={showSkillPicker}
		onOpenChange={(v) => (showSkillPicker = v)}
		onSelect={(skill) => {
			const slug = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
			const textarea = document.querySelector('textarea');
			if (textarea) {
				const cursorPos = (textarea as any).selectionStart || inputValue.length;
				inputValue = inputValue.slice(0, cursorPos) + `/${slug} ` + inputValue.slice(cursorPos);
				setTimeout(() => {
					(textarea as any).selectionStart = (textarea as any).selectionEnd = cursorPos + slug.length + 2;
					textarea.focus();
				}, 0);
			} else {
				inputValue = `/${slug} ` + inputValue;
			}
		}}
	/>

	{#if data.canInspectAgentContext}
		<ChatDebugSheet chatId={data.chatId} bind:open={showDebugSheet} />
	{/if}
{/if}
