import type { SvelteHTMLElements } from "svelte/elements";

interface EditorComponent<TProps> {
  props: Partial<TProps>;
  editorConfig: {
    fields: Record<string, unknown>;
    groups?: Record<string, unknown>;
  };
}

/**
 * Event handler function type - compatible with Svelte's event handlers
 */
export type EventHandler<T extends Event = Event> =
  | ((event: T) => void | Promise<void>)
  | null
  | undefined;

/**
 * Event handling props for View component
 */
export interface ViewEventProps {
  // Grouped event handlers
  ontap?: EventHandler<MouseEvent | KeyboardEvent> | Function;
  onhover?: EventHandler<MouseEvent> | Function;
  onhoverend?: EventHandler<MouseEvent> | Function;
  onpress?: EventHandler<MouseEvent> | Function;
  onpressend?: EventHandler<MouseEvent> | Function;

  // Direct event handlers
  onkeydown?: EventHandler<KeyboardEvent> | Function;
  onkeyup?: EventHandler<KeyboardEvent> | Function;
  onmouseenter?: EventHandler<MouseEvent> | Function;
  onmouseleave?: EventHandler<MouseEvent> | Function;
  onmousedown?: EventHandler<MouseEvent> | Function;
  onmouseup?: EventHandler<MouseEvent> | Function;
  onmousemove?: EventHandler<MouseEvent> | Function;
  onwheel?: EventHandler<WheelEvent> | Function;
  onfocus?: EventHandler<FocusEvent> | Function;
  onblur?: EventHandler<FocusEvent> | Function;

  // Studio Canvas action integration
  onActionTap?: string;
  onActionHover?: string;
  onActionHoverEnd?: string;
  onActionPress?: string;
  onActionPressEnd?: string;
  onActionFocus?: string;
  onActionBlur?: string;
  actionParams?: any;
}

/**
 * State-based styling props
 */
export interface ViewStateProps {
  states?: ViewStateStyles;
  disabled?: boolean;
  loading?: boolean;
  selected?: boolean;
  expanded?: boolean;
}

/**
 * Base style properties for states (avoiding circular reference)
 */
export interface ViewStyleProps {
  textDecoration?: string;
  borderColor?: any;
  // Layout props
  display?: "flex" | "grid" | "block" | "inline-block" | "inline-flex" | "inline-grid";
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
  flex?: number | string;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string | number;
  alignItems?: "start" | "center" | "end" | "stretch" | "baseline";
  alignSelf?: "auto" | "start" | "center" | "end" | "stretch" | "baseline";
  alignContent?: "start" | "center" | "end" | "stretch" | "between" | "around" | "evenly";
  justifyContent?: "start" | "center" | "end" | "between" | "around" | "evenly";
  justifyItems?: "start" | "center" | "end" | "stretch";
  justifySelf?: "auto" | "start" | "center" | "end" | "stretch";
  gap?: number | string;
  rowGap?: number | string;
  columnGap?: number | string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridAutoFlow?: string;
  gridColumn?: string;
  gridRow?: string;
  position?: "relative" | "absolute" | "fixed" | "sticky" | "static";
  overflow?: "visible" | "hidden" | "scroll" | "auto";
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  left?: string | number;
  zIndex?: number | string;

  // Appearance props
  padding?: string | number;
  paddingTop?: string | number;
  paddingRight?: string | number;
  paddingBottom?: string | number;
  paddingLeft?: string | number;
  margin?: string | number;
  marginTop?: string | number;
  marginRight?: string | number;
  marginBottom?: string | number;
  marginLeft?: string | number;
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  height?: string | number;
  minHeight?: string | number;
  maxHeight?: string | number;
  aspectRatio?: string | number;
  background?: string;
  color?: string;
  border?: string | number;
  borderRadius?: string | number;
  shadow?: "none" | "sm" | "md" | "lg" | "xl";

  // Interaction props
  cursor?: string;
  opacity?: number;
  transform?: string;
  transition?: string;
  outline?: string;
  outlineOffset?: string;
  pointerEvents?: string;
  boxShadow?: string;
}

/**
 * State styling configuration
 */
export interface ViewStateStyles {
  // Base styles (always applied)
  base?: Partial<ViewStyleProps>;

