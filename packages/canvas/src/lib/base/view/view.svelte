<script lang="ts" module>
export { ViewConfig, type ViewProps } from "./view.types.js";
</script>

<script lang="ts">
  import type { ViewProps } from "./view.types.js";
  import { createViewStyles } from "./view-styles.svelte.js";
  import { createDefaultViewEventHandlers } from "./view-events.svelte.js";
  import { useViewStates } from "./view-states.svelte.js";
  import { useViewLayout } from "./view-layout.svelte.js";
  import { useViewThemeStyles } from "./view-theme.svelte.js";

  let {
    ref = $bindable(null),
    as: asElement = "div",
    class: className = "",
    style: customStyle = "",
    children,
    // Event props (extracted for event handling)
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
  }: ViewProps = $props();

  // Create event props object (only derive when needed)
  let eventProps = $derived.by(() => {
    // Only create object if there are actual event handlers
    const hasEvents =
      ontap ||
      onhover ||
      onhoverend ||
      onpress ||
      onpressend ||
      onkeydown ||
      onkeyup ||
      onmouseenter ||
      onmouseleave ||
      onmousedown ||
      onmouseup ||
      onmousemove ||
      onwheel ||
      onfocus ||
      onblur ||
      onActionTap ||
      onActionHover ||
      onActionHoverEnd ||
      onActionPress ||
      onActionPressEnd ||
      onActionFocus ||
      onActionBlur;

    if (!hasEvents) return {};

    return {
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
    };
  });

  const generatedViewId = Math.random().toString(36);
  let viewId = $derived(`view-${restProps.id || generatedViewId}`);

  // Initialize all managers
  let viewStates = useViewStates(
    () => ref,
    () => states || {},
    () => ({
      disabled,
      loading,
      selected,
      expanded,
    }),
  );
  let viewLayout = useViewLayout(() => restProps, () => viewId);
  let viewTheme = useViewThemeStyles(() => restProps);

  // Create optimized merged styles (single computation)
  let finalStyles = $derived.by(() => {
    // Merge all style sources
    const mergedStyleProps = {
      ...restProps,
      ...viewStates.computedStyles,
      ...viewTheme.themeStyles,
    };

    // Create styles once
    const viewStyles = createViewStyles(mergedStyleProps);

    // Combine all style sources
    const allStyles = {
      ...viewLayout.layoutStyles,
      ...viewStyles.cssVariables,
      ...viewTheme.allVariables,
    };

    // Generate final CSS string
    const cssString = Object.entries(allStyles)
      .map(([key, value]) => `${key}: ${value};`)
      .join(" ");

    return {
      styles: allStyles,
      cssString: `${cssString} ${viewStyles.cssString} ${viewTheme.themeCSSString}`,
    };
  });

  // Create event handlers (only when needed)
  let eventHandlers = $derived(
    Object.keys(eventProps).length > 0
      ? createDefaultViewEventHandlers(eventProps)
      : {},
  );

  // Update states when props change
  $effect(() => {
    viewStates.updateStates({ disabled, loading, selected, expanded });
  });

  // Note: restProps may contain some duplicate props, but this is handled by the DOM
  // The explicit props take precedence over spread props in Svelte
</script>

{#if children}
  <svelte:element
    this={asElement || "div"}
    id={viewId}
    bind:this={ref}
    class={className}
    data-component="view"
    style={`${finalStyles.cssString} ${customStyle}`}
    {...eventHandlers}
    {...restProps}
  >
    {@render children?.()}
  </svelte:element>
{:else}
  <svelte:element
    this={asElement || "div"}
    id={viewId}
    bind:this={ref}
    class={className}
    data-component="view"
    style={`${finalStyles.cssString} ${customStyle}`}
    {...eventHandlers}
    {...restProps}
  />
{/if}
