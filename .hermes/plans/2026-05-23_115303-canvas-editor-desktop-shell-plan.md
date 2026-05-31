# Canvas Editor Desktop Shell Plan

> **For Hermes:** Planning only. Do not implement code from this document in this turn.

**Goal:** Align Studio Nova’s desktop editor shell with the intended/Puck-like structure: left icon rail, secondary left sidebar, centered canvas, and right inspector sidebar, while reusing the existing sidebar/rail/icon components already present in `view-ui` and `base/editor`.

**Architecture:** Keep the shell as a 4-column desktop layout managed by `CanvasEditor.svelte`: `(left rail + left panel) | canvas inset | right inspector`. Reuse the existing `view-ui/sidebar/*` primitives for chrome structure and reserve custom editor components for editor-specific content like outline, component palette, and inspector body. Match Puck’s behavioral model where the canvas auto-adjusts to sidebar width changes and sidebars are independently collapsible/resizable.

**Tech Stack:** Svelte 5 runes, Studio Nova canvas package, `view-ui/sidebar`, Lucide icons, existing editor store/context.

---

## What I reviewed

### Current Studio Nova editor shell

- `packages/canvas/src/lib/base/editor/CanvasEditor.svelte`
  - Already composes desktop shell as left sidebar → center inset → right sidebar.
  - Uses `Sidebar.Provider` and `Sidebar.Inset`.
  - Desktop widths are currently hardcoded-ish via toggle classes (`w-80`, `w-96`) instead of true persisted resize state.
- `packages/canvas/src/lib/base/editor/canvas-editor-left-sidebar.svelte`
  - Already implements a two-part left side: icon rail column + content panel column.
  - Has Outline / Components / Fields panel switching.
  - Uses `CanvasEditorNavRail` and `view-ui/sidebar` header/content/group wrappers.
- `packages/canvas/src/lib/base/editor/canvas-editor-nav-rail.svelte`
  - Already very close to the desired icon-rail behavior.
  - Contains app menu, icon buttons, and settings button.
- `packages/canvas/src/lib/base/editor/canvas-editor-right-sidebar.svelte`
  - Already acts as the inspector sidebar and uses `view-ui/sidebar` pieces.

### Puck reference

- `packages/puck/packages/core/components/Puck/components/Layout/index.tsx`
  - Confirms canonical shell order: `Header` → `Nav` → `Sidebar(left)` → `Canvas` → `Sidebar(right)`.
  - Uses persisted left/right sidebar widths and actual resize handling.
- `packages/puck/packages/core/lib/use-sidebar-resize.ts`
  - Confirms width persistence pattern via localStorage and viewport recalculation after resize.
- `packages/puck/packages/core/components/Puck/components/Canvas/index.tsx`
  - Confirms the canvas reacts to sidebar visibility/width changes to recompute auto-zoom.

---

## Interpretation of your desktop requirement

Desired desktop structure:

1. **Far left:** icon rail only
   - compact vertical strip
   - app/menu control at top
   - panel switcher icons in the middle/top zone
   - settings or utility action near bottom

2. **Second column:** contextual left sidebar
   - changes based on active icon/tab
   - likely hosts Components, Outline, and possibly app/document views

3. **Center:** canvas surface
   - remains the dominant column
   - should visually feel independent from sidebars
   - should respond when sidebar widths change

4. **Far right:** inspector sidebar
   - properties/app settings
   - selection-aware title/content
   - likely resizable and collapsible independently from the left side

This matches Puck’s mental model and is also already the direction of Nova’s current editor split.

---

## Recommended planning direction

### Decision 1: Keep the current structural split

Do **not** redesign the shell from scratch.

Instead, treat the existing components as the base contract:

- `CanvasEditor.svelte` = shell orchestrator
- `canvas-editor-nav-rail.svelte` = left icon rail
- `canvas-editor-left-sidebar.svelte` = secondary left sidebar
- `canvas-editor-right-sidebar.svelte` = inspector
- `canvas-editor-surface.svelte` = center canvas

Why:

- The structure already matches your stated layout.
- The gap is now fidelity/behavior, not architecture.
- This minimizes churn and keeps planning aligned with spec `004-canvas-editor-rebuild` Phase 4.

### Decision 2: Use `view-ui/sidebar` as the chrome system, not ad hoc CSS

For desktop shell framing:

- Use the already-built sidebar primitives as the canonical chrome layer.
- Let custom editor CSS focus on editor-specific states/content, not on inventing a second sidebar system.

Why:

- You explicitly said the sidebar/rail/icon pieces are already made.
- It reduces duplicated shell behavior.
- It keeps editor chrome visually consistent with the rest of Nova.

### Decision 3: Separate rail width from left panel width

Model the left side as two independent measurements:

- `leftRailWidth`: fixed, small, icon-only
- `leftPanelWidth`: resizable/collapsible

Why:

- The rail should stay stable while the contextual panel opens/closes.
- It better matches both your description and Puck’s nav-vs-sidebar distinction.

### Decision 4: Treat the right inspector as a first-class persistent panel

The right inspector should have:

- its own width state
- collapse/expand behavior
- selection/app-context-aware title and body

Why:

- This is where the editor’s “workbench” feel comes from.
- Puck treats the right side as a stable editing surface, not a transient drawer.

---

## Proposed desktop shell model

### Layout model

Preferred desktop grid/flex contract:

- Column 1: `left rail` fixed width
- Column 2: `left panel` resizable, collapsible
- Column 3: `canvas` fluid `minmax(0, 1fr)`
- Column 4: `right inspector` resizable, collapsible

Conceptually:

```text
[rail: fixed] [left panel: variable] [canvas: fluid] [right panel: variable]
```

### State model

Add/normalize desktop shell UI state around:

- `activeLeftPanel: "Components" | "Outline" | "Fields" | plugin-tab`
- `leftPanelOpen: boolean`
- `rightPanelOpen: boolean`
- `leftPanelWidth: number`
- `rightPanelWidth: number`
- `leftRailWidth: number` (constant token, not user-resized)

Optional later:

- `lastOpenLeftPanel`
- `persistedDesktopShellState`

### Behavioral rules

- Clicking the currently active left-rail icon toggles the left panel open/closed.
- Clicking a different left-rail icon switches panel and opens left panel if closed.
- Header toggle buttons collapse/expand left and right panels independently.
- Canvas recalculates viewport/auto-scale after:
  - left panel width changes
  - right panel width changes
  - left/right panel visibility changes
- The icon rail remains visible even when the left content panel is collapsed.

---

## Step-by-step implementation plan

### Task 1: Lock the shell contract in the editor types/store

**Objective:** Make shell structure explicit before touching layout behavior.

**Files likely to change:**

- `packages/canvas/src/lib/base/editor/types.ts`
- possibly `packages/canvas/src/lib/base/editor/store.ts`
- possibly a new `packages/canvas/src/lib/base/editor/editor-ui-state.ts`

**Plan:**

- Define a dedicated desktop shell state contract.
- Separate “which left panel is active” from “whether left panel is open”.
- Separate “rail exists” from “left panel exists”.

**Why first:**

- The current implementation mixes layout state into local component state.
- Planning is cleaner if shell behavior has an explicit schema.

### Task 2: Refactor `CanvasEditor.svelte` to make the 4-column layout literal

**Objective:** Make the desktop shell read directly as rail + left panel + canvas + right panel.

**Files likely to change:**

- `packages/canvas/src/lib/base/editor/CanvasEditor.svelte`

**Plan:**

- Replace the current “single left width bucket” mental model with explicit shell columns.
- Ensure the left rail is always rendered on desktop.
- Move width logic so the left panel and right inspector are independently measured.
- Keep `Sidebar.Provider` / `Sidebar.Inset`, but reduce ambiguity about where the rail lives.

**Important note:**

- `canvas-editor-left-sidebar.svelte` currently contains both rail and panel. We should decide whether to:
  1. keep that bundled and expose a cleaner API, or
  2. split rail and panel into sibling components controlled by `CanvasEditor.svelte`.

**Recommendation:**

