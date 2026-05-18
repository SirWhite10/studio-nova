export const canvasTheme = {
  colors: {
    background: "oklch(0.985 0 0)",
    foreground: "oklch(0.205 0 0)",
    card: "oklch(1 0 0)",
    cardForeground: "oklch(0.205 0 0)",
    muted: "oklch(0.97 0 0)",
    mutedForeground: "oklch(0.556 0 0)",
    border: "oklch(0.205 0 0)",
    ring: "oklch(0.205 0 0)",
    sidebar: "oklch(0.991 0 0)",
    sidebarForeground: "oklch(0.205 0 0)",
    sidebarMuted: "oklch(0.556 0 0)",
    sidebarAccent: "oklch(0.97 0 0)",
    accent: "oklch(0.97 0 0)",
    primary: "oklch(0.205 0 0)",
  },
  radius: {
    md: "0.5rem",
    lg: "0.75rem",
    xl: "0.875rem",
  },
  shadows: {
    xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    sm: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)",
  },
  fonts: {
    sans: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
} as const;

export function space(value: number | string): string {
  if (typeof value === "number") {
    return `calc(var(--spacing, 0.25rem) * ${value})`;
  }

  return value;
}

export function px(value: number): string {
  return `${value}px`;
}

export function cardGradient(): string {
  return canvasTheme.colors.card;
}

export function transition(property = "all"): string {
  return `${property} 150ms ease`;
}
