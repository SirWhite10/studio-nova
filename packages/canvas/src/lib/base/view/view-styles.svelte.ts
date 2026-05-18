import type { ViewProps } from "./view.types.js";

export interface ViewStyleObject {
  [key: string]: string | number | undefined;
}

export interface ViewCSSVariables {
  [key: string]: string | undefined;
}

/**
 * Formats a value to appropriate CSS unit
 */
export function formatValue(value: string | number | undefined): string {
  if (value === undefined || value === null) return "unset";
  if (typeof value === "number") return `${value}px`;
  return value;
}

/**
 * Formats spacing values (padding, margin, gap)
 */
export function formatSpacing(value: string | number | undefined): string {
  if (value === undefined || value === null) return "0";
  if (typeof value === "number") return `calc(var(--spacing, 0.25rem) * ${value})`;
  return value;
}

/**
 * Formats padding/margin shorthand values using the spacing scale
 */
export function formatSideSpacingValues(
  all: string | number | undefined,
  top: string | number | undefined,
  right: string | number | undefined,
  bottom: string | number | undefined,
  left: string | number | undefined,
): string {
  if (all !== undefined && all !== null) return formatSpacing(all);

  const t = formatSpacing(top);
  const r = formatSpacing(right);
  const b = formatSpacing(bottom);
  const l = formatSpacing(left);

  return `${t} ${r} ${b} ${l}`;
}

/**
 * Converts justify-content prop values to CSS values
 */
export function getJustifyContentValue(value: string | undefined): string | undefined {
  switch (value) {
    case "between":
      return "space-between";
    case "around":
      return "space-around";
    case "evenly":
      return "space-evenly";
    case "start":
      return "flex-start";
    case "end":
      return "flex-end";
    default:
      return value;
  }
}

/**
 * Converts align-items prop values to CSS values
 */
export function getAlignItemsValue(value: string | undefined): string | undefined {
  switch (value) {
    case "start":
      return "flex-start";
    case "end":
      return "flex-end";
    default:
      return value;
  }
}

/**
 * Converts align-content prop values to CSS values
 */
export function getAlignContentValue(value: string | undefined): string | undefined {
  switch (value) {
    case "start":
      return "flex-start";
    case "end":
      return "flex-end";
    case "between":
      return "space-between";
    case "around":
      return "space-around";
    case "evenly":
      return "space-evenly";
    default:
      return value;
  }
}

/**
 * Converts align-self prop values to CSS values
 */
export function getAlignSelfValue(value: string | undefined): string | undefined {
  switch (value) {
    case "start":
      return "flex-start";
    case "end":
      return "flex-end";
    default:
      return value;
  }
}

/**
 * Converts justify-items prop values to CSS values
 */
export function getJustifyItemsValue(value: string | undefined): string | undefined {
  switch (value) {
    case "start":
      return "flex-start";
    case "end":
      return "flex-end";
    default:
      return value;
  }
}

/**
 * Converts justify-self prop values to CSS values
 */
export function getJustifySelfValue(value: string | undefined): string | undefined {
  switch (value) {
    case "start":
      return "flex-start";
    case "end":
      return "flex-end";
    default:
      return value;
  }
}

/**
 * Gets shadow CSS value from shadow prop
 */
export function getShadowValue(shadow: string | undefined): string | undefined {
  switch (shadow) {
    case "none":
      return "none";
    case "sm":
      return "0 1px 2px 0 rgb(0 0 0 / 0.05)";
    case "md":
      return "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)";
    case "lg":
      return "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)";
    case "xl":
      return "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)";
    default:
      return undefined;
  }
}

/**
 * Formats padding/margin shorthand values
 */
export function formatSideValues(
  all: string | number | undefined,
  top: string | number | undefined,
  right: string | number | undefined,
  bottom: string | number | undefined,
  left: string | number | undefined,
): string {
  if (all) return formatValue(all);

  const t = formatValue(top);
  const r = formatValue(right);
  const b = formatValue(bottom);
  const l = formatValue(left);

  return `${t} ${r} ${b} ${l}`;
}

/**
 * Creates CSS variables object from ViewProps
 */
