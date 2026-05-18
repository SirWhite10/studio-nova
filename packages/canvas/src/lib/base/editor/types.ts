import type { Component, Snippet } from "svelte";
import type { SvelteMap } from "svelte/reactivity";
import type {
  CanvasComponentCatalog,
  CanvasNode,
  CanvasNodeKind,
  RenderComponentFn,
} from "$lib/base/canvas/types.js";

/**
 * Editor mode
 */
export type EditorMode = "edit" | "preview";

/**
 * Editor sidebar display mode
 */
export type EditorSidebarMode = "docked" | "floating" | "hidden" | "auto";

/**
 * Editor panel types
 */
export type EditorPanel = "Properties" | "Layers" | "Components" | "Settings";

/**
 * Editor field types
 */
export type EditorFieldType =
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "color"
  | "spacing"
  | "size"
  | "array"
  | "object"
  | "link"
  | "image"
  | "icon"
  | "richtext";

/**
 * Base field configuration
 */
export interface BaseFieldConfig {
  label: string;
  description?: string;
  required?: boolean;
  showIf?: (data: any) => boolean;
  onChange?: (value: any, formData: any) => any;
}

/**
 * Text field configuration
 */
export interface TextFieldConfig extends BaseFieldConfig {
  type: "text";
  default?: string;
  placeholder?: string;
  multiline?: boolean;
  secret?: boolean;
}

/**
 * Number field configuration
 */
