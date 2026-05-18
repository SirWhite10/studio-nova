# Canvas Plan: Extension Contribution Model

- **Plan Date:** 2026-05-17
- **Planned Start:** 2026-05-17
- **Target Completion:** 2026-05-26
- **Status:** Planned
- **Owners:** Canvas package
- **Dependencies:** `canvas-app-runtime` foundation
- **Related Plans:**
  - `planning/26-05-17-canvas-app-runtime-and-responsive-foundation.md`

## Summary

Define the extension/plugin contribution model for Canvas so that future apps, dashboards, integrations, and editor experiences can be assembled from scoped registries, provider-backed widgets, domain-specific editor definitions, and governed runtime capabilities.

## Why this plan exists now

This plan is being written in parallel with the runtime foundation because the runtime/editor boundary affects how future integrations should be designed.

The key reasoning is:

- if `CanvasApp` owns runtime concerns, then extensions should plug into that runtime boundary
- if the generic editor becomes `CanvasEditor`, then extension editor contributions should target that generic surface
- if nova-cloud owns the customized `StudioEditor`, then workspace/product-specific controls should not define the core extension contract for the library

This separation is important for future handoff so another developer can distinguish between:

- library-level extension contracts
- product/workspace-level composition and customization

The same naming direction should apply to the editor layer:

- the Canvas package should converge on `CanvasEditor`
- the nova-cloud product layer should own `StudioEditor`

## External reference and design stance

A useful conceptual reference is **Puck** (React), mainly for:

- schema-driven component editing
- serialized authored data
- default inspector generation from declared field definitions
- visual composition around a registry of allowed components

Canvas should not copy it directly.

Canvas should preserve these differences:

- stronger runtime separation via `CanvasApp`
- extension support aimed at widgets/providers/integrations, not only block/page authoring
- support for **manifest-only** contributions when an integration does not need the generic editor UI
- a type surface designed to be readable by **LLMs and code harnesses**
- product-specific editing remaining in nova-cloud rather than being forced into the library

## Recovery / handoff summary

If this track needs to be resumed later, the intended direction is:

1. Build the runtime boundary first (`CanvasApp`).
2. Keep the generic editor contract in Canvas (`CanvasEditor`).
3. Let integrations target manifests, widgets, providers, and field schemas.
4. Do not require every integration to use the generic editor UI.
5. Allow manifest-only or schema-only integrations where appropriate.
6. Keep arbitrary code execution out of Canvas by default.
7. Treat sandboxed custom code, if needed later, as a nova-cloud concern.

This plan assumes:

- `CanvasApp` is the runtime root
- `CanvasDocument` is the authored serializable model
- `Canvas` is the renderer
- extensions contribute capabilities into a controlled Canvas runtime model
- arbitrary user-authored code execution is **not** the default Canvas extension strategy

---

## Runtime hierarchy reference

The runtime hierarchy remains:

1. **`CanvasApp`** — runtime root and app shell
2. **`CanvasDocument`** — authored document/data model
3. **`Canvas`** — renderer

Extensions plug into the runtime and registry layers around this hierarchy. They do not replace it.

---

## Primary Goals

1. Define a stable extension contribution model for Canvas.
2. Support scoped component registries per app/document/editor surface.
3. Support provider-backed integration widgets.
4. Support domain-specific editor definitions contributed by extensions.
5. Support extension-provided app/document presets and templates.
6. Keep the extension model typed, governable, and agent-friendly.
7. Leave room for sandboxed custom code execution later in nova-cloud without making it the default Canvas behavior.

---

## Non-Goals for This Plan

1. Build a full marketplace or package distribution system.
2. Execute arbitrary uploaded user source files inside the Canvas library runtime.
3. Support direct remote URL imports as the primary extension mechanism.
4. Design a final billing/auth/distribution model.
5. Fully implement isolate execution in this package.

---

## Architecture assumptions

This plan assumes the following runtime work lands first:

- `CanvasApp` exists as the runtime root
- provider runtime and app-level configuration are centralized
- responsive config and root breakpoints are app-owned
- component registry assembly can be scoped and extended
- editor schemas can be provided per component definition
- the generic editor surface in Canvas can evolve into `CanvasEditor`, while nova-cloud owns the customized studio/workspace editor layer

---

## Core concepts

### 1. Extension / plugin

A package or contribution unit that adds new capabilities to Canvas.

### 2. Contribution manifest

The typed declaration of what an extension provides.

### 3. Scoped registry

A runtime-assembled component/widget registry limited to the current app/document/editor use case.

### 4. Widget contribution

A renderable, configurable, often provider-backed unit intended for surfaces like dashboards.

### 5. Editor contribution

Field definitions, grouping, inspector metadata, and possibly custom field UIs defined by the extension.

These contributions should target the generic Canvas editor model rather than hard-coding nova-cloud workspace behavior into the Canvas library.

### 6. Provider contribution

A typed data/action/integration contribution that supplies runtime data to widgets/components.

### 7. App preset contribution

