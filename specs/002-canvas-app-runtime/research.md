# Research: Canvas App Runtime

## Decision 1: Introduce `CanvasApp` as a real runtime root

**Decision**: Add `CanvasApp` above the renderer instead of treating the document or `Canvas` itself as the app shell.

**Rationale**: The landing-hero typography issue exposed that runtime concerns were being smeared across components and document content. A dedicated runtime root gives one place to own responsive config, provider wiring, splash state, and future app-level concerns.

**Alternatives considered**:

- Keep everything on `Canvas`. Rejected — turns the renderer into the app shell.
- Put runtime config directly in `CanvasDocument`. Rejected — pollutes authored serializable content with runtime-only concerns.
- Hardcode runtime concerns per route. Rejected — duplicates logic and blocks editor/runtime coherence.

## Decision 2: Keep `CanvasApp`, `CanvasDocument`, and `Canvas` as separate concepts

**Decision**: Preserve a strict conceptual split:

1. `CanvasApp` = runtime shell
2. `CanvasDocument` = authored model
3. `Canvas` = renderer

**Rationale**: This separation is foundational for future extension work, provider-backed widgets, and editor clarity. It also keeps Canvas architecture legible for both humans and agents.

**Alternatives considered**:

- Collapse app and document into one structure. Rejected — harder to evolve and reason about.
- Treat the renderer as both runtime and render layer. Rejected — muddles responsibilities.

## Decision 3: Use app-owned breakpoint definitions with sensible defaults

**Decision**: Responsive thresholds should come from root/app configuration, with Tailwind-like defaults when not overridden.

**Rationale**: Components should not hardcode their own breakpoint scale. Root-owned breakpoint definitions allow one app to customize responsive behavior without rewriting each component.

**Alternatives considered**:

- Hardcode breakpoints in every component. Rejected — inconsistent and not editable.
- Only support a single global package default. Rejected — too rigid for product-level control.

## Decision 4: Support both viewport and container responsive modes in the stored value model

**Decision**: Store both viewport and container branches in `ResponsiveValue`, with only one branch active at render time.

**Rationale**: Authors and future editor tooling need to switch modes without losing the inactive branch. This also future-proofs the data model for richer responsive editing UI.

**Alternatives considered**:

- Store only the active mode branch. Rejected — switching modes would destroy data.
- Treat container mode as future work only. Rejected — the spec explicitly requires both modes.

## Decision 5: Support sparse breakpoint overrides

**Decision**: Responsive mode branches use base-plus-overrides rather than requiring values for every breakpoint.

**Rationale**: Most authored content only needs a base value and one or two overrides. Sparse storage keeps data compact and easier to author.

**Alternatives considered**:

- Require a value at every breakpoint. Rejected — verbose and hostile to editor UX.

## Decision 6: Move typography ownership into `Text`

**Decision**: `Text` should own responsive typography fields including size, weight, line height, letter spacing, and text alignment.

**Rationale**: The original hero bug happened because Tailwind typography classes were no longer the true source of text sizing once content moved into data-driven Canvas text nodes. Typography must live where text is actually rendered.

**Alternatives considered**:

- Keep sizing on Tailwind utility classes. Rejected — not compatible with data-driven text primitives.
- Push typography logic into each block. Rejected — duplicates logic across blocks.

## Decision 7: Preserve classes for non-typography concerns

**Decision**: Even though typography is resolved by `Text`, classes remain allowed for animation, layout, spacing, and visual effects.

**Rationale**: Removing classes entirely would overcorrect and make authored components less expressive. The goal is to move typography ownership, not ban legitimate non-typography styling.

**Alternatives considered**:

- Ban classes entirely on `Text`. Rejected — too restrictive.
- Continue using classes for typography too. Rejected — undermines the reason `002` exists.

## Decision 8: Centralize provider runtime at the app boundary

**Decision**: `providerData` and `providerActions` flow through `CanvasApp` rather than being managed ad hoc by individual document renderers.

**Rationale**: This keeps integrations and future extension surfaces aligned with the app/runtime boundary instead of baking provider assumptions into the authored document layer.

**Alternatives considered**:

- Keep provider wiring only in `Canvas`. Rejected — weakens the runtime boundary.
- Store provider state inside the document. Rejected — mixes runtime with serialized content.

## Decision 9: Converge on `CanvasEditor` as the generic editor

**Decision**: The Canvas package should expose `CanvasEditor` as the generic editor, while `StudioEditor` remains a product-layer wrapper or compatibility surface.

**Rationale**: The editor model should belong to the library, not the product. This also keeps future product-specific editors free to extend or wrap the generic surface.

**Alternatives considered**:

- Keep `StudioEditor` as the package-level primary editor forever. Rejected — wrong ownership boundary.
- Delete `StudioEditor` immediately. Rejected — compatibility and migration still matter.

## Decision 10: Leave room for future extension/scoped-registry work

**Decision**: `002` should explicitly hand off into future extension-oriented work without implementing the whole extension model here.

**Rationale**: The runtime boundary must be designed with extension assembly in mind, but `002` should stay focused on the foundation rather than absorbing later specs.

**Alternatives considered**:

- Implement full extension architecture inside `002`. Rejected — scope explosion.
- Ignore extension implications entirely. Rejected — would lead to repainting the runtime boundary later.

## Open Research Question

The main unresolved question after implementation review is editor-root semantics:

- Is app-level editing via explicit App panels sufficient?
- Or should `CanvasApp` become a literal first-class selection object in editor state?

The current implementation supports app-level editing, but the root-selection abstraction is still softer than the original spec language implied.
