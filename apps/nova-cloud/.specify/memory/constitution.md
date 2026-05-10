<!--
Sync Impact Report
- Version change: template -> 1.0.0
- Modified principles: initial adoption
- Added sections: Core Principles, Product & Technical Constraints, Delivery Workflow & Quality Gates, Governance
- Removed sections: none
- Templates requiring updates:
  - ✅ none required
- Follow-up TODOs:
  - none
-->

# Nova Cloud Constitution

## Core Principles

### I. Studio-First Product Semantics

All product changes MUST preserve Nova Cloud's Studio-first model. User-facing
language MUST treat `Studio` as the primary shell, `chat` as a Studio feature,
`workspace` as the deployable surface, and `runtime` or `sandbox` as the
execution layer rather than the product itself. New specs, UI copy, APIs, and
data models MUST use these canonical terms consistently unless a migration plan
explicitly defines a temporary compatibility alias.

Rationale: Nova Cloud is actively consolidating around a Studio-first
information architecture, and terminology drift creates product, UX, and data
model confusion.

### II. Runtime Boundaries Are Explicit

Normal chat, durable application state, and execution-heavy runtime work MUST
remain explicitly separated. Features MUST define when runtime access is
required, what data is persisted outside the runtime, and how idle or failed
runtime states are surfaced to users. No feature may silently assume an always-
on sandbox or couple basic app navigation to runtime availability.

Rationale: Nova Cloud is designed for lightweight chat by default with
on-demand, studio-scoped runtimes that scale independently.

### III. Svelte 5 and Vite+ Compliance

Frontend work MUST use Svelte 5 runes mode and the repo's Vite+ workflow. New
Svelte code MUST use modern rune APIs rather than legacy Svelte 4 syntax. Tool
execution, dependency management, formatting, linting, testing, and builds MUST
use `vp` commands instead of invoking pnpm, npm, yarn, vite, or vitest
directly. Imports that are toolchain-sensitive MUST follow project guidance,
including `vite-plus` usage where applicable.

Rationale: This repository standardizes on Svelte 5 and Vite+ to reduce tool
drift, broken local workflows, and inconsistent CI behavior.

### IV. Durable State Before Convenience

User-visible state with cross-request, cross-session, or recovery implications
MUST have an explicit durable persistence model, ownership boundary, and repair
path. Specs and plans MUST identify the source of truth for chats, studios,
skills, files, runtime metadata, and deployment metadata before implementation.
Temporary in-memory shortcuts are allowed only for strictly local UI state or
clearly time-boxed migrations documented in the plan.

Rationale: Nova Cloud manages long-lived studios, chats, uploads, runtime
records, and deployable workspaces where accidental state loss is a product
failure, not an implementation detail.

### V. Validation Is a Release Gate

Every implementation change MUST define how it will be validated and MUST pass
the relevant repository gates before completion. At minimum, affected work MUST
run targeted tests plus `vp check`; larger feature work SHOULD also run `vp
test` or feature-specific suites. Specs MUST include measurable success
criteria, plans MUST name verification artifacts, and tasks MUST include the
work needed to prove correctness for primary flows, edge cases, and regressions.

Rationale: The product spans UI, auth, storage, runtime orchestration, and
deployment surfaces where regressions are expensive and often cross-cutting.

## Product & Technical Constraints

- Canonical stack for Nova Cloud work is SvelteKit, Svelte 5, Better Auth,
  Surreal-backed durable records, Nova-managed runtimes, and R2-compatible
  storage unless a plan explicitly approves a deviation.
- Specs MUST distinguish product-facing concepts from implementation terms. In
  particular, `workspace` is not `sandbox`, and `Integrations` is the
  user-facing label even if internal records still use extension-oriented names.
- New runtime or deployment features MUST define observability signals,
  operational failure states, and safe retry or recovery behavior.
- Security-sensitive changes MUST identify auth, authorization, secret
  handling, and tenancy boundaries for Studio-scoped data and runtime access.

## Delivery Workflow & Quality Gates

- The required planning sequence for substantial feature work is
  `constitution -> specify -> clarify -> plan -> checklist -> tasks -> analyze -> implement`.
- `clarify`, `checklist`, and `analyze` are optional only when their output
  would not materially reduce ambiguity or delivery risk; if skipped, the plan
  or implementation summary MUST state why.
- Specs MUST stay implementation-agnostic and describe user value, acceptance
  scenarios, edge cases, assumptions, and measurable success criteria.
- Plans MUST resolve architecture choices, persistence boundaries, interfaces,
  and validation strategy before task generation.
- Tasks MUST be dependency-ordered, file-specific, and organized so a user
  story can be implemented and verified independently where practical.
- Implementation is not complete until the corresponding tasks are updated,
  validation evidence is recorded, and any constitution-impacting deviations are
  either removed or escalated through a constitution amendment.

## Governance

This constitution supersedes ad hoc feature preferences for Nova Cloud. Reviews,
plans, and task generation MUST treat these principles as binding constraints.

Amendment policy:

- A PATCH version is for wording fixes, clarifications, or non-semantic cleanup.
- A MINOR version is for new principles, materially expanded guidance, or new
  required gates.
- A MAJOR version is for removed principles or incompatible governance changes.

Compliance policy:

- Every feature plan MUST include a constitution check.
- Every implementation review MUST verify toolchain compliance, terminology
  consistency, runtime boundary clarity, durability expectations, and
  validation coverage.
- If a feature requires violating this constitution, the constitution MUST be
  amended first or the feature MUST be re-scoped.

**Version**: 1.0.0 | **Ratified**: 2026-05-09 | **Last Amended**: 2026-05-09
