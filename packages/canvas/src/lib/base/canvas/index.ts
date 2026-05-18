import Canvas from "./canvas.svelte";
import { canvasCodeTemplates } from "./code-templates.js";
import CanvasRenderNode from "./render-node.svelte";
import CanvasRenderNodes from "./render-nodes.svelte";
import type {
  CanvasActionContext,
  CanvasDocument,
  CanvasNode,
  CanvasProps,
  CanvasProviderActions,
  CanvasProviderNode,
  CanvasBinding,
  CanvasActionRef,
  CanvasComponentCatalog,
  CanvasComponentDefinition,
  CanvasSlotDefinition,
  ComponentDef,
} from "./types.js";

export { Canvas, CanvasRenderNode, CanvasRenderNodes, canvasCodeTemplates };
export type {
  CanvasActionRef,
  CanvasActionContext,
  CanvasBinding,
  CanvasComponentCatalog,
  CanvasComponentDefinition,
  CanvasDocument,
  CanvasNode,
  CanvasProps,
  CanvasProviderActions,
  CanvasProviderNode,
  CanvasSlotDefinition,
  ComponentDef,
};
export default Canvas;
