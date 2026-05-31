<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	let { class: className = "", children, ...restProps } = $props();
</script>
<View data-slot="dialog-footer" class={className} display="flex" flexDirection="row" justifyContent="flex-end" gap="0.5rem" {...restProps}>{@render children?.()}</View>
