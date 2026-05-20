# Canvas Plan: Editor Refactor for Minimal Sidebar Runtime

- **Plan Date:** 2026-05-17
- **Planned Start:** 2026-05-17
- **Target Completion:** 2026-05-25
- **Status:** Planned
- **Owners:** Canvas package
- **Dependencies:**
  - `planning/26-05-17-canvas-app-runtime-and-responsive-foundation.md`
  - `specs/002-canvas-app-runtime/spec.md`

## Summary

Refactor the current package-level editor implementation away from the older `StudioEditor` shell into a generic `CanvasEditor` with a Puck-inspired information architecture adapted for Svelte.

This editor should:

- keep `CanvasApp` as the rendered runtime root
- use a desktop layout of **left rail + left panel + canvas + right inspector**
- keep the route/demo page free of extra product header chrome
- open editor UI from a small top-right edit trigger for the landing demo path
- keep the editor chrome closed by default on all screen sizes for the landing demo
- support document editing when nothing is selected in Properties
- support node/component editing when a canvas node is selected
- move app/runtime settings into a dedicated Settings surface
- make the left workflow sidebar customizable via Svelte snippets

This plan explicitly treats the current `StudioEditor` implementation as a **reference source and parts source**, not as the final architecture.

---

## Reference implementation

Primary external reference for editor information architecture:

- `~/studio-nova/packages/puck/packages/core`

This codebase is a React implementation and should be treated as a **design and architecture reference**, not as code to port directly. Canvas should borrow:

- workflow-left / inspector-right information architecture
- block-owned inspector schema patterns
- selected-state chrome concepts
- inspector section rhythm and spacing
- mobile bottom-tab + single-sheet interaction model

Canvas should not directly port:

- React reducer/store patterns
- hook-driven field subscriptions
- override/plugin APIs that depend on React conventions

## Why this plan exists

The current editor code was written before the architecture was clarified around:

- `CanvasApp` as the runtime root
- `CanvasDocument` as the authored model
- `Canvas` as the renderer
- `CanvasEditor` as the generic library editor
- `StudioEditor` as a later nova-cloud/workspace-specific product wrapper

The old editor is still useful, especially for:

- selection logic
- highlight overlays
- inspector field rendering
- editor store/context patterns

But its top-level shell structure is not the desired end state for the Canvas library.

---

## Design goals

1. Make the generic editor in this package truly **`CanvasEditor`**.
2. Remove the assumption that the library editor needs a full toolbar/header shell.
3. Let the landing-canvas demo use a minimal sidebar editing runtime.
4. Preserve and reuse proven interaction logic from the current editor where practical.
5. Keep the editor component tree modular and easy to extend.
6. Make the result easy to hand off to another developer.

---

## Architecture stance

### Generic library editor

Canvas should own:

- editor runtime/state
- selection behavior
- document inspector support
- node inspector support
- app/runtime settings support
- left workflow rail/panel support
- minimal/default editing experience with extensible side panels

### Product/workspace editor

nova-cloud should later own:

- `StudioEditor`
- product/workspace chrome
- deployment controls
- sandbox/workspace-specific actions
- agent/product-specific side panels and flows
- richer left-panel experiences layered on top of the generic Canvas editor contracts

---

## Proposed file strategy

## Files to keep and reuse conceptually

These contain useful logic and should be reused or split up rather than blindly discarded.

- `src/lib/base/editor/store.ts`
- `src/lib/base/editor/context.ts`
- `src/lib/base/editor/types.ts`
- `src/lib/base/editor/EditorComponentHighlight.svelte`
- `src/lib/base/editor/fields/*`
- portions of `src/lib/base/editor/EditorCanvas.svelte`
- portions of `src/lib/base/editor/EditorSidebar.svelte`

## Files to rename or replace

### 1. `CanvasEditor.svelte`

**Current role:** generic public editor entry  
**Decision:** this is now the real top-level generic editor implementation

### 2. `StudioEditor.svelte`

