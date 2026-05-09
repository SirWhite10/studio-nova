# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-04-07

### Changed - K3s Runtime and Domain Edge

- Replaced the active Nova Cloud sandbox/runtime path with the self-hosted k3s `nova-runtime-control` API, including runtime file operations, shell execution, preview serving, and `/api/sandbox` compatibility backed by runtime-control status instead of E2B
- Added runtime-control preview support so workspace builds can be served through a `runtime-preview` Kubernetes service and routed by Caddy/Cloudflared to `*.dlx.studio` or verified custom domains
- Added Nova Cloud domain-control integration for listing, adding, verifying, syncing, and removing Studio custom domains through `nova-domain-control`, with TXT ownership verification and Caddy sync support
- Added k3s deployment assets for Caddy, Cloudflared, domain-control, frpc, smoke workspaces, and runtime-control RBAC/bootstrap so the local Debian host can restart the remaining edge/runtime layers without a VPS
- Removed the active E2B dependency, template build script, and E2B runtime imports from Nova Cloud while keeping a k3s-backed compatibility shim for older sandbox call sites
- Fixed SurrealDB record-id handling for runtime process and artifact updates so existing preview rows update cleanly when a k3s workspace preview is restarted

### Added - Workspace Runtime Agent Surface

- Added a first-class workspace runtime contract API at `/api/studios/[studioId]/workspaces/[workspaceId]/runtime` so clients and the Nova agent can read the workspace commands, storage paths, hostnames, and deployment metadata from one source of truth
- Added Nova agent workspace tools for listing workspaces, fetching runtime contracts, creating blog workspaces, and provisioning or previewing them through the existing Studio APIs
- Added runtime-contract display to the Studio workspace cards and linked the runtime-lab page to the same workspace state so the runtime control plane and workspace view stay aligned
- Extended the workspace smoke route to return both the pre-provision and post-provision runtime contract snapshots for backend verification

### Added - Workspace Runtime Contract Docs

- Updated the Nova Cloud README and workspace planning docs to describe the studio-owned sandbox/runtime model, workspace publication lifecycle, blank-slate runtime base, R2-backed runtime state, single `runCommand` contract, and on-demand scale-to-zero execution model
- Updated the Nova runtime-control README to match the same on-demand k3s runtime direction and to remove stale build/image assumptions from the documentation

### Added - Workspace Contract Planning

- Clarified the `blog-react-vp` workspace plan so each Studio owns its sandbox/runtime environment, each Studio can own multiple workspaces, and the sandbox publishes runtime contracts plus workspace state instead of treating the workspace as the sandbox itself

### Added - Domain Control Planning

- Added [planning/2026-04-25-nova-domain-control-frp-plan.md](./planning/2026-04-25-nova-domain-control-frp-plan.md) to define the stock-frp-first Nova domain controller plan, SurrealDB proxy/domain schema, Cloudflared transition path, runtime-control integration, and phased custom domain/TCP/UDP roadmap
- Added [planning/2026-04-28-modular-pricing-stripe-plan.md](./planning/2026-04-28-modular-pricing-stripe-plan.md) to track the modular workspace, add-on, sandbox runtime, Nova AI credit, and Stripe billing plan

### Added - Nova Domain Schema Utility

- Added a standalone `tools/nova-domain-schema` utility with `vp run nova-domain-schema#ensure-schema` so the SurrealDB schema for `workspace_proxy`, `proxy_domain`, and `frp_client` can be initialized once without keeping the `nova-domain-control` service deployed

### Changed - Node Adapter Support

- Added the SvelteKit Node adapter as an optional Nova Cloud build target selected with `NOVA_SVELTE_ADAPTER=node`, while keeping the Cloudflare adapter as the default

### Added - Vendored frp Source

- Vendored upstream `fatedier/frp` under `apps/nova-frp` as the starting point for Nova's domain-control tunnel work
- Excluded the vendored frp tree from root Vite+ format/lint checks so upstream source formatting remains stable

