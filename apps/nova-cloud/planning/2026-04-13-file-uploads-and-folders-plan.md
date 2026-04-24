# File Uploads And Folders Plan

**Plan Date:** 2026-04-13
**Scope:** `apps/nova-cloud` only
**Goal:** Expand Studio file capabilities so uploads continue in the background, upload progress is visible in the sidebar while active, and users can create folders directly from the Files page.

---

## Background

The current Files page in `apps/nova-cloud` supports:

- listing files and virtual folders from R2
- uploading one or more files from the Files page
- navigating folders derived from object key prefixes
- deleting and downloading files

The current behavior has two product gaps:

1. Upload state is page-local. If the user navigates away from the Files page, the visible upload state is lost.
2. Users cannot create empty folders because folders only appear when R2 key prefixes already exist.

The requested behavior is:

- uploads should keep running in the background
- active upload progress should appear in the sidebar above Support and Feedback
- the upload UI should only show in the sidebar while uploads are in progress
- when multiple files upload together, the sidebar should show total progress and a completed counter such as `1/2`
- users should be able to create folders from the Files page

---

## Current State

### Files page

`src/routes/(app)/app/studios/[studioId]/files/+page.svelte`

- owns `isUploading` locally
- uploads with `fetch()` and `FormData`
- uploads files sequentially
- refreshes the current listing after all files finish
- has no shared state with the app shell/sidebar

### Sidebar

`src/lib/components/app-sidebar.svelte`

- renders `StudioSidebarNav`
- renders secondary links with Support, Feedback, and App Settings
- has no file upload state or file-progress UI

### Storage model

`src/lib/server/r2-files.ts`

- lists folders from R2 delimiters using object key prefixes
- ignores keys ending in `/`
- has no explicit folder creation helper
- treats folders as virtual, so empty folders do not exist today

### Files API

`src/routes/api/studios/[studioId]/files/+server.ts`

- supports `GET` for listing/downloading
- supports `POST` for single-file upload
- supports `DELETE` for file deletion
- has no endpoint behavior for folder creation

---

## Constraints

- The implementation should be limited to `apps/nova-cloud`.
- Existing upload API behavior should remain compatible with the Files page.
- Sidebar upload UI should be transient and only appear while there are active uploads.
- Aggregate progress must represent total uploaded bytes across all active files, not per-file progress only.
- Folder creation must support empty folders, which requires an explicit marker object in R2.

---

## Proposed Approach

### 1. Move upload state into a shared client-side upload manager

Add a dedicated client module, for example:

- `src/lib/files/upload-manager.svelte.ts`

Responsibilities:

- track active uploads across route changes
- store upload items by id
- store `studioId`, folder path, file name, bytes uploaded, total bytes, status, and error state
- expose derived aggregate values for:
  - whether uploads are active
  - total bytes uploaded
  - total bytes expected
  - overall percent complete
  - completed file count
  - total file count
- notify listeners when a Studio/path should refresh after successful uploads

Reasoning:

- The app sidebar lives at the app-shell level, so upload state must also live above the page level.
- A shared rune-based state module matches the current Svelte 5 architecture already used elsewhere in the app.

### 2. Replace `fetch()` uploads with progress-aware client uploads

Update the Files page upload flow to enqueue files into the shared upload manager.

Use `XMLHttpRequest` for the actual upload request because:

- `fetch()` does not provide reliable upload progress events for this use case
- `XMLHttpRequest.upload.onprogress` gives byte-level progress needed for aggregate sidebar progress

Upload behavior:

- accept multiple files from the current folder context
- register all files up front so the sidebar can immediately show `0/N`
- update each file's byte progress independently
- compute aggregate progress from total uploaded bytes across all in-flight files
- continue running if the user navigates away from the Files page

### 3. Add a transient sidebar upload card above Support and Feedback

Add a small upload-progress section in:

- `src/lib/components/app-sidebar.svelte`

Behavior:

- render above `NavSecondary`
- only show while at least one upload is active
- display a concise label such as `Uploading files`
- display a counter such as `1/2`
- show one aggregate progress bar
- optionally show the current Studio name if helpful, but keep the UI compact

Implementation notes:

- use the existing progress primitive in `src/lib/components/ui/progress/`
- keep the card non-interruptive and lightweight
- hide it immediately after all active uploads resolve

### 4. Refresh the Files page when uploads complete

The Files page should subscribe to upload-manager completion events relevant to:

- the current `studioId`
- the current folder path

Behavior:

- if the user is on the matching Files page when uploads finish, refresh the listing automatically
- if the user is elsewhere, no immediate refresh is needed
- retain toast success/error feedback at the completion boundary

### 5. Add explicit folder creation support

