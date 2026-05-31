import CanvasEditor from "./CanvasEditor.svelte";
import StudioEditor from "./StudioEditor.svelte";
import CanvasEditorSurface from "./canvas-editor-surface.svelte";
import CanvasEditorSidebar from "./canvas-editor-sidebar.svelte";
import CanvasEditorTrigger from "./canvas-editor-trigger.svelte";
import CanvasEditorInspector from "./canvas-editor-inspector.svelte";
import CanvasEditorAppInspector from "./canvas-editor-app-inspector.svelte";
import CanvasEditorNodeInspector from "./canvas-editor-node-inspector.svelte";
import CanvasEditorHeader from "./canvas-editor-header.svelte";
import CanvasEditorLeftRail from "./canvas-editor-left-rail.svelte";
import CanvasEditorLeftSidebar from "./canvas-editor-left-sidebar.svelte";
import CanvasEditorRightSidebar from "./canvas-editor-right-sidebar.svelte";
import EditorCanvas from "./EditorCanvas.svelte";
import EditorSidebar from "./EditorSidebar.svelte";
import EditorControls from "./EditorControls.svelte";
import EditorComponentHighlight from "./EditorComponentHighlight.svelte";
import EditorField from "./fields/EditorField.svelte";

export { createEditorStore, editorStore } from "./store.js";
export {
  getEditorContext,
  setEditorContext,
  selectComponent,
  hoverComponent,
  updateComponentProperty,
  isComponentSelected,
  isComponentHovered,
} from "./context.js";

export {
  generateId,
  isInternalLink,
  formatLinkValue,
  navigateToLink,
  getInputTypeForField,
  formatComponentType,
  createNodeFromCatalogEntry,
  getCatalogCategories,
  getComponentInsertionTargets,
  getDragPosition,
  findComponentById,
  isMobileDevice,
  getEventPosition,
} from "./utils.js";

export { editorCodeTemplates } from "./code-templates.js";
export * from "./types.js";
export {
  CanvasEditor,
  StudioEditor,
  CanvasEditorSurface,
  CanvasEditorSidebar,
  CanvasEditorTrigger,
  CanvasEditorInspector,
  CanvasEditorAppInspector,
  CanvasEditorNodeInspector,
  CanvasEditorHeader,
  CanvasEditorLeftRail,
  CanvasEditorLeftSidebar,
  CanvasEditorRightSidebar,
  EditorCanvas,
  EditorSidebar,
  EditorControls,
  EditorComponentHighlight,
  EditorField,
};

export default CanvasEditor;