**Current role:** old top-level editor shell  
**Decision:** reduce to a compatibility wrapper around `CanvasEditor.svelte` during migration, then delete later if nothing depends on it

### 3. `EditorCanvas.svelte`

**Current role:** interactive canvas surface implementation  
**Decision:** keep this file for the underlying interaction logic, and compose it through the new wrapper `canvas-editor-surface.svelte`

### 4. `EditorSidebar.svelte`

**Current role:** sidebar shell plus legacy inspector/layers/components panels  
**Decision:** keep this file as the higher-level sidebar host for now, but move Properties inspector logic out into dedicated inspector components

### 5. `EditorControls.svelte`

**Current role:** toolbar/header controls  
**Decision:** remove from the default `CanvasEditor` composition; keep only temporarily until remaining references are cleaned up

## Decided new file names

These are the actual file names chosen for the refactor:

- `src/lib/base/editor/CanvasEditor.svelte`
- `src/lib/base/editor/StudioEditor.svelte`
- `src/lib/base/editor/EditorCanvas.svelte`
- `src/lib/base/editor/EditorSidebar.svelte`
- `src/lib/base/editor/canvas-editor-surface.svelte`
- `src/lib/base/editor/canvas-editor-sidebar.svelte`
- `src/lib/base/editor/canvas-editor-trigger.svelte`
- `src/lib/base/editor/canvas-editor-inspector.svelte`
- `src/lib/base/editor/canvas-editor-app-inspector.svelte`
- `src/lib/base/editor/canvas-editor-node-inspector.svelte`

## Files likely to be deleted after migration

These should only be deleted after the new composition is functional and references are updated.

Candidates:

- `src/lib/base/editor/StudioEditor.svelte`
- `src/lib/base/editor/EditorControls.svelte` (if no longer used)
- old example/demo code that depends on the old shell model

Deletion should happen only after:

- exports are updated
- routes/examples are updated
- no package docs/templates still depend on the old names

---

## Proposed new component composition

## 1. `canvas-editor.svelte`

Main public generic editor entry.

Responsibilities:

- editor runtime composition
- sidebar provider/state
- selection wiring
- root app editing support
- child composition of trigger + surface + sidebar

## 2. `canvas-editor-trigger.svelte`

Small top-right edit trigger.

Responsibilities:

- pencil/edit icon button
- open/close sidebar
- no toolbar assumptions

## 3. `canvas-editor-surface.svelte`

Interactive preview/canvas surface.

Responsibilities:

- render `CanvasApp`
- preserve node selection
- preserve hover/highlight behavior
- support background click behavior

This should reuse logic from current `EditorCanvas.svelte`.

## 4. `canvas-editor-sidebar.svelte`

Right sidebar shell.

Responsibilities:

- open/close visual shell
- title area
- inspector tab rail/body
- scroll area
- host inspector content

## 5. `canvas-editor-left-sidebar.svelte`

Left workflow sidebar shell.

Responsibilities:

- render a narrow icon rail
- render the active left-panel body
- compose built-in tabs like Outline and Components
- support custom/integration-provided Svelte snippets for left panel content
- map cleanly onto shadcn-svelte sidebar primitives, including `Sidebar.Root`, `Sidebar.Content`, `Sidebar.Group`, and `Sidebar.Rail`

## 6. `canvas-editor-left-rail.svelte`

Left icon rail.

Responsibilities:

- icon-only desktop navigation between left-panel tabs
- mobile bottom-tab navigation source
- no large text labels in the persistent rail
- pair with shadcn-svelte sidebar shell composition such as:
  - `Sidebar.Root`
  - `Sidebar.Header`
  - `Sidebar.Content`
  - `Sidebar.Group`
  - `Sidebar.Footer`
  - `Sidebar.Rail`

## 7. `canvas-editor-inspector.svelte`

Inspector router/decision component.

Responsibilities:

- show document inspector when no node selected in Properties
- show node inspector when node selected in Properties
- show app/runtime inspector only in Settings mode

