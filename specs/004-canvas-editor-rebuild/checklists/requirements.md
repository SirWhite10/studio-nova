# Checklist: Canvas Editor Rebuild — Requirements Traceability

## Phase 1: Unblock

- [ ] **FR-003**: input component created in view-ui/
- [ ] **FR-003**: textarea component created in view-ui/
- [ ] **FR-003**: checkbox component created in view-ui/
- [ ] **FR-003**: switch component created in view-ui/
- [ ] **FR-003**: progress component created in view-ui/
- [ ] **FR-003**: accordion component created in view-ui/
- [ ] **FR-004**: dialog component created in view-ui/
- [ ] **FR-004**: command component created in view-ui/
- [ ] **FR-001**: CanvasEditor.svelte imports only from view-ui/
- [ ] **FR-001**: canvas-editor-left-sidebar.svelte imports only from view-ui/
- [ ] **FR-001**: canvas-editor-right-sidebar.svelte imports only from view-ui/
- [ ] **FR-001**: editor-settings.svelte imports only from view-ui/
- [ ] **FR-001**: canvas-editor-pages-dialog.svelte imports only from view-ui/
- [ ] **SC-001**: `grep -r "shadcn-components" packages/canvas/src/lib/base/ packages/canvas/src/lib/components/view-ui/` returns zero results

## Phase 2: Cross-Cutting Fixes

- [ ] **FR-007**: All interactive components have focus-visible rings
- [ ] **FR-008**: All interactive components have disabled state (opacity 0.5, pointer-events none)
- [ ] **FR-009**: No hardcoded colors — all use canvasTheme tokens
- [ ] **FR-005**: All view-ui components use `<View>` internally
- [ ] **FR-006**: No Tailwind classes in rendered output

## Phase 3: Component-Specific

- [ ] **FR-002**: Card component matches shadcn visual fidelity
- [ ] **FR-002**: Tabs component matches shadcn visual fidelity
- [ ] **FR-002**: Sidebar component matches shadcn visual fidelity
- [ ] **FR-002**: Button component matches shadcn visual fidelity
- [ ] **FR-002**: Dropdown-menu component matches shadcn visual fidelity
- [ ] **FR-002**: Select component matches shadcn visual fidelity
- [ ] **SC-002**: All components render within ±2px of shadcn counterparts

## Phase 4: Editor Shell

- [ ] **FR-010**: Editor layout uses 5-region CSS grid (header, nav, left, center, right)
- [ ] **FR-011**: Component selection overlay with action bar works
- [ ] **FR-012**: Drag-and-drop from palette to canvas works
- [ ] **SC-004**: Editor shell renders with Puck-matching layout

## Phase 5: AI Integration

- [ ] **FR-013**: Store API supports programmatic page construction
- [ ] **SC-005**: AI agent can construct a multi-component page and serialize to valid JSON

## Cross-Cutting

- [ ] **FR-014**: shadcn-components/ directory remains in codebase, zero runtime imports