### Added - Domain Control Service

- Added `apps/nova-domain-control` with SurrealDB-backed proxy/domain schema setup, host resolution helpers, admin proxy endpoints, a minimal frp plugin gate, and unit tests for domain/store/plugin behavior
- Added a local frp subdomain smoke test that starts frps, frpc, the domain-control plugin, and a fake workspace HTTP server to verify `ws-smoke.workspaces.test` routes end-to-end

### Added - Standalone Nova frps

- Added custom `apps/nova-frp` support for standalone `frps` domain control with direct SurrealDB host authorization, built-in ACME certificate issuance, HTTPS termination, and HTTP-to-HTTPS redirect behavior
- Added `frps nova-check` for validating whether a host is active/enabled in SurrealDB from the public frps edge
- Added `frps nova-smoke` plus a bundled `frpc` smoke binary to create/update a test workspace domain, start a temporary workspace page, verify HTTP redirect, obtain/reuse HTTPS certificates, and validate the frp tunnel path through the public edge
- Updated [planning/2026-04-25-nova-domain-control-frp-plan.md](./planning/2026-04-25-nova-domain-control-frp-plan.md) to record the finalized standalone custom `frps` deployment model and edge smoke-test flow

### Added - Workspace Domain Settings

- Added Studio settings UI for each workspace's Nova-managed `*.dlx.studio` URL, custom domain requests, expected DNS records, and FRP domain-control endpoint placeholders at `https://domains.dlxstudios.com`
- Added authenticated placeholder Studio domain API routes for listing, adding, verifying, and removing workspace domains while the custom `frps` API is finalized

### Fixed - Workspace Checks

- Fixed the shared copy button disabled prop typing so chat message copy controls pass Svelte checks and forward disabled state correctly
- Tightened chat timeline artifact typing so artifact cards receive validated literal artifact kinds and statuses
- Isolated root sandbox API tests from app-only alias resolution and skipped SurrealDB template preflight tests unless explicit SurrealDB credentials are provided

### Added - Self-Hosted Runtime Lab

- Added a Studio `Runtime Lab` page for testing the new self-hosted K3s runtime control plane from inside Nova Studio
- Added an authenticated Studio runtime-lab API proxy that keeps the runtime-control token server-side while supporting status, start, exec, and delete actions
- Added runtime-control configuration documentation for `NOVA_RUNTIME_CONTROL_URL` and `NOVA_RUNTIME_CONTROL_TOKEN`

### Fixed - Runtime Lab E2E Polish

- Added the missing auth placeholder artwork so sign-in and sign-up pages no longer render a broken image during browser tests
- Suppressed non-blocking sidebar chat preload noise when background fetches fail during navigation or dev-server reloads
- Added SurrealDB connection timeouts for direct database calls and the Better Auth adapter so requests fail fast instead of hanging when the database is unavailable
- Bound the Vite dev server to `0.0.0.0` so Cloudflare tunnels targeting `127.0.0.1:8105` or the LAN address can reach Nova Cloud

### Added - Studio Files and Resumable Uploads

- Added background Studio file uploads with aggregate sidebar progress, cancel/retry controls, and refresh signals for completed uploads
- Added folder creation and recursive folder deletion for Studio files, including hidden folder markers and internal upload staging cleanup
- Added resumable chunked uploads with Surreal-backed upload sessions, IndexedDB queue persistence, refresh/reopen recovery, and cross-tab upload leases
- Switched resumable upload chunks to raw `application/octet-stream` binary bodies and removed the JSON/base64 chunk fallback

### Changed - Realtime Transport Completion

