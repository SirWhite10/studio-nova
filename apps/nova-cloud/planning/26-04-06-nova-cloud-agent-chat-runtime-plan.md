# Nova Cloud Agent Chat Runtime Plan

**Document Name:** `26-04-06-nova-cloud-agent-chat-runtime-plan.md`  
**Version:** 1.1  
**Date:** April 6, 2026  
**Last Updated:** 2026-04-22 09:20:53 EDT

## Execution Tracker Rules

This document also acts as the implementation tracker for the remaining Nova Cloud work.

### How To Use This File

- Each checkpoint has a stable ID such as `1.a`, `3.c`, or `5.b`.
- Each checkpoint should be marked as one of:
  - `[ ]` not started
  - `[-]` in progress
  - `[x]` completed
  - `[!]` blocked
- When a checkpoint changes state, append a timestamp note directly beneath it.
- If work stops mid-feature, update only the affected checkpoint and add a short resume note.
- Do not rename checkpoint IDs once they exist. Add new suffixes if more breakdown is needed.

### Resume Rule

If an agent must stop due to limits, time, or blockers:

- mark the exact checkpoint status
- add the last meaningful change made
- add the next concrete step
- add any blocking file paths, routes, or APIs involved

This is intended to let the next agent continue without rediscovery work.

## 1. Purpose

This document defines the near-term stabilization plan and medium-term architecture plan for Nova Cloud's Studio-scoped agent experience.

The goal is not just to make chat work reliably. The goal is to make Nova Cloud feel like a modern, persistent, agent-driven workspace where a user can create sites, dashboards, automations, and client deliverables without writing code.

This plan covers:

- chat streaming and event ordering
- Studio runtime and sandbox lifecycle
- persisted history and artifact visibility
- super-admin debugging and observability
- integrations architecture
- agent SDK evaluation criteria

## 2. Product Principles

Nova Cloud should follow these principles:

- The user should not need to code.
- A Studio is the user's persistent workspace.
- Chat is the command surface and audit trail, not just a message thread.
- A sandbox is execution infrastructure, not the primary product surface.
- Integrations should feel like installable capabilities, not engineering work.
- The runtime should be visible, understandable, and controllable.
- Every meaningful agent action should be inspectable in chronological order.
- Persisted state should survive refresh, reconnect, process restart, and local power loss where possible.

## 3. Current State Audit

### Implemented or Partly Implemented

- Studio-scoped chats and Studio-first routing
- SurrealDB-backed persistence for chats, messages, chat runs, studios, and related entities
- Surreal-backed Better Auth integration
- persisted assistant `parts` with tool-call and tool-result support
- run-based streaming with start, attach, stop, and reload flows
- basic active-run recovery and stop/reconcile handling
- E2B-backed sandbox creation and reuse
- one-sandbox-per-Studio protection via server-side creation locking
- persistent local SurrealDB startup scripts for development
- integrations scaffold and Studio integration navigation
- skills and memory direction already present
- super-admin support already exists in part for chat context inspection

### Scaffolded but Incomplete

- integration install/config UX
- integration execution model and per-integration lifecycle
- artifact surfacing in chat and Studio UI
- runtime history, previews, and process visibility
- scheduled agent jobs / cron UX
- deployment/publish UX
- richer admin/debug tooling beyond prompt/context inspection
- no-code configuration flows for packaged capabilities like auth providers

### Known Regressions or Recent Fix Areas

- chat refresh persistence for tool-call history
- duplicate tool rows during stream replay / reattach
- active-run UI drift and stop-state reconciliation
- sidebar and chat-store synchronization
- same-chat loader data clobbering live optimistic state
- assistant/tool chronological ordering within a single turn
- local Surreal bootstrap and auth table initialization
- sandbox duplication caused by concurrent creation races

## 4. Already Completed Foundations

The following foundation work has already happened and should be treated as the baseline for future implementation:

- migration from Convex-backed persistence to SurrealDB-backed persistence
- move to run-based chat execution and reattachable streams
- improved assistant `parts` persistence and reconstruction
- stop handling and stale-run reconciliation improvements
- composer disable/stop UX tied to active runs
- persistent local SurrealDB runtime with reset/start scripts
- SurrealDB version compatibility checks in local startup
- auth/session bootstrap table creation for fresh Surreal databases
- per-Studio sandbox creation locking and sandbox termination on disconnect/expiry
- sidebar and chat creation fixes using a shared client creation path
- guard against stale same-chat loader snapshots overwriting live runs
- chronological streaming fixes for interleaving text and tool calls

