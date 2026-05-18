export type ResponsiveBreakpoint =
  | "base"
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl";

export type ResponsiveNonBaseBreakpoint = Exclude<ResponsiveBreakpoint, "base">;

export type ResponsiveMode = "viewport" | "container";

export interface ResponsiveModeValue<T> {
  base: T;
  overrides?: Partial<Record<ResponsiveNonBaseBreakpoint, T>>;
}

export interface ResponsiveValue<T> {
  mode: ResponsiveMode;
  viewport: ResponsiveModeValue<T>;
  container: ResponsiveModeValue<T>;
}

export type MaybeResponsiveValue<T> = T | ResponsiveValue<T>;

export interface ResolvedResponsiveValue<T> {
  mode: ResponsiveMode;
  breakpoint: ResponsiveBreakpoint;
  value: T;
}

export interface ResponsiveFieldState<T> {
  mode: ResponsiveMode;
  viewport: ResponsiveModeValue<T>;
  container: ResponsiveModeValue<T>;
}

export interface ResponsiveBreakpointDefinition {
  key: ResponsiveNonBaseBreakpoint;
  minWidth: number;
  query: string;
  label: string;
}

export interface ResponsiveBreakpointMatch {
  key: ResponsiveBreakpoint;
  matches: boolean;
}

export interface ResponsiveBreakpointState {
  base: true;
  xs: boolean;
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
  "2xl": boolean;
  "3xl": boolean;
  "4xl": boolean;
  "5xl": boolean;
}

export interface ResolveResponsiveValueOptions {
  mode?: ResponsiveMode;
  fallbackMode?: ResponsiveMode;
}

export interface ResolveResponsiveModeValueOptions {
  fallback?: ResponsiveBreakpoint;
  mode?: ResponsiveMode;
}

export interface CanvasResponsiveBreakpointSet {
  viewport?: Partial<
    Record<ResponsiveNonBaseBreakpoint, Omit<ResponsiveBreakpointDefinition, "key">>
  >;
  container?: Partial<
    Record<ResponsiveNonBaseBreakpoint, Omit<ResponsiveBreakpointDefinition, "key">>
  >;
}

export interface CanvasResponsiveConfig {
  breakpoints?: CanvasResponsiveBreakpointSet;
  defaultMode?: ResponsiveMode;
}
