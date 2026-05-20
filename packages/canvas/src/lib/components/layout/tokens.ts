export const canvasTheme = {
  colors: {
    background: "var(--background)",
    foreground: "var(--foreground)",
    card: "var(--card)",
    cardForeground: "var(--card-foreground)",
    muted: "var(--muted)",
    mutedForeground: "var(--muted-foreground)",
    border: "var(--border)",
    ring: "var(--ring)",
    sidebar: "var(--sidebar)",
    sidebarForeground: "var(--sidebar-foreground)",
    sidebarMuted: "var(--muted-foreground)",
    sidebarAccent: "var(--sidebar-accent)",
    accent: "var(--accent)",
    primary: "var(--primary)",
  },
  radius: {
    md: "var(--radius-md, calc(var(--radius) * 0.8))",
    lg: "var(--radius-lg, var(--radius))",
    xl: "var(--radius-xl, calc(var(--radius) * 1.4))",
  },
  shadows: {
    xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    sm: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)",
  },
  fonts: {
    sans: "var(--font-sans, Inter, ui-sans-serif, system-ui, sans-serif)",
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
