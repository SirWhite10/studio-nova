# SecureExec Runtime Migration Plan

**Document Name:** `2026-04-22-secureexec-runtime-migration-plan.md`
**Version:** 1.0
**Date:** April 22, 2026
**Last Updated:** 2026-04-22 09:35:00 EDT
**Scope:** `apps/nova-cloud` only

## 1. Purpose

Plan a migration path from the current E2B-backed Studio runtime to SecureExec for faster agent execution, better direct coding-tool control, and fewer provider lifecycle issues.

This is a planning document only. No SecureExec dependency, runtime code, database migration, or E2B removal should happen until the migration approach below is reviewed and accepted.

## 2. Source Notes

SecureExec public docs reviewed:

- SecureExec homepage: https://secureexec.dev/
- Quickstart: https://secureexec.dev/docs/quickstart
- AI agent code execution: https://secureexec.dev/docs/use-cases/ai-agent-code-exec
- Dev servers: https://secureexec.dev/docs/use-cases/dev-servers
- NPM and module loading: https://secureexec.dev/docs/features/module-loading
- Child processes: https://secureexec.dev/docs/features/child-processes
- Node compatibility: https://secureexec.dev/docs/nodejs-compatibility
- API reference: https://secureexec.dev/docs/api-reference

Important interpretation:

- SecureExec is a V8-isolate-based execution library that runs inside our host process.
- It is not the same thing as a remote Linux VM by default.
- It supports Node APIs, filesystem, networking, child processes, npm/module loading, resource limits, and dev-server patterns through explicit drivers and permissions.
- Its docs recommend full sandbox infrastructure when workloads require a full OS, persistent disk, root access, GPU, or stronger host separation.

## 3. Current Nova Runtime Footprint

Current runtime files and behavior to account for:

- `src/lib/server/sandbox.ts` owns E2B sandbox creation, reuse, expiration, R2 mounting, lifecycle events, and provider timeout handling.
- `src/lib/agent/tools/runtime.ts` exposes runtime tools to the agent: status/start/stop, shell, filesystem, browser, Firecrawl, Context7, Wrangler, scaffold creation, dev server start/stop/logs, and preview status.
- `src/lib/server/runtime-limits.ts` controls plan-based sandbox limits, run duration, concurrent runs, and tool-step policy.
- `src/lib/server/surreal-sandbox.ts`, `src/lib/server/surreal-runtime-processes.ts`, and `src/lib/server/surreal-studio-events.ts` persist runtime state and events.
- Runtime UI surfaces live under Studio overview, runtime page, jobs, and chat timeline.

The current implementation assumes a remote runtime with:

- one reusable runtime per Studio
- a workspace path at `/home/user/workspace`
- command execution with stdout/stderr/exit code
- background processes and process IDs
- preview URLs for dev servers
- R2-backed persistence
- provider-level kill/connect/is-running semantics

## 4. Migration Principle

Do not replace E2B calls directly inside current tools.

Instead, introduce a runtime-provider boundary and migrate tool behavior behind it:

```ts
type RuntimeProvider = "e2b" | "secureexec";

interface StudioRuntime {
  id: string;
  provider: RuntimeProvider;
  workspacePath: string;
  status(): Promise<RuntimeStatus>;
  exec(input: RuntimeExecInput): Promise<RuntimeExecResult>;
  readFile(path: string): Promise<string | Uint8Array>;
  writeFile(path: string, content: string | Uint8Array): Promise<void>;
  listFiles(path: string): Promise<RuntimeFileEntry[]>;
  makeDir(path: string): Promise<void>;
  remove(path: string): Promise<void>;
  startProcess(input: RuntimeProcessInput): Promise<RuntimeProcessHandle>;
  connectProcess(pid: number): Promise<RuntimeProcessLogs>;
  stopProcess(pid: number): Promise<void>;
  dispose(): Promise<void>;
}
```

This lets us:

- ship SecureExec under a feature flag
- test parity tool-by-tool
- keep E2B as rollback during migration
- avoid spreading SecureExec-specific assumptions through chat tools and UI
- defer the hard question of "is this a sandbox or an isolate" to a provider implementation

