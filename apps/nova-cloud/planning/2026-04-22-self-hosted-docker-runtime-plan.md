# Self-Hosted Docker Runtime Plan

**Document Name:** `2026-04-22-self-hosted-docker-runtime-plan.md`
**Version:** 1.0
**Date:** April 22, 2026
**Last Updated:** 2026-04-22 12:55:00 EDT
**Scope:** `apps/nova-cloud` only

## 1. Purpose

Plan the migration from E2B-managed runtimes to a self-hosted Docker runtime that Nova controls.

The goal is to reduce external provider cost and limits while preserving the most important Nova Cloud product promise: each Studio agent gets a real operating-system-level workspace capable of coding, running tools, scraping, building sites, starting dev servers, and running scheduled jobs.

This is a planning document only. No Docker runtime code, server provisioning, E2B removal, or schema migration should happen until this plan is reviewed and accepted.

## 2. Product Direction

Nova should use a full OS sandbox as the default runtime, not an isolate-only runtime.

Reasons:

- users can ask agents to do arbitrary coding work
- agent jobs may evolve from simple scripts into full repo workflows
- tools like `git`, `bun`, `vp`, Firecrawl, browser automation, Wrangler, and package managers expect OS capabilities
- long-running websites and dev servers need process lifecycle, logs, ports, and previews
- scheduled jobs should reuse the same environment as interactive work

SecureExec can remain a future optional fast path for tiny deterministic code execution, but the primary Studio runtime should be a Docker-backed OS workspace.

## 3. Target Architecture

Decision update:

- use single-node K3s as the production-shaped control substrate instead of raw Docker-only orchestration
- keep Docker/container knowledge in the runtime image layer
- manage Studio runtimes as Kubernetes Pods and PVCs
- keep Docker-only as a local fallback if K3s blocks development

```txt
Nova Cloud app
  -> Runtime provider adapter
    -> Runtime control plane
      -> self-hosted K3s node or node pool
        -> one Pod per active Studio runtime
        -> one PVC per Studio workspace
          -> Nova runtime agent HTTP/SSE server
          -> shell, tools, skills, package managers
          -> persistent workspace volume/PVC
          -> optional preview/dev server process
```

Core components:

- Nova app remains the product/API/UI control plane.
- Docker host runs active Studio containers.
- Runtime agent runs inside each container and exposes a small authenticated local API.
- Reverse proxy exposes runtime-agent API and preview ports to Nova only.
- R2 or host volumes persist workspace state across container sleep/restart.

## 4. Runtime Provider Boundary

Do not wire Docker directly into `src/lib/agent/tools/runtime.ts`.

Create a provider-neutral interface first:

```ts
type RuntimeProvider = "e2b" | "docker";

interface StudioRuntimeProvider {
  status(context: RuntimeContext): Promise<RuntimeStatusResult>;
  start(context: RuntimeContext): Promise<RuntimeStartResult>;
  stop(context: RuntimeContext): Promise<RuntimeStopResult>;
  exec(context: RuntimeContext, input: RuntimeExecInput): Promise<RuntimeExecResult>;
  readFile(context: RuntimeContext, path: string): Promise<RuntimeFileReadResult>;
  writeFile(
    context: RuntimeContext,
    path: string,
    content: string,
  ): Promise<RuntimeFileWriteResult>;
  listFiles(context: RuntimeContext, path: string): Promise<RuntimeFileListResult>;
  deleteFile(context: RuntimeContext, path: string): Promise<RuntimeFileDeleteResult>;
  startProcess(
    context: RuntimeContext,
    input: RuntimeProcessInput,
  ): Promise<RuntimeProcessStartResult>;
  readProcessLogs(
    context: RuntimeContext,
    input: RuntimeProcessLogsInput,
  ): Promise<RuntimeProcessLogsResult>;
  stopProcess(
    context: RuntimeContext,
    input: RuntimeProcessStopInput,
  ): Promise<RuntimeProcessStopResult>;
}
```

Initial files:

- `src/lib/server/runtime/types.ts`
- `src/lib/server/runtime/provider.ts`
- `src/lib/server/runtime/e2b-provider.ts`
- `src/lib/server/runtime/docker-provider.ts`
- `src/lib/server/runtime/docker-orchestrator.ts`

Keep existing E2B behavior behind the interface until Docker parity is proven.

## 5. Docker Host Model

