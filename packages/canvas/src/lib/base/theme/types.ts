export type CanvasThemeMode = "system" | "light" | "dark";
export type CanvasResolvedThemeMode = "light" | "dark";

export interface CanvasThemeVariables {
  background: string;
  foreground: string;
  card: string;
  "card-foreground": string;
  popover: string;
  "popover-foreground": string;
  primary: string;
  "primary-foreground": string;
  secondary: string;
  "secondary-foreground": string;
  muted: string;
  "muted-foreground": string;
  accent: string;
  "accent-foreground": string;
  destructive: string;
  "destructive-foreground": string;
  border: string;
  input: string;
  ring: string;
  "chart-1": string;
  "chart-2": string;
  "chart-3": string;
  "chart-4": string;
  "chart-5": string;
  radius: string;
  sidebar: string;
  "sidebar-foreground": string;
  "sidebar-primary": string;
  "sidebar-primary-foreground": string;
  "sidebar-accent": string;
  "sidebar-accent-foreground": string;
  "sidebar-border": string;
  "sidebar-ring": string;
  spacing?: string;
  "font-sans"?: string;
  "font-serif"?: string;
  "font-mono"?: string;
  "shadow-color"?: string;
  "shadow-opacity"?: string;
  "shadow-blur"?: string;
  "shadow-spread"?: string;
  "shadow-offset-x"?: string;
  "shadow-offset-y"?: string;
  "letter-spacing"?: string;
}

export interface CanvasThemeConfig {
  mode?: CanvasThemeMode;
  defaultMode?: CanvasResolvedThemeMode;
  light?: Partial<CanvasThemeVariables>;
  dark?: Partial<CanvasThemeVariables>;
}

export const defaultCanvasTheme: Required<CanvasThemeConfig> = {
  mode: "system",
  defaultMode: "light",
  light: {
    background: "oklch(1 0 0)",
    foreground: "oklch(0.145 0 0)",
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.145 0 0)",
    popover: "oklch(1 0 0)",
    "popover-foreground": "oklch(0.145 0 0)",
    primary: "oklch(0.77 0.16 70)",
    "primary-foreground": "oklch(0.145 0 0)",
    secondary: "oklch(0.97 0 0)",
    "secondary-foreground": "oklch(0.205 0 0)",
    muted: "oklch(0.97 0 0)",
    "muted-foreground": "oklch(0.556 0 0)",
    accent: "oklch(0.97 0 0)",
    "accent-foreground": "oklch(0.205 0 0)",
    destructive: "oklch(0.577 0.245 27.325)",
    "destructive-foreground": "oklch(1 0 0)",
    border: "oklch(0.922 0 0)",
    input: "oklch(0.922 0 0)",
    ring: "oklch(0.708 0 0)",
    "chart-1": "oklch(0.87 0 0)",
    "chart-2": "oklch(0.556 0 0)",
    "chart-3": "oklch(0.439 0 0)",
    "chart-4": "oklch(0.371 0 0)",
    "chart-5": "oklch(0.269 0 0)",
    radius: "0.625rem",
    sidebar: "oklch(0.985 0 0)",
    "sidebar-foreground": "oklch(0.145 0 0)",
    "sidebar-primary": "oklch(0.205 0 0)",
    "sidebar-primary-foreground": "oklch(0.985 0 0)",
    "sidebar-accent": "oklch(0.97 0 0)",
    "sidebar-accent-foreground": "oklch(0.205 0 0)",
    "sidebar-border": "oklch(0.922 0 0)",
    "sidebar-ring": "oklch(0.708 0 0)",
    spacing: "0.25rem",
    "font-sans": '"Inter Variable", sans-serif',
    "font-serif": "Georgia, serif",
    "font-mono": '"Geist Mono", monospace',
    "shadow-color": "hsl(0 0% 0%)",
    "shadow-opacity": "0.1",
    "shadow-blur": "8px",
    "shadow-spread": "-1px",
    "shadow-offset-x": "0px",
    "shadow-offset-y": "4px",
    "letter-spacing": "0em",
  },
  dark: {
    background: "oklch(0.145 0 0)",
    foreground: "oklch(0.985 0 0)",
    card: "oklch(0.205 0 0)",
    "card-foreground": "oklch(0.985 0 0)",
    popover: "oklch(0.205 0 0)",
    "popover-foreground": "oklch(0.985 0 0)",
    primary: "oklch(0.77 0.16 70)",
    "primary-foreground": "oklch(0.145 0 0)",
    secondary: "oklch(0.269 0 0)",
    "secondary-foreground": "oklch(0.985 0 0)",
    muted: "oklch(0.269 0 0)",
    "muted-foreground": "oklch(0.708 0 0)",
    accent: "oklch(0.269 0 0)",
    "accent-foreground": "oklch(0.985 0 0)",
    destructive: "oklch(0.704 0.191 22.216)",
    "destructive-foreground": "oklch(1 0 0)",
    border: "oklch(1 0 0 / 10%)",
    input: "oklch(1 0 0 / 15%)",
    ring: "oklch(0.556 0 0)",
    "chart-1": "oklch(0.87 0 0)",
    "chart-2": "oklch(0.556 0 0)",
    "chart-3": "oklch(0.439 0 0)",
    "chart-4": "oklch(0.371 0 0)",
    "chart-5": "oklch(0.269 0 0)",
    radius: "0.625rem",
    sidebar: "oklch(0.205 0 0)",
    "sidebar-foreground": "oklch(0.985 0 0)",
    "sidebar-primary": "oklch(0.488 0.243 264.376)",
    "sidebar-primary-foreground": "oklch(0.985 0 0)",
    "sidebar-accent": "oklch(0.269 0 0)",
    "sidebar-accent-foreground": "oklch(0.985 0 0)",
    "sidebar-border": "oklch(1 0 0 / 10%)",
    "sidebar-ring": "oklch(0.556 0 0)",
    spacing: "0.25rem",
    "font-sans": '"Inter Variable", sans-serif',
    "font-serif": "Georgia, serif",
    "font-mono": '"Geist Mono", monospace',
    "shadow-color": "hsl(0 0% 0%)",
    "shadow-opacity": "0.16",
    "shadow-blur": "10px",
    "shadow-spread": "-2px",
    "shadow-offset-x": "0px",
    "shadow-offset-y": "5px",
    "letter-spacing": "0em",
  },
};

export function resolveCanvasTheme(
  theme?: CanvasThemeConfig,
  inheritedMode?: CanvasResolvedThemeMode,
) {
  const mode = theme?.mode ?? defaultCanvasTheme.mode;
  const defaultMode = theme?.defaultMode ?? defaultCanvasTheme.defaultMode;
  const resolvedMode: CanvasResolvedThemeMode =
    mode === "system" ? (inheritedMode ?? defaultMode) : mode;
  const light = { ...defaultCanvasTheme.light, ...theme?.light };
  const dark = { ...defaultCanvasTheme.dark, ...theme?.dark };
  return {
    mode,
    defaultMode,
    resolvedMode,
    light,
    dark,
    active: resolvedMode === "dark" ? dark : light,
  };
}

export function generateThemeVariables(values: Partial<CanvasThemeVariables>) {
  return Object.entries(values)
    .filter(([, value]) => value != null && value !== "")
    .map(([key, value]) => `--${key}: ${value}`)
    .join("; ");
}
