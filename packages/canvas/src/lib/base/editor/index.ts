import CanvasEditor from "./CanvasEditor.svelte";
import StudioEditor from "./StudioEditor.svelte";
import EditorCanvas from "./EditorCanvas.svelte";
import EditorSidebar from "./EditorSidebar.svelte";
import EditorControls from "./EditorControls.svelte";
import EditorComponentHighlight from "./EditorComponentHighlight.svelte";
import EditorField from "./fields/EditorField.svelte";

export { editorStore } from "./store.js";
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
  EditorCanvas,
  EditorSidebar,
  EditorControls,
  EditorComponentHighlight,
  EditorField,
};

export default CanvasEditor;
