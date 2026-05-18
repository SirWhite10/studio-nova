<script lang="ts">
	import CardHeader from "../card/card-header.svelte";
	import CardTitle from "../card/card-title.svelte";
	import CardDescription from "../card/card-description.svelte";

	let {
		title = "Form title",
		description = "Form description",
		style = "",
		...restProps
	}: {
		title?: string;
		description?: string;
		style?: string;
		[key: string]: unknown;
	} = $props();
</script>

<CardHeader style={style} {...restProps}>
	<CardTitle text={title} />
	<CardDescription text={description} />
</CardHeader>
