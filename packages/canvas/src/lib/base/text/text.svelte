<script lang="ts" module>
export { TextConfig, type TextProps } from "./text-types.js";
</script>

<script lang="ts">
  import { getCanvasAppContext } from "$lib/base/canvas-app/context.js";
  import { createEmptyBreakpointState } from "$lib/base/responsive/breakpoints.js";
  import { resolveResponsiveValue } from "$lib/base/responsive/resolve-responsive.js";
  import type { TextAlign, TextProps, TextSize, FontWeight, LineHeight, LetterSpacing } from "./text-types.js";
  import { createTextStyles, createTextCSSVariables } from "./text-styles.svelte.js";
  import { useTextThemeStyles } from "./text-theme.svelte.js";
  import { View } from "../view/index.js";

  let {
    ref = $bindable(null),
    as: asElement = "span",
    class: className = "",
    style: customStyle = "",
    children,
    
    // Content props
    text,

    // Typography props
    size = "base",
    weight = "normal",
    color,
    textAlign = "left",
    transform = "none",
    lineHeight = "normal",
    letterSpacing = "normal",

    // Event props (extracted for View component)
    ontap,
    onhover,
    onhoverend,
    onpress,
    onpressend,
    onkeydown,
    onkeyup,
    onmouseenter,
    onmouseleave,
    onmousedown,
    onmouseup,
    onmousemove,
    onwheel,
    onfocus,
    onblur,
    onActionTap,
    onActionHover,
    onActionHoverEnd,
    onActionPress,
    onActionPressEnd,
    onActionFocus,
    onActionBlur,
    actionParams,
    
    // State props
    states,
    disabled,
    loading,
    selected,
    expanded,

    ...restProps
  }: TextProps = $props();

  const canvasAppContext = getCanvasAppContext();

  let responsiveBreakpoints = $derived(
    canvasAppContext?.responsiveQueryState.breakpoints ?? createEmptyBreakpointState()
  );

  let responsiveMode = $derived(
    canvasAppContext?.config.responsive?.defaultMode ?? "viewport"
  );

  let resolvedSize = $derived(
    resolveResponsiveValue<TextSize>(size, responsiveBreakpoints, { mode: responsiveMode }).value
  );

  let resolvedWeight = $derived(
    resolveResponsiveValue<FontWeight>(weight, responsiveBreakpoints, { mode: responsiveMode }).value
  );

  let resolvedTextAlign = $derived(
    resolveResponsiveValue<TextAlign>(textAlign, responsiveBreakpoints, { mode: responsiveMode }).value
  );

  let resolvedLineHeight = $derived(
    resolveResponsiveValue<LineHeight>(lineHeight, responsiveBreakpoints, { mode: responsiveMode }).value
  );

  let resolvedLetterSpacing = $derived(
    resolveResponsiveValue<LetterSpacing>(letterSpacing, responsiveBreakpoints, { mode: responsiveMode }).value
  );

  // Create text-specific styles using CSS variables
  let textStyles = $derived.by(() => {
    const textProps = {
      size: resolvedSize,
      weight: resolvedWeight,
      color,
      textAlign: resolvedTextAlign,
      transform,
      lineHeight: resolvedLineHeight,
      letterSpacing: resolvedLetterSpacing,
    };

    return createTextStyles(textProps);
  });

  // Create CSS variables for text styling
  let textCSSVariables = $derived.by(() => {
    const textProps = {
      size: resolvedSize,
      weight: resolvedWeight,
      color,
      lineHeight: resolvedLineHeight,
      letterSpacing: resolvedLetterSpacing,
    };

    return createTextCSSVariables(textProps);
  });

  // Use theme-aware styling
  let textTheme = $derived.by(() =>
    useTextThemeStyles({
      color,
    })
  );

  // Merge all styles
  let finalStyles = $derived.by(() => {
    const allStyles = {
      ...textStyles,
      ...textCSSVariables,
      ...textTheme.themeVariables,
    };

    // Generate final CSS string
    const cssString = Object.entries(allStyles)
      .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
      .join("; ");

    return `${cssString}; ${textTheme.themeCSSString}; ${customStyle}`;
  });

  const generatedTextId = `text-${Math.random().toString(36).slice(2)}`;
  let textId = $derived(restProps.id ? `text-${restProps.id}` : generatedTextId);
</script>

<View
  bind:ref
  as={asElement}
  id={textId}
  class={className}
  style={finalStyles}
  data-component="text"
  
  {ontap}
  {onhover}
  {onhoverend}
  {onpress}
  {onpressend}
  {onkeydown}
  {onkeyup}
  {onmouseenter}
  {onmouseleave}
  {onmousedown}
  {onmouseup}
  {onmousemove}
  {onwheel}
  {onfocus}
  {onblur}
  {onActionTap}
  {onActionHover}
  {onActionHoverEnd}
  {onActionPress}
  {onActionPressEnd}
  {onActionFocus}
  {onActionBlur}
  {actionParams}
  
  {states}
  {disabled}
  {loading}
  {selected}
  {expanded}
  
  {...restProps}
>
  {#if text}
    {text}
  {/if}
  {#if children}
    {@render children()}
  {/if}
</View>
