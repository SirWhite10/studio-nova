import type { ViewProps, ViewStyleProps } from "./view.types.js";

/**
 * Theme configuration interface
 */
export interface ViewThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    "2xl": string;
    "3xl": string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      "2xl": string;
      "3xl": string;
    };
    fontWeight: {
      light: number;
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  transitions: {
    fast: string;
    normal: string;
    slow: string;
  };
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

/**
 * Theme context state
 */
export interface ViewThemeContext {
  theme: ViewThemeConfig;
  mode: "light" | "dark" | "system";
  setMode: (mode: "light" | "dark" | "system") => void;
  toggleMode: () => void;
  customProperties: Record<string, string>;
  setCustomProperty: (key: string, value: string) => void;
  removeCustomProperty: (key: string) => void;
}

/**
 * Default theme configuration
 */
export const defaultTheme: ViewThemeConfig = {
  colors: {
    primary: "oklch(0.6 0.2 270)",
    secondary: "oklch(0.7 0.15 300)",
    accent: "oklch(0.65 0.25 60)",
    background: "oklch(0.98 0.01 0)",
    surface: "oklch(0.95 0.01 0)",
    text: "oklch(0.2 0.01 0)",
    textSecondary: "oklch(0.5 0.01 0)",
    border: "oklch(0.85 0.01 0)",
    error: "oklch(0.6 0.2 20)",
    warning: "oklch(0.7 0.15 80)",
    success: "oklch(0.6 0.15 140)",
    info: "oklch(0.6 0.2 220)",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
    "3xl": "4rem",
  },
  typography: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  },
  borderRadius: {
    none: "0",
    sm: "0.125rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    full: "9999px",
  },
  transitions: {
    fast: "150ms ease-out",
    normal: "250ms ease-out",
    slow: "350ms ease-out",
  },
  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
  },
};

/**
 * Dark theme configuration
 */
export const darkTheme: ViewThemeConfig = {
  ...defaultTheme,
  colors: {
    primary: "oklch(0.7 0.2 270)",
    secondary: "oklch(0.6 0.15 300)",
    accent: "oklch(0.75 0.25 60)",
    background: "oklch(0.1 0.01 0)",
    surface: "oklch(0.15 0.01 0)",
    text: "oklch(0.9 0.01 0)",
    textSecondary: "oklch(0.7 0.01 0)",
    border: "oklch(0.25 0.01 0)",
    error: "oklch(0.7 0.2 20)",
    warning: "oklch(0.8 0.15 80)",
    success: "oklch(0.7 0.15 140)",
    info: "oklch(0.7 0.2 220)",
  },
};

/**
 * Theme variable generator
 */
export class ViewThemeVariableGenerator {
  /**
   * Generate CSS variables from theme config
   */
  static generateThemeVariables(theme: ViewThemeConfig): Record<string, string> {
    const variables: Record<string, string> = {};

    // Colors
    for (const [key, value] of Object.entries(theme.colors)) {
      variables[`--view-color-${key}`] = value;
    }

    // Spacing
    for (const [key, value] of Object.entries(theme.spacing)) {
      variables[`--view-spacing-${key}`] = value;
    }

    // Typography
    variables["--view-font-family"] = theme.typography.fontFamily;
    for (const [key, value] of Object.entries(theme.typography.fontSize)) {
      variables[`--view-font-size-${key}`] = value;
    }
    for (const [key, value] of Object.entries(theme.typography.fontWeight)) {
      variables[`--view-font-weight-${key}`] = value.toString();
    }
    for (const [key, value] of Object.entries(theme.typography.lineHeight)) {
      variables[`--view-line-height-${key}`] = value.toString();
    }

    // Shadows
    for (const [key, value] of Object.entries(theme.shadows)) {
      variables[`--view-shadow-${key}`] = value;
    }

    // Border radius
    for (const [key, value] of Object.entries(theme.borderRadius)) {
      variables[`--view-radius-${key}`] = value;
    }

    // Transitions
    for (const [key, value] of Object.entries(theme.transitions)) {
      variables[`--view-transition-${key}`] = value;
    }

    // Breakpoints
    for (const [key, value] of Object.entries(theme.breakpoints)) {
      variables[`--view-breakpoint-${key}`] = value;
    }

    return variables;
  }