- Completed the Phase 7 realtime transport rollout so Studio runtime, overview, jobs, settings, integrations, and sidebar/layout freshness now reconcile through targeted refresh plus Studio-scoped SSE instead of broad reload/invalidation paths
- Added a dedicated `/api/app/sidebar-state` path and shared server sidebar-state resolver so the app layout can refresh the selected Studio shell independently of page-level loaders
- Added `studio.updated` and `integration.updated` Studio event kinds and wired Studio settings and integration mutations to publish them
- Hardened the Studio SSE endpoint against closed-stream enqueue crashes so disconnects no longer take down the dev server
- Fixed Studio integration seeding to use a per-Studio lock and duplicate cleanup, preventing duplicate integration records under concurrent access
- Fixed Studio integration enablement to update the correct Surreal record id and verified that enabling `User Auth` immediately appears in sidebar state on a fresh Studio

### Added - Studio Jobs and Unattended Scheduling

- Added a dedicated `Jobs` page under each Studio sidebar so users can create and manage recurring agent jobs outside the chat surface
- Added persisted `scheduled_job` records with plain-language schedule summaries, next-run tracking, last-run metadata, and last-error visibility
- Added a job editor dialog that lets users choose common schedule patterns such as every minute interval, daily time, or weekly day/time while seeing a readable summary of the schedule
- Added manual `Run now` job execution that starts a schedule-triggered agent run and records it in the same Studio chat/run history model
- Added Surreal-backed due-job claiming with `nextRunAt` and `lockedUntil` so scheduled jobs can be safely picked up once when they become due
- Added an authenticated internal scheduled-job runner endpoint plus a Cloudflare Worker cron poller configured to check for due jobs every minute
- Added `NOVA_CRON_SECRET` and `NOVA_APP_URL` configuration support for unattended scheduled-job execution

### Added - Chat Message Metadata Actions

- Added subtle relative timestamps to user and assistant messages using persisted `chat_message.createdAt` values when available
- Preserved timestamps for optimistic user and assistant messages while a run is streaming
- Added per-message copy controls in Studio chat:
  - user messages can copy the prompt text
  - assistant messages can copy text-only responses
  - assistant messages can copy a full readable turn summary including text, tools, runtime events, artifacts, and errors

### Fixed - Landing Auth State

- Fixed the landing page server auth check to use `event.locals.userId` so logged-in users see Dashboard actions immediately without a sign-in flash
- Fixed the auth layout redirect guard to use the same server-side user id state
- Updated logged-in landing page account CTAs to point at `/app/settings`

### Added - Artifacts, Jobs, and Studio Audit Trail

- Added a first-class Surreal-backed `artifact` persistence model for files, previews, generated outputs, and deploy outputs
- Wired file uploads/deletes and primary preview lifecycle changes into persisted artifact records
- Added a shared artifact card component and surfaced artifacts in the chat timeline, Studio runtime page, and Studio overview
- Promoted preview runtime events into inline artifact timeline rows so live streaming and reloads share the same visible output model
- Added Studio execution history backed by persisted chat run records, including trigger metadata for chat, direct, and scheduled runs
- Added a Studio job endpoint that can start immediate direct or scheduled-trigger agent runs using the same run/start path as chat
- Added a direct-task composer to the Studio overview so non-chat agent work appears in the same execution history
- Persisted successful Wrangler deploy/publish outputs as `deploy-output` artifacts and emitted live artifact events for deployment visibility

### Changed - Agent SDK Evaluation Gate

- Completed the Phase 6 SDK evaluation checkpoint in the planning tracker
- Recorded the current decision to keep the Vercel AI SDK/OpenRouter executor as the production path for now
- Documented `pi-coding-agent` as a future controlled spike candidate after a provider-neutral Nova `AgentEngine` adapter boundary exists
- Captured current SDK pain points, Pi evaluation notes, and the fallback strategy for a future feature-flagged engine experiment

### Changed - Runtime State, Limits, and Visibility