export interface NumberFieldConfig extends BaseFieldConfig {
  type: "number";
  default?: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

/**
 * Boolean field configuration
 */
export interface BooleanFieldConfig extends BaseFieldConfig {
  type: "boolean";
  default?: boolean;
}

/**
 * Select option
 */
export interface SelectOption {
  value: string | number;
  label: string;
  description?: string;
  icon?: string;
}

/**
 * Select field configuration
 */
export interface SelectFieldConfig extends BaseFieldConfig {
  type: "select";
  options: SelectOption[] | string[];
  default?: string | number;
  multiple?: boolean;
}

/**
 * Color field configuration
 */
export interface ColorFieldConfig extends BaseFieldConfig {
  type: "color";
  default?: string;
  format?: "hex" | "rgb" | "hsl" | "oklch";
  alpha?: boolean;
  presets?: string[];
}

/**
 * Spacing value
 */
export interface SpacingValue {
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  left?: string | number;
}

/**
 * Spacing field configuration
 */
export interface SpacingFieldConfig extends BaseFieldConfig {
  type: "spacing";
  default?: SpacingValue;
  unit?: "px" | "rem" | "em" | "%";
  linked?: boolean;
}

/**
 * Size value
 */
export interface SizeValue {
  width?: string | number;
  height?: string | number;
}

/**
 * Size field configuration
 */
export interface SizeFieldConfig extends BaseFieldConfig {
  type: "size";
  default?: SizeValue;
  unit?: "px" | "rem" | "em" | "%";
  linked?: boolean;
}

/**
 * Link value
 */
export interface LinkValue {
  url: string;
  target?: "_self" | "_blank" | "_parent" | "_top";
  rel?: string;
  internal?: boolean;
  title?: string;
}

/**
 * Link field configuration
 */
export interface LinkFieldConfig extends BaseFieldConfig {
  type: "link";
  default?: LinkValue;
  internalOnly?: boolean;
  externalOnly?: boolean;
}

/**
 * Image value
 */
export interface ImageValue {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

/**
 * Image field configuration
 */
export interface ImageFieldConfig extends BaseFieldConfig {
  type: "image";
  default?: ImageValue;
  maxSize?: number;
  allowedTypes?: string[];
}

/**
 * Icon field configuration
 */
export interface IconFieldConfig extends BaseFieldConfig {
  type: "icon";
  default?: string;
  collection?: string;
}

/**
 * Rich text field configuration
 */
export interface RichTextFieldConfig extends BaseFieldConfig {
  type: "richtext";
  default?: string;
  toolbar?: string[];
}

/**
 * Array field configuration
 */
export interface ArrayFieldConfig extends BaseFieldConfig {
  type: "array";
  itemConfig: EditorFieldConfig;
  default?: any[];
  minItems?: number;
  maxItems?: number;
}

/**
 * Object field configuration
 */
export interface ObjectFieldConfig extends BaseFieldConfig {
  type: "object";
  fields: Record<string, EditorFieldConfig>;
  default?: Record<string, any>;
}

/**
 * Union of all field configurations
 */
export type EditorFieldConfig =
  | TextFieldConfig
  | NumberFieldConfig
  | BooleanFieldConfig
  | SelectFieldConfig
  | ColorFieldConfig
  | SpacingFieldConfig
  | SizeFieldConfig
  | LinkFieldConfig
  | ImageFieldConfig
  | IconFieldConfig
  | RichTextFieldConfig
  | ArrayFieldConfig
  | ObjectFieldConfig;

/**
 * Editor group configuration
 */
export interface EditorGroupConfig {
  label: string;
  fields: string[];
  expanded?: boolean;
  icon?: string;
}

/**
 * Editor configuration
 */
export interface EditorConfig {
  fields: Record<string, EditorFieldConfig>;
  groups?: Record<string, EditorGroupConfig>;
}

export interface EditorSlotConfig {
  label: string;
  description?: string;
  allowedTypes?: string[];
  allowedKinds?: CanvasNodeKind[];
  multiple?: boolean;
}

/**
 * Component selection state
 */
export interface ComponentSelection {
  component: CanvasNode;
  config?: EditorComponent<any>;
  path: string[];
}

/**
 * Editor history entry
 */
export interface EditorHistoryEntry {
  components: CanvasNode[];
  selection?: ComponentSelection;
  timestamp: number;
}

/**
 * Editor state store
 */
export interface EditorState {
  canUndo: boolean | undefined;
  canRedo: boolean | undefined;
  mode: EditorMode;
  components: CanvasNode[];
  selection?: ComponentSelection;
  hoveredComponent?: CanvasNode;
  clipboard?: CanvasNode;
  history: EditorHistoryEntry[];
  historyIndex: number;
  sidebarMode: EditorSidebarMode;
  sidebarVisible: boolean;
  componentRegistry: Record<string, Component>;
  isDragging: boolean;
}

/**
 * Editor props
 */
export interface EditorProps {
  components?: CanvasNode[];
  mode?: EditorMode;
  sidebarMode?: EditorSidebarMode;
  onChange?: (components: CanvasNode[]) => void;
  onModeChange?: (mode: EditorMode) => void;
  componentRegistry?: Record<string, Component>;
  componentCatalog?: CanvasComponentCatalog;
  editorConfig?: Record<string, any>;
  renderComponent?: (component: CanvasNode) => Snippet;
  class?: string;
}

/**
 * Editor sidebar props
 */
export interface EditorSidebarProps {
  mode?: EditorSidebarMode;
  components?: CanvasNode[];
  selection?: ComponentSelection;
  clipboardAvailable?: boolean;
  clipboardNode?: CanvasNode;
  componentCatalog?: CanvasComponentCatalog;
  editorConfig?: Record<string, EditorComponent<any>>;
  updateProperty?: (path: string[], property: string, value: any) => void;
  class?: string;
  isDraggable?: boolean;
  activePanel?: EditorPanel; // Added activePanel prop
}

/**
 * Editor canvas props
 */
export interface EditorCanvasProps {
  components?: CanvasNode[];
  mode?: EditorMode;
  selection?: ComponentSelection;
  onSelect?: (selection: ComponentSelection) => void;
  onHover?: (component: CanvasNode | undefined) => void;
  onRequestEdit?: (selection: ComponentSelection) => void;
  componentRegistry?: SvelteMap<string, Component>;
  componentCatalog?: CanvasComponentCatalog;
  renderComponent?: RenderComponentFn;
  class?: string;
}

/**
 * Editor controls props
 */
export interface EditorControlsProps {
  mode?: EditorMode;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onModeChange?: (mode: EditorMode) => void;
  class?: string;
}

/**
 * Editor field props
 */
export interface EditorFieldProps {
  name: string;
  config: EditorFieldConfig;
  value?: any;
  onChange?: (value: any) => void;
  class?: string;
}

/**
 * Editor group props
 */
export interface EditorGroupProps {
  name: string;
  config: EditorGroupConfig;
  fieldsConfig: Record<string, EditorFieldConfig>;
  values?: Record<string, any>;
  onChange?: (name: string, value: any) => void;
  class?: string;
}

/**
 * Editor component highlight props
 */
export interface EditorComponentHighlightProps {
  component: CanvasNode;
  isSelected?: boolean;
  isHovered?: boolean;
  label?: string;
  onClick?: (e: MouseEvent) => void;
  onEdit?: () => void;
  onCopy?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onContextMenu?: (e: MouseEvent) => void;
}

/**
 * Editor context menu props
 */
export interface EditorContextMenuProps {
  component: CanvasNode;
  x: number;
  y: number;
  onClose: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
}

export interface EditorComponent<T extends Record<string, any> = {}> {
  component?: Component<T>;
  props?: Partial<T>;
  editorConfig?: EditorConfig;
  kind?: CanvasNodeKind;
  category?: string;
  slots?: Record<string, EditorSlotConfig>;
}