### Single-Host Start

Start with one dedicated machine running single-node K3s.

Assumptions:

- Nova app can reach the runtime control plane over a private network, SSH tunnel, WireGuard, Tailscale, or locked-down HTTPS API.
- K3s host has enough disk for local-path PVCs and image cache.
- K3s host is not the same machine that stores production secrets unless access is tightly scoped.

Single-host mode is enough to validate:

- runtime creation
- command execution
- long-running dev servers
- scheduled jobs
- workspace persistence
- container sleep/wake
- cost profile

### Host Pool Later

Add a host pool after single-host mode is stable:

- `runtime_host` table with host URL, capacity, current active Pods, health, tags, and last heartbeat
- scheduler chooses least-loaded healthy host
- active runtime records store `hostId`
- migrate or recreate Pods when a host is unhealthy

Do not build host pooling before the single-host path works end-to-end.

## 6. Runtime Container Image

Build one Nova runtime image first.

Recommended base:

- Debian or Ubuntu slim
- non-root `nova` user
- workspace at `/home/nova/workspace`
- runtime agent at `/usr/local/bin/nova-runtime-agent`
- common tools installed system-wide

Initial tools:

- `bash`
- `git`
- `curl`
- `ca-certificates`
- `node`
- `bun`
- `vp`
- `firecrawl`
- `ctx7`
- `agent-browser`
- `playwright` browsers if browser automation is required
- deployment CLI
- `s3fs` only if direct R2 mount remains desirable

Image goals:

- cold start under a few seconds on warm host
- no app production secrets baked into image
- no user-specific data baked into image
- deterministic tool versions where possible
- image rebuild command documented

## 7. Runtime Agent Inside Container

Run a small HTTP/SSE service inside each container.

Responsibilities:

- execute commands with cwd, timeout, env allowlist, stdout, stderr, exit code
- manage background processes
- stream logs
- read/write/list/delete files under workspace
- report health and tool versions
- expose dev-server preview metadata
- optionally run Sandbox Agent SDK if it fits better than a custom service

Recommended endpoints:

- `GET /health`
- `POST /exec`
- `POST /files/read`
- `POST /files/write`
- `POST /files/list`
- `POST /files/delete`
- `POST /processes/start`
- `POST /processes/logs`
- `POST /processes/stop`
- `GET /events`

Security:

- bind runtime agent to container/private network only
- require per-container token generated by Nova
- never expose runtime-agent API directly to the public internet
- validate every path stays under workspace

## 8. Container Lifecycle

### Start

When a Studio needs runtime access:

1. Nova checks runtime policy and active limits.
2. Docker provider checks for an active container record.
3. If no active container exists, Docker provider creates or starts one.
4. Workspace volume is attached.
5. Runtime agent health is checked.
6. Studio event `runtime.status active` is published.
7. Runtime tool call proceeds.

### Reuse

Active container reuse should be keyed by:

- userId
- studioId
- provider: `docker`

Reuse avoids cold starts during active chat sessions and scheduled jobs.

### Sleep

Idle policy:

- free: stop container after 5-10 minutes idle
- pro: stop container after 15-30 minutes idle
- scheduled jobs: stop after completion unless a dev server is marked keep-alive

Stopping a container should preserve the workspace volume.

### Stop

Explicit stop:

- stop background processes
- flush logs
- stop container
- keep volume
- mark runtime stopped/expired
- publish Studio event

### Delete

Destructive delete should be separate from stop:

- remove container
- optionally remove volume
- optionally delete R2 workspace objects
- require explicit user action or admin cleanup

## 9. Persistence Strategy

Start with Docker named volumes per Studio.

Volume naming:

- `nova_studio_<safeStudioId>_workspace`

Pros:

- fastest path
- natural OS filesystem behavior
- survives container stop/start
- supports package installs and repo checkouts

Cons:

- tied to one host
- needs backup
- migration between hosts requires copying volume data

Add R2 snapshot later:

- periodic tar/zstd snapshot to R2
- snapshot after scheduled job completion
- snapshot before host maintenance
- restore volume from latest snapshot if moving hosts

Do not mount R2 as the primary filesystem unless local volume persistence proves insufficient. Object storage semantics are not ideal for arbitrary package managers and dev servers.

## 10. Preview and Websites

Agents must be able to run long-lived websites.

Approach:

- container dev server binds to `127.0.0.1` or container network
- runtime agent records process pid, command, cwd, and port
- Docker host exposes only selected container port through a controlled reverse proxy
- Nova app serves preview URLs through authenticated routes

Preview URL shape:

- `/api/studios/[studioId]/runtime/preview/[port]/...`
- or `https://preview-<studioId>-<port>.nova...`

Initial recommendation:

- authenticated path-based proxy first
- subdomain previews later if needed for browser compatibility

Risks:

- WebSocket proxying for dev servers
- HMR with path-based proxy
- CORS and absolute asset URLs
- malicious preview app trying to hit internal services

Mitigation:

- proxy only to registered primary preview process
- strip dangerous headers
- require user auth for private previews
- add public preview mode later as an explicit artifact/deploy feature

## 11. Scheduled Jobs

Scheduled jobs should use the same Docker runtime as interactive chat.

Example: hourly Reddit AI news blog job.

Flow:

1. Scheduler claims due job.
2. Nova starts or reuses the Studio Docker runtime.
3. Agent runs with full workspace, shell, scraping tools, packages, and secrets policy.
4. Agent scrapes Reddit.
5. Agent writes markdown into the Studio workspace.
6. Runtime snapshots or keeps the volume.
7. Job result is saved.
8. Artifact and Studio events are published.
9. Container sleeps if no keep-alive process is active.

This avoids building a separate limited cron execution model that later blocks user requests.

## 12. Tool and Skill Model

The Docker runtime should include the same tool assumptions as Nova's current E2B image.

Agent capabilities:

- shell execution
- filesystem editing
- package install
- git clone/commit/push where credentials allow it
- skills folder access
- Firecrawl/browser/context tools
- dev server start/stop/logs
- static site and full-stack app builds

Skills:

- mount or copy Nova skills into `/home/nova/.agents/skills`
- keep canonical skill metadata in Nova DB
- keep runtime skill execution logged as tool calls and Studio events
- do not let runtime modify global skill definitions without explicit user/admin flow

Secrets:

- inject only per-job/per-Studio allowed secrets
- never mount Nova app `.env.local`, `.dev.vars`, or host secrets
- prefer short-lived env injection per command over long-lived container env

## 13. Security Baseline

Docker alone is weaker isolation than a paid microVM provider, but it is acceptable for a controlled early product if we constrain risk and evolve deliberately.

Minimum baseline:

- run containers as non-root user
- no privileged containers
- no Docker socket mount
- no host path mounts except dedicated workspace volume
- read-only root filesystem if practical
- cap CPU and memory
- cap pids
- cap disk usage
- disable container-to-host network paths where possible
- block access to metadata/internal services
- per-container network namespace
- per-container auth token
- path traversal tests
- command timeout enforcement
- idle cleanup worker

Recommended Docker flags:

```txt
--user nova
--memory <plan-limit>
--cpus <plan-limit>
--pids-limit 512
--cap-drop ALL
--security-opt no-new-privileges
--network nova-runtime
--mount source=<studio-volume>,target=/home/nova/workspace
```

Later hardening:

- gVisor runtime class
- Kata Containers
- Firecracker/microVM host
- per-customer VM for higher tiers
- egress firewall/proxy
- malware scanning for persisted workspaces

## 14. Runtime Limits and Pricing

Cost advantage comes from self-hosting and sleep-to-zero, not from pretending active OS work is free.

Initial plan limits:

- free: 1 runtime, low CPU/RAM, short idle timeout, limited scheduled jobs
- pro: 3 runtimes, higher CPU/RAM, longer idle timeout, more scheduled jobs
- team/future: dedicated host or dedicated VM option

Track:

- container start count
- active seconds
- CPU/memory usage
- disk usage
- network egress
- scheduled job runs
- preview uptime

Pricing should be based on aggregate host cost plus safety margin, not E2B per-runtime billing.

## 15. Database Changes

Extend runtime records without a breaking rename first.

Add or normalize:

- `provider`
- `hostId`
- `containerId`
- `containerName`
- `workspaceVolume`
- `runtimeAgentUrl`
- `runtimeAgentTokenHash`
- `status`
- `lastUsedAt`
- `expiresAt`
- `resourceLimits`
- `metadata`

Eventually rename `sandbox` concepts to `runtime` internally, but do not combine that rename with provider migration.

## 16. Implementation Phases