## 5. Proposed SecureExec Architecture

### Runtime Service

Add a server-side SecureExec runtime service:

- `src/lib/server/runtime/provider.ts`
- `src/lib/server/runtime/e2b-provider.ts`
- `src/lib/server/runtime/secureexec-provider.ts`
- `src/lib/server/runtime/types.ts`

The current `sandbox.ts` should eventually become a compatibility wrapper or be renamed once the provider abstraction is stable.

### Runtime Identity

SecureExec runtimes should be tracked per Studio similarly to the current sandbox records, but the record must gain provider awareness:

- `provider: "e2b" | "secureexec"`
- `providerRuntimeId`
- `workspacePath`
- `status`
- `createdAt`
- `lastUsedAt`
- `expiresAt`
- `metadata`

Do not rename user-facing runtime terms yet. Internally, we can keep `sandbox` tables during migration to avoid a large schema/UI churn, but new fields should avoid E2B-specific names.

### Workspace Model

SecureExec can use either:

- an in-memory virtual filesystem for fast isolated execution
- a host-backed workspace directory with strict path permissions
- a hydrate/snapshot bridge to R2 for persistence across refresh/restart

Recommended first implementation:

- create a per-Studio workspace root under a controlled server directory, for example `.tmp/runtime-workspaces/<studioId>/`
- deny all filesystem access outside that root
- hydrate from R2 on runtime start only for the files the tool needs
- snapshot changed files back to R2 after write-producing commands
- keep `.tmp` ignored by git

This is safer and easier to reason about than giving SecureExec direct access to the whole app checkout or process cwd.

### Permission Policy

Default deny:

- filesystem: only the Studio workspace root
- network: allow outbound HTTP/S by default for agent research tools, then add host/domain controls later
- environment: explicit allowlist only
- child processes: explicit command allowlist first, then broaden if tests prove safe
- module loading: read-only dependency overlay from known host `node_modules`
- resources: plan-driven memory, CPU, wall time, and concurrency

## 6. Tool Mapping

### `runtime_status`

Target:

- return provider, availability, workspace path, resource policy, and lifecycle state
- never throw raw provider errors into the AI SDK stream

SecureExec implementation:

- check/create in-memory provider session for the Studio
- report `available: true` when the runtime service can create an isolate

### `runtime_start`

Target:

- create or attach a Studio runtime
- publish existing runtime.status Studio events

SecureExec implementation:

- initialize provider session
- create workspace root
- hydrate required workspace state
- warm common tools/modules if useful

### `runtime_stop`

Target:

- stop long-running processes
- dispose isolates
- snapshot dirty workspace state
- mark runtime expired/stopped

SecureExec implementation:

- terminate active SecureExec runtime/processes
- persist workspace changes
- clear in-memory runtime registry

### `runtime_shell`

Target:

- preserve command, cwd, timeout, stdout, stderr, exit code

SecureExec implementation options:

- Prefer SecureExec kernel/process API for command-like execution.
- If using child process bridge, restrict command execution with command allowlists and cwd enforcement.
- Return the same shape as today so chat rendering and agent prompting do not change.

Open validation:

- whether `vp`, `bun`, `git`, `firecrawl`, `agent-browser`, `ctx7`, and `wrangler` can run reliably through SecureExec child process support in our deployment environment
- whether Cloudflare/Wrangler deployment target permits the required V8/native APIs

### `runtime_filesystem`

Target:

- read/write/list/mkdir/delete under the Studio workspace

SecureExec implementation:

- map paths through one shared path normalizer
- disallow absolute paths outside workspace
- store small files in SecureExec virtual FS or host workspace
- persist to R2 after mutations

### `runtime_firecrawl`, `runtime_browser`, `runtime_context7`, `runtime_wrangler`

Target:

- preserve current command-wrapper model while improving reliability

SecureExec implementation options:

