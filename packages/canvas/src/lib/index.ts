export { default as Canvas } from "./base/canvas/canvas.svelte";
export { default as CanvasApp } from "./base/canvas-app/CanvasApp.svelte";
export { getCanvasAppContext, setCanvasAppContext } from "./base/canvas-app/index.js";
export { default as CanvasThemeModeSwitcher } from "./base/theme/CanvasThemeModeSwitcher.svelte";
export { default as GlobalModeSwitcher } from "./base/theme/GlobalModeSwitcher.svelte";
export { default as ThemeProvider } from "./base/theme/ThemeProvider.svelte";
export {
  defaultCanvasTheme,
  generateThemeVariables,
  resolveCanvasTheme,
} from "./base/theme/index.js";
export { getThemeContext, setThemeContext } from "./base/theme/index.js";
export { canvasCodeTemplates } from "./base/canvas/index.js";
export {
  CONTAINER_BREAKPOINTS,
  RESPONSIVE_BREAKPOINT_ORDER,
  RESPONSIVE_NON_BASE_BREAKPOINT_ORDER,
  VIEWPORT_BREAKPOINTS,
  createEmptyBreakpointState,
  createMinWidthQuery,
  getBreakpointDefinition,
  getOrderedBreakpointKeys,
  getOrderedNonBaseBreakpointKeys,
} from "./base/responsive/breakpoints.js";
export {
  createContainerBreakpointState,
  createResponsiveQueryState,
  createStaticResponsiveQueryState,
  createViewportBreakpointState,
} from "./base/responsive/media-query.svelte.js";
export {
  createResponsiveValue,
  flattenResponsiveModeValue,
  getActiveBreakpoint,
  getResponsiveBranch,
  hasResponsiveOverride,
  isResponsiveModeValue,
  isResponsiveValue,
  listDefinedResponsiveBreakpoints,
  removeResponsiveOverride,
  resolveResponsiveModeValue,
  resolveResponsiveValue,
  setResponsiveOverride,
} from "./base/responsive/resolve-responsive.js";
export type { ResponsiveQueryState } from "./base/responsive/media-query.svelte.js";
export type {
  CanvasResponsiveBreakpointSet,
  CanvasResponsiveConfig,
  MaybeResponsiveValue,
  ResolvedResponsiveValue,
  ResponsiveBreakpoint,
  ResponsiveBreakpointDefinition,
  ResponsiveBreakpointMatch,
  ResponsiveBreakpointState,
  ResponsiveFieldState,
  ResponsiveMode,
  ResponsiveModeValue,
  ResponsiveNonBaseBreakpoint,
  ResponsiveValue,
  ResolveResponsiveModeValueOptions,
  ResolveResponsiveValueOptions,
} from "./base/responsive/types.js";
export type {
  BaseProps,
  CanvasActionRef,
  CanvasActionContext,
  CanvasBinding,
  CanvasComponentCatalog,
  CanvasComponentDefinition,
  CanvasDocument,
  CanvasNode,
  CanvasNodeKind,
  CanvasProps,
  CanvasProviderActions,
  CanvasProviderNode,
  CanvasSlotDefinition,
  ComponentDef,
} from "./base/canvas/types.js";
export type {
  CanvasAppConfig,
  CanvasAppContextValue,
  CanvasAppProps,
  CanvasSplashConfig,
} from "./base/canvas-app/types.js";
export type {
  CanvasResolvedThemeMode,
  CanvasThemeConfig,
  CanvasThemeMode,
  CanvasThemeVariables,
} from "./base/theme/index.js";
export type {
  EditorComponent,
  EditorConfig,
  EditorFieldConfig,
  EditorProps,
  EditorSlotConfig,
} from "./base/editor/types.js";

export { default as View } from "./base/view/view.svelte";
export type { ViewProps, ViewStyleProps, ViewStateStyles } from "./base/view/view.types.js";

export { default as ViewFlex } from "./components/layout/view-flex.svelte";
export { default as ViewGrid } from "./components/layout/view-grid.svelte";
export { canvasTheme, cardGradient, px, space, transition } from "./components/layout/tokens.js";
export { default as Icon } from "./components/icon/icon.svelte";
export { default as ViewDropdownMenu } from "./components/view-ui/dropdown-menu.svelte";
export { Button as ViewButton } from "./components/view-ui/button/index.js";
export { Separator as ViewSeparator } from "./components/view-ui/separator/index.js";
export * as ViewAvatar from "./components/view-ui/avatar/index.js";
export * as ViewDropdownMenuPrimitive from "./components/view-ui/dropdown-menu/index.js";
export { Badge as ViewBadge } from "./components/view-ui/badge/index.js";
export * as ViewCardPrimitive from "./components/view-ui/card/index.js";
export * as ViewChartPrimitive from "./components/view-ui/chart/index.js";
export { Label as ViewLabel } from "./components/view-ui/label/index.js";
export * as ViewSelectPrimitive from "./components/view-ui/select/index.js";
export * as ViewSidebarPrimitive from "./components/view-ui/sidebar/index.js";
export * as ViewTablePrimitive from "./components/view-ui/table/index.js";
export * as ViewTabsPrimitive from "./components/view-ui/tabs/index.js";
export * as ViewToggleGroupPrimitive from "./components/view-ui/toggle-group/index.js";