export function createCSSVariables(props: ViewProps): ViewCSSVariables {
  const variables: ViewCSSVariables = {};

  // Layout variables
  if (props.display) variables["--view-display"] = props.display;
  if (props.flexDirection) variables["--view-flex-direction"] = props.flexDirection;
  if (props.flexWrap) variables["--view-flex-wrap"] = props.flexWrap;
  if (props.flex) variables["--view-flex"] = String(props.flex);
  if (props.flexGrow !== undefined) variables["--view-flex-grow"] = String(props.flexGrow);
  if (props.flexShrink !== undefined) variables["--view-flex-shrink"] = String(props.flexShrink);
  if (props.flexBasis) variables["--view-flex-basis"] = formatValue(props.flexBasis);
  if (props.alignItems) variables["--view-align-items"] = getAlignItemsValue(props.alignItems);
  if (props.alignSelf) variables["--view-align-self"] = getAlignSelfValue(props.alignSelf);
  if (props.alignContent)
    variables["--view-align-content"] = getAlignContentValue(props.alignContent);
  if (props.justifyContent)
    variables["--view-justify-content"] = getJustifyContentValue(props.justifyContent);
  if (props.justifyItems)
    variables["--view-justify-items"] = getJustifyItemsValue(props.justifyItems);
  if (props.justifySelf) variables["--view-justify-self"] = getJustifySelfValue(props.justifySelf);
  if (props.gap) variables["--view-gap"] = formatSpacing(props.gap);
  if (props.rowGap) variables["--view-row-gap"] = formatSpacing(props.rowGap);
  if (props.columnGap) variables["--view-column-gap"] = formatSpacing(props.columnGap);
  if (props.gridTemplateColumns)
    variables["--view-grid-template-columns"] = props.gridTemplateColumns;
  if (props.gridTemplateRows) variables["--view-grid-template-rows"] = props.gridTemplateRows;
  if (props.gridAutoFlow) variables["--view-grid-auto-flow"] = props.gridAutoFlow;
  if (props.gridColumn) variables["--view-grid-column"] = props.gridColumn;
  if (props.gridRow) variables["--view-grid-row"] = props.gridRow;

  // Sizing variables
  if (props.width) variables["--view-width"] = formatValue(props.width);
  if (props.height) variables["--view-height"] = formatValue(props.height);
  if (props.minWidth) variables["--view-min-width"] = formatValue(props.minWidth);
  if (props.maxWidth) variables["--view-max-width"] = formatValue(props.maxWidth);
  if (props.minHeight) variables["--view-min-height"] = formatValue(props.minHeight);
  if (props.maxHeight) variables["--view-max-height"] = formatValue(props.maxHeight);
  if (props.aspectRatio) variables["--view-aspect-ratio"] = String(props.aspectRatio);

  // Spacing variables
  if (
    props.padding ||
    props.paddingTop ||
    props.paddingRight ||
    props.paddingBottom ||
    props.paddingLeft
  ) {
    variables["--view-padding"] = formatSideSpacingValues(
      props.padding,
      props.paddingTop,
      props.paddingRight,
      props.paddingBottom,
      props.paddingLeft,
    );
  }

  if (
    props.margin ||
    props.marginTop ||
    props.marginRight ||
    props.marginBottom ||
    props.marginLeft
  ) {
    variables["--view-margin"] = formatSideSpacingValues(
      props.margin,
      props.marginTop,
      props.marginRight,
      props.marginBottom,
      props.marginLeft,
    );
  }

  // Appearance variables
  if (props.background) variables["--view-background"] = props.background;
  if (props.color) variables["--view-color"] = props.color;
  if (props.border) variables["--view-border"] = formatValue(props.border);
  if (props.borderRadius) variables["--view-border-radius"] = formatValue(props.borderRadius);
  if (props.shadow) variables["--view-box-shadow"] = getShadowValue(props.shadow);
  if (props.transition) variables["--view-transition"] = props.transition;

  // Position variables
  if (props.position) variables["--view-position"] = props.position;
  if (props.top) variables["--view-top"] = formatValue(props.top);
  if (props.right) variables["--view-right"] = formatValue(props.right);
  if (props.bottom) variables["--view-bottom"] = formatValue(props.bottom);
  if (props.left) variables["--view-left"] = formatValue(props.left);
  if (props.zIndex) variables["--view-z-index"] = String(props.zIndex);

  return variables;
}

