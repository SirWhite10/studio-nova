# Feature Specification: Canvas App Runtime

**Feature Branch**: `002-canvas-app-runtime`  
**Created**: 2026-05-17  
**Status**: Draft  
**Input**: User description: "Introduce a first-class CanvasApp runtime root for Canvas documents, with app-level responsive breakpoint configuration, viewport/container responsive values, provider runtime wiring, splash/loading shell support, and a clearer separation between CanvasApp, CanvasDocument, and Canvas renderer responsibilities."

## Feature Rationale

This feature was not proposed in the abstract; it came from a concrete implementation problem.

During the landing hero work, the hero was moved into a data-driven Canvas block. The heading and paragraph were rendered through Canvas `Text` primitives, but those primitives generate inline typography styles. As a result, Tailwind typography utility classes on the hero content no longer acted as the true typography source.

Rather than adding more local exceptions, this led to a broader architectural decision:

- `Text` should own responsive typography directly
- responsive behavior should be resolved from shared app/runtime configuration
- app/runtime concerns need a dedicated `CanvasApp` root above the renderer
- the editor should have a meaningful root object to select and inspect
- the generic editor should belong to Canvas, while a customized workspace/studio editor should belong to nova-cloud
- the current package-level `StudioEditor` implementation should be renamed/generalized toward `CanvasEditor` during migration

This spec therefore captures both the immediate technical need and the intentionally broader solution.

## Conceptual reference

A useful reference point is **Puck** (React), specifically the schema-driven visual editor pattern:

- registered renderable components
- serialized authored content/data
- field definitions attached to components
- generic visual editing over a constrained registry

This feature should adopt the useful concepts while preserving Canvas-specific goals:

- stronger runtime/app/document separation
- support for provider-backed widgets and app surfaces
- a generic editor that is optional rather than mandatory for every integration
- type- and manifest-driven contracts that are friendly to LLMs and code harnesses

## Recovery summary

If a future developer must restart this feature from scratch, the intended reasoning chain is:

1. The hero text issue exposed a mismatch between Canvas `Text` inline typography and Tailwind text sizing classes.
2. The correct fix is to move typography ownership into `Text` responsive props.
3. That requires a reusable responsive system.
4. A reusable responsive system requires root/app-owned breakpoint config.
5. Root/app-owned runtime config implies a `CanvasApp` shell above `Canvas`.
6. Once `CanvasApp` exists, the editor root should select `CanvasApp` rather than doing nothing.
7. The generic editor belongs in Canvas; the product-specific Studio experience belongs in nova-cloud.
8. Integrations should be able to target manifests, providers, widgets, and schemas even when they do not use the default editor UI.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Render Canvas through an app runtime root (Priority: P1)

A developer can render any Canvas document through a `CanvasApp` root that owns runtime concerns while leaving `Canvas` as a renderer-only primitive.

**Why this priority**: This establishes the core architectural boundary needed for responsiveness, providers, splash behavior, and future extension work.

**Independent Test**: Can be tested by rendering an existing Canvas document through `CanvasApp` and verifying that the document still renders while runtime concerns are provided from above the renderer.

**Acceptance Scenarios**:

1. **Given** a Canvas document and component registry, **When** a page renders the document, **Then** it can render through `CanvasApp` without making `CanvasApp` a document child node.
2. **Given** the runtime hierarchy, **When** the Canvas tree is inspected, **Then** `CanvasApp` acts as the runtime root, `CanvasDocument` remains the authored model, and `Canvas` remains the renderer.

---

### User Story 2 - Configure responsive behavior at the app/root level (Priority: P1)

A developer can define app-level breakpoint definitions and use responsive values that resolve against viewport or container mode without hardcoding breakpoint thresholds inside each component.

**Why this priority**: Data-driven responsiveness is a primary goal of the feature and is foundational for future editor support.

**Independent Test**: Can be tested by defining root breakpoint configuration and a responsive text configuration, then verifying the resolved values change according to the active mode and breakpoint state.

**Acceptance Scenarios**:

