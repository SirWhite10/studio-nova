# Checklist: Canvas App Runtime — Requirements Traceability

## Runtime Boundary

- [x] **FR-001**: Canvas introduces a first-class `CanvasApp` runtime root
- [x] **FR-002**: `CanvasApp` remains outside the authored document tree
- [x] **FR-003**: `CanvasApp`, `CanvasDocument`, and `Canvas` remain distinct concepts

## Responsive Foundation

- [x] **FR-004**: App/root-level breakpoint definitions exist with sensible defaults
- [x] **FR-005**: Responsive values support both `viewport` and `container` modes
- [x] **FR-006**: Stored responsive values preserve both branches even when one mode is active
- [x] **FR-007**: Responsive values support sparse breakpoint overrides
- [x] **FR-008**: Responsive values resolve from root/app config rather than component-local thresholds

## Text Ownership

- [x] **FR-009**: `Text` supports responsive typography for `size`
- [x] **FR-009**: `Text` supports responsive typography for `weight`
- [x] **FR-009**: `Text` supports responsive typography for `lineHeight`
- [x] **FR-009**: `Text` supports responsive typography for `letterSpacing`
- [x] **FR-009**: `Text` supports responsive typography for `textAlign`
- [x] **FR-010**: `Text` preserves class-based styling for non-typography concerns

## Provider Runtime

- [x] **FR-011**: Provider data/actions are routable through `CanvasApp`
- [x] **FR-012**: Existing/current render entry points still have a migration/compatibility path

## Documentation and Handoff

- [x] **FR-013**: Runtime hierarchy is documented clearly in package-level planning and package docs
- [x] **FR-014**: Responsive config is structured for future editor UI without changing stored value shape
- [x] **FR-015**: Runtime boundary leaves a clear handoff path for future scoped registries/extensions/widgets

## Editor Alignment

- [x] **FR-016**: Editor root semantics are explicit: `CanvasDocument` is the editing root and `CanvasApp` remains a runtime shell outside root selection
- [x] **FR-017**: Canvas library has evolved toward a generic `CanvasEditor`
- [x] **FR-018**: Architecture makes room for nova-cloud / Studio product-layer editor customization
- [x] **FR-019**: Migration direction keeps `StudioEditor` as a temporary compatibility/generalization path

## Success Criteria

- [x] **SC-001**: Canvas demos can render through `CanvasApp` while preserving authored document/rendering split
- [x] **SC-002**: At least one example demonstrates root-configured responsive values from app-defined breakpoints
- [x] **SC-003**: Landing Canvas hero title and paragraph use responsive `Text` props instead of Tailwind typography sizing classes
- [x] **SC-004**: Provider data/actions can be supplied from the runtime root and consumed through the Canvas runtime pipeline

## Legend

- `[x]` satisfied in current implementation
- `[ ]` missing
- `[~]` partially satisfied / needs explicit confirmation or cleanup

## Open Follow-Up

Items still requiring confirmation or implementation work:

- Package-level planning docs can still be reviewed for wording alignment, but the spec and README hierarchy documentation is now in place
