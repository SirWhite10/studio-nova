<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import Icon from "$lib/components/icon/icon.svelte";
	import { canvasTheme, transition } from "$lib/components/layout/tokens.js";
	import { getDashboardSidebarState } from "./sidebar-state.svelte.js";

	let { title = "Documents" }: { title?: string } = $props();
	const sidebar = getDashboardSidebarState();
</script>

<View
	as="header"
	display="flex"
	alignItems="center"
	gap={2}
	paddingLeft={4}
	paddingRight={4}
	borderBottom={`1px solid ${canvasTheme.colors.border}`}
	style={`height: var(--header-height, 3rem); box-sizing: border-box; transition: ${transition("width, height")};`}
>
	<View display="flex" alignItems="center" gap={2} style="width: 100%;">
		<View
			as="button"
			padding={0}
			background="transparent"
			border="none"
			style={`display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; color: ${canvasTheme.colors.mutedForeground}; cursor: pointer;`}
			aria-label="Toggle sidebar"
			onclick={sidebar.toggle}
		>
			<Icon collection="lucide" name="panel-left" size={16} strokeWidth={1.5} aria-hidden="true" />
		</View>
		<View
			aria-hidden="true"
			style={`width: 1px; height: 1rem; background: ${canvasTheme.colors.border}; margin-inline: 0.25rem;`}
		/>
		<h1 style={`margin: 0; font-size: 1rem; line-height: 1.5rem; font-weight: 500;`}>
			{title}
		</h1>
		<View display="flex" alignItems="center" gap={2} style="margin-left: auto;">
			<a
				href="https://github.com/shadcn-ui/ui/tree/main/apps/v4/app/(examples)/dashboard"
				target="_blank"
				rel="noopener noreferrer"
				style={`display: inline-flex; align-items: center; justify-content: center; min-height: 2rem; padding: 0 0.5rem; border-radius: 0.5rem; color: ${canvasTheme.colors.foreground}; text-decoration: none; font-size: 0.875rem; font-weight: 500; background: transparent;`}
			>
				GitHub
			</a>
		</View>
	</View>
</View>