export { default as AuthForm } from "./components/auth/auth-form.svelte";
export { authComponentCatalog } from "./components/auth/catalog.js";
export { default as Hero1 } from "./blocks/hero/hero-1.svelte";
export { blockComponentCatalog } from "./blocks/catalog.js";
export { buttonComponentCatalog } from "./components/button/catalog.js";
export { imageComponentCatalog } from "./components/image/catalog.js";
export { default as CanvasImage } from "./components/image/image.svelte";
export { default as FormRoot } from "./components/form/form-root.svelte";
export { default as FormHeader } from "./components/form/form-header.svelte";
export { default as FormContent } from "./components/form/form-content.svelte";
export { formComponentCatalog } from "./components/form/catalog.js";
export { default as CardRoot } from "./components/card/card.svelte";
export { default as CardAction } from "./components/card/card-action.svelte";
export { default as CardContent } from "./components/card/card-content.svelte";
export { default as CardDescription } from "./components/card/card-description.svelte";
export { default as CardFooter } from "./components/card/card-footer.svelte";
export { default as CardHeader } from "./components/card/card-header.svelte";
export { default as CardTitle } from "./components/card/card-title.svelte";
export { cardComponentCatalog } from "./components/card/catalog.js";
export {
  cardActionEvents,
  cardActionTargets,
  cardShowcaseDocument,
  cardShowcaseJson,
  cardShowcaseProviderActions,
  cardSizes,
  cardVariants,
  executeCardTapActions,
  hasCardTapActions,
} from "./components/card/index.js";
export type {
  CardAction as CardSchemaAction,
  CardActionEvent,
  CardActionTarget,
  CardRootProps,
  CardSize,
  CardTextProps,
  CardVariant,
} from "./components/card/index.js";
export { canvasComponentCatalog } from "./components/catalog.js";

import { cardComponentCatalog } from "./components/card/catalog.js";
import { formComponentCatalog } from "./components/form/catalog.js";
import FormContentComponent from "./components/form/form-content.svelte";
import FormHeaderComponent from "./components/form/form-header.svelte";
import FormRootComponent from "./components/form/form-root.svelte";
import AuthFormComponent from "./components/auth/auth-form.svelte";
import CardRootComponent from "./components/card/card.svelte";
import CardActionComponent from "./components/card/card-action.svelte";
import CardContentComponent from "./components/card/card-content.svelte";
import CardDescriptionComponent from "./components/card/card-description.svelte";
import CardFooterComponent from "./components/card/card-footer.svelte";
import CardHeaderComponent from "./components/card/card-header.svelte";
import CardTitleComponent from "./components/card/card-title.svelte";

export const Card = {
  Root: CardRootComponent,
  Header: CardHeaderComponent,
  Title: CardTitleComponent,
  Description: CardDescriptionComponent,
  Action: CardActionComponent,
  Content: CardContentComponent,
  Footer: CardFooterComponent,
} as const;
export const Auth = {
  Form: AuthFormComponent,
} as const;
export const Form = {
  Root: FormRootComponent,
  Header: FormHeaderComponent,
  Content: FormContentComponent,
} as const;
export const CardSlots = cardComponentCatalog["Card.Root"].slots;
export const FormSlots = formComponentCatalog["Form.Root"].slots;

export { default as CanvasEditor } from "./base/editor/CanvasEditor.svelte";
export { default as StudioEditor } from "./base/editor/StudioEditor.svelte";

export { default as ViewAppSidebar } from "./components/app-sidebar.svelte";
export { default as ViewSiteHeader } from "./components/site-header.svelte";
export { default as ViewChartShell } from "./components/dashboard/chart-shell.svelte";
export { default as ViewDashboardMain } from "./components/dashboard/dashboard-main.svelte";
export { default as ViewMetricCardSection } from "./components/dashboard/metric-card-section.svelte";
export { default as ViewPageHeader } from "./components/dashboard/page-header.svelte";
export { default as ViewSidebarShell } from "./components/dashboard/sidebar-shell.svelte";
export { default as ViewTableShell } from "./components/dashboard/table-shell.svelte";