- Added a shared Studio runtime-state model so layout data, Studio overview, runtime pages, and `/api/sandbox` all derive from the same canonical statuses instead of hardcoded `idle` placeholders
- Expanded runtime state handling to support `idle`, `waking`, `active`, `paused`, `expired`, `unhealthy`, and `limit-reached`
- Added plan-driven runtime policy enforcement for active runtime caps, Studio run concurrency, run timeout windows, and tool-step caps
- Updated Free and Pro runtime copy to describe the guarded runtime/session differences more clearly
- Wired runtime tool actions to publish live runtime events into the active chat stream so start, reuse, stop, and preview changes appear inline during execution
- Added auto-refresh to the Studio runtime page while the runtime or primary preview is active, plus sync-status copy to reduce manual refresh/debug work

### Added - Run Recovery and Super Admin Controls

- Added a super-admin reconcile endpoint for chat runs with `reconcile`, `abort`, and `mark_failed` actions
- Exposed those recovery controls inside the existing chat debug sheet so stale or stuck runs can be reconciled without manual database edits

### Changed - Integration Capability Foundation

- Replaced page-local integration content with a shared capability catalog so integrations now have one source of truth for title, summary, docs URL, config fields, and next-step guidance
- Expanded Studio integration records with category, docs URL, summary, status metadata, configuration state, and missing-field reporting
- Added encrypted Studio-scoped integration configuration storage and config APIs, with masked secret handling and preserved secret values on blank resubmits
- Turned the integration route into a real configuration surface with secret-aware fields, save/refresh actions, and enablement flow
- Made agent tool availability Studio-aware: the agent now always gets `studio_integrations`, and provider-specific capability tools only exist when an integration is both enabled and configured

### Added - First Packaged Capability Pattern

- Added `User Auth` as the first packaged Studio capability
- Added provider-aware auth configuration fields for email/password plus optional Google, GitHub, and Facebook OAuth
- Added generated install guidance, env var requirements, provider health checks, and framework-specific setup snippets for Svelte, React, and Vue based on the saved Studio configuration

### Changed - Planning Tracker

- Expanded the agent chat/runtime planning tracker with later-phase realtime transport checkpoints
- Updated the tracker to mark Phase 2 and Phase 4 complete, including the first packaged capability pattern

### Changed - Phase 1 Chat Timeline and Shell Completion

- Unified active assistant turn rendering so assistant text, tool activity, runtime events, and error events render in one chronological path instead of splitting message parts and a detached trailing timeline
- Persisted streamed runtime and error events into assistant message parts for consistent in-order reload and inspection behavior
- Added inline queued, preparing, and running status rows for the active turn so run state remains visible even before tool or text output arrives
- Aligned the desktop composer shell to the same `max-w-3xl` conversation column as the chat content to remove the oversized prompt footprint on larger screens
- Switched the authenticated chat shell to `100dvh`, tightened the footer structure, added safe-area padding, and removed the `max-h-[100svh-2rem]` inset clamp that was causing dead vertical space on mobile
- Verified the mobile chat shell against a real authenticated chat route in an iPhone 14 viewport after creating a disposable local account and Studio

### Changed - Sidebar and Layout Freshness

- Made the sidebar prefer live `chatStore.chats` for current Studio previews after client load instead of relying only on the layout server snapshot
- Merged live chat-derived Studio chat counts and previews into the app sidebar data model so the selected Studio stays fresher without a hard refresh

### Fixed - Super Admin Debug Access and Inspection

- Fixed `isSuperAdmin()` to actually evaluate the current authenticated user's email from `event.locals.session.user.email` against `NOVA_SUPER_ADMIN_EMAILS` / `SUPER_ADMIN_EMAILS`
- Documented `NOVA_SUPER_ADMIN_EMAILS` in `.env.example`
- Expanded the existing chat debug sheet to include:
  - raw stored messages with persisted `parts`
  - persisted non-text event extraction
  - recent run records for the chat
  - latest run raw metadata including `streamKey`, `liveAttachable`, timestamps, and error state
  - current in-memory run-session snapshot when available
- Updated the agent chat/runtime tracker to mark Phase 1 complete and record the completed `3.a`, `3.b`, and `3.c` checkpoints

## [Unreleased] - 2026-04-06

### Added - Planning and Architecture