- Split them at the composition level for clarity, even if the visual parts stay implemented in the existing files.

### Task 3: Normalize the left rail into a dedicated desktop navigation component

**Objective:** Make the rail a stable, icon-only desktop navigation primitive.

**Files likely to change:**

- `packages/canvas/src/lib/base/editor/canvas-editor-nav-rail.svelte`
- possibly `packages/canvas/src/lib/base/editor/canvas-editor-left-sidebar.svelte`
- possibly `packages/canvas/src/lib/base/editor/canvas-editor-left-rail.svelte` (reuse or retire intentionally)

**Plan:**

- Standardize the rail around icon-only controls.
- Keep app/menu top anchor.
- Keep settings action bottom anchored.
- Ensure the active state visually matches the selected left panel.
- Verify whether `canvas-editor-left-rail.svelte` is redundant with `canvas-editor-nav-rail.svelte` and consolidate instead of maintaining two rail concepts.

**Important design call:**

- There should be only one canonical rail component.

### Task 4: Make the second left sidebar purely contextual content

**Objective:** The left panel should be a workspace surface, not a second nav system.

**Files likely to change:**

- `packages/canvas/src/lib/base/editor/canvas-editor-left-sidebar.svelte`

**Plan:**

- Keep the panel title/content synced to the active rail icon.
- Remove any visual confusion between rail navigation and panel content.
- Preserve existing section bodies:
  - Components
  - Outline
  - Fields (if still needed on left)
- Decide whether `Fields` belongs on left at all once right inspector is canonical.

**Recommendation:**

- For desktop, prioritize:
  - `Components`
  - `Outline`
- Treat `Fields` as optional/temporary because the right inspector already owns properties.

### Task 5: Make right inspector width persistent and resizable

**Objective:** Match Puck’s “stable workbench” behavior.

**Files likely to change:**

- `packages/canvas/src/lib/base/editor/CanvasEditor.svelte`
- `packages/canvas/src/lib/base/editor/canvas-editor-right-sidebar.svelte`
- likely new resize utility under `packages/canvas/src/lib/base/editor/`

**Plan:**

- Introduce drag handles for left panel and right inspector.
- Persist widths locally.
- Use sensible min/max widths.
- Recompute canvas zoom/layout after resize end.

**Suggested defaults:**

- left panel: ~280–320px default
- right inspector: ~360–420px default
- min widths should preserve useful content, not just visual presence

### Task 6: Wire canvas auto-layout to shell width changes

**Objective:** Prevent the center canvas from feeling detached from shell changes.

**Files likely to change:**

- `packages/canvas/src/lib/base/editor/canvas-editor-surface.svelte`
- any viewport/zoom utilities used by the surface

**Plan:**

- Emit/recompute when sidebars open/close or resize.
- Follow the same high-level behavior as Puck’s canvas logic.
- Ensure the rendered frame recenters cleanly.

### Task 7: Tighten visual hierarchy and spacing

**Objective:** Make the layout read clearly as tool chrome around a central stage.

**Files likely to change:**

- `packages/canvas/src/lib/base/editor/editor-theme.css`
- `canvas-editor-nav-rail.svelte`
- `canvas-editor-left-sidebar.svelte`
- `canvas-editor-right-sidebar.svelte`
- `canvas-editor-header.svelte`

**Plan:**

- Subtle contrast step-up from app background → panel background → elevated controls.
- Strong but tasteful dividers between rail/panel/canvas/inspector.
- Ensure rail buttons, panel headers, and inspector headers share one visual language.
- Keep the canvas area visually dominant and quieter than the tool chrome.

---

## Recommended file ownership after refactor

### Shell orchestration

- `packages/canvas/src/lib/base/editor/CanvasEditor.svelte`
  - source of truth for desktop shell composition
  - visibility toggles
  - width state
  - persistence hooks

### Left rail

- `packages/canvas/src/lib/base/editor/canvas-editor-nav-rail.svelte`
  - canonical icon rail
  - active tab state
  - app menu/settings anchors

### Left contextual panel

