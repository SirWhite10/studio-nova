import type {
  CanvasComponentCatalog,
  CanvasComponentDefinition,
  CanvasNode,
  CanvasSlotDefinition,
} from "$lib/base/canvas/types.js";
import type {
  EditorComponent,
  EditorConfig,
  EditorFieldConfig,
  EditorFieldType,
  EditorGroupConfig,
  LinkValue,
} from "./types.js";

const isBrowser = typeof window !== "undefined";

/**
 * Helper to generate a unique ID
 */
export function generateId(prefix = "comp"): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Check if a link is internal
 */
export function isInternalLink(url: string): boolean {
  if (!url) return false;
  if (!url.startsWith("http")) return true;

  if (isBrowser) {
    return url.startsWith(window.location.origin);
  }

  return false;
}

/**
 * Format a link value
 */
export function formatLinkValue(link: string | LinkValue): LinkValue {
  if (typeof link === "string") {
    const internal = isInternalLink(link);
    return {
      url: link,
      target: internal ? "_self" : "_blank",
      internal,
    };
  }

  return link;
}

/**
 * Safely navigate to a link
 */
export function navigateToLink(link: string | LinkValue, editorMode = "edit"): void {
  if (!isBrowser) return;

  const linkValue = formatLinkValue(link);

  // Don't navigate in edit mode unless it's a special editor link
  if (editorMode === "edit" && !linkValue.url.startsWith("studio://")) {
    return;
  }

  // Handle studio internal links
  if (linkValue.url.startsWith("studio://")) {
    // TODO: Implement studio internal navigation
    return;
  }

  // Handle regular links
  if (linkValue.target === "_blank") {
    window.open(linkValue.url, "_blank", "noopener,noreferrer");
  } else {
    window.location.href = linkValue.url;
  }
}

/**
 * Find the appropriate input type for a field type
 */
export function getInputTypeForField(fieldType: EditorFieldType): string {
  switch (fieldType) {
    case "number":
      return "number";
    case "boolean":
      return "checkbox";
    case "color":
      return "color";
    default:
      return "text";
  }
}

/**
 * Format a component type name for display
 */