- Added [planning/26-04-06-nova-cloud-agent-chat-runtime-plan.md](./planning/26-04-06-nova-cloud-agent-chat-runtime-plan.md) to define the current-state audit, product principles, phased stabilization plan, sandbox/runtime direction, integrations direction, super-admin/debug direction, and the agent SDK evaluation gate for Nova Cloud

### Changed - Chat Persistence, Ordering, and UX Stability

- Preserved persisted assistant message `parts` including tool calls and tool results during initial page load instead of flattening them to plain text
- Restored persisted active-run lookup on chat page load so refresh can reattach to an in-flight run
- Deduplicated repeated tool timeline rows during stream replay or reattach and tightened active-run attachment logic
- Fixed stop handling so aborted runs reconcile local state immediately instead of waiting indefinitely for a terminal stream event
- Disabled the composer consistently while a run is active and kept the stop action visible during active execution
- Unified Studio chat creation through a shared client path, fixed the sidebar `New Chat` action, and invalidated layout data so new chats appear in the sidebar without a manual refresh
- Prevented stale same-chat loader payloads from overwriting optimistic local messages and live run state
- Fixed assistant/tool ordering so interleaved text and tool calls persist and render in chronological order instead of pushing tool calls to the bottom of the final assistant message

### Changed - Sandbox and Runtime Reliability

- Added per-user/per-Studio sandbox creation locking to prevent duplicate E2B sandbox creation during overlapping runtime requests
- Updated sandbox disconnect/expiry behavior to terminate E2B sandboxes instead of only marking them expired locally
- Hardened stale sandbox replacement by terminating recorded stale sandboxes before creating new ones

### Changed - Local SurrealDB Development Workflow

- Added `scripts/start-surreal.sh` and updated `vp run surreal:start` to prefer modern SurrealDB binaries, validate version compatibility, bind on `0.0.0.0:8000`, and use persistent SurrealKV storage under `./surreal/data`
- Added `vp run surreal:reset` to remove the local persistent database when a clean reset is needed
- Updated local ignore rules so persistent SurrealDB data is not committed
- Pinned `vp dev` and preview workflows to port `8105`

### Fixed - Surreal Bootstrap and Auth Initialization

- Added Better Auth tables (`user`, `session`, `account`, `verification`, `rateLimit`) to the Surreal bootstrap path
- Changed table bootstrap to be promise-backed and awaited from `hooks.server.ts` so first-request auth/session access no longer races schema initialization

## [Unreleased] - 2026-04-03

### Changed - SurrealDB Migration from Convex

**Migrated entire backend from Convex to SurrealDB for all persistence:**

- Added SurrealDB connection layer (`src/lib/server/surreal.ts`) with authenticated per-request client factory and `surreal-query.ts` typed query helpers
- Added Surreal-backed stores for studios, chats, chat runs, memory, plans, skills, integrations, sandbox, and runtime processes replacing all Convex query/mutation modules
- Added Better Auth integration with Surreal (`surreal-better-auth.ts`) for user/session management replacing Convex auth
- Added SurrealDB schema (`surreal/schema.surql`) with full table definitions for all Nova entities
- Added chat run executor (`src/lib/server/chat-run-executor.ts`) consolidating streaming execution into a single Surreal-backed pipeline
- Added `/api/surreal-auth/` routes for sign-up, sign-in, sign-out, and session management
- Added `/api/user-plans/` endpoint and `/api/chat-runs/start/` route migrated to Surreal backends
- Removed entire `src/convex/` directory including schema, generated types, and all query/mutation modules (studios, chats, chatRuns, memory, plans, skills, sandboxes, runtimeProcesses, embeddings, messages)
- Removed `src/lib/server/convex.ts` bridge and `/api/convex-mutation/`, `/api/sandbox/`, `/api/internal/chat-runs/[runId]/start/`, `/api/internal/runtime-tools/` routes
- Removed `_worker/index.js` and `worker.entry.js` Cloudflare worker entrypoints
- Updated `src/hooks.server.ts` auth flow to use Better Auth + Surreal session handling
- Updated all page server loads and API routes to query Surreal instead of Convex
- Updated agent tools (memory, skills, search-skills, use-skill, shell, filesystem, runtime) to resolve Surreal connection per-request
- Updated chat run registry and stream endpoints for Surreal-backed state
- Updated skill store, skill versions, skill executions, skill folders, and skill seeder to use Surreal queries
- Updated memory system (embeddings, index, types) for Surreal document storage
- Updated chat store and user store for Surreal-backed data access
- Updated `vite.config.ts`, `svelte.config.js`, `tsconfig.json` to remove Convex plugin, references, and types
- Updated `package.json` to replace `convex` dependency with `surrealdb` and remove Convex-related scripts
- Updated `wrangler.build.jsonc` to remove Convex-related bindings
- Updated `src/lib/studios/types.ts` and `src/lib/studios/constants.ts` for Surreal record ID format
- Added `.env.example` for SurrealDB connection variables
- Added SurrealDB connection and CRUD pattern tests
- Added Vite+ pre-commit hook and VSCode workspace settings
- Added E2B template and streaming fix plan document
- Added SurrealDB migration tracker document
- Cleaned up 12K+ lines of stale embedding data from `data/memory.json`