## 8. `canvas-editor-app-inspector.svelte`

App/runtime property editor.

Responsibilities:

- edit `CanvasApp` config
- expose app-level fields
- later support breakpoints, providers, splash, etc.

## 9. `canvas-editor-node-inspector.svelte`

Selected node property editor.

Responsibilities:

- reuse current property rendering patterns
- show component schema-driven fields
- allow block-owned schemas to manage their own authored sub-structure instead of forcing nested selection as the primary workflow

---

## Current schema decisions

### `Hero.1` editor schema

The next concrete block schema pass should use the existing field system and expose a **block-owned authored schema** rather than relying primarily on nested slot selection.

Target `Hero.1` fields/sections:

- content
  - eyebrow text
  - title text
  - description text
- actions
  - CTA array with label, href, variant, and ordering
- media
  - mode: `inline | bg`
  - image url
  - alt text
- layout
  - alignment
  - padding
  - advanced class/style only as a lower-priority section

`Hero.1` can still render nested structure internally if useful, but the primary authoring contract should belong to the block itself. This is especially important for integrations/widgets that need to constrain editing to valid authored patterns.

### Canvas app root inspector fields

The app/root inspector should keep using `EditorField` and expand beyond placeholder metadata.

Planned root fields:

- `name`
- `description`
- `defaultResponsiveMode`
- `splashEnabled`
- `splashTitle`
- `splashDescription`

These fields should map cleanly into the route-owned app/root state and, where relevant, into `CanvasApp` runtime config.

## Selection behavior contract

### Default

- no node selected
- Properties shows the document inspector
- Settings shows app/runtime settings when explicitly opened

### Node click

- selected node becomes active
- sidebar switches to node inspector

### Background click

- clear node selection
- return to the document inspector in Properties

This is intentionally different from an empty no-op root state.

---

## Sidebar behavior contract

### Desktop

- left rail for workflow navigation
- left panel for Outline / Components / custom snippet content
- center canvas surface
- right inspector for document/node/app settings depending on active tab
- no full-width product header in the landing demo
- left workflow tools should not compete with the right inspector for editing responsibility

### Mobile

- bottom tab bar similar to native mobile navigation
- one shared bottom sheet
- tab body switches within the same sheet instead of closing one sheet and opening another
- editor chrome still starts closed by default for the landing demo

---

## Landing demo contract

For `landing-canvas` specifically:

- route renders `CanvasApp` first
- no extra route wrapper editor chrome
- floating edit trigger is overlaid
- opening editor UI does not replace the page
- editor acts as a runtime layer over the landing document
- document root is the default Properties target
- app/runtime settings live under Settings, not as the default selection target

---

## Phase breakdown

## Phase 0 — Inventory and naming audit

- **Start:** 2026-05-17
- **Target Completion:** 2026-05-17
- **Status:** Planned

### Tasks

1. Audit current editor files and references.
2. Identify all references to `StudioEditor`.
3. Identify all places where old toolbar-shell assumptions exist.
4. Decide what will be renamed, split, or removed.

### Deliverables

- concrete rename/delete map

---

## Phase 1 — Public naming correction

- **Start:** 2026-05-17
- **Target Completion:** 2026-05-18
- **Status:** Planned

### Tasks

1. Make `canvas-editor.svelte` the real public editor entry.
2. Update exports to prefer `CanvasEditor`.
3. Remove package-level assumptions that `StudioEditor` is the canonical library editor.
4. Update route/demo imports accordingly.

### Deliverables

- generic public editor naming

---

## Phase 2 — Surface/sidebar split

- **Start:** 2026-05-18
- **Target Completion:** 2026-05-19
- **Status:** Planned

### Tasks

1. Extract or rename the canvas interaction surface from `EditorCanvas.svelte`.
2. Separate sidebar shell from inspector content.
3. Keep highlight/selection logic intact while simplifying composition.

### Deliverables