## 5. Core Problems Still To Solve

### Chat and Timeline

- The chat still behaves like a message UI with tool state bolted on, instead of one unified event timeline.
- Tool calls, tool results, runtime events, text segments, and future artifacts are still represented through overlapping UI mechanisms.
- Reload and live-stream behavior are more reliable than before, but the architecture remains fragile because server snapshot data and client live state still have separate responsibilities.

### Layout and UX

- Desktop chat width is imbalanced because the composer and message column do not consistently share the same layout width.
- Mobile chat shell has bottom spacing/safe-area issues that are likely caused by container layout rather than the prompt component alone.
- Runtime and agent state are not yet surfaced as clearly as users expect from modern agent products.

### Runtime and Limits

- Sandbox limits and quota behavior are not yet productized.
- Runtime state is not yet treated as a first-class timeline and control surface.
- Background execution and queued work need clearer handling when runtime capacity is constrained.

### Integrations and No-Code Outcomes

- Integrations exist as scaffolding, but not yet as a complete capability system for end users.
- Users need packaged capabilities like auth, payments, CRM, shipping, and social workflows to feel like products they enable, not code they wire up.

## 6. Target Architecture

Nova Cloud should converge on the following model:

- SurrealDB is the source of truth for persisted Studio state, runs, messages, artifacts, integrations, and automations.
- The client store should only own transient live state for the currently open chat/run.
- Each assistant turn should be persisted and rendered as a chronological event sequence.
- A Studio should own:
  - chats
  - runtime
  - files
  - integrations
  - artifacts
  - deployments
  - automations
  - memory
- The sandbox should be treated as a reusable execution resource attached to a Studio, not as the user-facing abstraction.

## 7. Chat and Timeline Model

The chat experience should move toward a single ordered timeline model.

### Timeline Event Types

- user-message
- assistant-text
- assistant-thinking
- tool-call
- tool-result
- runtime-event
- file/artifact-created
- preview-available
- deployment-event
- memory-event
- automation-event
- error-event

### Requirements

- strict chronological ordering
- same ordering during live stream and after reload
- no separate "bottom tool area" detached from the turn timeline
- clear inline statuses for queued, running, thinking, using tool, waiting on runtime, and completed
- each assistant turn remains visually open until the run completes
- support for future artifact cards and preview cards inline in the same timeline

### UI Direction

- align composer width with the conversation column on desktop
- tighten desktop whitespace and reduce width mismatch
- fix mobile safe-area and bottom padding at the page-shell level
- present runtime state inline when it affects the run
- keep the stop action visible and reliable throughout active execution

## 8. Sandbox and Runtime Lifecycle

Nova Cloud should keep one reusable sandbox per Studio while it is healthy and within policy.

### Desired Runtime States

- idle
- waking
- active
- paused
- expired
- unhealthy
- limit-reached

### Runtime Policy Direction

- reuse a warm Studio sandbox when possible
- avoid expiring immediately after each request
- terminate stale or explicitly stopped sandboxes
- queue or reject work clearly when capacity is reached
- surface runtime health and state in both Studio runtime UI and chat timeline

### Limits To Add

- per-account active runtime limits
- per-account monthly runtime budget
- per-Studio runtime concurrency limits
- per-run duration and tool-step caps
- clear upgrade or billing messaging when limits are hit

## 9. Super-Admin and Debugging

Super-admin support should remain explicit and environment-driven.

### Required Access Model

- allowlist by email, for example `sir@dlxstudios.com`
- env-driven configuration, such as `SUPERADMIN_EMAILS` or `NOVA_DEBUG_EMAILS`

### Required Debug Surfaces

- raw persisted message parts
- raw run event sequence
- tool inputs and outputs
- runtime and sandbox identifiers
- run/session ids and timestamps
- message reconstruction diagnostics
- stale-run reconciliation actions
- visibility into resolved integrations and tool availability

### Current State

- super-admin support already exists in part for context inspection
- admin/debug visibility should be expanded into a durable operator workflow

## 10. Integrations Architecture

Integrations should become packaged capabilities that a user enables and configures without code.

### Near-Term Model

- one integration record per Studio capability
- Studio settings for credentials and enabled providers
- server-side tool availability derived from enabled integrations
- chat/runtime surfaces that explain what capabilities are available

### Product Direction

Examples:

- User Auth
- Stripe / payments
- inventory and shipping
- CRM
- social publishing and analytics
- scheduling and meetings

