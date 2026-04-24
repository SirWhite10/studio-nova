# E2B Template & Streaming Fix Plan

**Plan Date:** 2026-04-03
**Scope:** Fix missing bun/git in E2B sandbox runtime and refactor chat streaming to interleave tool calls with text in real-time order.

---

## Background

After completing the SurrealDB migration, two issues surfaced during end-to-end testing:

1. **Bun and Git not found by the agent** — The agent reports bun and git are unavailable when executing shell commands in the E2B sandbox, despite both being installed in the template.
2. **Tool calls grouped separately from text** — The chat UI shows all tool calls in a block at the top, then the assistant's text response at the bottom, even when the model interleaves text between tool call steps. This makes conversations difficult to follow.

---

## Root Cause Analysis

### Issue 1: Bun/Git Not Found

**Finding:** E2B's `.setEnvs({ PATH: "..." })` is **build-time only** — it does NOT persist to the running sandbox. The E2B documentation explicitly states:

> Environment variables set in template definition are only available during template build.

At sandbox runtime, the default Ubuntu `user` PATH is typically just `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`. User-space tool directories like `/home/user/.bun/bin`, `/home/user/.deno/bin`, `/home/user/.vite-plus/bin`, and `/home/user/.npm-global/bin` are NOT on this default PATH.

**Why some tools work and others don't:**

- `vp` (Vite+) works because the installer adds itself to `~/.bashrc` or profile
- `pnpm` works because `npm config set prefix` persists in `~/.npmrc`
- `git` is installed via `aptInstall` as root to `/usr/bin/git` — it SHOULD be on the default PATH. If it's also missing, the template may not have been rebuilt recently.
- `bun` was installed as `user` to `/home/user/.bun/bin/` which is NOT on the default runtime PATH

**Two-part fix required:**

1. **Template** — install system-wide tools to `/usr/local/bin` as root; use E2B's built-in `.bunInstall()`/`.npmInstall()` helpers which handle user context correctly; create symlinks for user-space tools
2. **Runtime** — pass `envs: { PATH: "..." }` in `Sandbox.create()` call to ensure all tool paths are available at runtime

### Issue 2: Tool Calls Not Interleaved

**Finding:** In `chat-run-executor.ts`, the Vercel AI SDK's `onStepFinish` callback fires per-step (emitting tool calls), but `result.textStream` is only consumed after the entire `streamText()` call completes. The SSE stream always sends: `[all tool calls] → [all text] → done`. The UI renders the timeline block first, then text below.

**Fix:** Use `result.fullStream` instead of `onStepFinish` + `result.textStream`. The `fullStream` yields `text-delta`, `tool-call`, and `tool-result` events in real-time order, so tool calls and text are naturally interleaved.

---

## Implementation Plan

### Phase A: E2B Template Fix

- [x] **A-01** Rewrite `e2b/template.ts` with correct user/install separation
      Status: Completed
      Completed: 2026-04-03

      Changes:
      - Phase 1 (root): Install bun to `/usr/local` via `BUN_INSTALL=/usr/local`, keeping it on the system PATH
      - Phase 1 (root): Install global bun packages using E2B's `.bunInstall([...], { g: true })` helper
      - Phase 1 (root): Install Node.js, Go, apt packages as before
      - Phase 2 (user): Install Deno, Vite+, npm global packages, Rust as user-space tools
      - Phase 2 (user): Create symlinks in `/usr/local/bin/` for user-space tools (deno, vp, pnpm, cargo) so they're found without PATH changes
      - Remove `.setEnvs({ PATH: "..." })` — it's misleading since it's build-time only
      - Keep `.setWorkdir("/home/user")` to ensure runtime starts in user's home

- [x] **A-02** Add runtime envs to `Sandbox.create()` in `src/lib/server/sandbox.ts`
      Status: Completed
      Completed: 2026-04-03

      Pass the full tool PATH as runtime envs so all binaries are discoverable:
      ```ts
      const sandbox = await Sandbox.create(E2B_TEMPLATE, {
        apiKey: E2B_API_KEY,
        timeoutMs,
        envs: {
          PATH: "/usr/local/go/bin:/home/user/.deno/bin:/home/user/.vite-plus/bin:/home/user/.npm-global/bin:/home/user/.cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
          GOPATH: "/home/user/go",
        },
      });
      ```

- [ ] **A-03** Rebuild and deploy the E2B template
      Status: Pending (requires E2B_API_KEY and manual `npx tsx e2b/build.ts` run)
      Completed: \_\_\_

      Run the build script to push the updated template to E2B:
      ```
      npx tsx e2b/build.ts
      ```