1. **Given** default app breakpoints, **When** a responsive prop resolves, **Then** it uses the Tailwind-like default breakpoint scale unless overridden by app config.
2. **Given** custom root breakpoint definitions, **When** a responsive prop resolves, **Then** it uses the app-provided breakpoint thresholds instead of hardcoded package defaults.
3. **Given** a responsive field that stores both viewport and container branches, **When** its active mode switches, **Then** the inactive branch is preserved and only the selected branch is rendered.

---

### User Story 3 - Let Text own responsive typography while preserving utility classes for non-typography concerns (Priority: P2)

A developer can author hero and app copy with Canvas `Text` primitives whose typography is controlled by responsive props, while still using classes for animation, layout, and visual effects.

**Why this priority**: This resolves the current mismatch between Tailwind typography classes and inline text styles while preserving editor-friendly text nodes.

**Independent Test**: Can be tested by rendering a hero title and paragraph through `Text` with responsive props and confirming the intended sizes resolve without relying on Tailwind typography utilities.

**Acceptance Scenarios**:

1. **Given** a `Text` node with responsive `size` and `weight`, **When** breakpoints change, **Then** the rendered typography updates according to the resolved responsive values.
2. **Given** a `Text` node with non-typography utility classes, **When** it renders, **Then** animation/layout/effect classes continue to apply without being used as the primary typography source.

---

### User Story 4 - Provide a stable runtime surface for future providers and extensions (Priority: P3)

A developer can treat `CanvasApp` as the app/runtime boundary where providers, actions, and future extension contributions are registered and delivered to rendered documents.

**Why this priority**: This feature is the foundation for later integration widgets, scoped registries, and extension-driven app surfaces.

**Independent Test**: Can be tested by providing provider data/actions through the app runtime and confirming those values are accessible through the existing Canvas runtime flow.

**Acceptance Scenarios**:

1. **Given** provider data and provider actions, **When** they are supplied through `CanvasApp`, **Then** rendered Canvas nodes can access them through the runtime pipeline.
2. **Given** a future extension-oriented app surface, **When** it assembles a scoped registry and runtime config, **Then** the architecture supports that assembly without redefining `Canvas` as the app shell.

### User Story 5 - Treat the app root as the editor root (Priority: P3)

A developer using the generic Canvas editor can select the root app object and edit app-level runtime fields such as breakpoints and provider-related configuration, while nova-cloud remains free to wrap that editor in a workspace-specific Studio experience.

**Why this priority**: This keeps the library editor generic while preserving a meaningful root selection model for future editor UX.

**Independent Test**: Can be tested by confirming the editor architecture treats `CanvasApp` as the root selection target rather than leaving the top-level selection empty or document-only.

**Acceptance Scenarios**:

1. **Given** the generic Canvas editor, **When** the root is selected, **Then** the inspector can target app-level fields rather than a no-op root.
2. **Given** nova-cloud needs a workspace-specific editor, **When** it builds on top of the generic editor, **Then** it can provide a customized `StudioEditor` wrapper without changing the core Canvas editor model.

### Edge Cases

