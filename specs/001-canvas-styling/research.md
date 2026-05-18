# Research: Canvas Styling Layer

## Decision 1: Keep `View` as the primitive substrate, not the primary authoring model

**Decision**: Use the existing primitive `View` concept as the lowest-level rendering base,
then build semantic Canvas components such as layout wrappers, card components, and dashboard
shell components on top of it.

**Rationale**: This preserves the extensibility of the existing Canvas concept while
preventing feature work from devolving into raw style-property authoring for every screen.
It keeps future JSON-driven composition viable without forcing all persisted UI definitions to
look like low-level layout instructions.

**Alternatives considered**:

- Use `View` as the primary authoring model for all components.
  Rejected because it turns semantic UI composition into a low-level style DSL and makes the
  dashboard slice harder to keep aligned with the reference component structure.
- Discard `View` and build only semantic components.
  Rejected because the primitive layer is still valuable for advanced composition, fallback
  rendering, and future data-driven layout use cases.

## Decision 2: Implement the first slice around semantic dashboard shells, not full parity

**Decision**: Scope the first implementation slice to layout primitives, card family,
sidebar shell, page header, and shell-level chart/table containers.

**Rationale**: This is the fastest route to making the Canvas demo feel real while proving
the architecture. It exercises layout, spacing, hierarchy, and semantic wrappers without
blocking on advanced chart logic or full data-table behavior.

**Alternatives considered**:

- Reimplement the entire dashboard, including advanced table interactions and chart behavior.
  Rejected because it would slow the first milestone and hide whether the semantic component
  architecture is sound.
- Start with only the primitive layer.
  Rejected because it would not demonstrate end-user value or visual parity on the demo page.

## Decision 3: Match reference structure and styling intent without importing reference CSS

**Decision**: Canvas components should visually align with the reference dashboard using
Canvas-owned styles and semantic props, without importing the reference package stylesheet.

**Rationale**: This validates the actual product goal: Canvas must own its styling layer and
eventually support data-driven styling, not simply proxy the reference package's classes.

**Alternatives considered**:

- Import the reference stylesheet to speed up the demo.
  Rejected because it would hide the real styling work and weaken the separation between the
  two packages.
- Copy class names one-for-one into Canvas as the final contract.
  Rejected because the long-term goal is semantic, data-driven styling rather than raw class
  dependency.

## Decision 4: Treat `shadcn-svelte` as the structural reference package

**Decision**: Use the current `shadcn-svelte` package as the source of truth for the
supported dashboard slice's structure, slot hierarchy, and visual intent.

**Rationale**: The reference package is already fresh, packageable, and successfully consumed
by Canvas. Matching it component family by component family gives Canvas a concrete target and
avoids inventing structure prematurely.

**Alternatives considered**:

- Reinterpret the dashboard design independently inside Canvas.
  Rejected because it would weaken parity and make regressions harder to review.
- Copy all reference components wholesale and restyle later.
  Rejected because it would collapse the distinction between reference package and Canvas
  styling layer.

## Decision 5: Use a semantic public API contract for the initial Canvas slice

**Decision**: The first Canvas styling layer should expose primitive exports and semantic
dashboard-facing exports as separate concerns.

**Rationale**: This keeps low-level flexibility available while encouraging future authoring
and JSON-driven composition to target semantic components first.

**Alternatives considered**:

- Expose only primitive components.
  Rejected because it would force feature authors to rebuild semantic structure repeatedly.
- Expose only semantic components.
  Rejected because it would reduce flexibility for later advanced or generated layouts.