- [ ] **A-04** Verify bun and git are found in a fresh sandbox
      Status: Pending (requires A-03 first)
      Completed: \_\_\_

      Test via agent-browser or manual API call:
      - Create a new chat in a studio
      - Ask the agent to run `bun --version`, `git --version`, `vp --version`, `deno --version`
      - Confirm all return valid version strings

---

### Phase B: Streaming Order Fix

- [x] **B-01** Read and document current streaming architecture in `chat-run-executor.ts`
      Status: Completed
      Completed: 2026-04-03

      Map the exact flow:
      1. How `streamText()` is called
      2. How `onStepFinish` emits tool call events
      3. How `result.textStream` is consumed
      4. How SSE events are structured and sent to the client
      5. How `chat-store.svelte.ts` processes incoming SSE chunks
      6. How `chat-view.svelte` renders timeline items vs text

- [x] **B-02** Refactor `chat-run-executor.ts` to use `result.fullStream`
      Status: Completed
      Completed: 2026-04-03

      Replace the `onStepFinish` + `result.textStream` pattern with `result.fullStream`, which yields events in real-time order:
      - `text-delta` → emit text chunk immediately
      - `tool-call` → emit tool call event
      - `tool-result` → emit tool result event
      - `step-finish` → emit step completion (if needed for timeline)

      This naturally interleaves tool calls and text as the model generates them.

- [x] **B-03** Update `chat-store.svelte.ts` to handle interleaved events
      Status: Completed (no changes needed — store already processes events in arrival order)
      Completed: 2026-04-03

      Ensure the frontend processes SSE events in arrival order and renders them correctly:
      - Tool calls appear inline with text, not grouped separately
      - The timeline shows events in the order they were generated
      - Text appears as it's streamed, even between tool calls

- [x] **B-04** Update `chat-view.svelte` rendering if needed
      Status: Completed
      Completed: 2026-04-03

      Review the current rendering logic:
      - Line 98-100: `textParts` and `messageTimeline` are derived separately
      - Line 104-106: Timeline renders first, then text below
      - May need to merge timeline items and text parts into a single ordered stream

- [ ] **B-05** End-to-end verification with agent-browser
      Status: Pending (requires running dev server + active sandbox)
      Completed: \_\_\_

      Test the full flow:
      1. Send a message that triggers tool calls (e.g., "create a new file and list the directory")
      2. Verify tool calls and text appear interleaved in the chat
      3. Verify the order matches the model's actual generation order
      4. Verify no regressions in loading states, error handling, or message persistence

---

### Phase C: Cleanup and Validation

- [x] **C-01** Run `vp check` and fix any type/lint errors
      Status: Completed (261 files formatted, 803 files linted/checked, zero errors)
      Completed: 2026-04-03

- [ ] **C-02** Run `vp test` and ensure all tests pass
      Status: Pending
      Completed: \_\_\_

- [ ] **C-03** Expire existing stale sandboxes in SurrealDB so fresh ones use the new template
      Status: Pending (manual step after A-03)
      Completed: \_\_\_

- [ ] **C-04** Update AGENTS.md or relevant docs with new template and streaming architecture notes
      Status: Pending
      Completed: \_\_\_

---

## Relevant Files

### E2B Template

- `e2b/template.ts` — template definition (needs rewrite)
- `e2b/build.ts` — template build script
- `src/lib/server/sandbox.ts` — sandbox creation (needs runtime envs)
- `src/lib/agent/tools/runtime.ts` — `runtime_shell` tool (no changes needed)

### Streaming

- `src/lib/server/chat-run-executor.ts` — streaming orchestration (needs refactor)
- `src/lib/server/chat-run-registry.ts` — SSE pub/sub for run chunks
- `src/lib/nova/chat/chat-store.svelte.ts` — frontend SSE consumer (may need updates)
- `src/lib/components/nova/chat/chat-view.svelte` — message rendering (may need updates)
- `src/lib/components/nova/chat/chat-timeline.svelte` — timeline rendering
- `src/lib/components/nova/chat/chat-timeline-row.svelte` — individual timeline item
- `src/routes/api/chat-runs/start/+server.ts` — POST handler for starting runs
- `src/routes/api/chat-runs/[runId]/stream/+server.ts` — SSE stream endpoint

### SDK Reference

- `node_modules/e2b/dist/index.d.ts` — `SandboxOpts.envs` at line 6514, `CommandStartOpts.envs` at line 7081
