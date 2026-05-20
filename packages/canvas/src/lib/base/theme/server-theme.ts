import { generateThemeVariables, resolveCanvasTheme, type CanvasThemeConfig } from "./types.js";

export const CANVAS_THEME_COOKIE = "canvas-theme";

export function parseCanvasThemeCookie(value: string | undefined): CanvasThemeConfig | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(decodeURIComponent(value)) as CanvasThemeConfig;
  } catch {
    return undefined;
  }
}

export function serializeCanvasThemeCookie(theme: CanvasThemeConfig): string {
  return encodeURIComponent(JSON.stringify(theme));
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function getServerThemeAttributes(
  theme?: CanvasThemeConfig,
  inheritedMode?: "light" | "dark",
): string {
  const resolvedTheme = resolveCanvasTheme(theme, inheritedMode);
  const themeStyle = [
    `color-scheme: ${resolvedTheme.resolvedMode}`,
    generateThemeVariables(resolvedTheme.active),
  ]
    .filter(Boolean)
    .join("; ");

  const attributes = [
    `data-theme-mode="${escapeHtmlAttribute(resolvedTheme.mode)}"`,
    `data-resolved-theme-mode="${escapeHtmlAttribute(resolvedTheme.resolvedMode)}"`,
    resolvedTheme.resolvedMode === "dark" ? 'class="dark"' : "",
    themeStyle ? `style="${escapeHtmlAttribute(themeStyle)}"` : "",
  ].filter(Boolean);

  return attributes.join(" ");
}
