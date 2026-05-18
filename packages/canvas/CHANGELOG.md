# Canvas Changelog

## 2026-05-14

### Summary
- Pivoted `canvas` away from the fully `View`-driven shadcn parity experiment.
- Preserved the old `View`-built work instead of deleting it.
- Started the new reference-backed Tailwind path for `canvas` components and pages.
- Replaced the root route with a landing page focused on card examples and Canvas positioning.

### What We Did

#### 1. Preserved the old `View`-based surface
- Renamed the old `ui` component surface to `view-ui`.
- Updated internal imports so the old implementation still compiles.
- Kept the old dashboard implementation available under:
  - `/dashboard-01-view`

#### 2. Freed the `ui` path for the new component layer
- Reserved `src/lib/components/ui` for the new Tailwind/reference-backed component surface.
- Began re-exporting reference-backed components from this path for the new migration.

#### 3. Set up Tailwind in `canvas`
- Added Tailwind v4 support in `canvas`.
- Added the Tailwind Vite plugin.
- Kept installation and validation on the `vp` toolchain.
- Added route-level CSS imports so Tailwind is active in the app shell.

#### 4. Added the shadcn-compatible theme/token bridge
- Imported the required animation/font layers.
- Added the missing Tailwind v4 token mapping used by the reference components:
  - `background`
  - `foreground`
  - `card`
  - `popover`
  - `primary`
  - `secondary`
  - `muted`
  - `accent`
  - `border`
  - `input`
  - `ring`
  - `sidebar`
- Added light/dark token values compatible with the reference component classes.
- Fixed the earlier `border-border` and similar Tailwind utility resolution failures.

#### 5. Kept global reset and font setup in the app shell
- Kept the reset in `src/app.html`.
- Added the Inter font loading path via CDN/global app shell setup.
- Maintained the root-level reset and `sr-only` utility support.

#### 6. Replaced the root page
- Replaced `/` with a Canvas landing page.
- The landing page currently introduces Canvas as a standalone UI library and showcases card patterns.

#### 7. Added the first landing page showcase
- Added a card-focused landing page using the new reference-backed path.
- Current examples include:
  - social/X post card
  - fashion product card
  - restaurant menu card
  - inventory summary card
  - next-steps card

#### 8. Kept the old dashboard work available
- Did not delete the old dashboard/editor/View work.
- The preserved route remains useful as:
  - a comparison point
  - a fallback
  - a source for future adapter ideas

### Current State
- `/` is now the new landing page.
- `/dashboard-01-view` is the preserved old dashboard.
- `src/lib/components/ui` is now the intended home for the new reference-backed component layer.
- Tailwind is installed and the app is serving again.
- `vp check` passes with `0 errors`.
- There are still existing non-blocking warnings in older base/text type surfaces.

### Architectural Direction
- `canvas` remains the authoring/runtime/editor layer.
- The reference component stack is now the visual/component implementation base.
- `View` is no longer the required styling engine for all shadcn-mirroring components.
- The old `View` path is preserved, but it is no longer the primary route for the new dashboard/component migration.

### Immediate Next Suggestions
1. Start the real `Card` adapter layer under `src/lib/components/ui`.
2. Add more card variants to the landing page with structured props/data examples.
3. Build the new `/dashboard-01` using the reference stack instead of the preserved View route.

### Additional Suggestions Beyond Those Three
4. Add a component catalog landing-page structure so each component family gets its own section:
   - Card
   - Button
   - Badge
   - Avatar
   - Dropdown Menu
   - Sidebar
   - Table
5. Add a dedicated `/components/cards` page once the landing page grows too large.
6. Create data fixtures for each card family so future editor/runtime binding work uses stable example content.
7. Build a thin Canvas adapter layer for common semantic props:
   - spacing
   - alignment
   - width
   - height
   - tone
   - variant
   - responsive options
8. Keep editor field metadata aligned with the new component layer so component props remain visually editable later.
9. Rebuild the sidebar next, one-to-one with the reference component API, using the new `ui` path.
10. Rebuild the dashboard route incrementally:
   - sidebar shell
   - header
   - cards
   - chart
   - table
11. Add a simple component docs structure for each new adapter:
   - purpose
   - reference component source
   - supported Canvas props
   - unsupported props
12. Decide which reference components will be:
   - direct re-exports
   - wrapped adapters
   - fully Canvas-owned compositions
13. Add screenshot-based parity checks once the new `/dashboard-01` route exists.
14. Revisit the editor after the new component path stabilizes:
   - mobile interaction cleanup
   - field metadata refinement
   - component insertion UX
15. Clean up or archive older experimental dashboard files once the new route is stable enough to replace them.

### Notes
- The pivot was necessary because reproducing shadcn parity through computed `View` styles was too slow and too fragile.
- The new direction should improve:
  - visual fidelity
  - implementation speed
  - maintainability
  - alignment with the reference source
