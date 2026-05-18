<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { Button } from "$lib/components/view-ui/button/index.js";
	import { Separator } from "$lib/components/view-ui/separator/index.js";
	import * as Sidebar from "$lib/components/view-ui/sidebar/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";

	let { title = "Documents" }: { title?: string } = $props();
	let viewportWidth = $state(1280);
	const showGithub = $derived(viewportWidth >= 640);
</script>

<svelte:window bind:innerWidth={viewportWidth} />

<View
	as="header"
	display="flex"
	alignItems="center"
	borderBottom={`1px solid color-mix(in srgb, ${canvasTheme.colors.foreground} 10%, transparent)`}
	style="height: var(--header-height, 3rem); flex-shrink: 0; box-sizing: border-box; transition: width 180ms ease-linear, height 180ms ease-linear;"
>
	<View display="flex" width="100%" alignItems="center" gap={1} paddingLeft={4} paddingRight={4} style="box-sizing: border-box;">
		<Sidebar.Trigger style="margin-inline-start: -0.25rem;" />
		<Separator
			orientation="vertical"
			style="height: 1rem; width: 1px; margin-inline: 0.5rem;"
		/>
		<h1 style="margin: 0; font-size: 1rem; line-height: 1.5rem; font-weight: 500;">{title}</h1>
		<View display="flex" alignItems="center" gap={2} style="margin-left: auto;">
			{#if showGithub}
				<Button
					href="https://github.com/shadcn-ui/ui/tree/main/apps/v4/app/(examples)/dashboard"
					target="_blank"
					rel="noopener noreferrer"
					variant="ghost"
					size="sm"
				>
					GitHub
				</Button>
			{/if}
		</View>
	</View>
</View>