- Phase 1: run as command wrappers if SecureExec child processes support these CLIs.
- Phase 2: convert each high-value tool to a first-class host-side tool instead of shelling out.
- Browser automation may need special handling because headless browser dependencies are often OS-level and may not fit an isolate model.

Recommendation:

- Treat Firecrawl and Context7 as early SecureExec candidates.
- Treat browser automation and Wrangler deploy as compatibility-risk items requiring proof-of-concept before E2B removal.

### `runtime_dev_start`, `runtime_dev_logs`, `runtime_dev_stop`, `runtime_preview_status`

Target:

- start a primary dev server
- expose a preview URL
- collect logs
- stop the process

SecureExec implementation:

- use SecureExec dev-server pattern with host-side port allocation
- bind to loopback only
- add a Nova proxy route for preview traffic
- persist primary process metadata in `runtime_process`
- publish `runtime.preview` events as today

Open validation:

- long-running process stability under our app host
- whether runtime survives server restarts
- whether Cloudflare deployment supports the required networking/process primitives

## 7. Skills and Tools Strategy

Goal: keep Nova's existing skill/tool system usable rather than rebuilding it around the provider.

Plan:

- expose installed Nova skills to SecureExec as a read-only mounted directory or materialized files in the Studio workspace
- keep permission checks in Nova server code, not inside generated agent code
- convert high-trust skills into first-class AI SDK tools where possible
- reserve raw shell execution for cases where command execution is materially needed
- record skill/tool execution as Studio events and chat tool parts exactly as current runtime tools do

This avoids turning SecureExec into an unrestricted local terminal while still giving agents practical coding capability.

## 8. Migration Phases

### Phase 0: Feasibility Spike

[ ] `0.a` Install and run SecureExec in a throwaway branch

- use `vp add secure-exec`
- create a local smoke test outside production runtime paths
- run JavaScript execution, filesystem access, network fetch, and child process checks

[ ] `0.b` Validate deployment compatibility

- confirm whether SecureExec works in local Node dev
- confirm whether it works in the target production runtime
- explicitly test Cloudflare/Wrangler constraints before committing to full replacement

[ ] `0.c` Validate command/tool parity

- test `node`, `bun`, `vp`, `git`, `firecrawl`, `ctx7`, `agent-browser`, and `wrangler`
- classify each as native SecureExec, host-side tool, or fallback-only

### Phase 1: Runtime Provider Interface

[ ] `1.a` Define provider-neutral runtime types

- add `RuntimeProvider`, `StudioRuntime`, result types, process types, and file types
- keep current E2B implementation behavior unchanged

[ ] `1.b` Move E2B behind provider adapter

- extract current `sandbox.ts` logic into `e2b-provider`
- keep public imports compatible initially
- verify current E2B runtime tools still pass smoke tests

[ ] `1.c` Add provider selection

- env flag: `NOVA_RUNTIME_PROVIDER=e2b|secureexec`
- optional per-user or per-Studio override for staged rollout
- default to E2B until SecureExec parity is proven

### Phase 2: SecureExec Provider Prototype

[ ] `2.a` Create SecureExec provider session manager

- per-Studio runtime map
- creation locks
- disposal
- plan-driven memory/CPU/time limits
- Studio event publishing

[ ] `2.b` Implement basic exec

- JavaScript run/exec
- command-like exec if supported
- stdout/stderr/exit code normalization

[ ] `2.c` Implement filesystem operations

- workspace path mapping
- read/write/list/mkdir/delete
- path traversal tests

### Phase 3: Persistence Bridge

[ ] `3.a` Decide workspace persistence mechanism

- direct R2 object bridge
- host workspace snapshots
- hybrid manifest-based sync

[ ] `3.b` Implement hydrate/snapshot lifecycle

- hydrate before first runtime use
- persist after writes and before stop
- add conflict and partial-failure handling

[ ] `3.c` Preserve existing files page behavior

- runtime writes should appear in the files page
- files page changes should be visible to runtime tools

### Phase 4: Tool Parity