- What happens when no app-level breakpoint overrides are provided?
- What happens when a responsive field defines only `base` and one later breakpoint override?
- What happens when the active responsive mode is `container` but no container width source is available yet?
- How does the runtime behave during SSR before client-side breakpoint matching becomes available?
- What happens when existing Canvas entry points still render without an explicit `CanvasApp` wrapper during migration?
- What happens during editor migration while the current package-level `StudioEditor` is being generalized toward `CanvasEditor`?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Canvas MUST introduce a first-class `CanvasApp` runtime root for rendering Canvas documents.
- **FR-002**: `CanvasApp` MUST remain outside the authored document tree and MUST NOT be represented as the first child node of a `CanvasDocument`.
- **FR-003**: Canvas MUST preserve the distinction between `CanvasApp` as runtime shell, `CanvasDocument` as authored serializable model, and `Canvas` as renderer.
- **FR-004**: The runtime system MUST support root/app-level breakpoint definitions with sensible Tailwind-like defaults.
- **FR-005**: The responsive value model MUST support both `viewport` and `container` modes.
- **FR-006**: Responsive values MUST preserve both viewport and container branches even when only one mode is currently active.
- **FR-007**: Responsive values MUST support sparse breakpoint overrides so users are not required to provide values for every breakpoint.
- **FR-008**: The runtime MUST resolve responsive values from root/app breakpoint configuration rather than requiring each component to hardcode media query thresholds.
- **FR-009**: The `Text` primitive MUST support responsive typography ownership for at least `size`, `weight`, `lineHeight`, `letterSpacing`, and `textAlign`.
- **FR-010**: `Text` MUST preserve class-based styling for non-typography concerns such as animation, layout, spacing, and visual effects.
- **FR-011**: The provider/runtime pipeline MUST be routable through `CanvasApp` so provider data and actions can be centralized at the app/runtime layer.
- **FR-012**: The implementation MUST preserve compatibility or provide a migration path for current Canvas render entry points during adoption.
- **FR-013**: The feature MUST document the runtime hierarchy clearly in package-level planning and package documentation.
- **FR-014**: The app/root responsive configuration MUST be designed so future editor UI can expose editable breakpoint definitions and responsive field controls without changing the stored value model.
- **FR-015**: The feature MUST leave a clear handoff path for future scoped registries, extension contributions, and integration-backed widgets.
- **FR-016**: The editor architecture MUST be able to treat `CanvasApp` as the root selection target for app-level editing.
- **FR-017**: The Canvas library SHOULD evolve toward a generic `CanvasEditor`, while nova-cloud remains free to provide a customized `StudioEditor` wrapper built on top of it.
- **FR-018**: The documented architecture MUST make clear that nova-cloud may expose additional or different editor configuration at the Studio/product layer without redefining the base Canvas editor contract.
- **FR-019**: The migration plan SHOULD explicitly treat the current package-level `StudioEditor` implementation as a rename/generalization candidate toward `CanvasEditor`, with temporary compatibility aliasing allowed during transition.

### Key Entities _(include if feature involves data)_

- **CanvasApp**: The top-level runtime shell that owns app-wide responsive configuration, provider runtime wiring, splash/loading behavior, and future app/runtime concerns.
- **CanvasDocument**: The authored, serializable composition model containing nodes, props, slots, and structure to render.
- **Canvas**: The rendering component that receives a document, a component registry, and runtime inputs and renders the requested composition.
- **Canvas Responsive Config**: The root/app-owned definition of viewport and container breakpoint thresholds and labels used during responsive resolution.
- **ResponsiveValue**: A value model that stores both viewport and container branches plus the currently selected active mode.
- **ResponsiveModeValue**: A sparse base-plus-overrides structure for a single responsive mode branch.
- **Provider Runtime**: The app/runtime-owned set of provider data and provider actions exposed to rendered nodes through Canvas runtime context.
- **CanvasEditor**: The generic editor surface for the Canvas library, intended to edit app-level and document/component-level state.
- **StudioEditor**: A future nova-cloud-owned workspace-specific wrapper around the generic Canvas editor model.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Existing or updated Canvas demos can render through `CanvasApp` while preserving the authored document/rendering split.
- **SC-002**: At least one Canvas example demonstrates root-configured responsive values resolving from app-defined breakpoints rather than fixed component-local values.
- **SC-003**: The landing Canvas hero can render its title and paragraph using responsive `Text` props rather than relying on Tailwind typography utility classes for sizing.
- **SC-004**: Provider data/actions can be supplied from the runtime root and consumed through the Canvas runtime pipeline without redefining authored document structure.
- **SC-005**: Package planning and package README both clearly describe the `CanvasApp` → `CanvasDocument` → `Canvas` hierarchy.

## Assumptions

- The current Canvas package remains a compiled Svelte library used by nova-cloud and related apps.
- Breakpoint definitions are data-driven and SSR-compatible as configuration, while actual viewport/container matching remains runtime/client-driven.
- Initial implementation focuses on the responsive foundation and runtime boundary rather than full editor UI for responsive controls.
- Future extension/plugin work will build on this runtime boundary rather than redefining the renderer itself.
- nova-cloud will own the product/workspace-specific Studio layer, even when it composes the generic Canvas editor and runtime contracts from this package.