- `canvas-editor-surface.svelte`
- `canvas-editor-sidebar.svelte`

---

## Phase 3 — App vs node inspector split

- **Start:** 2026-05-19
- **Target Completion:** 2026-05-20
- **Status:** Planned

### Tasks

1. Add dedicated app/root inspector rendering.
2. Add dedicated node inspector rendering.
3. Make empty selection route to app/root editing.

### Deliverables

- `canvas-editor-inspector.svelte`
- `canvas-editor-app-inspector.svelte`
- `canvas-editor-node-inspector.svelte`

---

## Phase 4 — Trigger-based minimal editor composition

- **Start:** 2026-05-20
- **Target Completion:** 2026-05-21
- **Status:** Planned

### Tasks

1. Add top-right edit trigger component.
2. Control sidebar open/close state explicitly.
3. Keep sidebar closed by default on all screen sizes.
4. Remove the old toolbar/header shell from the default composition.

### Deliverables

- `canvas-editor-trigger.svelte`
- minimal `CanvasEditor` composition

---

## Phase 5 — Landing demo integration

- **Start:** 2026-05-21
- **Target Completion:** 2026-05-22
- **Status:** Planned

### Tasks

1. Mount the minimal editor over `landing-canvas`.
2. Ensure `CanvasApp` remains the rendered root.
3. Ensure the landing page remains visually intact when sidebar is closed.
4. Verify root app selection and node selection both work.

### Deliverables

- sidebar-based landing demo editor

---

## Phase 6 — Cleanup and deletion pass

- **Start:** 2026-05-22
- **Target Completion:** 2026-05-23
- **Status:** Planned

### Tasks

1. Remove dead code from old shell assumptions.
2. Delete obsolete files if no longer referenced.
3. Update examples/docs/templates to the new structure.
4. Remove old public naming if safe.

### Deliverables

- cleaner editor package structure

---

## Theme integration follow-up plan

### Why this follow-up exists

The current editor/runtime work exposed a theme ownership gap:

- `app.css` is currently the real live theme contract for the package
- some runtime surfaces already consume CSS variables like `var(--primary)` and `var(--background)`
- some older component paths still consume static token objects instead of the live CSS-variable theme
- `CanvasApp` does not yet fully own or apply an app-scoped theme provider/runtime contract

This creates visible mismatches like the primary button using a static dark token instead of the app theme color.

### Theme architecture decision

Canvas should support **two theme layers**:

#### 1. Global/site theme layer

Used for preview/deployment and app-shell SSR.

Responsibilities:

- resolve theme from cookies or route/server state
- inject the correct theme variables into the initial HTML response
- avoid client-side theme flicker on first paint
- optionally set dark/light classes or data attributes for SSR parity

#### 2. `CanvasApp` scoped theme layer

Used for embedded runtime/editor use and app-local previewing.

Responsibilities:

- accept app-level theme config from `CanvasApp`
- apply theme variables at the `CanvasApp` root instead of always mutating global document state
- support live editor updates without requiring full page reloads
- inherit from the global SSR theme when no explicit app override is provided

### Canonical theme contract

The canonical default theme contract should be based on the current live variables in:

- `packages/canvas/src/app.css`

That contract currently includes at least:

- `background`
- `foreground`
- `card`
- `card-foreground`
- `popover`
- `popover-foreground`
- `primary`
- `primary-foreground`
- `secondary`
- `secondary-foreground`
- `muted`
- `muted-foreground`
- `accent`
- `accent-foreground`
- `destructive`
- `border`
- `input`
- `ring`
- `chart-1` through `chart-5`
- `radius`
- `sidebar`
- `sidebar-foreground`
- `sidebar-primary`
- `sidebar-primary-foreground`
- `sidebar-accent`
- `sidebar-accent-foreground`
- `sidebar-border`
- `sidebar-ring`

The existing earlier theme design also includes richer optional fields such as:

- `destructive-foreground`
- `font-sans`
- `font-serif`
- `font-mono`
- `shadow-*`
- `letter-spacing`
- `spacing`

Decision:

- use the current `app.css` variables as the required first-pass baseline
- allow the richer preset/theme model to extend beyond that baseline later
- update the default/base theme values so they match the current `app.css`, not the older static monochrome defaults

### Existing theme code to reuse or consolidate

Potentially reusable earlier theme pieces already exist conceptually in the user-provided design:

- `ThemeProvider`
- `ThemePreset`
- `defaultPresets`
- `generateThemeVariables(...)`
- cookie-based SSR theme handling
- theme context/store utilities

However, the earlier design contains overlapping models:

- preset-based theme shape
- `theme-config.ts` style `ThemeOption` / `Theme` split
- multiple context/store files

Decision:

- consolidate to **one** runtime theme model
- prefer the simpler preset-style model with:
  - `themeId`
  - `colorMode`
  - `styles.light`
  - `styles.dark`
- avoid carrying forward multiple parallel theme abstractions

### `CanvasApp` theme ownership requirements

`CanvasApp` should ultimately:

- accept theme configuration as part of app/runtime config
- provide theme context to runtime/editor consumers
- apply CSS variables at the app root container
- support live editing in the inspector
- remain compatible with SSR-provided theme values for deployed preview

This means the theme provider should be integrated into `CanvasApp`, not left only as route-global CSS behavior.

### Inspector requirements

Theme editing should live under app Settings, not document Properties.

Recommended first-pass inspector groups:

#### Theme General

- preset
- color mode

#### Theme Core Colors

- background
- foreground
- card
- card-foreground
- popover
- popover-foreground
- primary
- primary-foreground
- secondary
- secondary-foreground
- muted
- muted-foreground
- accent
- accent-foreground
- destructive
- border
- input
- ring

#### Theme Sidebar

- sidebar
- sidebar-foreground
- sidebar-primary
- sidebar-primary-foreground
- sidebar-accent
- sidebar-accent-foreground
- sidebar-border
- sidebar-ring

#### Theme Advanced / Later

- chart-1 through chart-5
- radius
- optional font vars
- optional shadow vars
- optional spacing / letter-spacing vars

### SSR and flicker-prevention requirements

This theme work must support SSR for preview/deployment.

Requirements:

- the correct theme variables must be available in the initial HTML response
- the browser must not wait for client hydration to determine the theme
- server-side cookie/theme resolution should set the correct mode and variables before first paint
- client runtime updates should preserve the same variable contract so preview and deployed SSR stay aligned

This is required to avoid:

- light/dark flash
- wrong initial primary color
- preview mismatch between SSR and hydrated runtime

### Component consumption rule

All Canvas components should converge on consuming the live CSS-variable theme contract.

Decision:

- prefer `var(--primary)`, `var(--background)`, etc.
- stop relying on static hardcoded token objects for runtime color ownership where possible
- audit known mismatches such as the current `view-ui/button` path

### File-by-file implementation direction for the next pass

#### Phase A — Theme audit and normalization

- audit `app.css` as the live contract baseline
- identify which earlier theme files should be restored, adapted, or consolidated
- define the normalized runtime theme type for Canvas

#### Phase B — SSR theme path

- add or adapt a server theme handler for cookie-based SSR theme resolution
- inject theme variables into the initial HTML for preview/deployment
- ensure the default SSR theme matches `app.css`

#### Phase C — `CanvasApp` provider integration

- mount a scoped `ThemeProvider` or equivalent in `CanvasApp`
- apply theme variables to the `CanvasApp` root container
- allow app config to control theme preset, mode, and overrides

#### Phase D — Inspector integration

- add app Settings fields/groups for Theme
- support theme preset selection, mode changes, and direct variable editing
- make sure editor updates are reflected live in the preview canvas

#### Phase E — Component cleanup

- audit components still reading static theme tokens
- migrate them to the live CSS variable/theme-provider contract
- specifically fix primary button color ownership so it matches the app theme

