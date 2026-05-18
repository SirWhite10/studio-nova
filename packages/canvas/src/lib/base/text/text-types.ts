import type { MaybeResponsiveValue } from "$lib/base/responsive/types.js";
import type { ViewProps } from "../view/view.types.js";
import type { EditorComponent } from "../editor/types.ts";

/**
 * Text size options mapped to CSS variables
 */
export type TextSize =
  | "xs"
  | "sm"
  | "base"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "6xl"
  | "7xl";

/**
 * Font weight options mapped to CSS variables
 */
export type FontWeight = "normal" | "medium" | "semibold" | "bold";

/**
 * Text alignment options
 */
export type TextAlign = "left" | "center" | "right" | "justify";

/**
 * Text transform options
 */
export type TextTransform = "none" | "uppercase" | "lowercase" | "capitalize";

/**
 * Line height options (can be preset or custom)
 */
export type LineHeight = "tight" | "normal" | "relaxed" | "loose" | (string & {});

/**
 * Letter spacing options (can be preset or custom)
 */
export type LetterSpacing = "tight" | "normal" | "wide" | "wider" | (string & {});

/**
 * Text component props extending ViewProps
 */
export interface TextProps extends Omit<
  ViewProps,
  "textAlign" | "transform" | "children" | "as" | "class" | "style"
> {
  // Content props
  text?: string;

  // Typography props
  size?: MaybeResponsiveValue<TextSize>;
  weight?: MaybeResponsiveValue<FontWeight>;
  color?: string;
  textAlign?: MaybeResponsiveValue<TextAlign>;
  transform?: TextTransform;
  lineHeight?: MaybeResponsiveValue<LineHeight>;
  letterSpacing?: MaybeResponsiveValue<LetterSpacing>;

  // Element props
  as?: keyof HTMLElementTagNameMap;
  class?: string;
  style?: string;
  children?: any;
}

/**
 * Text component state styles
 */
export interface TextStateStyles {
  base?: Record<string, string>;
  hover?: Record<string, string>;
  active?: Record<string, string>;
  focus?: Record<string, string>;
  disabled?: Record<string, string>;
  loading?: Record<string, string>;
  selected?: Record<string, string>;
  expanded?: Record<string, string>;
}

/**
 * Text component configuration for editor
 */
export interface TextConfig extends EditorComponent<TextProps> {
  editorConfig: {
    fields: {
      text: {
        type: "text";
        label: string;
        description: string;
      };
      size: {
        type: "select";
        label: string;
        options: TextSize[];
      };
      weight: {
        type: "select";
        label: string;
        options: FontWeight[];
      };
      color: {
        type: "color";
        label: string;
      };
      textAlign: {
        type: "select";
        label: string;
        options: TextAlign[];
      };
      transform: {
        type: "select";
        label: string;
        options: TextTransform[];
      };
      lineHeight: {
        type: "text";
        label: string;
      };
      letterSpacing: {
        type: "text";
        label: string;
      };
    };
    groups: {
      content: {
        label: string;
        fields: string[];
      };
      typography: {
        label: string;
        fields: string[];
      };
      layout: {
        label: string;
        fields: string[];
      };
    };
  };
}

/**
 * Theme-aware text props for enhanced styling
 */
export interface ThemedTextProps extends TextProps {
  theme?: "light" | "dark" | "auto";
  colorScheme?: "primary" | "secondary" | "accent" | "destructive" | "muted";
  variant?: "default" | "heading" | "body" | "caption" | "label";
}

/**
 * Text component event handlers
 */
export interface TextEventHandlers {
  onClick?: (event: MouseEvent) => void;
  onDoubleClick?: (event: MouseEvent) => void;
  onMouseEnter?: (event: MouseEvent) => void;
  onMouseLeave?: (event: MouseEvent) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  onKeyUp?: (event: KeyboardEvent) => void;
}

/**
 * Text component internal state
 */
export interface TextState {
  isHovered: boolean;
  isFocused: boolean;
  isPressed: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  isLoading: boolean;
}

/**
 * Text styling configuration
 */
export interface TextStylingConfig {
  useThemeColors: boolean;
  useCSSVariables: boolean;
  enableTransitions: boolean;
  enableStates: boolean;
  enableResponsive: boolean;
}

/**
 * Text component configuration for editor
 */
export const TextConfig: EditorComponent<TextProps> = {
  props: {
    text: "Text",
    size: "base",
    weight: "normal",
    color: "inherit",
    textAlign: "left",
    transform: "none",
    lineHeight: "normal",
    letterSpacing: "normal",
  },
  editorConfig: {
    fields: {
      text: {
        type: "text",
        label: "Text Content",
        description: "The text to display",
      },
      size: {
        type: "select",
        label: "Size",
        options: ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl"],
      },
      weight: {
        type: "select",
        label: "Weight",
        options: ["normal", "medium", "semibold", "bold"],
      },
      color: {
        type: "color",
        label: "Color",
      },
      textAlign: {
        type: "select",
        label: "Alignment",
        options: ["left", "center", "right", "justify"],
      },
      transform: {
        type: "select",
        label: "Text Transform",
        options: ["none", "uppercase", "lowercase", "capitalize"],
      },
      lineHeight: {
        type: "text",
        label: "Line Height",
      },
      letterSpacing: {
        type: "text",
        label: "Letter Spacing",
      },
    },
    groups: {
      content: {
        label: "Content",
        fields: ["text"],
      },
      typography: {
        label: "Typography",
        fields: [
          "size",
          "weight",
          "color",
          "textAlign",
          "transform",
          "lineHeight",
          "letterSpacing",
        ],
      },
      layout: {
        label: "Layout",
        fields: ["display", "width", "height", "padding", "margin"],
      },
    },
  },
};
