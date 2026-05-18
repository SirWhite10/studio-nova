<script lang="ts">
	import { View } from "$lib/base/view/index.js";

	let { children }: { children?: () => any } = $props();
	let viewportWidth = $state(1280);

	const sectionGap = $derived(viewportWidth >= 768 ? 6 : 4);
	const verticalPadding = $derived(viewportWidth >= 768 ? 6 : 4);
</script>

<svelte:window bind:innerWidth={viewportWidth} />

<View display="flex" flexDirection="column" style="flex: 1; min-width: 0; min-height: 0;">
	<View
		display="flex"
		flexDirection="column"
		gap={2}
		style="flex: 1; min-width: 0; min-height: 0; overflow: auto;"
	>
		<View
			display="flex"
			flexDirection="column"
			gap={sectionGap}
			paddingTop={verticalPadding}
			paddingBottom={verticalPadding}
			style="flex: 1; min-width: 0;"
		>
			{@render children?.()}
		</View>
	</View>
</View>
