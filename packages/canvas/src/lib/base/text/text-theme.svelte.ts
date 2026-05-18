import type { TextProps } from "./text-types.js";

/**
 * Text theme-aware styling manager
 */
export function useTextThemeStyles(props: Partial<TextProps>) {
  const { color } = props;

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

    if (resolveColor) {
      variables["--text-theme-color"] = resolveColor;
    }

    return variables;
  });

  // Theme-aware CSS string
  const themeCSSString = $derived.by(() => {
    const styles: string[] = [];

    if (resolveColor) {
      styles.push(`color: ${resolveColor}`);
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
