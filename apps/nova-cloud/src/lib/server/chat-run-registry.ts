type StreamChunk =
  | { type: "start"; runId: string; status: string }
  | { type: "thinking"; id: string; label: string; state: "streaming" | "done"; detail?: string }
  | { type: "text"; delta: string }
  | { type: "tool"; toolCallId: string; toolName: string; state: string; input?: unknown }
  | {
      type: "runtime";
      id?: string;
      action: "status" | "start" | "reuse" | "stop" | "preview";
      toolName?: string;
      sandboxId?: string;
      previewUrl?: string;
      detail?: string;
      artifact?: Record<string, unknown>;
    }
  | { type: "tool-result"; toolCallId: string; toolName: string; output?: unknown; error?: string }
  | { type: "done"; runId: string; status: string }
  | { type: "error"; runId: string; error: string };

type Listener = (chunk: StreamChunk) => void;

interface RunSession {
  runId: string;
  streamKey: string;
  listeners: Set<Listener>;
  status: "queued" | "preparing" | "running" | "completed" | "failed" | "aborted";
  attachable: boolean;
  startedAt: number;
  lastEventAt: number;
  finalChunk?: StreamChunk;
  initialChunk?: StreamChunk;
  bufferedText: string;
  bufferedEvents: StreamChunk[];
  abortController?: AbortController;
}

const runSessions = new Map<string, RunSession>();

function getSessionKey(runId: string, streamKey: string) {
  return `${runId}:${streamKey}`;
}

export function registerRunSession(runId: string, streamKey: string) {
  const key = getSessionKey(runId, streamKey);
  let session = runSessions.get(key);
  if (!session) {
    session = {
      runId,
      streamKey,
      listeners: new Set(),
      status: "queued",
      attachable: true,
      startedAt: Date.now(),
      lastEventAt: Date.now(),
      bufferedText: "",
      bufferedEvents: [],
    };
    runSessions.set(key, session);
  }
  return session;
}

export function getRunSession(runId: string, streamKey: string) {
  return runSessions.get(getSessionKey(runId, streamKey)) ?? null;
}

export function setRunAbortController(
  runId: string,
  streamKey: string,
  abortController?: AbortController,
) {
  const session = getRunSession(runId, streamKey);
  if (!session) return;
  session.abortController = abortController;
}

export function publishRunChunk(runId: string, streamKey: string, chunk: StreamChunk) {
  const session = getRunSession(runId, streamKey);
  if (!session) return;

  session.lastEventAt = Date.now();
  if (chunk.type === "start") {
    session.status = chunk.status as RunSession["status"];
    session.initialChunk = chunk;
  }
  if (chunk.type === "text") {
    session.bufferedText += chunk.delta;
  } else if (chunk.type !== "done" && chunk.type !== "error") {
    session.bufferedEvents = [...session.bufferedEvents, chunk].slice(-40);
  }
  if (chunk.type === "done" || chunk.type === "error") {
    session.attachable = false;
    session.status = (chunk.type === "done" ? chunk.status : "failed") as RunSession["status"];
    session.finalChunk = chunk;
  }

  for (const listener of session.listeners) {
    listener(chunk);
  }
}

export function publishRunChunkByRunId(runId: string, chunk: StreamChunk) {
  for (const session of runSessions.values()) {
    if (session.runId !== runId || !session.attachable) continue;
    publishRunChunk(runId, session.streamKey, chunk);
    return true;
  }
  return false;
}

export function attachRunListener(runId: string, streamKey: string, listener: Listener) {
  const session = getRunSession(runId, streamKey);
  if (!session || !session.attachable) return null;
  session.listeners.add(listener);
  if (session.initialChunk) listener(session.initialChunk);
  for (const chunk of session.bufferedEvents) {
    listener(chunk);
  }
  if (session.bufferedText) listener({ type: "text", delta: session.bufferedText });
  return () => {
    session.listeners.delete(listener);
  };
}

export function completeRunSession(runId: string, streamKey: string, status: RunSession["status"]) {
  const session = getRunSession(runId, streamKey);
  if (!session) return;
  session.status = status;
  session.attachable = false;
  session.abortController = undefined;
  if (status === "completed" || status === "aborted") {
    session.finalChunk = { type: "done", runId, status };
  } else if (status === "failed") {
    session.finalChunk = { type: "error", runId, error: status };
  }
  setTimeout(() => {
    runSessions.delete(getSessionKey(runId, streamKey));
  }, 60_000);
}

export function failRunSession(runId: string, streamKey: string, error: string) {
  publishRunChunk(runId, streamKey, { type: "error", runId, error });
  completeRunSession(runId, streamKey, "failed");
}

export function abortRunSession(runId: string, streamKey: string) {
  const session = getRunSession(runId, streamKey);
  if (!session) return false;
  session.abortController?.abort("Run aborted");
  publishRunChunk(runId, streamKey, { type: "done", runId, status: "aborted" });
  completeRunSession(runId, streamKey, "aborted");
  return true;
}

export function getRunSessionSnapshot(runId: string, streamKey: string) {
  const session = getRunSession(runId, streamKey);
  if (!session) return null;
  return {
    runId: session.runId,
    streamKey: session.streamKey,
    status: session.status,
    attachable: session.attachable,
    startedAt: session.startedAt,
    lastEventAt: session.lastEventAt,
    bufferedText: session.bufferedText,
    finalChunk: session.finalChunk,
  };
}
