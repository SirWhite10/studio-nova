# Nova Cloud Chat Runs Architecture Plan

**Date:** 2026-03-25
**Status:** ACTIVE
**Goal:** Move Nova chat to an enterprise-grade run architecture with direct low-latency streaming to the connected user, durable run lifecycle in SurrealDB, one active run per chat, and no `streamingDeltas`.

## Target Architecture

**Core design**

- SurrealDB owns durable orchestration and final state
- SvelteKit owns live stream delivery and E2B-backed tool execution
- The browser is never the source of truth
- Final assistant messages are persisted; per-token deltas are not

```
Client ──► SurrealDB startRun mutation
          ├── save user message
          ├── create durable chatRun
          └── return runId + streamKey

Client ──► /api/chat-runs/[runId]/stream?key=...
          └── attach/re-attach to live server stream if available

SurrealDB ──► run lifecycle
          ├── queued
          ├── preparing
          ├── running
          ├── completed
          ├── failed
          └── aborted

SvelteKit ──► live generation session
             ├── reconnect sandbox via SurrealDB sandboxes table
             ├── run model + tools
             ├── stream tokens directly to browser
             └── persist only final assistant message + run terminal state
```

## Key Decisions

- Reattach to the live stream if possible
- Allow only one active run per chat
- Remove `streamingDeltas` completely
- Use the SvelteKit bridge approach first

## Durable Data Model

### Keep

- `messages`
- `sandboxes`

### Add

- `chatRuns`
  - `chatId`
  - `userId`
  - `status`
  - `requestMessageId`
  - `assistantMessageId` optional
  - `model`
  - `sandboxId` optional
  - `streamKey`
  - `liveAttachable`
  - `attempt`
  - `startedAt`
  - `updatedAt`
  - `completedAt` optional
  - `error` optional

### Remove

- `streamingDeltas`

## Runtime Flow

1. Client calls SurrealDB `startRun({ chatId, content })`
2. SurrealDB saves the user message and creates a durable `chatRun`
3. SurrealDB starts or coordinates detached processing for the run
4. Client immediately attempts to attach to `/api/chat-runs/[runId]/stream?key=...`
5. If the live stream is available, SvelteKit streams tokens directly to the browser
6. If the browser refreshes, the client reloads active run state from SurrealDB and re-attaches if possible
7. On completion, the final assistant message is written to `messages` and the run is marked `completed`

## Files To Create Or Change

### SurrealDB

1. **`src/surreal/schema.ts`**
   - Add `chatRuns`
   - Remove `streamingDeltas`

2. **`src/surreal/chatRuns.ts`** (NEW)
   - `startRun`
   - `getRun`
   - `getActiveRunForChat`
   - `listRunsForChat`
   - `markPreparing`
   - `markRunning`
   - `markCompleted`
   - `markFailed`
   - `markAborted`

3. **`src/surreal/messages.ts`**
   - Ensure final assistant message persistence remains canonical

4. **`src/surreal/sandboxes.ts`**
   - Keep sandbox reconnect + metadata aligned with run lifecycle

### Server

5. **`src/lib/server/chat-run-registry.ts`** (NEW)
   - In-memory active session registry keyed by `runId` + `streamKey`
   - Best-effort live re-attach on the same server instance

6. **`src/routes/api/internal/chat-runs/[runId]/start/+server.ts`** (NEW)
   - Protected internal bridge that starts the actual live generation session
   - Executes model + tools via SvelteKit/E2B
   - Persists only lifecycle + final message

7. **`src/routes/api/chat-runs/[runId]/stream/+server.ts`** (NEW)
   - Public attach/re-attach endpoint for live stream consumption

8. **`src/lib/server/sandbox.ts`**
   - Keep reconnection logic and align it with run metadata where needed

### Client

9. **`src/lib/nova/chat/chat-store.svelte.ts`**
   - Replace direct `/api/chat/stream` sends with `startRun`
   - Track active run state
   - Attach/re-attach to live stream endpoint
   - Use run lifecycle for loading/error UX

10. **`src/routes/(app)/app/chat/[id]/+page.server.ts`**
    - Load active run state alongside messages

11. **`src/routes/(app)/app/chat/[id]/+page.svelte`**
    - Render run lifecycle states
    - Show active assistant placeholder while attached or running

### Cleanup

12. **Delete or retire**
    - `src/surreal/streamingDeltas.ts`
    - `src/routes/api/chat/stream/+server.ts`
    - delta reconstruction logic in `chat-store.svelte.ts`

## Function Contracts

### `startRun`

Returns:

```ts
{
  runId: Id<"chatRuns">;
  streamKey: string;
  reused: boolean;
  status: "queued" | "preparing" | "running";
}
```

### Live attach endpoint

Success stream emits SSE events like:

```txt
event: start
data: {"runId":"...","status":"running"}

event: text
data: {"delta":"Hello"}

event: tool
data: {"toolName":"shell","state":"running"}

event: tool-result
data: {"toolName":"shell","output":"..."}

event: done
data: {"runId":"...","status":"completed"}
```

Fallback if re-attach is unavailable:

```json
{
  "status": "running",
  "attachable": false,
  "fallback": "status-only"
}
```

## Operational Rules

- Only one active run per chat (`queued`, `preparing`, `running`)
- Final assistant message must be persisted before marking run `completed`
- Browser disconnect must not define whether the run succeeds or fails
- Re-attach is best-effort on the current server instance
- If live re-attach is not possible, fallback is status-only until final completion

## Implementation Phases

### Phase 1

- Add `chatRuns` schema + SurrealDB functions
- Load active run state in chat page data

### Phase 2

- Add server-side run registry
- Add internal bridge + public attach endpoint

### Phase 3

- Switch client send flow from `/api/chat/stream` to `startRun + attach`
- Persist final assistant output through run completion only

### Phase 4

- Remove `streamingDeltas`
- Remove old direct stream architecture

### Phase 5

- Validate refresh / reconnect / completion / failure flows

## Acceptance Criteria

1. Sending a message creates exactly one active run for the chat
2. A second send while active reuses or blocks correctly
3. Connected users receive direct live stream output
4. Refresh during an active run attempts re-attach
5. If re-attach is unavailable, UI shows active running state until the final message lands
6. Final assistant message is persisted in `messages`
7. Failed runs show status and can be retried later
8. `streamingDeltas` is fully removed

**Status:** Ready to implement
**Created:** 2026-03-25
**Owner:** opencode

---

This file is the canonical implementation plan for the chat runs migration.
