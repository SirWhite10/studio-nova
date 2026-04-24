# Resumable Upload Persistence Plan

**Plan Date:** 2026-04-19
**Scope:** `apps/nova-cloud` only
**Goal:** Make Studio file uploads recover across full browser refresh and browser close/reopen by moving from one-shot uploads to resumable uploads with durable client and server state.

---

## Background

The current upload implementation already supports:

- background uploads across in-app navigation
- aggregate sidebar progress while uploads are active
- completion refresh on the matching Files page

That solved route-level continuity, but not process-level continuity.

Today, if the browser is refreshed or closed:

- the in-memory upload queue is lost
- the in-memory `File` references are lost
- the current one-request-per-file upload has no resumable checkpoint
- partially uploaded work cannot be resumed safely

The user asked whether this should be handled by a web worker.

Short answer:

- **No, not by itself**
- a plain web worker dies when the page dies
- a shared worker helps only while the browser session stays alive
- a service worker can help with coordination, but it still does not make uploads resumable on its own

The core requirement is **resumable uploads plus durable client state**, not just a different execution thread.

---

## Current State

### Client upload state

`src/lib/files/upload-manager.svelte.ts`

- keeps upload batches entirely in memory
- holds raw `File` objects in a private `Map`
- uploads each file with a single `XMLHttpRequest`
- has no durable storage for queue state or file data

### Upload API

`src/routes/api/studios/[studioId]/files/+server.ts`

- accepts a complete file in a single `POST`
- writes directly to R2 through `uploadFile(...)`
- does not issue upload session ids
- does not support chunk commits or completion reconciliation

### Storage helper

`src/lib/server/r2-files.ts`

- supports direct whole-object upload and delete
- does not support multipart upload lifecycle
- does not expose incomplete upload state

---

## Why A Worker Alone Is Not Enough

### Plain web worker

Not sufficient.

- it is owned by the page
- on refresh, the page and its dedicated worker are both torn down
- on browser close, all in-memory upload state is gone

### Shared worker

Only partially helpful.

- it can survive navigation between tabs/pages in some cases
- it does not survive full browser shutdown reliably
- it still does not provide resumable checkpoints

### Service worker

Potentially useful, but not the core solution.

- it can coordinate background work and retries
- it can observe connectivity changes and receive messages from pages
- it still needs durable data in IndexedDB and resumable server APIs
- browser support for long-running background upload behavior is constrained and inconsistent

Conclusion:

- A worker can be an **execution helper**
- It is **not** the persistence model

The persistence model must be:

1. durable local queue state
2. durable access to file content
3. resumable, chunked server upload sessions

---

## Proposed Architecture

### 1. Durable client upload queue in IndexedDB

Persist upload jobs in IndexedDB with records like:

- `uploadId`
- `studioId`
- destination folder path
- file name
- file size
- content type
- chunk size
- upload session id
- per-chunk completion bitmap or completed chunk indices
- status
- error state
- created/updated timestamps

This queue becomes the source of truth after refresh/reopen.

### 2. Durable file data

The client must also retain file content, not just metadata.

Practical options:

- store `Blob`s directly in IndexedDB
- or store `FileSystemFileHandle`s when available and permitted

Recommended default:

- use IndexedDB `Blob` storage first
- treat `File System Access API` as an optional future enhancement

Reasoning:

- IndexedDB works broadly and does not require extra permission prompts
- it allows the app to reopen and continue reading chunks

Tradeoff:

- writing large files into IndexedDB adds an upfront copy cost

### 3. Chunked resumable upload protocol

Replace one-shot file POSTs with chunked uploads.

Required flow:

1. client creates an upload session
2. server returns `uploadId`, chunk size, and accepted metadata
3. client uploads chunks with chunk index and byte range
4. server persists chunk progress
5. client asks server to finalize when all chunks are present
6. server assembles or completes multipart upload into the final R2 object

This is the key step that makes refresh/close recovery real.

### 4. Server-managed upload session state

Add persistent session tracking in the backend.

Each upload session should store:

- `uploadId`
- `userId`
- `studioId`
- final file path
- file metadata
- total size
- chunk size
- upload status
- completed chunk indices or part metadata
- underlying R2 multipart upload id if using multipart APIs
- created/updated timestamps

Likely storage:

- SurrealDB, since the app already uses it for user/studio/application state