- `packages/canvas/src/lib/base/editor/canvas-editor-left-sidebar.svelte`
  - panel header
  - panel body rendering for Components/Outline/etc.
  - no responsibility for owning the rail long-term

### Right inspector

- `packages/canvas/src/lib/base/editor/canvas-editor-right-sidebar.svelte`
  - canonical desktop inspector panel
  - title/body based on selection or app/document mode

### Shared shell behavior

- likely new utility(s):
  - `packages/canvas/src/lib/base/editor/use-editor-sidebar-resize.ts` or equivalent TS utility
  - `packages/canvas/src/lib/base/editor/editor-shell-state.ts`

---

## Risks and tradeoffs

### Risk 1: Left sidebar currently bundles rail + panel

If we don’t separate concerns, layout logic will keep feeling muddy.

**Mitigation:**

- Explicitly decide whether `canvas-editor-left-sidebar.svelte` is a composite wrapper or just the panel.

### Risk 2: Duplicate rail components exist

There is both:

- `canvas-editor-left-rail.svelte`
- `canvas-editor-nav-rail.svelte`

This suggests potential drift.

**Mitigation:**

- Consolidate to one canonical desktop rail during shell work.

### Risk 3: “Fields” may compete with right inspector

If fields remain on the left while properties stay on the right, the editor may feel redundant/confusing.

**Mitigation:**

- Treat left as structure/insertion space and right as editing/inspection space.

### Risk 4: Resizing without viewport recalculation will feel broken

The layout may technically resize while the canvas composition feels off-center.

**Mitigation:**

- Couple resize end + visibility changes to canvas recenter/auto-zoom.

---

## Open questions worth deciding before implementation

1. **Should the left rail always stay visible when the left panel is collapsed?**
   - My recommendation: yes.

2. **Should `Fields` remain a left-rail destination on desktop?**
   - My recommendation: no, or at least deprioritize it behind Components + Outline.

3. **Do you want the left panel and right inspector both resizable in the first pass, or only the right inspector first?**
   - My recommendation: both, because that’s where the desktop shell starts to feel “real”.

4. **Should left/right widths persist per user locally?**
   - My recommendation: yes.

---

## Validation plan for the future implementation pass

From repo root:

- `vp check`
- `vp test`

For focused package work first:

- `cd packages/canvas && vp check`
- `cd packages/canvas && vp test`

Manual verification for desktop shell:

- confirm desktop shows 4 clear zones: rail, left panel, canvas, right inspector
- confirm left rail remains visible when left panel collapses
- confirm switching icons updates left panel content
- confirm right inspector remains selection-aware
- confirm resizing sidebars triggers clean canvas recentering/autoscale
- confirm no runtime imports regress back to `shadcn-components/`

---

## Mobile editor strategy

After reviewing the current mobile flow in `CanvasEditor.svelte`, `canvas-editor-trigger.svelte`, and `canvas-editor-surface.svelte`, I think the current behavior is functional but not yet mobile-native:

- there is a **floating pencil trigger** in the top-right
- the **canvas toolbar stays at the top** as an overlay
- the canvas can scroll horizontally underneath that top chrome
- `handleRequestEdit()` opens the bottom sheet directly into Properties
- mobile currently uses a **bottom tab bar + bottom sheet** model, which is directionally good

### What feels off today

1. **The floating pencil is too detached**
   - It reads like a bolt-on action, not part of the mobile command system.
   - It can visually compete with or get hidden by the top toolbar.

2. **The top toolbar is too heavy for mobile**
   - Viewport controls are consuming the most valuable screen area.
   - On phones, persistent top overlays reduce usable editing space and create collision risk with edit affordances.

3. **Edit intent is too explicit and tool-like**
   - Requiring a dedicated edit button is less modern than direct-manipulation patterns.
   - On mobile, users expect tap/select/reveal patterns before they expect a separate “enter edit” button.

4. **The current mobile inspector is a generic sheet, not a contextual inspector pattern yet**
   - It works, but it doesn’t yet feel like “select object → inspect object”.

---

## Recommended mobile interaction model

### Core principle

On mobile, the shell should become:

- **canvas-first**
- **bottom-navigation driven**
- **selection-driven inspector**
- **gesture-light, not gesture-dependent**

In plain terms:

- keep the canvas visually dominant
- put primary workspace switching in a bottom bar
- open inspector/context UI based on selection
- do not rely on hidden gestures as the only path

### Recommended mobile structure

1. **Top area**
   - Keep it minimal.
   - Either:
     - collapse the current viewport controls into a compact single button/menu, or
     - hide most viewport controls on phone entirely and move them into an overflow/action sheet.

2. **Canvas middle**
   - dominant editing region
   - tap to select
   - selected node shows outline
   - optional compact contextual chip/menu near selection or anchored bottom

3. **Bottom navigation bar**
   - replace left-sidebar destinations on mobile
   - max ~4–5 icons
   - recommended tabs:
     - Components
     - Outline
     - Inspect
     - Pages or App
     - More (optional overflow)

4. **Bottom sheet / drawer / mobile inspector**
   - use the existing sidebar/dialog/drawer style primitives rather than custom overlays
   - sheet content changes based on current bottom tab or current selection
   - transitions come “for free” from the component system instead of bespoke animation work

---

## Specific interaction recommendations

### 1) Tap selects, not edits immediately

**Recommended behavior:**

- single tap on a component = select/highlight
- show component name + small contextual actions
- do **not** immediately throw the user into a full inspector

Why:

- this is more stable and less disruptive
- it gives the user confidence about what they selected
- it matches modern mobile design better than instant mode switching

### 2) Inspector should open from selection, not from a floating pencil

**Recommended behavior:**

- after selection, the user can:
  - tap the `Inspect` tab in the bottom bar, or
  - tap a contextual `Edit` action in a small component action strip
- either path opens the bottom inspector sheet

Why:

- keeps edit affordance tied to the selected object
- removes the awkward standalone pencil affordance
- supports both novice and power users

### 3) Long-press should be secondary, not primary

**Recommended behavior:**

- **do not** make long-press the only way to edit
- if used, long-press should trigger a secondary action such as:
  - drag/reorder mode
  - context menu
  - quick actions

Why:

- long-press is discoverable only to some users
- it is good as an enhancement, not as the main edit entry point

### 4) Double-tap is optional, not core

**Recommended behavior:**

- avoid making double-tap the main path to inspector
- at most, use it as a shortcut for `open inspector for selected component`

Why:

- double-tap on mobile is less universal now than it used to be
- it can conflict with zoom/tap expectations

### 5) Bottom bar should replace left rail concepts on phone

**Recommended behavior:**

- mobile bottom bar becomes the left rail equivalent
- no horizontal hunting for sidebar functions
- no dependence on an off-screen sidebar concept for primary workspace changes

Why:

- this is a common and proven mobile pattern
- it aligns with your instinct and with standard small-screen ergonomics

---

## Best-practice mobile flow I recommend

### Flow A: inspect/edit selected component

1. User taps a component on canvas
2. Component gets visible outline
3. A compact label appears with the component name
4. The bottom bar enables/highlights `Inspect`
5. User taps `Inspect`
6. Bottom sheet opens with the right-side inspector content adapted for mobile

### Flow B: add a component

1. User taps `Components` in bottom bar
2. Bottom drawer opens component palette
3. User chooses a component
4. Canvas enters insertion flow or inserts into current valid target
5. Drawer closes or minimizes

### Flow C: restructure content

1. User taps `Outline`
2. Bottom drawer opens outline tree
3. User selects a node
4. Selection is reflected on canvas
5. User can jump to `Inspect` from bottom bar

### Flow D: advanced actions

1. User selects a component
2. User long-presses selected component
3. Show quick actions such as:
   - Duplicate
   - Move
   - Delete
   - Open inspector

---

## What I would change in the current implementation plan

### Mobile change 1: remove or demote `CanvasEditorTrigger`

Current:

- `canvas-editor-trigger.svelte` is a standalone floating pencil button

Recommended:

- remove it from the primary mobile path, or
- fold its action into the top control bar or bottom bar

Best option:

- retire the floating pencil for phones
- let bottom nav + selection drive the editor flow

### Mobile change 2: split mobile sheet modes clearly

Current:

- `activeMobilePanel` controls Outline / Components / Properties

Recommended:

- formalize mobile destinations as:
  - `components`
  - `outline`
  - `inspect`
  - `pages`
  - `app`
- treat inspector as a first-class mobile destination, not just a fallback properties panel

### Mobile change 3: compress top toolbar on phone

Current:

- `canvas-editor-surface-toolbar` is always a substantial top overlay

Recommended:

- on phones, reduce it to:
  - viewport/device toggle only, or
  - a single overflow button for zoom/device actions
- reserve the canvas for actual editing

### Mobile change 4: add selection context UI

Recommended:

- when a component is selected, show a compact mobile action surface containing:
  - component name
  - Inspect
  - Move / Arrange
  - More

This can be:

- an anchored bottom chip above the nav bar,
- a tiny popover sheet,
- or a compact action row near the bottom of the screen

### Mobile change 5: support gesture enhancements without depending on them

Recommended gesture layer:

- tap = select
- long-press = quick actions or drag mode
- drag handles / explicit move affordance for rearrangement
- optional double-tap = shortcut to inspect

---

## My product opinion

Your instinct is mostly right.

Specifically, I agree with you that:

- the left-sidebar functions should become a **bottom bar** on mobile
- the floating edit pencil is **not the best long-term mobile affordance**
- the inspector should feel like it opens **because something was selected**, not because an unrelated overlay button was pressed

Where I’d refine your instinct slightly:

- I would **not** make long-press the primary entry to editing
- I would make **tap-to-select** the primary interaction
- then use **Inspect** in the bottom bar or a small contextual action to open the inspector

That is more discoverable, cleaner, and more modern.

---

## Suggested mobile-first UI contract

### Phone

- top: minimal controls only
- middle: canvas
- bottom: 4–5 icon navigation bar
- bottom sheet: Components / Outline / Inspect / Pages / App
- selection: outline + component name chip + quick actions

### Tablet

- hybrid mode
- may keep slightly richer top controls
- can optionally show a wider bottom sheet or side sheet

### Desktop

- keep full rail + left sidebar + canvas + right inspector layout

---

## Exact mobile navigation model

### Mobile primary navigation

Keep the phone nav to **4 primary tabs + 1 overflow slot max**.

**Recommended default phone tabs:**

1. **Add**
   - icon: plus / box-plus
   - opens component palette sheet
2. **Outline**
   - icon: layers / list-tree
   - opens structure tree sheet
3. **Document**
   - icon: file-text / square-pen
   - opens the current page/document editing surface and page-specific settings
4. **More**
   - icon: ellipsis
   - opens a full-screen settings and options dialog
5. **App**
   - icon: layout / panels-top-left / sparkles-grid style app icon
   - placed at the far right because it is used less often
   - opens app-level controls and cross-page configuration

### Mobile nav labeling rules

- **Phone / small mobile:** icon-only bottom bar
- **Tablet:** icon + text label side-by-side
- Keep icon ordering stable across breakpoints so muscle memory carries over.

### Why `Add` instead of `Components`

For mobile, `Add` is clearer and more action-oriented.
It tells the user what happens immediately.

### Why remove `Inspect` from the bottom bar

Inspection/editing should come from **selection gestures and contextual actions**, not from occupying a permanent nav slot.
That frees one slot for higher-level app/workspace navigation while keeping the edit model more direct.

### What `App` should contain

`App` should be the user-facing home for **cross-page app-level operations**, not page-specific editing and not low-level editor settings.

Recommended contents:

- providers
- additional pages / page management entry points
- app icon / app identity
- basic app metadata
- theme / style-system level controls
- app-wide configuration shared across pages

### What should NOT live in `App`

Avoid putting page-specific concerns here when they belong to the current document/page.
In particular:

- page-specific SEO
- page content editing
- page-local metadata

Those belong under the current **Document** flow.

### What goes in `More`

