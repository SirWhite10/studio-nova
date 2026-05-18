# Feature Specification: Canvas Editor Refactor

**Feature Branch**: `003-canvas-editor-refactor`  
**Created**: 2026-05-18  
**Status**: Draft  
**Input**: User description: "Refactor the current package-level editor away from the older StudioEditor shell into a generic CanvasEditor with a Puck-inspired but Svelte-native information architecture: top-right landing-demo trigger, left workflow rail/panel, center canvas, right inspector, document selected by default in Properties, app/runtime settings under Settings, and block-owned inspector schemas for authored blocks like Hero.1."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Open a landing editor without replacing the app preview (Priority: P1)

A developer can open the landing canvas page, click a small edit trigger in the top-right corner, and reveal editor chrome around the rendered app without replacing the page with a separate product shell.

**Why this priority**: This establishes the desired editing experience for Canvas: the app remains primary, and the editor is an overlay/runtime layer rather than a separate product shell.

**Independent Test**: Can be tested by loading the landing canvas page, confirming the editor is closed by default, clicking the edit trigger, and seeing the editing surfaces open while the CanvasApp-rendered page remains intact.

**Acceptance Scenarios**:

1. **Given** the landing canvas page is loaded, **When** it first renders, **Then** the page shows the Canvas app content with editor chrome closed by default.
2. **Given** the editor is closed, **When** the user clicks the top-right edit trigger, **Then** the editor opens while the app preview remains visible.
3. **Given** the editor is open, **When** the user closes it, **Then** the page returns to the plain app preview with no full editor header/chrome remaining.

---

### User Story 2 - Edit the document when nothing is selected (Priority: P1)

A developer can open the editor and inspect/edit the Canvas document root when no specific canvas node is selected in the Properties surface.

**Why this priority**: The default editing target should be meaningful and authored. No-selection should resolve to the document, not a no-op state.

**Independent Test**: Can be tested by opening the editor without selecting any component and verifying that document/root fields are shown and editable in Properties.

**Acceptance Scenarios**:

1. **Given** the editor is open and no component is selected, **When** Properties renders, **Then** it shows document/root fields instead of an empty state.
2. **Given** document/root fields are shown, **When** the user updates one of those fields, **Then** the document-level editor state updates through the editor runtime.

---

### User Story 3 - Edit a selected canvas node or block-owned schema (Priority: P1)

A developer can click a canvas node in the rendered preview and have the right inspector switch from document editing to node/component editing using schema-driven fields, including block-owned authored schemas for higher-level blocks like `Hero.1`.

**Why this priority**: The editor must support both primitive node editing and higher-level authored block editing, not only document editing.

**Independent Test**: Can be tested by opening the editor, selecting a visible canvas node, and verifying that the inspector switches to the selected node’s property fields.

**Acceptance Scenarios**:

1. **Given** the editor is open, **When** the user clicks a selectable canvas node, **Then** the right inspector shows that node’s editable fields.
2. **Given** a `Hero.1` block is selected, **When** the inspector renders, **Then** it exposes block-owned sections such as content, actions, media, and layout rather than relying primarily on nested slot selection.
3. **Given** a node is selected, **When** the user clicks the page background, **Then** node selection clears and Properties returns to document editing.

---

### User Story 4 - Use a dual-sidebar generic Canvas editor rather than a Studio-branded shell (Priority: P2)

A developer integrating Canvas can use a generic `CanvasEditor` from the library with a left workflow rail/panel and right inspector, without inheriting a product-specific Studio shell, leaving `StudioEditor` for future nova-cloud ownership.

**Why this priority**: The library editor must remain generic so it can be reused outside the Studio product and composed into different experiences.

**Independent Test**: Can be tested by importing and using `CanvasEditor` as the main package-level editor entry and confirming the implementation no longer depends on a full `StudioEditor` shell structure.

**Acceptance Scenarios**:

1. **Given** the package exports its editor entry, **When** a developer imports the generic editor, **Then** the package exposes `CanvasEditor` as the intended generic editor surface.
2. **Given** the editor implementation is refactored, **When** the codebase is reviewed, **Then** the main editor composition is clearly generic and not branded around Studio-specific behavior.

### User Story 5 - Use customizable left workflow panels and mobile tab/sheet behavior (Priority: P2)

A developer integrating Canvas can use built-in left workflow tabs like Outline and Components on desktop, replace or augment the left panel with a Svelte snippet for custom tooling, and rely on a bottom-tab + single-sheet editing model on mobile.

**Why this priority**: The left side of the editor should be workflow-oriented and extensible, especially for AI-driven or integration-specific experiences.

**Independent Test**: Can be tested by using the default left workflow tabs on desktop, then swapping in custom snippet content and confirming the editor still composes correctly.

**Acceptance Scenarios**:

1. **Given** the editor is open on desktop, **When** the user views the left side, **Then** it shows an icon rail and active panel body for workflow tools such as Outline and Components.
2. **Given** an integration provides custom left panel snippet content, **When** the editor renders, **Then** the custom content can replace or augment the native left panel body.
3. **Given** the editor is used on mobile, **When** the user navigates editing surfaces, **Then** the UI uses a bottom tab bar with one shared bottom sheet whose body switches between tabs instead of opening separate sheets.

### Edge Cases