  // Interaction states
  hover?: Partial<ViewStyleProps>;
  active?: Partial<ViewStyleProps>;
  focus?: Partial<ViewStyleProps>;
  focusVisible?: Partial<ViewStyleProps>;
  pressed?: Partial<ViewStyleProps>;

  // Component states
  disabled?: Partial<ViewStyleProps>;
  loading?: Partial<ViewStyleProps>;
  selected?: Partial<ViewStyleProps>;
  expanded?: Partial<ViewStyleProps>;

  // Combined states (for complex interactions)
  "hover:focus"?: Partial<ViewStyleProps>;
  "active:focus"?: Partial<ViewStyleProps>;
  "hover:active"?: Partial<ViewStyleProps>;
  "hover:selected"?: Partial<ViewStyleProps>;
  "focus:selected"?: Partial<ViewStyleProps>;
}

export interface ViewProps extends ViewEventProps, ViewStateProps {
  ref?: any;
  textAlign?: "start" | "center" | "end" | "justify" | "left" | "right";

  // Element type
  as?: keyof SvelteHTMLElements;

  // Layout props
  display?: "flex" | "grid" | "block" | "inline-block" | "inline-flex" | "inline-grid";
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
  flex?: number | string;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string | number;
  alignItems?: "start" | "center" | "end" | "stretch" | "baseline";
  alignSelf?: "auto" | "start" | "center" | "end" | "stretch" | "baseline";
  alignContent?: "start" | "center" | "end" | "stretch" | "between" | "around" | "evenly";
  justifyContent?: "start" | "center" | "end" | "between" | "around" | "evenly";
  justifyItems?: "start" | "center" | "end" | "stretch";
  justifySelf?: "auto" | "start" | "center" | "end" | "stretch";
  gap?: number | string;
  rowGap?: number | string;
  columnGap?: number | string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridAutoFlow?: string;
  gridColumn?: string;
  gridRow?: string;
  position?: "relative" | "absolute" | "fixed" | "sticky" | "static";
  overflow?: "visible" | "hidden" | "scroll" | "auto";
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  left?: string | number;
  zIndex?: number | string;

  // Appearance props
  padding?: string | number;
  paddingTop?: string | number;
  paddingRight?: string | number;
  paddingBottom?: string | number;
  paddingLeft?: string | number;
  margin?: string | number;
  marginTop?: string | number;
  marginRight?: string | number;
  marginBottom?: string | number;
  marginLeft?: string | number;
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  height?: string | number;
  minHeight?: string | number;
  maxHeight?: string | number;
  aspectRatio?: string | number;
  background?: string;
  color?: string;
  border?: string | number;
  borderRadius?: string | number;
  shadow?: "none" | "sm" | "md" | "lg" | "xl";

  // Other props
  transition?: string;
  transform?: string;
  children?: any;
  class?: string;
  style?: string;

  // HTML attributes
  [key: string]: any;
}

