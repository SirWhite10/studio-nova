<script lang="ts">
	import { Label } from "$lib/components/view-ui/label/index.js";
	let { ref = $bindable(null), class: className = "", style = "", ...restProps } = $props();
</script>
<Label bind:ref data-slot="field-label" class={className} style={style} {...restProps} />