`More` should open a **full-screen dialog**, not a small action sheet.
That dialog becomes the mobile home for broader settings and secondary options.

Recommended structure inside `More`:

- **App Settings**
  - app-wide configuration entry points that are too dense for the bottom bar
- **Document Settings**
  - current-document utilities that are broader than inline editing
- **Workspace / Actions**
  - viewport/device preview controls
  - undo / redo
  - preview mode
  - save / publish
- **Editor Settings**
  - always placed at the very bottom as a clearly separate section

### Product recommendation: `Document` vs `App` vs `More`

My opinion:

- **Document** should be the fast-access area for the current page/document the user is actively shaping.
- **App** should be the cross-page/configuration area that affects the app beyond the current page.
- **More** should be the full-screen overflow/settings surface for broader configuration and less-frequent actions.

So I would split it like this:

- `Document` = current page/document work, including page-specific SEO and page-level metadata
- `App` = providers, additional pages, app icon, basic app metadata, and app-wide configuration
- `More` = full-screen overflow dialog with settings, utilities, and editor-level controls

This keeps the bottom bar useful without making `More` a junk drawer, and it cleanly separates page concerns from app concerns.

### What should NOT be in the phone bottom bar

Avoid putting these as top-level tabs on small screens unless usage data proves otherwise:

- Settings
- Theme
- Providers
- SEO
- Metadata
- Zoom controls

Those belong in:

- `More`
- page/app sheets
- contextual inspector sections

---

## Bottom-sheet behavior by tab

### `Add`

**Presentation:** bottom drawer / sheet

**Contents:**

- search input
- category groups
- common/recent components first
- tap-to-insert actions

**Behavior:**

- opens half-height by default
- can expand to near full height
- closes after insert unless user pins it open later

### `Outline`

**Presentation:** bottom drawer / sheet

**Contents:**

- document/component tree
- current selection highlighted
- collapse/expand tree groups
- quick jump to selected node

**Behavior:**

- selecting an item updates canvas selection
- sheet stays open until dismissed or `Inspect` is tapped

### `Inspect`

**Presentation:** bottom drawer / sheet

**Contents:**

- selected component name
- edit fields
- component actions
- style/layout/content sections

**Behavior:**

- if no selection: show empty state with prompt like `Select a component to inspect`
- if app/page mode is active: show app/page inspector instead

### `Document`

**Presentation:** bottom sheet or full-height mobile dialog depending on density

**Contents:**

- current page/document editing utilities
- page-level metadata
- page-specific SEO
- page structure/settings for the active page
- explicit save/apply flow before switching to another page when needed

**Behavior:**

- optimized for the page the user is actively working on
- should support the workflow of editing/saving the current page before jumping elsewhere

### `App`

**Presentation:** bottom sheet on phone, wider side-sheet/full-height panel on tablet when space allows

**Contents:**

- providers
- additional pages / page management
- app icon / app identity
- basic app metadata
- theme / brand controls
- app-wide configuration shared across pages

**Behavior:**

- this is the frequent-access home for cross-page app configuration
- should feel operational, not like a dumping ground for every rare setting

### `More`

**Presentation:** **full-screen mobile dialog**

**Contents:**

- App Settings section
- Document Settings section
- Workspace / Actions section
- Editor Settings pinned at the very bottom

**Behavior:**

- acts as the mobile settings/overflow hub
- good place for less-frequent controls and anything too dense for the bottom bar
- should feel like a dedicated settings screen, not a tiny action popover

---

## Exact mobile interaction spec

### Selection states

#### State 1: no selection

- canvas remains clean
- no dedicated `Inspect` tab is shown in bottom nav
- editing remains accessible through selection gestures and contextual UI
- app/pages/more remain available regardless of selection

#### State 2: selected

- tapped component gets visible outline
- show compact component label chip
- chip includes:
  - component name
  - chevron or menu affordance
  - optional quick `Edit` action

#### State 3: selected + inspector open

- keep selected outline visible on canvas
- bottom inspector sheet opens from gesture/context action
- content reflects selected node fields/actions

#### State 4: selected + quick actions open

