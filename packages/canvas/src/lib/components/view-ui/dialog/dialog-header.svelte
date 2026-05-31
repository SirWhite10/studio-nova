<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	let { class: className = "", children, ...restProps } = $props();
</script>
<View data-slot="dialog-header" class={className} display="flex" flexDirection="column" gap="0.5rem" textAlign="center" {...restProps}>{@render children?.()}</View>