  /**
   * Generate CSS string from variables
   */
  static generateCSSString(variables: Record<string, string>): string {
    return Object.entries(variables)
      .map(([key, value]) => `${key}: ${value};`)
      .join(" ");
  }
}

/**
 * Theme-aware style resolver
 */
export class ViewThemeStyleResolver {
  /**
   * Resolve theme-aware styles
   */
  static resolveThemeStyles(
    props: ViewProps,
    theme: ViewThemeConfig,
    customProperties: Record<string, string> = {},
  ): Partial<ViewStyleProps> {
    const resolvedStyles: Partial<ViewStyleProps> = {};

    // Resolve background
    if (props.background) {
      resolvedStyles.background = this.resolveThemeValue(props.background, theme, customProperties);
    }

    // Resolve color
    if (props.color) {
      resolvedStyles.color = this.resolveThemeValue(props.color, theme, customProperties);
    }

    // Resolve border
    if (props.border) {
      resolvedStyles.border = this.resolveThemeValue(props.border, theme, customProperties);
    }

    // Resolve border radius
    if (props.borderRadius) {
      resolvedStyles.borderRadius = this.resolveThemeValue(
        props.borderRadius,
        theme,
        customProperties,
      );
    }

    // Resolve shadow
    if (props.shadow && props.shadow !== "none") {
      resolvedStyles.boxShadow =
        theme.shadows[props.shadow as keyof typeof theme.shadows] || props.shadow;
    }

    // Resolve spacing
    if (props.padding) {
      resolvedStyles.padding = this.resolveSpacingValue(props.padding, theme);
    }
    if (props.margin) {
      resolvedStyles.margin = this.resolveSpacingValue(props.margin, theme);
    }
    if (props.gap) {
      resolvedStyles.gap = this.resolveSpacingValue(props.gap, theme);
    }

    // Resolve transitions
    if (props.transition) {
      resolvedStyles.transition = this.resolveThemeValue(props.transition, theme, customProperties);
    }

    return resolvedStyles;
  }

  /**
   * Resolve a theme value
   */
  private static resolveThemeValue(
    value: string | number | undefined,
    theme: ViewThemeConfig,
    customProperties: Record<string, string>,
  ): string {
    if (value === undefined) return "";

    const strValue = value.toString();

    // Check if it's a theme token
    if (strValue.startsWith("$")) {
      const token = strValue.substring(1);

      // Check custom properties first
      if (customProperties[`--view-${token}`]) {
        return `var(--view-${token})`;
      }

      // Check theme colors
      if (theme.colors[token as keyof typeof theme.colors]) {
        return `var(--view-color-${token})`;
      }

      // Check theme spacing
      if (theme.spacing[token as keyof typeof theme.spacing]) {
        return `var(--view-spacing-${token})`;
      }

      // Check theme typography
      if (theme.typography.fontSize[token as keyof typeof theme.typography.fontSize]) {
        return `var(--view-font-size-${token})`;
      }

      // Return as CSS variable
      return `var(--view-${token})`;
    }

    // Check if it's already a CSS variable
    if (strValue.startsWith("var(")) {
      return strValue;
    }

    // Return as-is
    return strValue;
  }

  /**
   * Resolve spacing value
   */
  private static resolveSpacingValue(
    value: string | number | undefined,
    theme: ViewThemeConfig,
  ): string {
    if (value === undefined) return "";

    const strValue = value.toString();

    // Check if it's a theme spacing token
    if (theme.spacing[strValue as keyof typeof theme.spacing]) {
      return `var(--view-spacing-${strValue})`;
    }

    // Handle numeric values
    if (typeof value === "number") {
      return `${value}px`;
    }

    // Return as-is
    return strValue;
  }
}