- What happens when the editor is opened before any node has ever been selected?
- What happens when a selected node has no editor schema?
- What happens when app/runtime editor config is missing or incomplete?
- What happens when the trigger is used on smaller screens where editor chrome still starts closed?
- What happens when a block chooses to constrain its authored schema instead of exposing arbitrary nested replacements?
- What happens during migration while older examples still reference `StudioEditor` naming or shell assumptions?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The package MUST provide a generic `CanvasEditor` as the main library editor surface.
- **FR-002**: The default `CanvasEditor` composition MUST use a desktop layout of left workflow rail/panel + center canvas + right inspector instead of a required full editor toolbar/header shell.
- **FR-003**: Editor chrome for the landing demo MUST be closed by default on all screen sizes.
- **FR-004**: The landing demo MUST provide a top-right edit trigger that opens and closes editor chrome.
- **FR-005**: The landing canvas demo MUST preserve `CanvasApp` as the rendered root while the editor acts as an overlay/runtime layer.
- **FR-006**: When no node is selected, Properties MUST show document/root editing fields rather than an empty no-op state.
- **FR-007**: When a selectable node is selected, the right inspector MUST switch to node/component editing fields.
- **FR-008**: Background click behavior MUST support returning from node selection to document editing in Properties.
- **FR-009**: App/runtime settings MUST live in a dedicated Settings surface rather than being the default no-selection Properties target.
- **FR-010**: The left workflow sidebar MUST support native workflow tabs such as Outline and Components.
- **FR-011**: The left workflow sidebar MUST support customization via Svelte snippets so integrations can replace or augment the native left panel body.
- **FR-012**: The right inspector MUST be dedicated to document/node/app editing rather than mixing in Outline or Components workflows.
- **FR-013**: The selected component chrome MUST show title/actions only for the selected node, while hover-only state SHOULD keep visual highlight without full chrome.
- **FR-014**: Higher-level blocks/widgets MUST be able to define block-owned authored schemas that manage their own content/actions/media/layout instead of forcing arbitrary nested replacement as the primary editing path.
- **FR-015**: `Hero.1` MUST serve as the first concrete block-owned schema example in the landing flow.
- **FR-016**: The refactor MUST preserve or reuse existing proven editor logic for selection, highlighting, and field rendering where appropriate.
- **FR-017**: The refactor MUST separate the editor into smaller components to improve organization and future editing/runtime customization.
- **FR-018**: The package MUST not require Studio-specific product chrome to use the default editor.
- **FR-019**: The implementation MUST leave a clear path for nova-cloud to own or build a richer `StudioEditor` later.
- **FR-020**: The refactor MUST identify which current files are renamed, split, retained, or deleted as part of the editor architecture cleanup.
- **FR-021**: Mobile editing MUST use a bottom-tab + single-bottom-sheet model rather than separate competing drawers.

### Key Entities _(include if feature involves data)_

- **CanvasEditor**: The generic library-level editor surface for Canvas, intended to provide selection, inspection, workflow navigation, and editing runtime behavior.
- **Canvas Editor Trigger**: A minimal top-right control that toggles editor chrome open and closed.
- **Canvas Editor Surface**: The interactive preview layer responsible for rendering CanvasApp and handling node selection/highlighting behavior.
- **Left Workflow Rail**: The icon-first navigation surface for tools like Outline and Components on desktop, and the source of mobile bottom-tab navigation.
- **Left Workflow Panel**: The active tool body adjacent to the left rail, intended for built-in workflow tools or integration-provided snippet content.
- **Right Inspector**: The dedicated editing surface for document fields, selected node fields, or app/runtime settings.
- **Document Inspector**: The inspector content shown in Properties when no node is selected.
- **App/Runtime Inspector**: The inspector content shown in Settings for app-level runtime concerns.
- **Node Inspector**: The inspector content shown when a canvas node is selected, exposing node-specific editor schema fields.
- **Block-Owned Authored Schema**: A higher-level editing contract for blocks/widgets that manages content, actions, media, and layout without forcing the user to navigate arbitrary nested structure as the main workflow.
- **StudioEditor (future product wrapper)**: A later nova-cloud-owned editor composition that may build on Canvas editor contracts but is not the canonical library editor shape.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The landing canvas demo renders editor chrome that is closed by default and opened by a top-right edit trigger.
- **SC-002**: Opening the editor does not replace the CanvasApp-rendered page with a full toolbar/header editor shell.
- **SC-003**: Desktop editing uses a left rail/panel + center canvas + right inspector layout.
- **SC-004**: Properties shows document fields when no node is selected, while Settings shows app/runtime fields explicitly.
- **SC-005**: `Hero.1` demonstrates a block-owned authored inspector schema for content/actions/media/layout.
- **SC-006**: The package-level editor structure is clearly organized into smaller composable parts rather than a monolithic Studio-specific shell.
- **SC-007**: `CanvasEditor` is the intended generic editor entry point for the package.

## Assumptions

- `CanvasApp`, responsive foundation work, and current landing canvas runtime structure remain the baseline for this refactor.
- The old `StudioEditor` implementation is useful as a source of reusable editor logic but not as the desired final shell architecture.
- The primary design reference is Puck’s editor information architecture, especially the code under `~/studio-nova/packages/puck/packages/core`, but Canvas must reinterpret those ideas in Svelte rather than port React internals.
- nova-cloud will later own product/workspace-specific Studio behavior rather than the Canvas package.
- Initial refactor scope focuses on the generic Canvas editing experience, not the full future Studio workspace interface.