The long-term user experience should be:

- user installs a capability
- user enters required credentials or chooses packaged options
- Nova exposes that capability through chat, runtime, and generated output
- billing can map to usage or packaged limits without requiring code changes by the user

## 11. Agent SDK Decision Gate

Nova Cloud currently uses the Vercel AI SDK. There is interest in evaluating `pi-coding-agent` because of OpenClaw-style coding-agent behavior and stronger tool/session patterns.

This should remain a decision gate, not an assumed migration.

### Why It Is Not Phase 1

- the current biggest problems are event modeling, persistence, runtime lifecycle, and UI state synchronization
- those problems would survive an SDK swap if the architectural model remained fragmented

### Evaluation Criteria

- resumable session support
- richer event bus for chronological timeline rendering
- multi-step tool loop control
- better sandbox-bound tool composition
- branching or forking if needed for Studio workflows
- operational complexity and maintenance burden
- compatibility with Nova Cloud's Svelte UI and persistence model

### Decision Rule

Do not commit to migration until:

- timeline persistence is stable
- runtime state and limits are clear
- super-admin debugging is sufficient to compare agent behavior
- integration/tool boundaries are defined

## 12. Phased Implementation Plan and Checkpoints

### Phase 1: Stabilize Chat and Timeline

[x] `1.a` Persisted event ordering audit
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-07 00:10:44 EDT: audited the current assistant-turn persistence/render path and confirmed the remaining split was between `msg.parts` and transient runtime/error timeline state
  Definition of done:
- confirm all currently persisted assistant `parts` are chronological during stream and reload
- identify any remaining event types still not represented in-order
  Resume notes:
- focus files likely include `src/lib/server/chat-run-executor.ts`, `src/lib/nova/chat/message-parts.ts`, and `src/lib/nova/chat/chat-store.svelte.ts`

[x] `1.b` Single-turn chronological timeline model
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-07 00:10:44 EDT: moved runtime/error stream events into assistant message parts and switched chat rendering to one chronological assistant-entry path instead of merging a separate trailing timeline
  Definition of done:
- assistant text, tool calls, tool results, runtime events, and future artifacts render in one ordered sequence
- no special-case "tool area at bottom" behavior remains
  Resume notes:
- if blocked, continue by defining the canonical event shape before further UI work

[x] `1.c` Remove remaining client/store/server drift
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-07 00:10:44 EDT: reduced drift by making the sidebar prefer live `chatStore.chats` for the current Studio after loading client chat data, but the broader layout snapshot versus client-store split still needs one more pass
- 2026-04-07 08:40:55 EDT: moved sidebar Studio summaries onto live chat-store-derived chat counts and previews after first client load, which removes the main stale-sidebar drift path for current use
  Definition of done:
- same-chat reloads cannot clobber live optimistic state
- sidebar/chat/store/server data flow is explicit and minimal
- active run state has one clear owner for live updates
  Resume notes:
- likely touch `+layout.server.ts`, layout/sidebar state, and chat store synchronization boundaries

[x] `1.d` Desktop chat shell width pass
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-07 00:10:44 EDT: aligned the composer shell to the same `max-w-3xl` column as the conversation and removed the oversized large-screen prompt footprint
  Definition of done:
- composer width matches the conversation column on large screens
- no visually oversized prompt region relative to message area
  Resume notes:
- inspect page shell and parent layout containers first, not just prompt component internals

[x] `1.e` Mobile safe-area and bottom spacing pass
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-07 00:10:44 EDT: changed the chat shell to `100dvh`, tightened footer structure, and applied explicit safe-area padding, but this still needs real mobile viewport verification
- 2026-04-07 08:40:55 EDT: removed the `max-h-[100svh-2rem]` clamp from the authenticated app inset, which was a likely source of dead vertical space, but real browser/device verification is still pending because no local app server was running for automation
- 2026-04-07 08:46:21 EDT: verified the authenticated chat route on an iPhone 14 mobile viewport using browser automation after creating a disposable local account and Studio; composer placement and bottom spacing now look correct in the live app
  Definition of done:
- composer sits correctly at the bottom on mobile
- no unexplained bottom gap from shell padding/inset/safe-area mismatch
  Resume notes:
- test actual device viewport behavior before finalizing

[x] `1.f` Inline runtime and active-run status improvements
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-07 00:10:44 EDT: added inline queued/preparing/running status rows for the active assistant turn and kept active-run state visible without relying on a detached tool section
  Definition of done:
- queued, preparing, running, waiting on runtime, and stopped states are visible inline in the active turn
- stop action remains legible and reliable

### Phase 2: Runtime and Sandbox Productization

[x] `2.a` Runtime state model finalization
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-07 09:03:41 EDT: introduced a shared `runtime-state` mapper with canonical statuses (`idle`, `waking`, `active`, `paused`, `expired`, `unhealthy`, `limit-reached`), wired layout/studio/runtime loaders and `/api/sandbox` to use it, and updated the Studio overview/runtime UI to consume derived runtime labels and action affordances instead of raw sandbox strings
  Definition of done:
- runtime states are explicitly defined and surfaced consistently: idle, waking, active, paused, expired, unhealthy, limit-reached

[x] `2.b` Sandbox limits and quota policy
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-07 09:07:15 EDT: added a shared runtime policy module with plan-specific sandbox/session/run/tool-step limits, enforced active-runtime caps during sandbox start, enforced one active run per Studio at chat-run start, made run timeout and tool-step caps policy-driven, and updated plan copy to describe the guarded free/pro differences
  Definition of done:
- per-account, per-Studio, and per-run limits are defined in code and product copy
- blocked work has a clear user-visible reason

[x] `2.c` Runtime state visibility in Studio and chat
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-07 09:09:21 EDT: completed the shared Studio/runtime UI mapping in loaders and pages, and wired runtime tool actions to publish live `runtime` chunks by `runId` into the chat stream so start/reuse/stop/preview state is visible inline during agent execution
  Definition of done:
- runtime events appear both in Studio runtime UI and chat timeline when relevant

[x] `2.d` Preview and process visibility
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-07 09:10:12 EDT: added runtime-page auto-refresh while the runtime or primary preview is active, plus focus/visibility-triggered refresh and sync status copy, so preview/process state updates without manual refresh or log chasing
  Definition of done:
- users can see active preview/process state without needing manual refresh or log digging

### Phase 3: Super-Admin and Observability

[x] `3.a` Verify current super-admin implementation
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-07 08:46:21 EDT: audited the current implementation and confirmed that the UI/debug surface already exists via `Inspect context`, `ChatDebugSheet`, and `/api/internal/chats/[chatId]/debug-context`, but the email allowlist path was broken because `isSuperAdmin()` never checked the current user's email
  Definition of done:
- document exactly what already works today
- confirm current env/config path and active UI/debug surfaces
  Resume notes:
- do this before adding new admin/debug code

[x] `3.b` Formalize env-driven super-admin allowlist
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-07 08:46:21 EDT: wired `isSuperAdmin()` to `event.locals.session.user.email`, kept support for `NOVA_SUPER_ADMIN_EMAILS` and `SUPER_ADMIN_EMAILS`, and documented `NOVA_SUPER_ADMIN_EMAILS` in `.env.example`
  Definition of done:
- explicit email-based allowlist exists and is documented
- `sir@dlxstudios.com` can access the required debug surfaces in development and intended deploy targets

[x] `3.c` Raw run/message inspection surface
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-07 08:49:25 EDT: expanded the existing debug payload and sheet to include raw stored messages, persisted non-text events, recent run records, latest run raw metadata including stream key and error state, and the current in-memory run-session snapshot when available
  Definition of done:
- super-admins can inspect raw message parts, run events, ids, timestamps, and sandbox references

[x] `3.d` Recovery and reconciliation tools
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-07 08:55:33 EDT: added a super-admin reconcile endpoint for `reconcile`, `abort`, and `mark_failed` actions and exposed those controls directly in the chat debug sheet so stale or stuck runs can be synchronized or force-closed without manual database edits
  Definition of done:
- super-admins can safely reconcile stale runs or inspect why a run got stuck

### Phase 4: Integrations as Capabilities

[x] `4.a` Audit current integrations scaffold
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-07 11:11:18 EDT: audited the current integration path and confirmed that integrations are persisted per Studio and can be enabled for sidebar/navigation, but credential storage, provider auth, runtime/tool gating, and activity/configuration surfaces are still missing
  Definition of done:
- document what is already scaffolded versus missing for integration install/config/run behavior

[x] `4.b` Define capability model
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-07 11:11:18 EDT: replaced hardcoded per-page integration content with a shared capability catalog and expanded integration records to include category, summary, docs URL, and status metadata so integrations now map to user-facing capability definitions instead of raw sidebar links
  Definition of done:
- integrations map cleanly to user-facing capabilities rather than raw tool bundles

[x] `4.c` Credentials and configuration UX
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-07 11:19:43 EDT: added secret-aware capability field definitions, encrypted Studio-scoped integration config storage, config GET/POST APIs, and a real integration page form that can save credentials and non-secret defaults while masking stored secret values
  Definition of done:
- Studio owners can configure credentials/providers without code

[x] `4.d` Tool availability derived from enabled integrations
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-07 11:25:38 EDT: made the Studio integration state resolvable as enabled/configured metadata, switched the agent tool builder to async Studio-aware resolution, added an always-available `studio_integrations` discovery tool, and now expose provider-specific capability tools only when that integration is both enabled and configured
  Definition of done:
- agent/runtime tool availability reflects installed and configured capabilities

[x] `4.e` First packaged capability pattern
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-08 02:00:56 EDT: introduced `User Auth` as the first packaged Studio capability with provider-aware config requirements, encrypted credential storage, generated install/env guidance, and framework-specific setup snippets for Svelte, React, and Vue based on the saved configuration
  Definition of done:
- at least one capability such as User Auth has a reusable install/config/use pattern

### Phase 5: Artifacts, Jobs, and Automation

[x] `5.a` Artifact event model
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-08 02:06:28 EDT: added a first-class `artifact` table and persistence helpers, then wired existing file uploads/deletes and primary preview lifecycle updates to create or update persisted file/preview artifacts so Studio outputs are no longer represented only by storage or runtime-process tables
  Definition of done:
- files, previews, generated assets, and deploy outputs have a first-class persisted representation

[x] `5.b` Artifact cards in timeline and Studio UI
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-08 02:12:33 EDT: added a shared artifact card component, surfaced persisted preview artifacts on the runtime page, surfaced recent Studio artifacts on the Studio overview, and promoted live/persisted preview runtime events into inline artifact rows in the chat timeline so artifact visibility now follows the same event model instead of a separate footer
  Definition of done:
- artifacts surface both in the chat timeline and outside the chat where appropriate

[x] `5.c` Cron/direct job history
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-08 02:14:06 EDT: added a Studio execution-history surface backed by persisted `chat_run` records, including trigger metadata and recent run cards on the Studio overview, so direct agent work is now inspectable; scheduled jobs still need a real trigger/persistence path before this checkpoint can be completed
- 2026-04-08 03:03:12 EDT: extracted chat-run startup into a shared server helper, added a Studio job endpoint that can start immediate `direct` or `schedule` triggered runs, and added a Studio overview direct-task composer so non-chat agent work flows into the same persisted execution-history surface; future cron scheduling can call the same endpoint/model rather than inventing a separate history path
- 2026-04-10 17:45:53 EDT: added a dedicated Studio `Jobs` page in the sidebar with persisted `scheduled_job` records, a plain-language schedule editor dialog, manual `Run now` invocation, and recent scheduled-run history, so recurring work is now a first-class Studio surface instead of an implementation detail
- 2026-04-10 17:45:53 EDT: added unattended scheduled-job execution using Surreal-backed due-job claiming (`nextRunAt`, `lockedUntil`, `lastRunAt`, `lastRunId`, `lastError`), an authenticated internal due-job runner endpoint, and a Cloudflare Worker cron poller that posts into the app once per minute, so enabled jobs can run without an open browser tab
  Definition of done:
- users can inspect agent work triggered by schedule or direct background task

[x] `5.d` Deployment and publish flow visibility
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-08 02:15:55 EDT: wired successful Wrangler deploy/publish commands into persisted `deploy-output` artifacts and live runtime artifact events, so deployment outputs now surface through the existing Studio recent-artifacts view and inline chat timeline instead of being lost in raw command output
  Definition of done:
- publish/deploy states and outputs are visible as part of the Studio audit trail

### Phase 6: SDK Evaluation Gate

[x] `6.a` Capture current SDK pain points from stabilized architecture
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-08 03:18:44 EDT: audited the stabilized executor/tool path and confirmed the remaining SDK pain points are now narrower: the executor is still coupled directly to Vercel AI SDK `fullStream` event shapes, persisted assistant parts are manually reconstructed, tool definitions are AI SDK `ToolSet`-shaped, there is no native tree/branch/compaction/session model beyond Nova's Surreal chat/run tables, and message queue/steering behavior remains product-owned rather than SDK-owned
  Definition of done:
- list only the issues that remain after phases 1 through 4 have reduced architecture noise
  Findings:
- current stack strengths: `ai`/Vercel AI SDK keeps OpenRouter model use simple, tool streaming is already bridged into Nova's SSE/run registry, and recent event/artifact/runtime fixes prove Nova can own the timeline model without an SDK swap
- current stack limits: no native coding-agent session tree, no built-in branch/fork/compact workflow, no built-in Studio/sandbox-aware tool lifecycle, no built-in event persistence, and no message queue semantics comparable to terminal coding agents
- important distinction: current remaining pain is mostly an adapter-boundary problem, not proof that the model SDK is the blocker

[x] `6.b` Evaluate `pi-coding-agent` against Nova-specific requirements
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-08 03:18:44 EDT: evaluated `@mariozechner/pi-coding-agent` from the current npm metadata and upstream README; latest npm version is `0.65.2` as of 2026-04-06, and the upstream README describes SDK/RPC embedding, JSONL tree sessions, branching/forking, compaction, prompt templates, skills, extensions, transport options, and package-based extension points
  Definition of done:
- compare event model, session model, tool composition, and maintenance cost against current stack
  Findings:
- event model: Pi appears stronger for rich coding-agent event/session semantics, but Nova already has a server-owned SSE/run registry and Surreal-backed timeline; adopting Pi would still require mapping Pi events into Nova's persisted `parts`, artifacts, runs, and admin/debug surfaces
- session model: Pi's JSONL tree sessions, `/tree`, `/fork`, and compaction are stronger than Nova's current linear chat history; however, Nova needs multi-tenant Surreal persistence, Studio ownership, super-admin inspection, billing boundaries, and E2B sandbox scoping, so Pi's default file session model cannot be used as-is
- tool composition: Pi extensions/skills/tools are promising for OpenClaw-style workflows, but Nova already has Studio-aware tool gating, encrypted integration config, runtime limits, and sandbox locking; a migration would need an adapter that binds Pi tools to Nova's existing permission/runtime/integration model instead of exposing Pi package execution directly
- maintenance cost: package is active and purpose-built, but a direct migration would add a large new agent runtime surface and security review; Pi packages/extensions run code and would need explicit Nova policy before third-party package support is allowed
- product fit: Pi is worth a controlled spike for future coding-agent quality, especially session branching and compaction, but it should not replace the current executor until Nova has an engine adapter and parity tests

[x] `6.c` Migration decision
Timestamp:

- 2026-04-07 00:02:55 EDT: checkpoint created
- 2026-04-08 03:18:44 EDT: decision recorded: stay on the current Vercel AI SDK/OpenRouter executor for the production path, do not install or migrate to `pi-coding-agent` yet, and make the next architecture step an internal agent-engine adapter boundary so a future Pi spike can run behind a feature flag without rewriting chat persistence, runtime limits, integrations, artifacts, or admin tooling
  Definition of done:
- explicit decision recorded: stay on current SDK, hybridize, or migrate
- if migrate, define fallback/feature-flag plan
  Decision:
- current production engine: keep Vercel AI SDK/OpenRouter
- future spike: allow a feature-flagged alternate engine such as `NOVA_AGENT_ENGINE=pi` only after an internal engine interface exists
- fallback plan if Pi spike proceeds later: `NOVA_AGENT_ENGINE=vercel` remains the default and rollback path
- next prerequisite before any SDK migration: define a provider-neutral `AgentEngine` interface that emits Nova timeline events and accepts Nova's Studio-scoped tool/runtime context, then adapt the current executor to that interface first

### Phase 7: Realtime Transport Architecture

[x] `7.a` Audit current realtime transport paths
Timestamp:

- 2026-04-07 09:12:14 EDT: checkpoint created
- 2026-04-13 07:06:09 EDT: audited the current transport split from real call sites; chat runs attach to `/api/chat-runs/[runId]/stream` over custom server SSE backed by the in-memory run registry, the runtime page polls `/api/sandbox` every 10s while active and also refreshes on focus/visibility, Studio overview still uses `window.location.reload()` after runtime and direct-task mutations, jobs/settings/integrations/studio-create mostly use `invalidateAll()` after request/response mutations, and there are no client-side Surreal `LIVE SELECT` subscriptions or direct browser WebSocket connections outside the chat-run SSE path
  Definition of done:
- document which surfaces use custom server SSE, which use polling or reloads, and which state remains purely request/response
  Findings:
- push transport in production today: chat-run SSE only
- polling today: Studio runtime page status/preview refresh
- reload/invalidation today: Studio overview runtime/direct-task actions, jobs CRUD/run-now, settings saves, integration enable/config, Studio creation, and some sidebar/layout refresh paths
- direct Surreal realtime today: none in the browser
- consequence: non-chat Studio state is eventually consistent and often refresh-driven, while chat is the only surface with a durable live event stream

[x] `7.b` Decide server-mediated realtime versus direct Surreal live queries
Timestamp:

- 2026-04-07 09:12:14 EDT: checkpoint created
- 2026-04-13 07:06:09 EDT: decision recorded: use a hybrid architecture with app-server-mediated SSE as the default realtime transport for Studio state, keep direct Surreal browser live queries out of the near-term plan, and reserve Surreal live-query use only as a future optional optimization for low-risk read models if the app-server path becomes a clear bottleneck
  Definition of done:
- explicit decision recorded for each surface: keep app-server SSE/WebSocket middleman, adopt selective Surreal live queries, or use a hybrid approach
  Decision:
- chat runs: keep the existing app-server SSE path
- runtime, preview, artifact, deploy, and scheduled-job updates: add a new app-server Studio SSE path rather than direct Surreal live queries
- settings, integration config, Studio creation, and similar low-frequency mutations: keep request/response plus targeted invalidation unless a specific UX problem justifies live updates
- Surreal live queries: defer for now because they would move auth, tenancy, filtering, and event-shaping complexity into the browser while the current server already owns those concerns

[x] `7.c` Define durable realtime event model outside chat runs
Timestamp:

- 2026-04-07 09:12:14 EDT: checkpoint created
- 2026-04-13 07:06:09 EDT: defined a server-owned Studio event model for non-chat live updates built around a new persisted `studio_event` stream with short-retention records and a Studio SSE endpoint; producers should include sandbox lifecycle changes, primary preview/runtime process changes, artifact writes, deploy/publish outputs, scheduled-job claims/results, and other Studio automation events, while the existing persisted domain tables remain the long-term source of truth for reload and recovery
  Definition of done:
- runtime, preview, artifact, deployment, and automation updates have a transport plan that does not rely on reloads or ad hoc polling
  Event model:
- transport: `GET /api/studios/[studioId]/events/stream` using same-origin authenticated SSE
- persistence: new `studio_event` table with `userId`, `studioId`, `kind`, `entityType`, `entityId`, `state`, `summary`, `payload`, `createdAt`
- retention: short-lived diagnostic/event-log retention, while canonical state continues to live in `runtime_process`, `artifact`, `sandbox`, `chat_run`, and `scheduled_job`
- initial event kinds: `runtime.status`, `runtime.preview`, `artifact.upserted`, `deploy.updated`, `job.updated`, `job.run-started`, `job.run-failed`
- client use: runtime page, Studio overview, jobs page, and sidebar/store freshness subscribe to this stream and update local state without full reload

[x] `7.d` Transport rollout plan
Timestamp:

- 2026-04-07 09:12:14 EDT: checkpoint created
- 2026-04-13 07:06:09 EDT: rollout sequence recorded so the transport migration can land incrementally without destabilizing chat or control-plane actions
  Definition of done:
- phased migration path exists for replacing manual refresh/polling where it materially improves UX without weakening control or observability
  Rollout:

1. Add `studio_event` persistence, publisher helpers, and a server-owned Studio SSE endpoint with auth/Studio scoping.
2. Publish runtime lifecycle, primary preview, artifact, deploy, and scheduled-job events from existing mutation points without removing current reload/polling behavior.
3. Move the runtime page from 10s polling to SSE-first with polling as fallback when the stream is unavailable.
4. Move the Studio overview runtime cards, recent execution history, and jobs page off `window.location.reload()` / broad `invalidateAll()` and onto optimistic mutations plus Studio SSE reconciliation.
5. Reduce layout/sidebar broad invalidation by feeding Studio chat/runtime/job freshness through targeted store updates from the Studio event stream.
6. Only after the app-server SSE path is stable, reevaluate whether any low-risk read-only surfaces merit selective Surreal live-query experiments.

## 13. Current Completion Snapshot

Use this section to summarize real progress when stopping work.

### Completed

