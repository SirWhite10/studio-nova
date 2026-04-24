# Nova Cloud

Nova Cloud is a Studio-first AI application platform built with SvelteKit, Svelte 5, Convex, Better Auth, and E2B.

The product is designed around persistent user environments called `Studios`. Each Studio gives a user a dedicated context for conversations, runtime state, skills, and future capabilities like files and integrations.

## Core Concepts

### Studios

- `Studio` is the primary user-facing shell concept.
- A Studio contains chats, runtime state, skills, settings, and future capabilities.
- The selected Studio controls what appears in the app shell and sidebar.

### Chats

- Chats are scoped to a Studio.
- Durable run state and final message persistence are handled through Convex-backed chat run lifecycle records.

### Runtime / Sandbox

- `sandbox` is the technical execution term.
- Each Studio is backed by an isolated runtime environment used for code execution, tools, and long-running tasks.
- E2B currently powers Nova's execution layer.
- Runtime access is on-demand: normal chat stays lightweight until Nova explicitly uses runtime-backed tools.
- Each Studio can keep one primary preview/dev server record with persisted status, preview URL, and recent logs.

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
- `Convex`
  - durable application state, chat persistence, run records, and backend functions
- `Better Auth`
  - authentication and user session integration
- `E2B`
  - isolated execution runtime for Nova sandboxes

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

## Current Product Direction

Nova is moving from a chat-first shell to a Studio-first information architecture.

- `"/app"` becomes the real app home
- the selected Studio controls the sidebar context
- chats become one Studio feature instead of the root app concept
- `Integrations` becomes a dynamic Studio-scoped sidebar group

See the canonical Studios planning reference for the full IA direction:

- `planning/STUDIOS_INFORMATION_ARCHITECTURE_PLAN.md`

## Development

### Install dependencies

```bash
bun install
```

### Run checks

```bash
bun run check
```

### Start development server

```bash
bun run dev
```

### Build

```bash
bun run build
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

## Svelte Guidance

Nova uses Svelte 5 runes mode for modern Svelte code.

- use `$state`, `$derived`, `$effect`, `$props`, and `$bindable`
- avoid legacy Svelte 4 patterns for new work
- when working on Studio pages, app shell UI, layouts, or sidebar navigation, follow the guidance in `AGENTS.md`