/**
 * Theme context manager
 */
export class ViewThemeManager {
  private static instance: ViewThemeManager | null = null;
  private currentTheme: ViewThemeConfig = defaultTheme;
  private currentMode: "light" | "dark" | "system" = "light";
  private customProperties: Record<string, string> = {};
  private subscribers: Set<() => void> = new Set();

  static getInstance(): ViewThemeManager {
    if (!ViewThemeManager.instance) {
      ViewThemeManager.instance = new ViewThemeManager();
    }
    return ViewThemeManager.instance;
  }

  /**
   * Get current theme
   */
  getTheme(): ViewThemeConfig {
    return this.currentTheme;
  }

  /**
   * Set theme
   */
  setTheme(theme: ViewThemeConfig): void {
    this.currentTheme = theme;
    this.notifySubscribers();
  }

  /**
   * Get current mode
   */
  getMode(): "light" | "dark" | "system" {
    return this.currentMode;
  }

  /**
   * Set mode
   */
  setMode(mode: "light" | "dark" | "system"): void {
    this.currentMode = mode;

    // Update theme based on mode
    if (mode === "light") {
      this.currentTheme = defaultTheme;
    } else if (mode === "dark") {
      this.currentTheme = darkTheme;
    } else {
      // System mode - detect from media query
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      this.currentTheme = isDark ? darkTheme : defaultTheme;
    }

    this.notifySubscribers();
  }

  /**
   * Toggle mode
   */
  toggleMode(): void {
    const newMode = this.currentMode === "light" ? "dark" : "light";
    this.setMode(newMode);
  }

  /**
   * Get custom properties
   */
  getCustomProperties(): Record<string, string> {
    return { ...this.customProperties };
  }

  /**
   * Set custom property
   */
  setCustomProperty(key: string, value: string): void {
    this.customProperties[key] = value;
    this.notifySubscribers();
  }