- `baseline` SurrealDB-backed chat/run foundation exists
- `baseline` Studio-scoped chat flow exists
- `baseline` sandbox creation locking and termination improvements exist
- `baseline` local persistent SurrealDB workflow exists
- `baseline` chat persistence and ordering fixes have started landing
- `1.a` current persisted ordering path audited
- `1.b` assistant turn rendering now uses one chronological entry path for text, tools, and streamed runtime/error events
- `1.c` sidebar Studio summaries now refresh from live client chat data after load instead of relying only on the layout snapshot
- `1.d` desktop composer width aligned to the conversation column
- `1.e` mobile chat shell spacing verified on a live authenticated route with browser automation
- `1.f` active-run status is rendered inline in the assistant turn
- `3.a` current super-admin implementation audited
- `3.b` env-driven super-admin allowlist fixed and documented
- `3.c` raw run/message/tool inspection added to the existing chat debug sheet
- `3.d` super-admin run reconciliation controls added to the existing chat debug sheet
- `5.a` artifact persistence model added for files, previews, generated outputs, and deploy outputs
- `5.b` artifact cards added to chat timeline, runtime page, and Studio overview
- `5.c` direct/scheduled job history foundation added through Studio job runs
- `5.c` dedicated Studio Jobs page and unattended cron-backed scheduled execution added on top of the same persisted run/history path
- `5.d` Wrangler deploy/publish outputs now persist as deployment artifacts
- `6.a` remaining current SDK pain points captured after architecture stabilization
- `6.b` `pi-coding-agent` evaluated against Nova-specific event/session/tool/security requirements
- `6.c` SDK decision recorded: keep current Vercel AI SDK/OpenRouter engine for production and only spike Pi after an internal agent-engine adapter exists
- `7.a` current realtime transport paths audited from actual chat/runtime/Studio/jobs/settings/integration call sites
- `7.b` realtime transport decision recorded: app-server SSE default, Surreal browser live queries deferred
- `7.c` durable non-chat Studio event model defined around a persisted `studio_event` stream plus Studio SSE endpoint
- `7.d` phased rollout plan defined for replacing polling/reloads with Studio SSE where it materially improves UX
- `7.d` rollout implementation now covers persisted `studio_event` publishing, a Studio SSE endpoint, runtime page SSE-first refresh with polling fallback, targeted Studio overview/jobs state refresh, local settings/integration detail mutations without broad `invalidateAll()` or `window.location.reload()`, a layout/sidebar Studio event bridge, sidebar-state refresh via a dedicated API route, SSE stream crash hardening, and integration enable/seeding fixes so new capabilities appear in sidebar state immediately after enable
- `post-completion` repaired corrupted assistant tool history in SurrealDB, hardened chat-run persistence against unmatched tool calls, capped E2B sandbox creation to the current provider one-hour limit, normalized runtime tool timeouts, and verified Firecrawl CLI availability in the runtime template
- `handoff` committed the completed Studio event/runtime safeguard work and added the dated Nova Cloud PWA standalone app plan plus local Surreal query history so the current workspace can be tracked and rolled back cleanly

### In Progress

- none

### Blocked

- none recorded in this tracker yet

### Next Recommended Start Point

- This tracker is functionally complete. Further work should start from a new plan or a new dated continuation document focused on the next product slice rather than the stabilization work captured here.

### Stop Template

When stopping mid-implementation, append:

- `Stopped At:` timestamp
- `Active Checkpoint:` for example `1.c`
- `Last Change:` short summary
- `Next Step:` exact next action
- `Blocked By:` optional blocker
- `Files Touched:` file paths

## 14. Risks and Open Questions

- compare current Vercel AI SDK behavior against `pi-coding-agent`
- prototype migration only after phases 1 through 4 reduce architecture ambiguity
- keep a feature-flagged fallback if migration proceeds

- How much of the current chat state should remain client-owned versus re-derived from Surreal on every meaningful transition?
- Should the persisted timeline become its own first-class event table instead of remaining embedded only in assistant message `parts`?
- How should artifact creation and runtime process updates be stored so they are usable both in chat and outside it?
- What is the minimum integration framework needed before packaging auth, payments, and CRM-style capabilities?
- Will `pi-coding-agent` materially improve the product after the timeline/runtime architecture is stabilized, or only shift implementation complexity?

## 15. Success Criteria

This plan is successful when:

- a user can create a Studio, open a chat, and watch a reliable, modern chronological agent timeline
- refresh never destroys or misorders tool history
- runtime state is visible and trustworthy
- sandbox limits behave predictably
- super-admins can inspect failures without manual database digging
- integrations can be enabled as no-code capabilities
- the SDK decision can be made from stable architecture and real product needs rather than frustration with temporary bugs
