<script lang="ts">
	import XIcon from "@lucide/svelte/icons/x";
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { Button } from "$lib/components/view-ui/button/index.js";
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import DialogPortal from "./dialog-portal.svelte";
	import DialogOverlay from "./dialog-overlay.svelte";
	let { ref = $bindable(null), class: className = "", portalProps, children, showCloseButton = true, style = "", ...restProps }: DialogPrimitive.ContentProps & { portalProps?: any; children?: () => any; showCloseButton?: boolean; class?: string } = $props();
</script>
<DialogPortal {...portalProps}>
	<DialogOverlay />
	<DialogPrimitive.Content bind:ref {...restProps}>
		{#snippet child({ props })}
			<View
				{...props}
				data-slot="dialog-content"
				class={className}
				position="fixed"
				top="50%"
				left="50%"
				zIndex={50}
				display="grid"
				width="100%"
				maxWidth="42rem"
				gap="1rem"
				padding="1.5rem"
				border={`1px solid ${canvasTheme.colors.border}`}
				borderRadius="0.75rem"
				background="var(--editor-panel, var(--popover, var(--background)))"
				color="var(--editor-fg, var(--popover-foreground, inherit))"
				shadow="lg"
				style={`transform: translate(-50%, -50%); outline: none; animation: dialog-zoom-in 150ms ease-out; ${style}`}
			>
				{@render children?.()}
				{#if showCloseButton}
					<DialogPrimitive.Close>
						{#snippet child({ props: closeProps })}
							<Button {...closeProps} variant="ghost" size="icon-sm" style="position: absolute; top: 1rem; right: 1rem;">
								<XIcon size={16} />
								<span style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">Close</span>
							</Button>
						{/snippet}
					</DialogPrimitive.Close>
				{/if}
			</View>
		{/snippet}
	</DialogPrimitive.Content>
</DialogPortal>
<style>@keyframes dialog-zoom-in{from{opacity:0;transform:translate(-50%,-50%) scale(.95)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}</style>