### 5. Resume-on-start behavior

On app startup:

- load queued uploads from IndexedDB
- ask the server for each upload session’s current progress
- diff local chunk state against server chunk state
- resume only missing chunks
- repopulate the sidebar progress card from the reconstructed queue

This provides continuity after refresh and browser reopen.

### 6. Optional service worker coordination

A service worker can help with:

- reconnect/retry logic
- resuming queue processing when the page reopens
- coordinating uploads across multiple tabs

But this should be **Phase 2**, not the base dependency.

The initial resumable system should work without a service worker.

---

## R2 Strategy

There are two realistic backend implementations.

### Option A: Server buffers chunks and writes the final file

Simpler conceptually, worse for large files.

- client uploads chunks to app server
- app stores chunks temporarily
- app assembles the final object

This is usually the wrong direction for this app because it adds avoidable server-side buffering and storage complexity.

### Option B: Use R2 multipart upload

Recommended.

- server creates an R2 multipart upload
- client sends chunks to the app API
- app forwards each chunk as an R2 multipart part
- server stores part numbers and ETags in session state
- server completes the multipart upload when all parts exist

Why this is the better fit:

- aligns with large-file resumability
- avoids building a second object assembly system
- maps naturally to chunk checkpoints

Open implementation detail:

- verify the exact Cloudflare Worker runtime R2 multipart API surface available in this app environment before coding

---

## Client Design

### Upload manager split

Refactor the current `FileUploadManager` into two layers:

1. **UploadPersistenceStore**
   - IndexedDB read/write
   - queue hydration
   - durable blob access

2. **UploadRuntimeManager**
   - active in-memory scheduling
   - progress aggregation
   - retry scheduling
   - page/sidebar subscriptions

This keeps UI state clean while making persistence explicit.

### Suggested client modules

- `src/lib/files/upload-persistence.ts`
- `src/lib/files/upload-runtime.svelte.ts`
- `src/lib/files/upload-protocol.ts`
- `src/lib/files/upload-types.ts`

### Scheduling model

Recommended default:

- limit concurrent uploads to a small number such as `2`
- limit concurrent chunks per file to `1`

Reasoning:

- simpler recovery semantics
- predictable network usage
- easier aggregate progress math

Parallel chunks can be added later if needed.

### Aggregate progress

Aggregate sidebar progress should become:

- uploaded committed bytes across all active sessions
- divided by total bytes across all queued/running uploads

Not:

- percent of chunks attempted
- percent of files completed only

---

## API Plan

Replace the single upload-only behavior with a resumable protocol.

### New endpoints

Recommended additions under:

- `src/routes/api/studios/[studioId]/files/uploads/`

Suggested routes:

1. `POST /api/studios/[studioId]/files/uploads`
   - create upload session
   - input: filename, size, contentType, folder path
   - output: `uploadId`, chunk size, current status

2. `GET /api/studios/[studioId]/files/uploads/[uploadId]`
   - fetch session status
   - output: completed chunks, total size, file path, status

3. `PUT /api/studios/[studioId]/files/uploads/[uploadId]/parts/[partNumber]`
   - upload one chunk
   - input: chunk bytes
   - output: accepted part metadata

4. `POST /api/studios/[studioId]/files/uploads/[uploadId]/complete`
   - finalize multipart upload
   - output: final file path

5. `POST /api/studios/[studioId]/files/uploads/[uploadId]/abort`
   - cancel and clean up abandoned multipart uploads

### Existing files route

Keep:

- `GET /api/studios/[studioId]/files`
- `DELETE /api/studios/[studioId]/files`
- folder creation support in current `POST` for now

Deprecate direct whole-file upload from:

- `POST /api/studios/[studioId]/files`

or keep it for small files only behind a size threshold during migration.

---

## Data Model Plan

Add a new SurrealDB-backed record for upload sessions.

Suggested fields:

- `id`
- `userId`
- `studioId`
- `path`
- `fileName`
- `contentType`
- `size`
- `chunkSize`
- `status`: `created | uploading | completing | completed | failed | aborted`
- `multipartUploadId`
- `completedParts`
- `error`
- `createdAt`
- `updatedAt`

Optional later fields:

- `sha256`
- `clientInstanceId`
- `lastHeartbeatAt`

---

## Failure Model

The design must handle:

- refresh during active upload
- browser close and reopen
- network disconnect during a chunk
- duplicate tab resume attempt
- stale incomplete multipart uploads
- file renamed or target path collision before completion

Recommended rules:

- upload session path is reserved once session creation succeeds
- server finalization rechecks path conflicts explicitly
- client retries transient chunk failures with bounded backoff
- abandoned sessions are cleaned up by a scheduled job or lazy expiration path

---

## Rollout Plan

### Phase A: Research and protocol confirmation

- [ ] Confirm available R2 multipart upload APIs in the deployed Worker runtime
- [ ] Decide fixed chunk size and max supported file size for v1
- [ ] Define upload session schema in SurrealDB

### Phase B: Backend upload sessions

- [ ] Add upload-session persistence helpers
- [ ] Add create/status/part/complete/abort endpoints
- [ ] Add R2 multipart upload orchestration
- [ ] Add cleanup path for expired/incomplete sessions

### Phase C: Client durable queue

- [ ] Add IndexedDB persistence for upload jobs and blobs
- [ ] Refactor the current upload manager into persistence + runtime layers
- [ ] Hydrate pending uploads on app startup
- [ ] Reconstruct sidebar progress from persisted jobs

### Phase D: Resumable Files page integration

- [ ] Switch the Files page from one-shot upload to resumable session creation
- [ ] Upload file chunks through the new API
- [ ] Keep existing background sidebar behavior
- [ ] Ensure completed uploads still refresh the matching folder listing

### Phase E: Recovery behavior

- [ ] Resume pending uploads after browser refresh
- [ ] Resume pending uploads after browser close/reopen
- [ ] Handle retries and terminal failures cleanly

### Phase F: Optional worker enhancement

- [ ] Evaluate service worker coordination for retry/reconnect improvements
- [ ] Add cross-tab coordination if duplicate resumptions become a problem

### Phase G: Validation

- [ ] Verify refresh during upload resumes correctly
- [ ] Verify browser close/reopen resumes correctly
- [ ] Verify aggregate sidebar progress survives hydration
- [ ] Verify completed files appear exactly once
- [ ] Verify aborted or expired uploads clean up correctly
- [ ] Run `vp check`
- [ ] Run `vp test`

---

## Open Decisions

### Chunk size

Need a fixed initial chunk size.

Recommended starting point:

- `8 MB`

Reasoning:

- large enough to reduce request count
- small enough to retry cheaply
- reasonable memory tradeoff in browser and Worker runtime

### Large file limits

Need a v1 product limit even if multipart supports more.

Recommended:

- define a clear limit in UI and API
- reject unsupported sizes early

### Multi-tab behavior

Two open tabs could try to resume the same upload.

Recommended first step:

- use `BroadcastChannel` or IndexedDB lease records for a simple active-owner lock

This is more important than a worker in the initial design.

### Direct-to-R2 uploads

Could be a future optimization, but is not the first step here.

The first step should keep policy, auth, and upload-session control inside the app API.

---

## Recommendation

Build resumable uploads in this order:

1. IndexedDB-backed durable queue
2. SurrealDB-backed upload sessions
3. R2 multipart upload orchestration
4. resume-on-start hydration
5. optional service worker enhancements

If choosing between “web worker now” and “resumable protocol now,” the correct choice is:

- **resumable protocol now**

Without that, refresh/close persistence will remain fragile no matter which worker model is used.

---

## Relevant Files

- `apps/nova-cloud/src/lib/files/upload-manager.svelte.ts`
- `apps/nova-cloud/src/routes/(app)/app/studios/[studioId]/files/+page.svelte`
- `apps/nova-cloud/src/lib/components/app-sidebar.svelte`
- `apps/nova-cloud/src/routes/api/studios/[studioId]/files/+server.ts`
- `apps/nova-cloud/src/lib/server/r2-files.ts`
- `apps/nova-cloud/src/lib/server/surreal-artifacts.ts`
- `apps/nova-cloud/src/lib/server/surreal-query.ts`
- `apps/nova-cloud/planning/2026-04-13-file-uploads-and-folders-plan.md`

---

## Expected Outcome

After this plan is implemented:

- uploads can survive full browser refresh
- uploads can recover after browser close and reopen
- the sidebar upload state rehydrates from durable queue state
- failed or partial uploads can resume from the last confirmed chunk
- the system no longer depends on a single page lifetime to finish large uploads