[ ] `4.a` Port status/start/stop/filesystem/shell`

- these are the minimum viable SecureExec provider tools

[ ] `4.b` Port Firecrawl and Context7

- prefer first-class integrations if CLI execution is brittle

[ ] `4.c` Port scaffold tools

- verify `vp create` and `sv create` behavior
- decide whether scaffolding runs through shell, package APIs, or templates

[ ] `4.d` Port Wrangler

- confirm auth, environment, and deploy behavior
- likely keep stricter permissions around this than generic shell

### Phase 5: Dev Server and Preview

[ ] `5.a` Implement SecureExec dev-server lifecycle

- loopback port allocation
- health check
- log capture
- process metadata persistence

[ ] `5.b` Implement preview proxy

- authenticated Studio preview route
- proxy to loopback runtime process
- graceful error UI when runtime stops

[ ] `5.c` Test long-running process behavior

- server restart
- user refresh
- process crash
- concurrent Studio runs

### Phase 6: Rollout and E2B Removal

[ ] `6.a` Feature-flag internal users

- start with one test Studio
- log provider, command timings, failures, memory, CPU, and process lifecycle events

[ ] `6.b` Compare outcomes against E2B

- cold start
- command reliability
- Firecrawl/browser success rate
- dev-server preview reliability
- persistence correctness
- total operational risk

[ ] `6.c` Remove E2B only after parity

- remove E2B dependency
- remove E2B env requirements
- update runtime docs, product copy, and planning docs
- migrate or expire old `provider="e2b"` runtime records

## 9. Security Requirements

The migration is only acceptable if these are true:

- generated agent code cannot read Nova source, env files, private keys, `.dev.vars`, `.env.local`, or host filesystem outside its Studio workspace
- child process execution cannot run arbitrary host commands until we explicitly approve the command class
- network access is observable and can be restricted by policy
- env vars exposed to runtime are explicit and audited
- CPU, memory, wall-clock time, and concurrency are enforced per plan
- runtime failures always return tool results rather than corrupting AI SDK message history
- workspace persistence cannot overwrite files outside the Studio prefix
- preview proxy cannot expose internal app routes or host services

## 10. Testing Plan

Minimum tests before production rollout:

- provider type unit tests
- path traversal tests
- filesystem read/write/list/delete tests
- runtime status/start/stop tests
- shell timeout and output capture tests
- AI SDK tool-call/tool-result preservation tests
- Firecrawl smoke test
- Context7 smoke test
- dev-server start/logs/stop/preview test
- R2 hydrate/snapshot test
- concurrent runtime creation lock test
- process cleanup test
- regression test for "Tool result is missing for tool call"

Manual verification:

- create a Studio
- ask agent to inspect runtime status
- ask agent to create files
- ask agent to run a command
- ask agent to crawl a URL with Firecrawl
- ask agent to start a dev server and open preview
- refresh browser and verify runtime state remains truthful
- stop runtime and verify UI updates through Studio events

## 11. Risks and Open Questions

- SecureExec may not be a full replacement for E2B if our highest-value workflows require a full Linux environment.
- Browser automation may require OS/browser dependencies that do not fit SecureExec cleanly.
- Wrangler deploy may be better as a host-side integration than a sandbox command.
- Long-running dev servers need careful lifecycle management because SecureExec runs inside our app host.
- Production deployment target matters. If the target cannot run SecureExec's required native/V8 APIs, we need a worker/service host for runtimes.
- Persistence semantics must be designed explicitly because SecureExec is not a remote persistent disk by itself.
- Security posture changes from remote VM isolation to in-process isolation. That can be acceptable, but only with strict permission boundaries and tests.

## 12. Recommended Decision

Proceed with a spike, not a blind migration.

Recommended path:

1. Add a provider interface while keeping E2B as the default.
2. Build a SecureExec prototype for status, filesystem, and shell-like execution.
3. Prove Firecrawl/Context7 and one dev-server preview.
4. Decide whether browser automation and Wrangler should be SecureExec commands or host-side tools.
5. Only remove E2B after SecureExec passes the tool parity and security checklist.

This approach gives us the speed and control benefits of SecureExec without risking a regression in Nova's current Studio runtime capabilities.