## [Unreleased] - 2026-03-27

### Fixed - Surreal Runtime and Local E2E Stability

- Replaced failing Convex-dependent Studio and Chat API paths with Surreal-backed handlers so Studio creation and chat persistence work in local dev without Convex runtime dependencies
- Stabilized Better Auth + Surreal adapter behavior for local signup/session flows and removed blocking `/api/auth/get-session` path mismatches from active auth usage
- Added table/bootstrap resilience for `integrations`, `chat`, and `chat_message` access paths to prevent `/app` hard-failures while local Surreal state is being initialized
- Verified local browser E2E path on `http://localhost:8105` through auth, Studio creation, chat open, and message send flow

### Fixed - Server Auth, Studio Routing, and Run Lifecycle

- Centralized auth gating in `hooks.server.ts` and auth route loaders so landing, sign-in, sign-up, and `/app` redirects now run server-side from `event.locals.token` instead of duplicating cookie/client checks
- Fixed Studio-scoped layout data to follow the route `studioId` first and refresh sidebar/chat context correctly when switching Studios
- Hardened `chatRuns` against lingering active state by recovering stale or already-completed runs, guarding status transitions, resuming queued/preparing runs after reload, and clearing client stream/poll state when runs finish
- Added server-side stop handling with abort propagation so stopping an active run cleanly ends execution and stream cleanup

### Added - Chat Debugging and Execution Controls

- Added super-admin allowlist support plus an internal debug-context endpoint and in-app inspector sheet for viewing the assembled system prompt, messages, memories, skills, and tools for a chat run
- Added shared chat-context assembly helpers so run execution and debug inspection use the same prompt/tool construction
- Added a default 20-step cap for active runs and reused-run safeguards so duplicate sends no longer drift away from the real active run

### Changed - Chat UX Simplification

- Simplified the chat run UI into a more compact ChatGPT-style layout with inline timeline items, shorter thinking states, and cleaner assistant message presentation
- Removed obsolete chat-first files and dead chat UI/store code that was no longer referenced after the run-based flow migration

### Changed - Studio Plans and Customization

- Added plan configuration and `userPlans` persistence for Free/Pro Studio limits and runtime policy metadata
- Added richer Studio creation and settings flows with purpose-based palettes, theme hue customization, Studio updates/deletion, and surfaced plan controls in the Studio settings UI
- Updated sandbox persistence to store template IDs and use plan-based runtime timeouts, and added placeholder `/api/billing` scaffolding for future checkout/portal/webhook integration

### Fixed - Runtime Tool Path Handling

