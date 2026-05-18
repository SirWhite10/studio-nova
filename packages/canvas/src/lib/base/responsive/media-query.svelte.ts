import { MediaQuery } from "svelte/reactivity";
import { getActiveBreakpoint } from "./resolve-responsive.js";
import { createEmptyBreakpointState, resolveBreakpointDefinitions } from "./breakpoints.js";
import type {
  CanvasResponsiveConfig,
  ResponsiveBreakpoint,
  ResponsiveBreakpointState,
  ResponsiveMode,
} from "./types.js";

export interface ResponsiveQueryState {
  mode: ResponsiveMode;
  breakpoints: ResponsiveBreakpointState;
  activeBreakpoint: ResponsiveBreakpoint;
}

function createBreakpointStateFromFlags(
  flags: Partial<Record<Exclude<ResponsiveBreakpoint, "base">, boolean>>,
): ResponsiveBreakpointState {
  return {
    base: true,
    xs: flags.xs ?? false,
    sm: flags.sm ?? false,
    md: flags.md ?? false,
    lg: flags.lg ?? false,
    xl: flags.xl ?? false,
    "2xl": flags["2xl"] ?? false,
    "3xl": flags["3xl"] ?? false,
    "4xl": flags["4xl"] ?? false,
    "5xl": flags["5xl"] ?? false,
  };
}

export function createViewportBreakpointState(
  config?: CanvasResponsiveConfig,
  fallback = false,
): ResponsiveBreakpointState {
  const definitions = resolveBreakpointDefinitions("viewport", config);
  const queries = {
    xs: new MediaQuery(definitions.xs.query, fallback),
    sm: new MediaQuery(definitions.sm.query, fallback),
    md: new MediaQuery(definitions.md.query, fallback),
    lg: new MediaQuery(definitions.lg.query, fallback),
    xl: new MediaQuery(definitions.xl.query, fallback),
    "2xl": new MediaQuery(definitions["2xl"].query, fallback),
    "3xl": new MediaQuery(definitions["3xl"].query, fallback),
    "4xl": new MediaQuery(definitions["4xl"].query, fallback),
    "5xl": new MediaQuery(definitions["5xl"].query, fallback),
  };

  return {
    base: true,
    get xs() {
      return queries.xs.current;
    },
    get sm() {
      return queries.sm.current;
    },
    get md() {
      return queries.md.current;
    },
    get lg() {
      return queries.lg.current;
    },
    get xl() {
      return queries.xl.current;
    },
    get "2xl"() {
      return queries["2xl"].current;
    },
    get "3xl"() {
      return queries["3xl"].current;
    },
    get "4xl"() {
      return queries["4xl"].current;
    },
    get "5xl"() {
      return queries["5xl"].current;
    },
  };
}

export function createContainerBreakpointState(
  getWidth: () => number | undefined,
  config?: CanvasResponsiveConfig,
): ResponsiveBreakpointState {
  const definitions = resolveBreakpointDefinitions("container", config);

  return {
    base: true,
    get xs() {
      return (getWidth() ?? 0) >= definitions.xs.minWidth;
    },
    get sm() {
      return (getWidth() ?? 0) >= definitions.sm.minWidth;
    },
    get md() {
      return (getWidth() ?? 0) >= definitions.md.minWidth;
    },
    get lg() {
      return (getWidth() ?? 0) >= definitions.lg.minWidth;
    },
    get xl() {
      return (getWidth() ?? 0) >= definitions.xl.minWidth;
    },
    get "2xl"() {
      return (getWidth() ?? 0) >= definitions["2xl"].minWidth;
    },
    get "3xl"() {
      return (getWidth() ?? 0) >= definitions["3xl"].minWidth;
    },
    get "4xl"() {
      return (getWidth() ?? 0) >= definitions["4xl"].minWidth;
    },
    get "5xl"() {
      return (getWidth() ?? 0) >= definitions["5xl"].minWidth;
    },
  };
}

export function createResponsiveQueryState(
  options: {
    mode?: ResponsiveMode;
    config?: CanvasResponsiveConfig;
    getContainerWidth?: () => number | undefined;
    viewportFallback?: boolean;
  } = {},
): ResponsiveQueryState {
  let mode = options.mode ?? options.config?.defaultMode ?? "viewport";
  let viewportBreakpoints = createViewportBreakpointState(
    options.config,
    options.viewportFallback ?? false,
  );
  let containerBreakpoints = options.getContainerWidth
    ? createContainerBreakpointState(options.getContainerWidth, options.config)
    : createEmptyBreakpointState();

  return {
    get mode() {
      return mode;
    },
    get breakpoints() {
      return mode === "container" ? containerBreakpoints : viewportBreakpoints;
    },
    get activeBreakpoint() {
      return getActiveBreakpoint(mode === "container" ? containerBreakpoints : viewportBreakpoints);
    },
  };
}

export function createStaticResponsiveQueryState(
  breakpoints: Partial<Record<Exclude<ResponsiveBreakpoint, "base">, boolean>>,
  mode: ResponsiveMode = "viewport",
): ResponsiveQueryState {
  const state = createBreakpointStateFromFlags(breakpoints);
  return {
    mode,
    breakpoints: state,
    activeBreakpoint: getActiveBreakpoint(state),
  };
}
