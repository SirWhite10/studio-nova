# Canvas Changelog

## 2026-05-29

### Summary

- Added scoped theme/runtime groundwork for `CanvasApp` and app preview mode switching.
- Removed the fake landing `View` root and made the landing document own its wrapper props directly.
- Reworked the editor shell toward a branded editor/app workspace split.
- Added app workspace menu and separate editor/pages dialogs.
- Vendored the local `packages/puck` reference repository into the repo as normal tracked files.

### What We Did

#### 1. Added app-scoped theme groundwork

- Added a theme runtime layer under `src/lib/base/theme`.
- Added `ThemeProvider.svelte`, theme context/store helpers, and theme type definitions.
- Extended `CanvasApp` so it can resolve and apply app theme mode and theme variables at the app root.
- Added support for app preview mode switching between:
  - `system`
  - `light`
  - `dark`

#### 2. Moved landing document wrapper ownership into `CanvasDocument`

- Extended `CanvasDocument` to support document-level `props`.
- Updated `Canvas` to render a plain document wrapper div from `document.props`.
- Removed the fake/selectable root `View` from the landing document.
- Preserved document editing in the inspector via a dedicated document inspector path.

#### 3. Improved theme/editing separation in the editor

- Removed the earlier conflicting global HTML theme-var injection path.
- Kept global package-level mode watching in the route layout.
- Added a dedicated app-preview mode switcher in the editor header.
- Audited and updated major editor chrome surfaces to be more theme-aware and consistent.
- Fixed inspector routing so selected node editing and document fallback both work again.

#### 4. Introduced branded editor/app workspace separation

- Added a top-left app workspace menu trigger in the left rail.
- Added app workspace entries for:
  - App Settings
  - Theme
  - Providers
  - SEO
  - Metadata
  - Pages
- Added a dedicated `Editor Settings` dialog for editor-only concerns.
- Added a dedicated `Pages` dialog for structural page management.
- Removed the overloaded single Settings concept from the left rail workflow navigation.

#### 5. Added editor theme planning and shell groundwork

- Added `editor-theme.css` for the current branded editor shell iteration.
- Updated the editor refactor plan to reflect the new long-term direction:
  - keep `app.css` as the canonical token contract
  - move toward scoped `ThemeProvider`-based theming
  - keep editor shell theme and `CanvasApp` theme as separate scopes
  - separate app workspace concerns from editor/tool concerns in the IA

#### 6. Fixed interaction and visual regressions during the pass

- Fixed the node inspector selection handoff bug that caused `Hero.1` title changes without showing its actual props.
- Improved selected overlay badge/menu contrast in dark preview states.
- Improved inspector heading and field/readability treatment in dark contexts.
- Tightened app menu trigger behavior back toward an icon-only rail trigger.
- Fixed dialog theming behavior after portal-related editor token scope issues appeared.

#### 7. Vendored the local Puck reference repository

- First added `packages/puck` as a gitlink by mistake.
- Then removed the embedded repo metadata and re-added it as normal tracked files.
- This means fresh clones/pulls of `studio-nova` now include the actual `packages/puck` file contents directly.

### Validation

- Repeated targeted `vp check` runs passed on the changed editor/theme/runtime/planning files.
- Multiple `agent-browser` checks were used to verify:
  - app preview mode behavior
  - selected node inspector routing
  - editor menu/dialog behavior
  - branded editor shell consistency
- Visual artifacts captured during this phase include:
  - `/tmp/canvas-check/landing-dark-hero-selected-fixed.png`
  - `/tmp/canvas-check/landing-dark-hero-menu.png`
  - `/tmp/canvas-check/landing-branded-editor-dark-preview.png`
  - `/tmp/canvas-check/editor-settings-dialog-solid.png`
  - `/tmp/canvas-check/left-rail-icon-app-menu.png`

### Current State

- `CanvasApp` now has real theme runtime groundwork and app preview mode switching.
- The landing document no longer depends on a fake Canvas `View` root wrapper.
- The editor now distinguishes between:
  - document/node properties
  - app workspace sections
  - editor settings
- The left rail now has a top app-workspace entry and a bottom editor-settings entry.
- The long-term plan now favors shared `app.css` token contracts with scoped theme providers over a permanent prefixed editor token system.
- `packages/puck` is present in the repo as normal files for local reference.

### Follow-up Work Suggested For Later Pickup

1. Replace the temporary prefixed/branded editor token path with a proper scoped editor `ThemeProvider` using the same token contract as `app.css`.
2. Make editor dialogs/menus inherit theme through the intended scoped provider path rather than incidental/global availability.
3. Implement real app workspace inspectors for Theme, Providers, SEO, and Metadata instead of placeholders.
4. Expand the Pages dialog into a full page-management surface.
5. Decide whether page/document background ownership should live at the document level, section level, or both so app preview theme changes are more legible.
6. Continue aligning editor shell surfaces to the branded design system while keeping runtime preview isolated.

## 2026-05-18

### Summary

