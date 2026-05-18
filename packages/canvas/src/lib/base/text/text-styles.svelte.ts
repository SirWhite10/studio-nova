import type {
  FontWeight,
  LetterSpacing,
  LineHeight,
  TextAlign,
  TextSize,
  TextTransform,
} from "./text-types.js";

export interface ResolvedTextStyleProps {
  size?: TextSize;
  weight?: FontWeight;
  color?: string;
  textAlign?: TextAlign;
  transform?: TextTransform;
  lineHeight?: LineHeight;
  letterSpacing?: LetterSpacing;
}

/**
 * Text size mapping to CSS variables
 */
export const textSizeMap = {
  xs: "var(--text-xs)",
  sm: "var(--text-sm)",
  base: "var(--text-base)",
  lg: "var(--text-lg)",
  xl: "var(--text-xl)",
  "2xl": "var(--text-2xl)",
  "3xl": "var(--text-3xl)",
  "4xl": "var(--text-4xl)",
  "5xl": "var(--text-5xl)",
  "6xl": "var(--text-6xl)",
  "7xl": "var(--text-7xl)",
} as const;

/**
 * Font weight mapping to CSS variables
 */
export const fontWeightMap = {
  normal: "var(--font-normal)",
  medium: "var(--font-medium)",
  semibold: "var(--font-semibold)",
  bold: "var(--font-bold)",
} as const;

/**
 * Line height mapping to CSS variables
 */
export const lineHeightMap = {
  tight: "var(--leading-tight)",
  normal: "var(--leading-normal)",
  relaxed: "var(--leading-relaxed)",
  loose: "var(--leading-loose)",
} as const;

/**
 * Letter spacing mapping to CSS variables
 */
export const letterSpacingMap = {
  tight: "var(--tracking-tight)",
  normal: "var(--tracking-normal)",
  wide: "var(--tracking-wide)",
  wider: "var(--tracking-wider)",
} as const;

/**
 * Creates text-specific CSS styles from props
 */
export function createTextStyles(props: Partial<ResolvedTextStyleProps>) {
  const {
    size = "base",
    weight = "normal",
    color,
    textAlign = "left",
    transform = "none",
    lineHeight = "normal",
    letterSpacing = "normal",
  } = props;

  const styles: Record<string, string> = {};

  // Font size
  if (size && size in textSizeMap) {
    styles.fontSize = textSizeMap[size as keyof typeof textSizeMap];
  }

  // Font weight
  if (weight && weight in fontWeightMap) {
    styles.fontWeight = fontWeightMap[weight as keyof typeof fontWeightMap];
  }

  // Text color
  if (color) {
    styles.color = color;
  }

  // Text alignment
  if (textAlign && textAlign !== "left") {
    styles.textAlign = textAlign;
  }

  // Text transform
  if (transform && transform !== "none") {
    styles.textTransform = transform;
  }

  // Line height
  if (lineHeight && lineHeight !== "normal") {
    if (lineHeightMap[lineHeight as keyof typeof lineHeightMap]) {
      styles.lineHeight = lineHeightMap[lineHeight as keyof typeof lineHeightMap];
    } else {
      styles.lineHeight = lineHeight;
    }
  }

  // Letter spacing
  if (letterSpacing && letterSpacing !== "normal") {
    if (letterSpacingMap[letterSpacing as keyof typeof letterSpacingMap]) {
      styles.letterSpacing = letterSpacingMap[letterSpacing as keyof typeof letterSpacingMap];
    } else {
      styles.letterSpacing = letterSpacing;
    }
  }

  // Text wrapping
  styles.textWrap = "pretty";

  return styles;
}

/**
 * Creates CSS string from text styles
 */
export function createTextStylesString(props: Partial<ResolvedTextStyleProps>): string {
  const styles = createTextStyles(props);

  return Object.entries(styles)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${value}`)
    .join("; ");
}

/**
 * Creates CSS variables object for text styling
 */
export function createTextCSSVariables(
  props: Partial<ResolvedTextStyleProps>,
): Record<string, string> {
  const variables: Record<string, string> = {};

  // Create component-specific CSS variables for easy theming
  if (props.size) {
    variables["--text-size"] =
      props.size in textSizeMap ? textSizeMap[props.size as keyof typeof textSizeMap] : props.size;
  }

  if (props.weight) {
    variables["--text-weight"] =
      props.weight in fontWeightMap
        ? fontWeightMap[props.weight as keyof typeof fontWeightMap]
        : props.weight;
  }

  if (props.color) {
    variables["--text-color"] = props.color;
  }

  if (props.lineHeight && props.lineHeight !== "normal") {
    variables["--text-line-height"] =
      lineHeightMap[props.lineHeight as keyof typeof lineHeightMap] || props.lineHeight;
  }

  if (props.letterSpacing && props.letterSpacing !== "normal") {
    variables["--text-letter-spacing"] =
      letterSpacingMap[props.letterSpacing as keyof typeof letterSpacingMap] || props.letterSpacing;
  }

  return variables;
}