- quick action menu/sheet appears
- possible actions:
  - Edit
  - Duplicate
  - Delete
  - Move
  - Scroll into view in Outline

---

## Gesture and tap contract

### Single tap

**Primary action:** select component

Rules:

- if tapping unselected component → select it
- if tapping selected component again → reveal quick actions or keep selected without changing mode
- if tapping canvas background → clear selection

### Long press

**Primary action:** open quick actions or enter move mode

Recommended use:

- long-press selected component = open contextual action sheet
- optional future enhancement: long-press + drag = rearrange mode

### Double tap

**Primary action:** optional shortcut to inspect

Rule:

- do not require this for core editing
- okay as a power-user accelerator

### Dragging

On small screens, dragging should be intentional.

Recommended:

- do not begin drag from ordinary tap
- use:
  - explicit move handle, or
  - long-press-to-reorder mode

This reduces accidental drags while scrolling.

---

## Recommended mobile component action UI

### Preferred pattern: bottom context chip

After selection, show a compact bar/chip just above the bottom nav.

**Contents:**

- component icon
- component name
- `Edit`
- `More`

Why this is best:

- visible
- thumb-friendly
- doesn’t cover the top toolbar area
- keeps the relationship between selection and edit actions obvious

### Alternative pattern: anchored mini popover

Only use this if the canvas content density supports it.

Risk:

- popovers can feel cramped or cover content on small screens

### Avoid

- standalone floating pencil unrelated to current selection
- forcing inspector open on every tap
- relying on hidden gestures with no visible fallback

---

## Responsive breakpoint model

### Phone (< ~768px)

- bottom nav replaces left rail/sidebar
- inspector is a bottom sheet
- top controls are minimized
- canvas gets maximum vertical space

### Small tablet (~768px to ~1024px)

- keep bottom nav OR use hybrid side sheet depending on orientation
- allow wider inspector sheet
- allow more visible toolbar controls in landscape

### Desktop (>= ~1024px)

- restore full rail + left sidebar + center canvas + right inspector

---

## Suggested implementation notes for current files

### `CanvasEditor.svelte`

Planning changes:

- replace current mobile tab labels with final nav model:
  - `Add`
  - `Outline`
  - `Document`
  - `More`
  - `App`
- keep `App` at the far right as the less-frequently used global area
- phone bottom nav is icon-only
- tablet bottom nav uses icon + text label
- remove `CanvasEditorTrigger` from primary phone flow
- let selection gestures and contextual UI open the inspector instead of dedicating a permanent nav tab to it

### `canvas-editor-trigger.svelte`

Planning direction:

- likely retire on phone
- if kept, repurpose for tablet or overflow-only scenarios

### `canvas-editor-surface.svelte`

Planning changes:

- reduce persistent phone toolbar density
- support a selected-state context chip above bottom nav
- ensure top overlay no longer collides with edit affordances

### Right inspector content reuse

Planning direction:

- reuse `canvas-editor-right-sidebar.svelte` content model for mobile sheet
- do not create a second, separate inspector system if avoidable

---

## Final recommendation snapshot

### Final phone bottom bar

- `Add`
- `Outline`
- `Document`
- `More`
- `App`

### Final phone/tablet nav presentation

- phone: icon-only bottom bar
- tablet: icon + label bottom bar

### Final phone edit interaction

- tap = select
- edit via gesture/context chip, not a permanent nav tab
- long-press = quick actions / move mode
- double-tap = optional shortcut only

### Final phone inspector model

- contextual bottom sheet
- selection-aware
- powered by existing sidebar/sheet component system

---

## Bottom line

You do **not** need a new architecture for this editor shell.

The correct planning move is:

- keep the current shell direction,
- formalize desktop as a true 4-zone workbench,
- consolidate to one canonical left rail,
- make the second left sidebar contextual,
- keep the right side as the inspector,
- add persisted resize behavior modeled after Puck,
- and on mobile, switch to a **canvas-first bottom-bar + contextual inspector** model instead of a floating edit button model.

That gets Nova the layout you described without unnecessary churn, and it makes the mobile editor feel intentional instead of merely adapted.