### Success criteria for the next pass

The theme integration follow-up is considered successful when:

- `CanvasApp` owns a theme provider/runtime contract
- the default app theme matches `app.css`
- SSR preview/deployment can render the correct theme without flicker
- app Settings exposes Theme controls in the inspector
- theme edits update the preview live
- core components like buttons consume the same live theme variables as the rest of the app

## Editor theme and app-workspace follow-up plan

The recent editor iterations clarified that Canvas should stop mixing editor chrome styling and app/runtime styling into one token system.

### New architecture decision

Canvas should use the same token contract as `packages/canvas/src/app.css`, but theme ownership should be separated by **scoped providers**, not by ad-hoc prefixed token systems.

#### 1. Project/package-level theme layer

The package-level site/editor shell should continue to use the canonical `app.css` token contract.

This layer should support:

- the package landing page
- docs/demo routes
- shadcn-svelte primitives
- editor chrome defaults when no narrower editor theme scope is applied

#### 2. Editor shell theme layer

`CanvasEditor` should get its own scoped theme provider/preset using the same `app.css` token names:

- `--background`
- `--foreground`
- `--card`
- `--muted`
- `--border`
- `--primary`
- etc.

This editor shell theme should:

- style header, rail, left panel, right inspector, mobile sheet, dialog, and editor overlays
- use a branded preset derived from `packages/design/DESIGN.md`
- support editor-only light/dark modes later through editor settings
- avoid a separate long-term `--editor-*` token contract

The short-lived prefixed editor token layer was useful to prove the separation model, but it creates avoidable drift from the shadcn/app token contract and increases portal/dialog complexity.

#### 3. `CanvasApp` theme layer

Each `CanvasApp` should continue to own a separate scoped theme provider nested inside the editor shell or project shell.

This app theme layer should:

- use the same `app.css` / shadcn token names
- support app-authored `system | light | dark`
- support SSR preview/deployment
- remain editable under app settings in the inspector
- support future nested theme wrappers for documents/components/sections

### Encapsulation strategy

Theme encapsulation should come from **DOM scoping via nested theme providers**, not token-prefix duplication.

Target composition:

- project shell/site theme provider
  - editor shell theme provider
    - `CanvasEditor`
      - app workspace / dialogs / inspector
      - nested `CanvasApp` theme provider
        - document
        - blocks/components
        - future nested theme overrides

This keeps:

- shadcn compatibility
- portal/dialog behavior predictable when themed scopes are chosen intentionally
- nested app/document/component theming possible without inventing parallel token contracts

### Editor shell theming requirements

The editor shell should be treated as a stable product UI, distinct from authored app preview.

Requirements:

- editor chrome should not visually inherit app preview theme changes
- app preview mode toggle in the header should control only `CanvasApp`
- editor dialogs should visually match the editor shell theme
- editor dialogs should not accidentally inherit the authored app preview theme
- editor shell light/dark preferences should live in editor settings, not app settings

### App workspace IA requirements

Editor/tool settings and app/runtime settings should be clearly separated.

#### App workspace entry point

The top-left app identity/logo trigger should open a dropdown menu for app-level concerns.

Initial dropdown items:

- App Settings
- Theme
- Providers
- SEO
- Metadata
- Pages

Routing rules:

- `App Settings`, `Theme`, `Providers`, `SEO`, and `Metadata` should route the right inspector into app-scoped editing surfaces
- `Pages` should open a dedicated dialog rather than reusing the right inspector

#### Editor settings entry point

The bottom-left gear/button should open an editor-only settings dialog.

Editor settings should cover only tool concerns such as:

- editor appearance/theme mode
- density/panel preferences
- workflow/help/debug controls

It should not contain:

- app theme
- providers
- SEO
- metadata
- pages

### Page management requirements

Pages should be managed through a dedicated dialog using shadcn-svelte list/items/command-style primitives rather than forcing page management into the right inspector.