### Phase 0: Host Preparation

[ ] `0.a` Document the target Docker host

- OS version
- Docker version
- CPU/RAM/disk
- network access from Nova app
- backup location

[ ] `0.b` Create private host access path

- SSH tunnel, Tailscale, WireGuard, or locked-down HTTPS control API
- no public Docker socket

[ ] `0.c` Create runtime network and base directories

- Docker network: `nova-runtime`
- workspace volume policy
- logs path
- snapshot path

### Phase 1: Runtime Image

[ ] `1.a` Create `runtime/docker/Dockerfile`

- non-root user
- workspace path
- core tools
- runtime agent

[ ] `1.b` Add runtime image build script

- deterministic tag
- local build
- optional registry push later

[ ] `1.c` Smoke test manually

- start container
- run `git --version`
- run `bun --version`
- run `vp --version`
- run Firecrawl help
- create and read workspace file

### Phase 2: Runtime Agent

[ ] `2.a` Implement minimal runtime agent

- health
- exec
- file read/write/list/delete

[ ] `2.b` Add process endpoints

- start background command
- collect logs
- stop process

[ ] `2.c` Add auth and path enforcement

- token validation
- workspace-only paths
- command timeout

### Phase 3: Nova Docker Provider

[ ] `3.a` Add provider-neutral runtime interface

- no behavior change
- E2B remains default

[ ] `3.b` Add Docker provider behind feature flag

- `NOVA_RUNTIME_PROVIDER=docker`
- Docker host config
- container create/start/stop/status

[ ] `3.c` Wire existing runtime tools through provider

- status/start/stop
- shell
- filesystem
- dev start/logs/stop

### Phase 4: Persistence and Preview

[ ] `4.a` Persist workspace with Docker volumes

- create per-Studio volume
- reuse across starts
- delete only through explicit cleanup

[ ] `4.b` Add snapshot to R2

- manual snapshot first
- scheduled snapshot later

[ ] `4.c` Add preview proxy

- path-based authenticated preview
- logs and process metadata visible in Studio runtime page

### Phase 5: Scheduled Jobs

[ ] `5.a` Run scheduled jobs through Docker provider

- start runtime
- execute agent/tool workflow
- persist result
- sleep if idle

[ ] `5.b` Validate Reddit blog workflow

- scrape Reddit hourly
- write markdown
- update website source
- optionally run build
- publish artifact/event

### Phase 6: Rollout

[ ] `6.a` Internal test Studio

- one user
- one Studio
- Docker provider only for that Studio

[ ] `6.b` Side-by-side with E2B

- compare cold start
- compare command reliability
- compare dev-server preview
- compare Firecrawl/browser tooling
- compare cost and host load

[ ] `6.c` Make Docker default

- only after parity
- keep E2B fallback temporarily

[ ] `6.d` Remove E2B

- remove dependency
- remove env
- expire old E2B runtime records
- update docs/product copy

## 17. Operational Runbooks

Need before production:

- start/stop runtime host
- rotate runtime agent tokens
- prune stopped containers
- prune orphan volumes
- snapshot/restore workspace
- move Studio volume to another host
- inspect runtime logs
- kill runaway process
- disable a user's runtime
- recover from host disk pressure
- recover from runtime image bug

## 18. Open Questions

- Should each Studio get one volume forever, or should volumes be archived after inactivity?
- Should free users share lower CPU/RAM limits or get fewer runtime minutes?
- Should public previews be allowed, or only authenticated previews initially?
- Should agents be allowed to `apt install`, or should image rebuilds handle system packages?
- Should browser automation be installed in every image or only enabled per plan?
- Should runtime host live on the same network as production DB, or be isolated and talk only through Nova API?
- Should we use Sandbox Agent SDK as the runtime agent, or start with a minimal custom runtime agent?
- How do we meter disk and network egress fairly?

## 19. Recommended Decision

Proceed with the self-hosted Docker runtime as the primary replacement path for E2B.

Recommended first milestone:

1. Build a local Docker image with Nova's required tools.
2. Run one container manually on the prepared host.
3. Expose a token-protected runtime agent.
4. Connect one internal Studio through `NOVA_RUNTIME_PROVIDER=docker`.
5. Validate shell, files, Firecrawl, dev server preview, and the Reddit scheduled job.

Do not remove E2B until the Docker provider has proven parity and operational safety.
