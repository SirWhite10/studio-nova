import type {
  CanvasResponsiveConfig,
  ResponsiveBreakpoint,
  ResponsiveBreakpointDefinition,
  ResponsiveBreakpointState,
  ResponsiveMode,
  ResponsiveNonBaseBreakpoint,
} from "./types.js";

export const RESPONSIVE_BREAKPOINT_ORDER: ResponsiveBreakpoint[] = [
  "base",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
];

export const RESPONSIVE_NON_BASE_BREAKPOINT_ORDER: ResponsiveNonBaseBreakpoint[] =
  RESPONSIVE_BREAKPOINT_ORDER.filter(
    (breakpoint): breakpoint is ResponsiveNonBaseBreakpoint => breakpoint !== "base",
  );

export function createMinWidthQuery(minWidth: number): string {
  return `(min-width: ${minWidth}px)`;
}

function defineBreakpoint(
  key: ResponsiveNonBaseBreakpoint,
  minWidth: number,
  label: string,
): ResponsiveBreakpointDefinition {
  return {
    key,
    minWidth,
    query: createMinWidthQuery(minWidth),
    label,
  };
}

export const VIEWPORT_BREAKPOINTS: Record<
  ResponsiveNonBaseBreakpoint,
  ResponsiveBreakpointDefinition
> = {
  xs: defineBreakpoint("xs", 240, "XS"),
  sm: defineBreakpoint("sm", 320, "SM"),
  md: defineBreakpoint("md", 640, "MD"),
  lg: defineBreakpoint("lg", 768, "LG"),
  xl: defineBreakpoint("xl", 1024, "XL"),
  "2xl": defineBreakpoint("2xl", 1280, "2XL"),
  "3xl": defineBreakpoint("3xl", 1536, "3XL"),
  "4xl": defineBreakpoint("4xl", 1920, "4XL"),
  "5xl": defineBreakpoint("5xl", 2560, "5XL"),
};

export const CONTAINER_BREAKPOINTS: Record<
  ResponsiveNonBaseBreakpoint,
  ResponsiveBreakpointDefinition
> = {
  ...VIEWPORT_BREAKPOINTS,
};

export function getBreakpointDefinition(
  mode: ResponsiveMode,
  breakpoint: ResponsiveNonBaseBreakpoint,
): ResponsiveBreakpointDefinition {
  return mode === "container"
    ? CONTAINER_BREAKPOINTS[breakpoint]
    : VIEWPORT_BREAKPOINTS[breakpoint];
}

export function resolveBreakpointDefinitions(
  mode: ResponsiveMode,
  config?: CanvasResponsiveConfig,
): Record<ResponsiveNonBaseBreakpoint, ResponsiveBreakpointDefinition> {
  const defaults = mode === "container" ? CONTAINER_BREAKPOINTS : VIEWPORT_BREAKPOINTS;
  const overrides = config?.breakpoints?.[mode] ?? {};

  return Object.fromEntries(
    RESPONSIVE_NON_BASE_BREAKPOINT_ORDER.map((key) => {
      const override = overrides[key];
      const minWidth = override?.minWidth ?? defaults[key].minWidth;
      return [
        key,
        {
          key,
          minWidth,
          query: override?.query ?? createMinWidthQuery(minWidth),
          label: override?.label ?? defaults[key].label,
        },
      ];
    }),
  ) as Record<ResponsiveNonBaseBreakpoint, ResponsiveBreakpointDefinition>;
}

export function getOrderedBreakpointKeys(): ResponsiveBreakpoint[] {
  return [...RESPONSIVE_BREAKPOINT_ORDER];
}

export function getOrderedNonBaseBreakpointKeys(): ResponsiveNonBaseBreakpoint[] {
  return [...RESPONSIVE_NON_BASE_BREAKPOINT_ORDER];
}

export function createEmptyBreakpointState(): ResponsiveBreakpointState {
  return {
    base: true,
    xs: false,
    sm: false,
    md: false,
    lg: false,
    xl: false,
    "2xl": false,
    "3xl": false,
    "4xl": false,
    "5xl": false,
  };
}