/**
 * Creates inline style object from ViewProps
 */
export function createStyleObject(props: ViewProps): ViewStyleObject {
  const styles: ViewStyleObject = {};

  // Layout styles
  if (props.display) styles.display = props.display;
  if (props.flexDirection) styles.flexDirection = props.flexDirection;
  if (props.flex) styles.flex = props.flex;
  if (props.alignItems) styles.alignItems = getAlignItemsValue(props.alignItems);
  if (props.justifyContent) styles.justifyContent = getJustifyContentValue(props.justifyContent);
  if (props.gap) styles.gap = formatSpacing(props.gap);
  if (props.rowGap) styles.rowGap = formatSpacing(props.rowGap);
  if (props.columnGap) styles.columnGap = formatSpacing(props.columnGap);
  if (props.gridTemplateColumns) styles.gridTemplateColumns = props.gridTemplateColumns;
  if (props.gridTemplateRows) styles.gridTemplateRows = props.gridTemplateRows;
  if (props.gridAutoFlow) styles.gridAutoFlow = props.gridAutoFlow;
  if (props.gridColumn) styles.gridColumn = props.gridColumn;
  if (props.gridRow) styles.gridRow = props.gridRow;
  if (props.textAlign) styles.textAlign = props.textAlign;

  // Sizing styles
  if (props.width) styles.width = formatValue(props.width);
  if (props.height) styles.height = formatValue(props.height);
  if (props.minWidth) styles.minWidth = formatValue(props.minWidth);
  if (props.maxWidth) styles.maxWidth = formatValue(props.maxWidth);
  if (props.minHeight) styles.minHeight = formatValue(props.minHeight);
  if (props.maxHeight) styles.maxHeight = formatValue(props.maxHeight);
  if (props.aspectRatio) styles.aspectRatio = String(props.aspectRatio);

  // Spacing styles
  if (
    props.padding ||
    props.paddingTop ||
    props.paddingRight ||
    props.paddingBottom ||
    props.paddingLeft
  ) {
    styles.padding = formatSideSpacingValues(
      props.padding,
      props.paddingTop,
      props.paddingRight,
      props.paddingBottom,
      props.paddingLeft,
    );
  }

  if (
    props.margin ||
    props.marginTop ||
    props.marginRight ||
    props.marginBottom ||
    props.marginLeft
  ) {
    styles.margin = formatSideSpacingValues(
      props.margin,
      props.marginTop,
      props.marginRight,
      props.marginBottom,
      props.marginLeft,
    );
  }

  // Appearance styles
  if (props.background) styles.background = props.background;
  if (props.color) styles.color = props.color;
  if (props.border) styles.border = formatValue(props.border);
  if (props.borderRadius) styles.borderRadius = formatValue(props.borderRadius);
  if (props.shadow) styles.boxShadow = getShadowValue(props.shadow);
  if (props.transition) styles.transition = props.transition;

  // Position styles
  if (props.position) styles.position = props.position;
  if (props.overflow) styles.overflow = props.overflow;
  if (props.top) styles.top = formatValue(props.top);
  if (props.right) styles.right = formatValue(props.right);
  if (props.bottom) styles.bottom = formatValue(props.bottom);
  if (props.left) styles.left = formatValue(props.left);
  if (props.zIndex) styles.zIndex = props.zIndex;

  return styles;
}

/**
 * Converts style object to CSS string
 */
export function styleObjectToCSSString(styles: ViewStyleObject): string {
  return Object.entries(styles)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      const cssKey = key.replace(/[A-Z]/g, "-$&").toLowerCase();
      return `${cssKey}: ${value};`;
    })
    .join(" ");
}

/**
 * Main style manager function that creates both CSS variables and inline styles
 */
export function createViewStyles(props: ViewProps): {
  cssVariables: ViewCSSVariables;
  inlineStyles: ViewStyleObject;
  cssString: string;
} {
  const cssVariables = createCSSVariables(props);
  const inlineStyles = createStyleObject(props);
  const cssString = styleObjectToCSSString(inlineStyles);

  return {
    cssVariables,
    inlineStyles,
    cssString,
  };
}