// Editor configuration for View component
export const ViewConfig: EditorComponent<ViewProps> = {
  props: {
    padding: 0,
    margin: 0,
    width: "auto",
    height: "auto",
    background: undefined,
    border: "none",
    borderRadius: "0",
    shadow: "none",
    transition: "none",
    display: "block",
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "stretch",
    alignContent: "stretch",
    justifyContent: "start",
    gap: "0",
    rowGap: "0",
    columnGap: "0",
  },
  editorConfig: {
    fields: {
      padding: {
        type: "spacing",
        label: "Padding",
        description: "Space inside the view",
      },
      margin: {
        type: "spacing",
        label: "Margin",
        description: "Space around the view",
      },
      width: {
        type: "size",
        label: "Width",
      },
      height: {
        type: "size",
        label: "Height",
      },
      background: {
        type: "color",
        label: "Background Color",
      },
      color: {
        type: "color",
        label: "Text Color",
      },
      border: {
        type: "text",
        label: "Border",
      },
      borderRadius: {
        type: "spacing",
        label: "Border Radius",
      },
      shadow: {
        type: "select",
        label: "Shadow",
        options: ["none", "sm", "md", "lg", "xl"],
      },
      as: {
        type: "select",
        label: "Element Type",
        options: [
          "div",
          "section",
          "article",
          "header",
          "footer",
          "main",
          "nav",
          "aside",
          "button",
          "a",
          "span",
          "p",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
        ],
      },
      display: {
        type: "select",
        label: "Display",
        options: ["flex", "grid", "block", "inline-block", "inline-flex", "inline-grid"],
      },
      flexDirection: {
        type: "select",
        label: "Flex Direction",
        options: ["row", "column", "row-reverse", "column-reverse"],
      },
      flexWrap: {
        type: "select",
        label: "Flex Wrap",
        options: ["nowrap", "wrap", "wrap-reverse"],
      },
      flex: {
        type: "text",
        label: "Flex",
        description: "Flex grow, shrink, and basis shorthand",
      },
      flexGrow: {
        type: "number",
        label: "Flex Grow",
        description: "How much the item should grow",
      },
      flexShrink: {
        type: "number",
        label: "Flex Shrink",
        description: "How much the item should shrink",
      },
      flexBasis: {
        type: "size",
        label: "Flex Basis",
        description: "Initial main size of the item",
      },
      alignItems: {
        type: "select",
        label: "Align Items",
        options: ["start", "center", "end", "stretch", "baseline"],
      },
      alignSelf: {
        type: "select",
        label: "Align Self",
        options: ["auto", "start", "center", "end", "stretch", "baseline"],
      },
      alignContent: {
        type: "select",
        label: "Align Content",
        options: ["start", "center", "end", "stretch", "between", "around", "evenly"],
      },
      justifyContent: {
        type: "select",
        label: "Justify Content",
        options: ["start", "center", "end", "between", "around", "evenly"],
      },
      justifyItems: {
        type: "select",
        label: "Justify Items",
        options: ["start", "center", "end", "stretch"],
      },
      justifySelf: {
        type: "select",
        label: "Justify Self",
        options: ["auto", "start", "center", "end", "stretch"],
      },
      gap: {
        type: "spacing",
        label: "Gap",
      },
      rowGap: {
        type: "spacing",
        label: "Row Gap",
        description: "Gap between rows",
      },
      columnGap: {
        type: "spacing",
        label: "Column Gap",
        description: "Gap between columns",
      },
      transition: {
        type: "text",
        label: "Transition",
      },
      // Action event fields
      onActionTap: {
        type: "text",
        label: "Tap Action",
        description: "Action to execute on tap/click",
      },
      onActionHover: {
        type: "text",
        label: "Hover Action",
        description: "Action to execute on hover",
      },
      onActionFocus: {
        type: "text",
        label: "Focus Action",
        description: "Action to execute on focus",
      },
      actionParams: {
        // Previous Version
        // type: "json",
        // label: "Action Parameters",
        // description: "Parameters to pass to actions",

        type: "object",
        label: "Action Parameters",
        description: "Parameters to pass to actions",
        fields: {},
      },
      // State props
      disabled: {
        type: "boolean",
        label: "Disabled",
        description: "Disable the component",
      },
      loading: {
        type: "boolean",
        label: "Loading",
        description: "Show loading state",
      },
      selected: {
        type: "boolean",
        label: "Selected",
        description: "Show selected state",
      },
      expanded: {
        type: "boolean",
        label: "Expanded",
        description: "Show expanded state",
      },
      states: {
        // Previous Version
        // type: "json",
        // label: "State Styles",
        // description: "Configure styles for different states",
        type: "object",
        label: "State Styles",
        description: "Configure styles for different states",
        fields: {},
      },
    },
    groups: {
      layout: {
        label: "Layout",
        fields: [
          "as",
          "display",
          "flexDirection",
          "flexWrap",
          "flex",
          "flexGrow",
          "flexShrink",
          "flexBasis",
          "alignItems",
          "alignSelf",
          "alignContent",
          "justifyContent",
          "justifyItems",
          "justifySelf",
          "gap",
          "rowGap",
          "columnGap",
          "width",
          "height",
          "padding",
          "margin",
        ],
      },
      appearance: {
        label: "Appearance",
        fields: ["background", "color", "border", "borderRadius", "shadow"],
      },
      behavior: {
        label: "Behavior",
        fields: ["transition"],
      },
      events: {
        label: "Events & Actions",
        fields: ["onActionTap", "onActionHover", "onActionFocus", "actionParams"],
      },
      states: {
        label: "Component States",
        fields: ["disabled", "loading", "selected", "expanded", "states"],
      },
    },
  },
};