export function formatComponentType(type: string): string {
  if (!type) return "Unknown";

  // Split by camel case and capitalize each word
  return type
    .replace(/([A-Z])/g, " $1")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

export function getComponentDisplayLabel(
  component: CanvasNode,
  componentCatalog: CanvasComponentCatalog = {},
): string {
  const definition = componentCatalog[component.type];
  const componentLabel = definition?.label ?? formatComponentType(component.type);
  const detail = [
    component.props?.label,
    component.props?.title,
    component.props?.text,
    component.props?.name,
    component.props?.heading,
  ]
    .find((value) => typeof value === "string" && value.trim().length > 0)
    ?.trim();

  if (detail && detail !== componentLabel) {
    return `${detail} - ${componentLabel}`;
  }

  return `${componentLabel} - ${component.type}`;
}

/**
 * Get the drag position of an element
 */
export function getDragPosition(element: HTMLElement): {
  x: number;
  y: number;
} {
  const style = window.getComputedStyle(element);
  const matrix = new DOMMatrix(style.transform);

  return {
    x: matrix.m41,
    y: matrix.m42,
  };
}

/**
 * Deep find component by ID
 */
export function findComponentById(components: CanvasNode[], id: string): CanvasNode | undefined {
  for (const component of components) {
    if (component.id === id) {
      return component;
    }

    if (component.children?.length) {
      const found = findComponentById(component.children, id);
      if (found) return found;
    }

    for (const slot of Object.values(component.slots ?? {})) {
      const found = findComponentById(slot.children, id);
      if (found) return found;
    }
  }

  return undefined;
}

export interface ComponentInsertionTarget {
  label: string;
  path?: string[];
}

export function createNodeFromCatalogEntry(definition: CanvasComponentDefinition): CanvasNode {
  return {
    id: generateId(definition.type.replace(/\W+/g, "-").toLowerCase()),
    type: definition.type,
    kind: definition.kind,
    props: definition.defaultProps ? JSON.parse(JSON.stringify(definition.defaultProps)) : {},
  };
}

function matchesSlotDefinition(
  definition: CanvasComponentDefinition,
  slotDefinition: CanvasSlotDefinition,
): boolean {
  const typeMatch =
    !slotDefinition.allowedTypes?.length || slotDefinition.allowedTypes.includes(definition.type);
  const kindMatch =
    !slotDefinition.allowedKinds?.length ||
    (definition.kind ? slotDefinition.allowedKinds.includes(definition.kind) : false);

  return typeMatch && kindMatch;
}

export function getComponentInsertionTargets(
  selection: CanvasNode | undefined,
  path: string[] | undefined,
  definition: CanvasComponentDefinition,
  componentCatalog: CanvasComponentCatalog,
): ComponentInsertionTarget[] {
  if (!selection || !path) {
    return [{ label: "Add to canvas" }];
  }

  const selectionDefinition = componentCatalog[selection.type];
  if (!selectionDefinition?.slots || !Object.keys(selectionDefinition.slots).length) {
    return [
      {
        label: `Add inside ${selectionDefinition?.label ?? formatComponentType(selection.type)}`,
        path,
      },
    ];
  }

  return Object.entries(selectionDefinition.slots)
    .filter(([, slotDefinition]) => matchesSlotDefinition(definition, slotDefinition))
    .map(([slotName, slotDefinition]) => ({
      label: `Add to ${slotDefinition.label}`,
      path: [...path, `slot:${slotName}`],
    }));
}

export function getInsertionTargetsForType(
  selection: CanvasNode | undefined,
  path: string[] | undefined,
  componentType: string | undefined,
  componentCatalog: CanvasComponentCatalog,
): ComponentInsertionTarget[] {
  if (!componentType) {
    return [];
  }

  const definition = componentCatalog[componentType];
  if (!definition) {
    return [];
  }

  return getComponentInsertionTargets(selection, path, definition, componentCatalog);
}

export function getCatalogCategories(componentCatalog: CanvasComponentCatalog): Array<{
  category: string;
  components: CanvasComponentDefinition[];
}> {
  const grouped = new Map<string, CanvasComponentDefinition[]>();

  for (const definition of Object.values(componentCatalog)) {
    const category = definition.category ?? "general";
    const entries = grouped.get(category) ?? [];
    entries.push(definition);
    grouped.set(category, entries);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([category, components]) => ({
      category,
      components: components.sort((left, right) =>
        (left.label ?? left.type).localeCompare(right.label ?? right.type),
      ),
    }));
}

export function resolveEditorComponent(
  type: string | undefined,
  componentCatalog: CanvasComponentCatalog,
  editorConfig: Record<string, EditorComponent<any>>,
): EditorComponent<object> | undefined {
  if (!type) {
    return undefined;
  }

  const catalogDefinition = componentCatalog[type];
  const editorDefinition = editorConfig[type];

  if (!catalogDefinition && !editorDefinition) {
    return undefined;
  }

  const mergedEditorConfig: EditorConfig | undefined = catalogDefinition?.editorConfig
    ? {
        fields: Object.assign(
          {} as Record<string, EditorFieldConfig>,
          editorDefinition?.editorConfig?.fields,
          catalogDefinition.editorConfig.fields,
        ),
        groups: Object.assign(
          {} as Record<string, EditorGroupConfig>,
          editorDefinition?.editorConfig?.groups,
          catalogDefinition.editorConfig.groups,
        ),
      }
    : editorDefinition?.editorConfig;

  return {
    ...editorDefinition,
    component: editorDefinition?.component ?? catalogDefinition?.component,
    kind: editorDefinition?.kind ?? catalogDefinition?.kind,
    category: editorDefinition?.category ?? catalogDefinition?.category,
    slots: editorDefinition?.slots ?? catalogDefinition?.slots,
    editorConfig: mergedEditorConfig,
  };
}

export interface EditorLayerNode {
  component: CanvasNode;
  path: string[];
  label: string;
  children: EditorLayerNode[];
  slotChildren: Array<{
    slotName: string;
    label: string;
    children: EditorLayerNode[];
  }>;
}

export function buildEditorLayerTree(
  components: CanvasNode[],
  componentCatalog: CanvasComponentCatalog,
  basePath: string[] = [],
): EditorLayerNode[] {
  return components.map((component, index) => {
    const path = [...basePath, `${index}`];
    const definition = componentCatalog[component.type];
    const label = definition?.label ?? formatComponentType(component.type);
    const children = buildEditorLayerTree(component.children ?? [], componentCatalog, path);
    const slotChildren = Object.entries(component.slots ?? {}).map(([slotName, slot]) => ({
      slotName,
      label: definition?.slots?.[slotName]?.label ?? formatComponentType(slotName),
      children: buildEditorLayerTree(slot.children, componentCatalog, [
        ...path,
        `slot:${slotName}`,
      ]),
    }));

    return {
      component,
      path,
      label,
      children,
      slotChildren,
    };
  });
}

/**
 * Check if device is mobile
 */
export function isMobileDevice(): boolean {
  if (!isBrowser) return false;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Handle touch or mouse event for position
 */
export function getEventPosition(event: MouseEvent | TouchEvent): {
  clientX: number;
  clientY: number;
} {
  if ("touches" in event) {
    return {
      clientX: event.touches[0].clientX,
      clientY: event.touches[0].clientY,
    };
  }

  return {
    clientX: event.clientX,
    clientY: event.clientY,
  };
}

export interface EditorBreadcrumb {
  label: string;
  path: string[];
  component?: CanvasNode;
  isSlot?: boolean;
}

export function buildEditorBreadcrumbs(
  components: CanvasNode[],
  path: string[] | undefined,
  componentCatalog: CanvasComponentCatalog,
): EditorBreadcrumb[] {
  if (!path?.length) {
    return [];
  }

  const breadcrumbs: EditorBreadcrumb[] = [];
  let currentComponents = components;
  let currentComponent: CanvasNode | undefined;
  let currentPath: string[] = [];

  for (const segment of path) {
    currentPath = [...currentPath, segment];

    if (segment.startsWith("slot:")) {
      const slotName = segment.slice(5);
      breadcrumbs.push({
        label: currentComponent
          ? (componentCatalog[currentComponent.type]?.slots?.[slotName]?.label ??
            formatComponentType(slotName))
          : formatComponentType(slotName),
        path: [...currentPath],
        component: currentComponent,
        isSlot: true,
      });
      currentComponents = currentComponent?.slots?.[slotName]?.children ?? [];
      continue;
    }

    const index = Number.parseInt(segment, 10);
    if (Number.isNaN(index) || index < 0 || index >= currentComponents.length) {
      break;
    }

    currentComponent = currentComponents[index];
    breadcrumbs.push({
      label:
        componentCatalog[currentComponent.type]?.label ??
        formatComponentType(currentComponent.type),
      path: [...currentPath],
      component: currentComponent,
      isSlot: false,
    });
    currentComponents = currentComponent.children ?? [];
  }

  return breadcrumbs;
}