Because folders are virtual today, empty folders need a marker object.

Recommended representation:

- create a hidden marker object inside the folder, for example:
  - `folder-name/.keep`

Why `.keep`:

- it creates the prefix so the folder shows up in R2 listings
- it is easy to filter from visible file listings
- it avoids ambiguous treatment of trailing-slash objects

Required backend changes:

- add a `createFolder(...)` helper in `src/lib/server/r2-files.ts`
- extend `POST` handling in `src/routes/api/studios/[studioId]/files/+server.ts` to support folder creation requests
- filter marker files from visible file listings
- decide whether `DELETE` should remain file-only for now or also support folder deletion later

Recommended first step:

- support folder creation now
- defer recursive folder deletion unless explicitly requested

### 6. Add a folder creation control to the Files page

Add a `New Folder` action near the existing `Upload` and `Refresh` buttons.

Behavior:

- open a small inline form or dialog
- accept a folder name in the current path
- validate:
  - not empty
  - trimmed
  - no `/`
  - not `.` or `..`
  - not already present in the current listing
- on success:
  - create the folder marker through the Files API
  - refresh the current listing
  - show a success toast

This should work both at the Studio root and inside nested folders.

---

## Implementation Plan

### Phase A: Shared Upload State

- [ ] Add `src/lib/files/upload-manager.svelte.ts`
- [ ] Define upload item types and aggregate derived values
- [ ] Add progress-aware upload execution with `XMLHttpRequest`
- [ ] Add completion notifications keyed by `studioId` and folder path

### Phase B: Files Page Upload Refactor

- [ ] Refactor `src/routes/(app)/app/studios/[studioId]/files/+page.svelte` to use the upload manager
- [ ] Replace local `isUploading` as the primary source of truth
- [ ] Keep the Upload button usable while preserving clear disabled/loading behavior as needed
- [ ] Auto-refresh the current folder after successful uploads complete

### Phase C: Sidebar Upload Progress

- [ ] Add a compact upload-progress card to `src/lib/components/app-sidebar.svelte`
- [ ] Render it above Support/Feedback/App Settings
- [ ] Hide it when there are no active uploads
- [ ] Show aggregate progress percentage and completed count such as `1/2`

### Phase D: Folder Creation

- [ ] Add folder-marker support in `src/lib/server/r2-files.ts`
- [ ] Extend `src/routes/api/studios/[studioId]/files/+server.ts` to accept folder creation requests
- [ ] Filter `.keep` markers from normal file listings
- [ ] Add `New Folder` UI to the Files page
- [ ] Add client and server validation for folder names
- [ ] Refresh the current listing after folder creation

### Phase E: Validation

- [ ] Verify uploads continue while navigating to other app routes
- [ ] Verify sidebar upload progress appears only during active uploads
- [ ] Verify aggregate progress is correct for multi-file uploads
- [ ] Verify the completed counter updates correctly for cases like `1/2`
- [ ] Verify created folders appear immediately and remain visible when empty
- [ ] Run `vp check`
- [ ] Run `vp test`

---

## Open Decisions

### Upload concurrency

Decision needed during implementation:

- sequential uploads are simpler and keep bandwidth predictable
- parallel uploads feel faster but require slightly more coordination in aggregate progress/error handling

Recommended default:

- start with sequential uploads through the shared manager
- keep the manager design capable of future parallelism

### Folder deletion

Not required for this change.

If added later, folder deletion should be explicit because R2 does not provide a real directory abstraction. Recursive deletion would need to enumerate and remove all objects under a prefix, including marker files.

### Upload persistence on reload

This plan covers background uploads across in-app navigation while the current tab remains open.

It does not cover:

- browser refresh survival
- browser close/reopen recovery

Those would require a different design and are out of scope for this change.

---

## Relevant Files

- `apps/nova-cloud/src/routes/(app)/app/studios/[studioId]/files/+page.svelte`
- `apps/nova-cloud/src/lib/components/app-sidebar.svelte`
- `apps/nova-cloud/src/lib/components/nav-secondary.svelte`
- `apps/nova-cloud/src/routes/(app)/app/+layout.svelte`
- `apps/nova-cloud/src/routes/api/studios/[studioId]/files/+server.ts`
- `apps/nova-cloud/src/lib/server/r2-files.ts`
- `apps/nova-cloud/src/lib/components/ui/progress/progress.svelte`

---

## Expected Outcome

After implementation:

- uploads started from the Files page remain visible and continue during navigation inside the app shell
- the sidebar shows a compact aggregate upload state only while uploads are active
- multi-file uploads show one total progress indicator and a completed counter such as `1/2`
- users can create empty folders directly from the Files page
- empty folders persist in the listing because they are backed by explicit marker objects in R2