A predefined app/runtime configuration or app shell tailored to a specific use case.

### 8. Document preset/template contribution

A predefined authored document structure that can be inserted, cloned, or scaffolded.

---

## Extension strategy and governance

## Recommendation

Canvas should default to a **governed extension model**.

That means:

- Canvas exposes typed extension interfaces
- Canvas supports governed/approved component and widget contributions
- Canvas does **not** directly execute arbitrary user-authored `.ts` or `.svelte.ts` files from object storage as its primary extension path

## Why

1. Svelte component code is compile-time oriented and often requires bundling/resolution.
2. Arbitrary remote code loading introduces security, governance, support, and reproducibility risk.
3. Agentic app generation works better against a stable, typed, predictable component surface.
4. Canvas is a library for nova-cloud and should remain runtime-safe and deterministic.

## Future-compatible path

Later, **nova-cloud** may provide:

- isolate/sandbox-based extension execution
- build/package/validation pipelines for user-authored extensions
- compiled and approved extension artifacts
- tenant-scoped extension enablement

But this should remain a nova-cloud concern, not the default Canvas runtime behavior.

The same principle applies to the editor:

- Canvas defines the generic extension/editor/runtime contracts
- nova-cloud decides how the Studio product exposes those contracts to users, agents, and workspace-specific tooling

---

## Contribution categories

Extensions may eventually contribute:

1. **Components**
   - renderable components registered into Canvas
2. **Widgets**
   - higher-level, often provider-backed dashboard/app modules
3. **Providers**
   - data sources, actions, integration bindings
4. **Editor schemas**
   - field definitions, groups, labels, descriptions, custom field UIs
5. **Documents/templates**
   - starter documents and reusable blueprints
6. **App presets**
   - app/runtime shells or default runtime configuration
7. **Actions/triggers**
   - user interactions or runtime hooks
8. **Inspector/authoring metadata**
   - editor categorization, insertion metadata, grouping, restrictions

---

## Scoped registry model

Not every Canvas surface should expose every component.

A registry should be assembled per runtime/app/editor context, for example:

- marketing page canvas
- auth canvas
- dashboard canvas
- integration-specific canvas
- internal tools canvas

This enables:

- tighter UX
- smaller authoring surface
- integration-specific widget availability
- safer component restrictions

### Registry expectations

A scoped registry should be able to include:

- core primitives
- app-approved components
- extension-approved widgets
- integration-contributed editor definitions

---

## Widget model

Widgets should be first-class contribution types, not just ad hoc JSON blobs.

A widget should be able to define:

- render component/type
- props/config schema
- provider dependencies
- editor field definitions
- insertion metadata
- optional presets/defaults

## Example: Shopify integration

A Shopify extension may contribute widgets like:

- `Shopify.Sales24HoursWidget`
- `Shopify.WeeklySalesWidget`
- `Shopify.TopProductsWidget`

These widgets should expose editor-facing fields like:

- sales period
- metric source
- store/account binding
- comparison range
- display variant

Not just primitive low-level style fields.

---

## Editor definition model

Extensions should be able to contribute domain-specific editor definitions.

Examples:

- "Sales from past 24 hours"
- "Sales from this week"
- "Compare against previous period"
- "Connected store"
- "Attribution source"

The editor model should support:

- field groups
- select fields
- provider-backed fields
- object fields
- arrays
- conditional fields
- future custom field renderers

This is distinct from primitive style editing and is necessary for integration-backed widgets.

---

## Dashboard direction

The dashboard likely spans both app and document layers.

### As a document

Dashboard layout is a `CanvasDocument`:

- grid structure
- widget placement
- drag/drop order
- persisted layout state

### As an app

Dashboard runtime/editor shell is a `CanvasApp` specialization:

- scoped widget registry
- providers/integrations
- drag/drop and sort runtime behavior
- permissions and app-level config

## Working recommendation

- **dashboard layout = document**
- **dashboard runtime/editor experience = app**

---

## Data-defined vs code-defined extensions

## Default recommendation: data-defined first

Prefer extension contributions that are primarily:

- typed manifests
- JSON/widget configuration
- provider bindings
- editor schema definitions
- templates/presets

This should cover many integrations safely.

## Code-defined extensions

Reserve true code-defined extensions for cases requiring:

- custom rendering logic
- custom field UI
- complex behavior not representable by existing primitives
- custom runtime data behavior

These should be treated as a later, more governed capability.

---

## Future isolate/sandbox direction

This package should **not** be the primary place where arbitrary user extension code executes.

If/when custom code execution is needed, the recommended future path is:

1. user authors extension in nova-cloud-compatible format
2. nova-cloud builds/validates the extension in isolation
3. compiled artifact + typed manifest are produced
4. tenant/app enables approved extension
5. Canvas consumes approved contribution data/runtime interfaces

This keeps Canvas:

- deterministic
- typed
- supportable
- agent-friendly

---

## AI/agent compatibility direction

Canvas should remain highly typed so AI agents can reason about:

- available components
- widget manifests
- editor field schemas
- provider capabilities
- app/document presets

A stable, governed extension surface is better for agentic generation than arbitrary runtime code loading.

---

## Proposed future type areas

### Extension core

- `CanvasExtensionManifest`
- `CanvasExtensionMetadata`
- `CanvasExtensionContributionSet`

### Component/widget contributions

- `CanvasComponentContribution`
- `CanvasWidgetContribution`
- `CanvasWidgetPreset`

### Provider contributions

- `CanvasProviderContribution`
- `CanvasActionContribution`
- `CanvasIntegrationContribution`

### Editor contributions

- `CanvasEditorFieldContribution`
- `CanvasInspectorContribution`
- `CanvasFieldRendererContribution`

### Presets/templates

- `CanvasDocumentTemplateContribution`
- `CanvasAppPresetContribution`

### Registry assembly

- `CanvasScopedRegistryConfig`
- `CanvasRegistryAssemblyOptions`

---

## Proposed phased implementation roadmap

## Phase 0 — Parallel planning and dependency alignment

- **Start:** 2026-05-17
- **Target Completion:** 2026-05-17
- **Status:** Planned

### Tasks

1. Record extension model assumptions.
2. Link extension plan to runtime plan.
3. Record governance strategy and isolate direction.

---

## Phase 1 — Extension manifest design

- **Start:** 2026-05-24
- **Target Completion:** 2026-05-25
- **Status:** Planned

### Tasks

1. Define core extension manifest types.
2. Define contribution categories and metadata shape.
3. Define versioning/compatibility notes.

---

## Phase 2 — Scoped registry assembly model

- **Start:** 2026-05-25
- **Target Completion:** 2026-05-26
- **Status:** Planned

### Tasks

1. Define registry assembly rules.
2. Define allowlist/scoping behavior.
3. Define extension merge/collision rules.

---

## Phase 3 — Widget contribution model

- **Start:** 2026-05-26
- **Target Completion:** 2026-05-27
- **Status:** Planned

### Tasks

1. Define widget contribution shape.
2. Define widget/editor/provider relationship.
3. Define insertion/catalog metadata.

---

## Phase 4 — Editor contribution model

- **Start:** 2026-05-27
- **Target Completion:** 2026-05-28
- **Status:** Planned

### Tasks

1. Define extension-provided editor field schemas.
2. Define future custom field renderer contribution hooks.
3. Define editor grouping/inspector conventions.

---

## Phase 5 — Dashboard specialization model

- **Start:** 2026-05-28
- **Target Completion:** 2026-05-29
- **Status:** Planned

### Tasks

1. Define dashboard document conventions.
2. Define dashboard app/runtime conventions.
3. Define drag/drop/sort/widget constraints at the planning level.

---

## Phase 6 — Integration example contributions

- **Start:** 2026-05-29
- **Target Completion:** 2026-05-30
- **Status:** Planned

### Tasks

1. Model a Shopify contribution example.
2. Model at least one additional provider/integration example.
3. Validate editor schema approach against real widget cases.

---

## Phase 7 — Governance and sandbox handoff notes

- **Start:** 2026-05-30
- **Target Completion:** 2026-05-31
- **Status:** Planned

### Tasks

1. Record the boundary between Canvas and nova-cloud responsibilities.
2. Record future sandbox/isolate handoff requirements.
3. Record later packaging/publication concerns.

---

## Risks

1. **Too much flexibility too early**
   - Keep core contribution types narrow at first.
2. **Registry collisions**
   - Require namespacing and contribution merge rules.
3. **Unsafe custom code pressure**
   - Maintain governed defaults and defer sandbox execution to nova-cloud.
4. **Editor schema sprawl**
   - Standardize field contracts before allowing custom field renderers.
5. **Runtime/document confusion**
   - Preserve `CanvasApp` vs `CanvasDocument` distinction.

---

## Dependencies on runtime plan

This plan depends on:

1. `CanvasApp` runtime root
2. provider/runtime foundation
3. root-config-driven responsive system
4. stable component registry APIs
5. clear document vs app separation

---

## Acceptance criteria

This planning track is ready for later implementation when:

1. Extension contribution categories are defined clearly.
2. Scoped registry behavior is defined clearly.
3. Widget and provider contribution relationships are defined clearly.
4. Editor contribution direction is defined clearly.
5. Governance guidance is explicit.
6. The future nova-cloud isolate path is documented as a separate concern.

---

## Follow-Up Work

1. Turn this plan into concrete type definitions.
2. Add extension manifest examples.
3. Add dashboard/widget examples.
4. Add README/docs guidance for integrations and extensions.
5. Add nova-cloud handoff notes for sandbox execution.

---

## Notes for later review

- Re-evaluate when custom code extensions become necessary.
- Re-evaluate whether data-defined widgets cover most real integrations.
- Re-evaluate registry assembly APIs after `CanvasApp` implementation lands.
- Re-evaluate the dashboard surface as a dedicated app preset after runtime work is complete.