- Added `normalizeCwd` and `normalizePath` helpers to correctly resolve relative and absolute paths in runtime shell, filesystem, scaffolding, and dev server tools
- Switched `runtime_vite_create` and `runtime_svelte_create` tools to call the sandbox directly instead of delegating through the shell tool wrapper, ensuring consistent sandbox resolution and event recording
- Fixed dev server start tool to use normalized cwd paths

### Changed - Studio Runtime and Preview Workflows

- Refactored Nova chat execution to treat the Studio runtime as on-demand instead of eagerly creating or reconnecting a sandbox for every message
- Added lazy runtime-backed tools including explicit lifecycle controls (`runtime_status`, `runtime_start`, `runtime_stop`) and dedicated wrappers for browser, scraping, docs, and Cloudflare workflows
- Added structured scaffolding and preview tools for `vp`, `sv`, one primary Studio dev server, preview status, and dev log retrieval
- Added `studioRuntimeProcesses` persistence in Convex so each Studio can track a single primary preview/dev server with command, pid, port, preview URL, and recent logs
- Added Studio runtime controls to the UI with wake/sleep/refresh actions, a dedicated runtime page, preview metadata panels, and direct preview log / stop actions
- Added runtime engagement metadata to `chatRuns` and live runtime stream events so chat execution can distinguish runtime lifecycle activity from normal tool usage
- Updated system prompt/runtime guidance to describe Studio runtime access as lazy and tool-driven rather than unconditional computer access
- Refreshed E2B template usage so Nova points at the custom `nova-bun-agent` template with preinstalled Bun, Node.js, Deno, Python, Go, Wrangler, Vite+, Svelte CLI, and web tooling

### Changed - Chat Runs Architecture

- Replaced transient streaming delta persistence with durable Convex-backed `chatRuns` lifecycle records and removed the `streamingDeltas` table/module
- Switched chat delivery from `/api/chat/stream` to a run-based flow with start, attach, and internal execution endpoints for live reattachment support
- Updated the chat page and store to surface active run state, background execution, live stream status, and tool activity details in the UI
- Added server-side run registry and Convex bridge endpoints to coordinate live streaming and run status queries across the new architecture
- Updated the chat persistence plan document to reflect the run-based orchestration design and migration steps

### Changed - Studios Documentation and IA Planning

- Added `planning/STUDIOS_INFORMATION_ARCHITECTURE_PLAN.md` as the canonical reference for Nova's Studio-first app shell, sidebar model, onboarding, routing, and migration strategy
- Updated `AGENTS.md` to define `Studio` as the user-facing top-level concept, document dynamic `Integrations` in the sidebar, and reference the required Svelte skills for Studio UI work
- Rewrote `README.md` to describe Nova Cloud's Studio-first architecture, runtime model, skills, and Integrations instead of the default Svelte starter content
- Aligned `planning/NOVA_CLOUD_PRODUCT_AND_BUSINESS_PLAN.md` terminology around Studios for user-facing product framing while preserving technical sandbox references where needed

### Changed - Studio Shell Implementation

- Added first-class `studios` and `extensions` data models, Studio-scoped chat relationships, and Studio-aware sandbox linkage in Convex
- Reworked the authenticated app shell so `/app` acts as a Studio-first dashboard with Studio selection persistence and free-plan Studio limits
- Replaced the chat-first sidebar model with a Studio-first sidebar that surfaces dynamic `Integrations` for the selected Studio
- Upgraded the Studio overview and Integration routes into real product surfaces with runtime, chat, and capability context
- Moved conversation navigation onto Studio-scoped URLs and removed remaining legacy `/app/chat/[id]` compatibility routing from the main product flow
- Reset the Convex dev database to a clean state after the Studio model and routing migration

### Fixed - Studio Routing Follow-up

- Fixed the Studio overview loader to return `studioPlan` and the full integration set so the overview page no longer crashes when rendering plan or suggested Integration sections
- Fixed Studio chat creation to return a consistent `{ id }` payload from `/api/chats`, preventing navigation to `/chat/undefined`
- Added invalid Studio chat route handling so broken or missing chat ids render a safe fallback instead of throwing a server-side validator error