- Completed the first real `CanvasEditor` refactor away from the older package-level `StudioEditor` shell.
- Made `CanvasApp` the true runtime root for the landing editor flow.
- Reworked the landing document so `Hero.1` is the first authored section child under a document `View` root.
- Added a Puck-inspired but Svelte-native editor layout with dual desktop sidebars and preserved mobile bottom-sheet behavior.
- Moved `Hero.1` toward a block-owned authored schema instead of relying primarily on nested slot navigation.

### What We Did

#### 1. Finalized the Canvas runtime/editor architecture direction

- Kept `CanvasApp` as the rendered runtime root.
- Kept `CanvasDocument` as the authored document model.
- Positioned `CanvasEditor` as the generic package editor entry point.
- Reduced `StudioEditor` to a thin compatibility wrapper around `CanvasEditor` rather than the primary shell.

#### 2. Reworked the landing document structure

- Removed the extra width-constraining landing wrapper around the hero.
- Made the landing document root a meaningful selectable `View` node.
- Made `Hero.1` the direct first child section in the landing flow.
- Kept page flow inside the document instead of route wrappers.

#### 3. Added the Canvas app runtime foundation

- Added the `canvas-app` runtime layer and context.
- Added responsive foundation helpers for viewport/container-aware values.
- Updated `Text` to support responsive authored typography props.
- Shifted hero typography to authored `Text` props rather than page-specific utility sizing.

#### 4. Built the generic editor decomposition

- Added dedicated editor pieces for:
  - surface
  - trigger
  - left rail
  - left sidebar
  - header
  - inspector router
  - app inspector
  - node inspector
  - right inspector sidebar
- Split the older monolithic sidebar responsibilities into smaller focused components.
- Exposed the new generic editor pieces through package exports.

#### 5. Moved desktop editing to a dual-sidebar shell

- Replaced the earlier right-overlay-only desktop composition.
- Desktop now uses:
  - left workflow rail + panel
  - sticky editor header
  - center canvas surface
  - right inspector
- Left and right desktop sidebars now open by default and are independently collapsible.
- The desktop header now includes:
  - left sidebar toggle
  - right sidebar toggle
  - document title
  - undo
  - redo
  - preview
  - save affordance

#### 6. Preserved the mobile editor path for now

- Kept the mobile bottom-tab + shared-bottom-sheet interaction model.
- Kept the compact mobile trigger instead of forcing the desktop shell onto small screens.
- Mapped mobile tabs to:
  - Outline
  - Components
  - Properties
  - Settings

#### 7. Changed editor targeting behavior

- Properties now defaults to the document root when nothing is selected.
- App/runtime editing moved under Settings instead of being the default no-selection target.
- The left rail now includes Settings as the final workflow item.
- The right inspector content now changes based on the active left workflow and current selection.

#### 8. Updated selection chrome behavior

- Hover state now uses highlight-only treatment.
- Selected state now owns the title/action pill.
- Component labels now favor component-oriented naming like:
  - `View - landing-canvas-page-root`
  - `Hero.1 - landing-canvas-hero`

#### 9. Moved `Hero.1` toward a block-owned authored schema

- Added authored fields for:
  - content
  - actions
  - media
  - layout
  - advanced class
- Kept slot support available, but made the authored inspector path primary for the landing demo.
- Updated the landing document to use the authored hero props directly.

#### 10. Improved editor shell visuals

- Added clearer editor-shell separation between:
  - left sidebar surfaces
  - header chrome
  - center canvas area
  - right inspector surface
- Added stronger borders and off-surface tinting so the sidebars read as editor chrome instead of blending into the canvas.

#### 11. Stabilized editor state syncing

- Fixed the earlier `effect_update_depth_exceeded` loop by moving to per-instance editor stores.
- Diffed incoming component sync before applying it.
- Prevented redundant `onChange` emissions for equivalent component trees.

### Validation

- Repeated targeted `vp check` runs passed on the changed editor/runtime/route/block files.
- Desktop and mobile behavior were visually tested with `agent-browser`.
- Visual artifacts captured during this phase include:
  - `/tmp/canvas-check/landing-dual-sidebar-desktop.png`
  - `/tmp/canvas-check/landing-dual-sidebar-mobile.png`
  - `/tmp/canvas-check/landing-shell-surfaces.png`

### Current State

- `CanvasEditor` is now the real generic editor implementation in `packages/canvas`.
- The landing canvas demo is running on the new authored/runtime/editor model.
- Desktop editor chrome uses a dual-sidebar shell with sticky header.
- Mobile still uses the shared-sheet model until a later dedicated redesign.
- `Hero.1` is the first concrete block-owned authored schema example.

### Follow-up Work Suggested For Later Pickup

1. Tighten the desktop visual polish further against Puck spacing and surface rhythm.
2. Refine full-height behavior and scroll isolation until the shell feels fully production-grade.
3. Add a more complete save flow/callback contract for package consumers.
4. Consider whether the right inspector also needs resizable width behavior.
5. Continue moving complex authored blocks/widgets toward block-owned schemas.
6. Redesign mobile editor chrome once the desktop shell stabilizes.
7. Decide how much of `StudioEditor` compatibility should remain in this package long-term.

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