  /**
   * Remove custom property
   */
  removeCustomProperty(key: string): void {
    delete this.customProperties[key];
    this.notifySubscribers();
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify subscribers
   */
  private notifySubscribers(): void {
    this.subscribers.forEach((callback) => callback());
  }

  /**
   * Get all theme variables
   */
  getAllThemeVariables(): Record<string, string> {
    const themeVariables = ViewThemeVariableGenerator.generateThemeVariables(this.currentTheme);
    return { ...themeVariables, ...this.customProperties };
  }
}

/**
 * Theme context hook for components
 */
export function useViewTheme(): ViewThemeContext {
  const themeManager = ViewThemeManager.getInstance();

  // Create reactive state
  const theme = $state(themeManager.getTheme());
  const mode = $state(themeManager.getMode());
  const customProperties = $state(themeManager.getCustomProperties());

  // Subscribe to theme changes
  $effect(() => {
    const unsubscribe = themeManager.subscribe(() => {
      Object.assign(theme, themeManager.getTheme());
      Object.assign(mode, themeManager.getMode());
      Object.assign(customProperties, themeManager.getCustomProperties());
    });

    return unsubscribe;
  });

  return {
    theme,
    mode,
    setMode: (newMode: "light" | "dark" | "system") => themeManager.setMode(newMode),
    toggleMode: () => themeManager.toggleMode(),
    customProperties,
    setCustomProperty: (key: string, value: string) => themeManager.setCustomProperty(key, value),
    removeCustomProperty: (key: string) => themeManager.removeCustomProperty(key),
  };
}

/**
 * Theme-aware style computation hook
 */
export function useViewThemeStyles(getProps: () => ViewProps) {
  const themeContext = useViewTheme();

  // Compute theme-aware styles
  const themeStyles = $derived(
    ViewThemeStyleResolver.resolveThemeStyles(
      getProps(),
      themeContext.theme,
      themeContext.customProperties,
    ),
  );

  // Generate theme variables
  const themeVariables = $derived(
    ViewThemeVariableGenerator.generateThemeVariables(themeContext.theme),
  );

  // Combine with custom properties
  const allVariables = $derived({
    ...themeVariables,
    ...themeContext.customProperties,
  });

  // Generate CSS string
  const themeCSSString = $derived(ViewThemeVariableGenerator.generateCSSString(allVariables));

  return {
    get themeStyles() {
      return themeStyles;
    },
    get themeVariables() {
      return themeVariables;
    },
    get allVariables() {
      return allVariables;
    },
    get themeCSSString() {
      return themeCSSString;
    },
    themeContext,
  };
}

/**
 * Theme provider component utilities
 */
export function createViewThemeProvider(
  initialTheme?: ViewThemeConfig,
  initialMode?: "light" | "dark" | "system",
) {
  const themeManager = ViewThemeManager.getInstance();

  if (initialTheme) {
    themeManager.setTheme(initialTheme);
  }

  if (initialMode) {
    themeManager.setMode(initialMode);
  }

  return {
    setTheme: (theme: ViewThemeConfig) => themeManager.setTheme(theme),
    setMode: (mode: "light" | "dark" | "system") => themeManager.setMode(mode),
    setCustomProperty: (key: string, value: string) => themeManager.setCustomProperty(key, value),
    removeCustomProperty: (key: string) => themeManager.removeCustomProperty(key),
    getThemeVariables: () => themeManager.getAllThemeVariables(),
  };
}

/**
 * Utility to inject theme variables into document
 */
export function injectThemeVariables(
  theme: ViewThemeConfig,
  customProperties: Record<string, string> = {},
  target: HTMLElement = document.documentElement,
): void {
  const themeVariables = ViewThemeVariableGenerator.generateThemeVariables(theme);
  const allVariables = { ...themeVariables, ...customProperties };

  for (const [key, value] of Object.entries(allVariables)) {
    target.style.setProperty(key, value);
  }
}

/**
 * Utility to remove theme variables from document
 */
export function removeThemeVariables(
  theme: ViewThemeConfig,
  customProperties: Record<string, string> = {},
  target: HTMLElement = document.documentElement,
): void {
  const themeVariables = ViewThemeVariableGenerator.generateThemeVariables(theme);
  const allVariables = { ...themeVariables, ...customProperties };

  for (const key of Object.keys(allVariables)) {
    target.style.removeProperty(key);
  }
}

/**
 * Predefined theme presets
 */
export const themePresets = {
  light: defaultTheme,
  dark: darkTheme,
  blue: {
    ...defaultTheme,
    colors: {
      ...defaultTheme.colors,
      primary: "oklch(0.6 0.2 220)",
      secondary: "oklch(0.7 0.15 240)",
      accent: "oklch(0.65 0.25 200)",
    },
  },
  green: {
    ...defaultTheme,
    colors: {
      ...defaultTheme.colors,
      primary: "oklch(0.6 0.2 140)",
      secondary: "oklch(0.7 0.15 160)",
      accent: "oklch(0.65 0.25 120)",
    },
  },
  purple: {
    ...defaultTheme,
    colors: {
      ...defaultTheme.colors,
      primary: "oklch(0.6 0.2 300)",
      secondary: "oklch(0.7 0.15 320)",
      accent: "oklch(0.65 0.25 280)",
    },
  },
  minimal: {
    ...defaultTheme,
    colors: {
      ...defaultTheme.colors,
      primary: "oklch(0.3 0.01 0)",
      secondary: "oklch(0.5 0.01 0)",
      accent: "oklch(0.7 0.01 0)",
    },
    shadows: {
      sm: "none",
      md: "none",
      lg: "none",
      xl: "none",
    },
    borderRadius: {
      ...defaultTheme.borderRadius,
      sm: "0",
      md: "0",
      lg: "0",
      xl: "0",
    },
  },
} as const;
