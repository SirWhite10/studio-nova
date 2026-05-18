import {
  createEmptyBreakpointState,
  RESPONSIVE_BREAKPOINT_ORDER,
  RESPONSIVE_NON_BASE_BREAKPOINT_ORDER,
} from "./breakpoints.js";
import type {
  MaybeResponsiveValue,
  ResolvedResponsiveValue,
  ResponsiveBreakpoint,
  ResponsiveBreakpointState,
  ResponsiveMode,
  ResponsiveModeValue,
  ResponsiveValue,
  ResolveResponsiveModeValueOptions,
  ResolveResponsiveValueOptions,
} from "./types.js";

export function isResponsiveValue<T>(value: unknown): value is ResponsiveValue<T> {
  return Boolean(
    value &&
    typeof value === "object" &&
    "mode" in (value as Record<string, unknown>) &&
    "viewport" in (value as Record<string, unknown>) &&
    "container" in (value as Record<string, unknown>),
  );
}

export function isResponsiveModeValue<T>(value: unknown): value is ResponsiveModeValue<T> {
  return Boolean(
    value && typeof value === "object" && "base" in (value as Record<string, unknown>),
  );
}

export function getResponsiveBranch<T>(
  value: ResponsiveValue<T>,
  mode: ResponsiveMode = value.mode,
): ResponsiveModeValue<T> {
  return value[mode];
}

export function flattenResponsiveModeValue<T>(
  value: ResponsiveModeValue<T>,
): Partial<Record<ResponsiveBreakpoint, T>> {
  return {
    base: value.base,
    ...value.overrides,
  };
}

export function getActiveBreakpoint(
  state: ResponsiveBreakpointState = createEmptyBreakpointState(),
): ResponsiveBreakpoint {
  let activeBreakpoint: ResponsiveBreakpoint = "base";

  for (const breakpoint of RESPONSIVE_NON_BASE_BREAKPOINT_ORDER) {
    if (state[breakpoint]) {
      activeBreakpoint = breakpoint;
    }
  }

  return activeBreakpoint;
}

export function resolveResponsiveModeValue<T>(
  value: ResponsiveModeValue<T>,
  state: ResponsiveBreakpointState,
  options: ResolveResponsiveModeValueOptions = {},
): ResolvedResponsiveValue<T> {
  const flattened = flattenResponsiveModeValue(value);
  let resolvedBreakpoint = options.fallback ?? "base";
  let resolvedValue = value.base;

  for (const breakpoint of RESPONSIVE_BREAKPOINT_ORDER) {
    if (breakpoint !== "base" && !state[breakpoint]) {
      continue;
    }

    const candidate = flattened[breakpoint];
    if (candidate !== undefined) {
      resolvedBreakpoint = breakpoint;
      resolvedValue = candidate;
    }
  }

  return {
    mode: options.mode ?? "viewport",
    breakpoint: resolvedBreakpoint,
    value: resolvedValue,
  };
}

export function resolveResponsiveValue<T>(
  value: MaybeResponsiveValue<T>,
  state: ResponsiveBreakpointState,
  options: ResolveResponsiveValueOptions = {},
): ResolvedResponsiveValue<T> {
  if (!isResponsiveValue<T>(value)) {
    return {
      mode: options.mode ?? options.fallbackMode ?? "viewport",
      breakpoint: getActiveBreakpoint(state),
      value,
    };
  }

  const mode = options.mode ?? value.mode ?? options.fallbackMode ?? "viewport";
  const resolved = resolveResponsiveModeValue(getResponsiveBranch(value, mode), state, { mode });

  return {
    ...resolved,
    mode,
  };
}

export function hasResponsiveOverride<T>(
  value: ResponsiveModeValue<T>,
  breakpoint: ResponsiveBreakpoint,
): boolean {
  if (breakpoint === "base") return true;
  return value.overrides?.[breakpoint] !== undefined;
}

export function setResponsiveOverride<T>(
  value: ResponsiveModeValue<T>,
  breakpoint: ResponsiveBreakpoint,
  nextValue: T,
): ResponsiveModeValue<T> {
  if (breakpoint === "base") {
    return {
      ...value,
      base: nextValue,
    };
  }

  return {
    ...value,
    overrides: {
      ...value.overrides,
      [breakpoint]: nextValue,
    },
  };
}

export function removeResponsiveOverride<T>(
  value: ResponsiveModeValue<T>,
  breakpoint: ResponsiveBreakpoint,
): ResponsiveModeValue<T> {
  if (breakpoint === "base" || !value.overrides) {
    return value;
  }

  const overrides = { ...value.overrides };
  delete overrides[breakpoint];

  return {
    ...value,
    overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
  };
}

export function listDefinedResponsiveBreakpoints<T>(
  value: ResponsiveModeValue<T>,
): ResponsiveBreakpoint[] {
  return RESPONSIVE_BREAKPOINT_ORDER.filter((breakpoint) =>
    hasResponsiveOverride(value, breakpoint),
  );
}

export function createResponsiveValue<T>(
  baseValue: T,
  mode: ResponsiveMode = "viewport",
): ResponsiveValue<T> {
  const branch = { base: baseValue };

  return {
    mode,
    viewport: { ...branch },
    container: { ...branch },
  };
}
