# Nova Cloud

Nova Cloud is a Studio-first AI application platform built with SvelteKit, Svelte 5, SurrealDB, Better Auth, and Nova-managed runtimes.

The product is designed around persistent user environments called `Studios`. Each Studio gives a user a dedicated context for conversations, runtime state, skills, files, integrations, and deployable workspaces.

## Core Concepts

### Studios

- `Studio` is the primary user-facing shell concept.
- A Studio contains chats, runtime state, skills, settings, and future capabilities.
- The selected Studio controls what appears in the app shell and sidebar.

### Chats

- Chats are scoped to a Studio.
- Durable run state and final message persistence are handled through SurrealDB-backed chat run lifecycle records.

### Runtime / Sandbox

- `sandbox` is the technical execution term.
- Each Studio is backed by an isolated, on-demand runtime environment used for code execution, tools, and workspace preparation.
- The target runtime path is self-hosted on K3s, with studio-scoped runtime pods and scale-to-zero behavior.
- Runtime access is on-demand: normal chat stays lightweight until Nova explicitly uses runtime-backed tools.
- Each Studio can keep one primary preview/dev server record with persisted status, preview URL, and recent logs.

### Workspaces

- `workspace` is the deployable product surface for a Studio.
- A workspace is not the sandbox itself. It is the public app or site served from a published runtime revision.
- The sandbox owns project generation, dependency installation, file edits, runtime-contract generation, and workspace publication.
- The workspace runtime owns executing the stored runtime contract, deployment status, domains, and health.
- Initial workspace direction favors template-backed presets such as blogs, docs, landing pages, and future custom app types.

### Skills

- Skills extend what the assistant can do and how it operates.
- Svelte UI work in this repo should follow the Svelte-specific guidance in `AGENTS.md`.

### Integrations

- `Integrations` is the user-facing sidebar label for dynamic Studio-connected capabilities.
- Examples include Stripe, GitHub, Notion, email, and similar providers.
- Internally, these records may still be modeled as `extensions`.

## Architecture at a Glance

- `SvelteKit`
  - application shell, routes, streaming endpoints, and product UI
- `Svelte 5`
  - runes-first component architecture for all modern Svelte work
- `SurrealDB`
  - durable application state, chat persistence, run records, and backend functions
- `Better Auth`
  - authentication and user session integration
- `Nova runtime control`
  - on-demand execution runtime for Studio sandboxes and workspace prep
- `Custom frps`
  - public workspace domain routing, HTTPS, and tunnel termination for Nova-managed workspace URLs
- `R2-compatible storage`
  - persistent Studio files, workspace content, and future deployment artifacts

## Studio Runtime Workflow

- Nova now separates normal chat from execution-heavy runtime work.
- Chats can stay conversational, memory-backed, and skill-driven without automatically starting a sandbox.
- When execution is needed, Nova uses Studio runtime tools to wake or reuse the sandbox on demand.
- Structured runtime tools now cover:
  - project scaffolding with `runtime_vite_create` and `runtime_svelte_create`
  - lifecycle control with `runtime_status`, `runtime_start`, and `runtime_stop`
  - general execution with `runtime_shell` and `runtime_filesystem`
  - one primary preview flow with `runtime_dev_start`, `runtime_dev_stop`, `runtime_dev_logs`, and `runtime_preview_status`

The Studio runtime page is now the manual operational surface for:

- waking and sleeping the runtime
- checking runtime health and expiry
- viewing the current primary preview/dev server
- refreshing preview logs or stopping the active preview

## Workspace Deployment Direction

Nova is moving toward a split model:

- the sandbox creates and maintains the source project plus runtime/deployment spec
- the workspace serves the published app or job result
- Nova Cloud manages orchestration, metadata, domains, and deployment status

Each workspace stores a declarative runtime contract. The sandbox writes that contract, and the runtime reads it on demand.

- runtime base is blank slate
- workspace-specific files, tools, and assets come from R2-backed storage
- the runtime contract uses a single `runCommand`
- lifecycle is always on-demand and scales to zero when idle
- the workspace can represent a static site, a long-running web app, or a one-shot job

For deployable web workspaces, the current preferred shape is:

- the sandbox scaffolds a project with `vp`
- the sandbox installs dependencies and writes the app structure
- the sandbox publishes the runtime contract and workspace files to R2-backed storage
- Nova starts the on-demand workspace runtime when traffic or an agent request arrives
- the workspace reads the stored contract and files, then executes the declared `runCommand`
- the workspace serves the published app, API, or job result on its Nova URL or custom domain

The first concrete example under this model is a blog workspace template:

- scaffolded by the sandbox
- implemented as a `vp` React project
- content-aware and integration-aware
- deployed from a workspace runtime contract instead of depending on a live sandbox process

## Current Product Direction

Nova is moving from a chat-first shell to a Studio-first information architecture.

- `"/app"` becomes the real app home
- the selected Studio controls the sidebar context
- chats become one Studio feature instead of the root app concept
- `Integrations` becomes a dynamic Studio-scoped sidebar group

See the canonical Studios planning reference for the full IA direction:

- `planning/STUDIOS_INFORMATION_ARCHITECTURE_PLAN.md`

## Pricing Direction

Nova pricing is being split into clearer product surfaces instead of one flat runtime bundle.

The scaffolded pricing route now reflects separate concepts for:

- workspaces
- sandbox/runtime usage
- add-ons
- Nova AI credits
- pricing examples

Current pricing route structure:

- `/pricing`
- `/pricing/workspaces`
- `/pricing/sandbox`
- `/pricing/add-ons`
- `/pricing/ai-credits`
- `/pricing/examples`

The product direction behind this split is:

- a user may want a hosted workspace without paying for an always-on development runtime
- sandbox/runtime cost should remain separate from workspace hosting
- Nova AI usage should remain optional instead of bundled into every plan

Nova also plans to offer a self-hosted option later. That path is intended to be fully free on the Nova side, with users providing and operating their own infrastructure. It should exist as a later deployment model, not as part of the first hosted workspace rollout.

## Development

### Install dependencies

```bash
vp install
```

### Run checks

```bash
vp check
```

### Start development server

```bash
vp dev
```

### Build

```bash
vp build
```

## Important Project References

- `AGENTS.md`
  - implementation guidance for Studios, runtime behavior, and Svelte 5 requirements
- `PLAN_CHAT_PERSISTENCE.md`
  - canonical plan for durable chat runs, live streaming, and final assistant persistence
- `planning/STUDIOS_INFORMATION_ARCHITECTURE_PLAN.md`
  - canonical plan for the Studio-first app shell, sidebar, onboarding, and Integrations model
- `planning/NOVA_CLOUD_PRODUCT_AND_BUSINESS_PLAN.md`
  - broader product, pricing, and business direction
- `planning/2026-05-01-workspace-template-blog-plan.md`
  - plan for sandbox-generated `vp` React blog workspaces, deployment artifacts, UI/API flow, and testing strategy

## Svelte Guidance

Nova uses Svelte 5 runes mode for modern Svelte code.

- use `$state`, `$derived`, `$effect`, `$props`, and `$bindable`
- avoid legacy Svelte 4 patterns for new work
- when working on Studio pages, app shell UI, layouts, or sidebar navigation, follow the guidance in `AGENTS.md`
