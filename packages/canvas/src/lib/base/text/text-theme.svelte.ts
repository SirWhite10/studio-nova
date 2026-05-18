import type { TextProps } from "./text-types.js";

/**
 * Text theme-aware styling manager
 */
export function useTextThemeStyles(props: Partial<TextProps>) {
  const { color, size, weight, lineHeight, letterSpacing } = props;

  // Theme-aware color resolution
  const resolveColor = $derived.by(() => {
    if (!color) return null;

    // Handle CSS variables and theme colors
    if (color.startsWith("var(")) {
      return color;
    }

    // Handle theme color names
    const themeColors = {
      primary: "var(--primary)",
      secondary: "var(--secondary)",
      accent: "var(--accent)",
      destructive: "var(--destructive)",
      muted: "var(--muted)",
      "primary-foreground": "var(--primary-foreground)",
      "secondary-foreground": "var(--secondary-foreground)",
      "accent-foreground": "var(--accent-foreground)",
      "destructive-foreground": "var(--destructive-foreground)",
      "muted-foreground": "var(--muted-foreground)",
      foreground: "var(--foreground)",
      background: "var(--background)",
      border: "var(--border)",
      input: "var(--input)",
      ring: "var(--ring)",
    };

    return themeColors[color as keyof typeof themeColors] || color;
  });

  // Theme-aware CSS variables
  const themeVariables = $derived.by(() => {
    const variables: Record<string, string> = {};

    // Set theme-aware color
    if (resolveColor) {
      variables["--text-theme-color"] = resolveColor;
    }

    // Set other theme variables
    if (size) {
      variables["--text-theme-size"] = `var(--text-${size})`;
    }

    if (weight) {
      variables["--text-theme-weight"] = `var(--font-${weight})`;
    }

    if (lineHeight && lineHeight !== "normal") {
      variables["--text-theme-line-height"] = lineHeight.startsWith("var(")
        ? lineHeight
        : `var(--leading-${lineHeight})`;
    }

    if (letterSpacing && letterSpacing !== "normal") {
      variables["--text-theme-letter-spacing"] = letterSpacing.startsWith("var(")
        ? letterSpacing
        : `var(--tracking-${letterSpacing})`;
    }

    return variables;
  });

  // Theme-aware CSS string
  const themeCSSString = $derived.by(() => {
    const styles: string[] = [];

    // Apply theme-aware color
    if (resolveColor) {
      styles.push(`color: ${resolveColor}`);
    }

    // Apply theme-aware size
    if (size) {
      styles.push(`font-size: var(--text-${size})`);
    }

    // Apply theme-aware weight
    if (weight) {
      styles.push(`font-weight: var(--font-${weight})`);
    }

    // Apply theme-aware line height
    if (lineHeight && lineHeight !== "normal") {
      const lineHeightValue = lineHeight.startsWith("var(")
        ? lineHeight
        : `var(--leading-${lineHeight})`;
      styles.push(`line-height: ${lineHeightValue}`);
    }

    // Apply theme-aware letter spacing
    if (letterSpacing && letterSpacing !== "normal") {
      const letterSpacingValue = letterSpacing.startsWith("var(")
        ? letterSpacing
        : `var(--tracking-${letterSpacing})`;
      styles.push(`letter-spacing: ${letterSpacingValue}`);
    }

    return styles.join("; ");
  });

  // Theme context detection
  const themeContext = $derived.by(() => {
    // This could be expanded to detect theme context from parent elements
    return {
      isDark: false, // Could be detected from DOM or context
      hasCustomTheme: false,
      themeScope: "global",
    };
  });

  return {
    get resolveColor() {
      return resolveColor;
    },
    get themeVariables() {
      return themeVariables;
    },
    get themeCSSString() {
      return themeCSSString;
    },
    get themeContext() {
      return themeContext;
    },

    // Helper methods
    getThemeAwareColor: (colorName: string) => {
      const themeColors = {
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        accent: "var(--accent)",
        destructive: "var(--destructive)",
        muted: "var(--muted)",
        "primary-foreground": "var(--primary-foreground)",
        "secondary-foreground": "var(--secondary-foreground)",
        "accent-foreground": "var(--accent-foreground)",
        "destructive-foreground": "var(--destructive-foreground)",
        "muted-foreground": "var(--muted-foreground)",
        foreground: "var(--foreground)",
        background: "var(--background)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
      };

      return themeColors[colorName as keyof typeof themeColors] || colorName;
    },

    // Create scoped theme variables
    createScopedTheme: (scope: string) => {
      const scopedVars: Record<string, string> = {};

      Object.entries(themeVariables).forEach(([key, value]) => {
        scopedVars[`${key}-${scope}`] = value;
      });

      return scopedVars;
    },
  };
}
