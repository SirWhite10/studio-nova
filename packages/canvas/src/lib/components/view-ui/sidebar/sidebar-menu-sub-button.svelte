<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";

	let { ref = $bindable(null), class: className = "", children, style = "", href = undefined, disabled = false, active = false, ...restProps }: (HTMLButtonAttributes | HTMLAnchorAttributes) & { children?: () => any; href?: string; active?: boolean } = $props();

	const states = $derived({
		hover: { background: canvasTheme.colors.muted, color: canvasTheme.colors.foreground },
		focusVisible: { boxShadow: `0 0 0 3px ${canvasTheme.colors.ring}50` },
		disabled: { opacity: 0.5, pointerEvents: "none" },
	});
</script>

<View bind:ref as={href ? "a" : "button"} data-slot="sidebar-menu-sub-button" class={className} href={disabled ? undefined : href} disabled={!href ? disabled : undefined} aria-disabled={href && disabled ? true : undefined} display="flex" alignItems="center" gap={2} width="100%" minHeight="1.75rem" paddingLeft="0.5rem" paddingRight="0.5rem" borderRadius="0.375rem" border="1px solid transparent" background={active ? canvasTheme.colors.muted : "transparent"} color={active ? canvasTheme.colors.foreground : canvasTheme.colors.mutedForeground} states={states} style={`font-size: 0.8125rem; text-align: left; cursor: pointer; ${style}`} {...restProps}>
	{@render children?.()}
</View>