The pages dialog should evolve toward:

- listing all pages in the app
- create page
- rename page
- duplicate page
- delete page
- select/switch active page
- route/slug management
- home page designation

### Inspector routing requirements

The right inspector should resolve state in this order:

1. active app section from the app dropdown
2. selected canvas node
3. document root/default document inspector

This preserves the earlier agreed model that the document is the default properties target when no node is selected, while still allowing app-scoped inspector modes to take precedence when explicitly invoked.

### Dialog and portal theming follow-up

Dialog/menu theming must account for portal boundaries.

Implementation plan should explicitly decide one of:

- keep themed portal content inside the intended provider scope, or
- ensure the appropriate scoped theme variables are available where the portal mounts

The important requirement is not the mechanism, but the guarantee that:

- editor dialogs match editor shell theme
- app dialogs match editor shell or app/runtime theme intentionally rather than accidentally
- portal mounting does not silently break scoped theme variables

### Implementation phases

#### Phase 1 — unify on provider-scoped `app.css` tokens

- keep `app.css` as the canonical token contract
- remove the long-term dependency on prefixed editor-only token names
- adapt `ThemeProvider.svelte` so it is the main scoped theming primitive

#### Phase 2 — editor shell theme provider

- add an editor shell theme preset/provider around `CanvasEditor`
- migrate shell surfaces, inspector, menus, dialogs, and mobile sheets to the shared `app.css` token contract
- ensure editor shell and dialogs visually match in both editor theme modes

#### Phase 3 — nested app runtime provider

- keep `CanvasApp` as a nested scoped theme provider
- ensure the preview-mode toggle only affects `CanvasApp`
- preserve SSR/runtime requirements for deployment and preview

#### Phase 4 — app workspace and page management

- formalize app dropdown routing for app settings/theme/providers/SEO/metadata
- implement pages dialog as the structural page-management surface
- implement editor settings dialog as a tool-only settings surface

### Success criteria

This follow-up is successful when:

- editor shell and `CanvasApp` no longer share one ambiguous theme surface
- editor shell uses the same `app.css` / shadcn token contract through scoped theming
- app preview theme changes do not recolor editor chrome
- editor dialogs visually match editor chrome
- app settings and editor settings are clearly separated in the IA
- pages are managed in a dedicated dialog rather than overloaded into the inspector
- future nested document/component theme overrides remain possible through additional theme-provider scopes

## Additional interaction decisions

### Selected chrome

- hover should keep only the visual highlight
- selected should show title + actions
- the selected title bar/menu should be one integrated pill
- it should clamp to the viewport and avoid rendering off-screen

### Inspector ownership

- primitives can keep generic field-driven editing
- authored blocks/widgets should own their own editing schema
- nested node/slot traversal is secondary for complex blocks like `Hero.1`

## Risks

1. **Over-preserving old shell structure**
   - Avoid letting the old `StudioEditor` layout dictate the new composition.
2. **Premature deletion**
   - Delete only after routes/exports/examples are moved.
3. **Inspector logic duplication**
   - Reuse field rendering logic rather than fork it badly.
4. **Selection regression**
   - Preserve current highlight/selection behavior while refactoring composition.

---

## Acceptance criteria

This refactor is ready when:

1. `CanvasEditor` is the true generic public editor entry.
2. The default editor composition is sidebar-based and minimal.
3. The editor has no required top toolbar/header shell.
4. The sidebar is closed by default and opened by a top-right edit trigger.
5. Root app selection shows app/root fields.
6. Node selection shows node fields.
7. The landing demo uses the new composition cleanly.
8. Old `StudioEditor` assumptions are removed from the package-level architecture.

---

## Notes for handoff

If this work is resumed by another developer, the intended stance is:

- reuse old code where it contains good interaction logic
- do **not** preserve old file structure just because it exists
- prefer new generic names and smaller components
- keep the default editor minimal and library-generic
- let nova-cloud build the richer Studio experience later