### Added - Chat, Auth, and Sandbox Infrastructure

- Added Convex-backed sandbox lifecycle storage with new `sandboxes` table and server helpers for reconnect, expiry tracking, and teardown
- Added server-side auth guards for landing and sign-in pages to redirect authenticated users into the app
- Added streaming delta persistence support with new Convex modules for files, sandboxes, and streaming chat chunks
- Added server routes and auth plumbing for chat streaming, sandbox management, login/logout flows, and request-scoped session handling
- Added deployment/runtime assets including sandbox Dockerfiles, worker entrypoints, and Cloudflare loader/stub integration files
- Added project planning notes, visual test artifacts, and screenshots captured during the implementation work

### Changed - Agent Tools and Chat Runtime

- Refactored agent tools to accept sandbox and token-driven dependencies so shell/filesystem execution and Convex-backed tools can run in the new streaming path
- Updated chat state handling to stream assistant responses from `/api/chat/stream`, refresh same-chat state correctly, and surface expired sandbox sessions to the UI
- Updated sandbox orchestration to persist session state in Convex instead of relying on in-memory caching alone
- Updated SvelteKit config to expose the expected server environment setup for the new backend flow

### Fixed - Message Persistence

- Fixed chat message persistence to derive plain-text content from message parts when direct content is missing
- Fixed skill and memory tools to fail gracefully when Convex auth is unavailable instead of throwing during tool creation

### Changed - UI/UX and Cleanup

- Refactored chat run status UI to appear inline within the assistant's message bubble instead of a top banner for a cleaner look
- Removed obsolete Cloudflare Sandbox worker export (`_worker/index.js`) and dev script (`dev:fast`)
- Added auth load functions for landing and sign-in pages to protect routes server-side

### Changed - E2B Migration

**Migrated from Cloudflare Sandbox to E2B for code execution:**

- Replaced `@cloudflare/sandbox` with `e2b` package
- Rewrote `src/lib/server/sandbox.ts` to use E2B SDK (`Sandbox.create()`, `sandbox.commands.run()`, `sandbox.files.*`)
- Updated agent tools for E2B API:
  - `src/lib/agent/tools/shell.ts` - uses `sandbox.commands.run()`
  - `src/lib/agent/tools/filesystem.ts` - uses `sandbox.files.read/write/list/makeDir/remove()`
- Created custom E2B template (`nova-bun-agent`) with Bun + s3fs for R2 mounting
- Removed Cloudflare container/DO bindings from `wrangler.jsonc` and `wrangler.build.jsonc`
- Removed `@cloudflare/sandbox` stub from `vite.config.ts`

### Fixed - Development Workflow

- Changed `dev` script from full build + wrangler to `vite dev` for HMR on port 5173
- Deleted obsolete scripts (`scripts/dev-fast.js`, `scripts/add-sandbox-export.js`)

### Fixed - Environment Variables

- Fixed `import.meta.env.PUBLIC_CONVEX_URL` to use `$env/static/public` in:
  - `src/lib/agent/tools/memory.ts`
  - `src/lib/agent/tools/skills-tool.ts`
  - `src/lib/agent/tools/use-skill-tool.ts`
  - `src/lib/agent/tools/search-skills-tool.ts`
  - `src/routes/api/primitives/full-chat-app/+server.ts`
  - `src/routes/(app)/app/chat/[id]/+page.server.ts`

### Fixed - Bugs

- Fixed Convex `_id` vs `id` field mapping in `src/lib/nova/chat/chat-store.svelte.ts` (caused Svelte `each_key_duplicate` error)
- Migrated All Chats page (`src/routes/(app)/app/chats/+page.server.ts`) from local JSON file to Convex for consistency

### Added

- E2B credentials configuration in `.env.local`
- Custom E2B template definition in `e2b/template.ts`
- Template build script in `e2b/build.ts`
- E2B integration documentation in `planning/e2b-integration.md`
