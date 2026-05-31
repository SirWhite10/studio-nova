<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import { canvasTheme } from "$lib/components/layout/tokens.js";
	import type { HTMLInputAttributes } from "svelte/elements";

	type Props = HTMLInputAttributes & {
		ref?: HTMLInputElement | null;
		class?: string;
		"data-slot"?: string;
	};

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className = "",
		"data-slot": dataSlot = "input",
		disabled = false,
		style = "",
		oninput,
		...restProps
	}: Props = $props();

	function handleInput(event: Event) {
		value = (event.currentTarget as HTMLInputElement).value;
		oninput?.(event as InputEvent & { currentTarget: EventTarget & HTMLInputElement });
	}

	const states = $derived({
		focus: {
			borderColor: canvasTheme.colors.ring,
			boxShadow: `0 0 0 3px color-mix(in srgb, ${canvasTheme.colors.ring} 50%, transparent)`,
		},
		disabled: {
			opacity: 0.5,
			pointerEvents: "none",
		},
	});

	const inlineStyle = $derived(
		[
			"box-sizing: border-box",
			"display: flex",
			"width: 100%",
			"min-width: 0",
			"height: 2.25rem",
			"padding: 0.25rem 0.625rem",
			"font-size: 0.875rem",
			"line-height: 1.25rem",
			"outline: none",
			"transition: color 150ms ease, box-shadow 150ms ease, border-color 150ms ease",
			"background: transparent",
			"color: inherit",
			"--placeholder-color: var(--muted-foreground)",
			style,
		]
			.filter(Boolean)
			.join("; "),
	);
</script>

<View
	as="input"
	bind:ref
	data-slot={dataSlot}
	class={className}
	border={`1px solid ${canvasTheme.colors.border}`}
	borderRadius="0.375rem"
	shadow="xs"
	opacity={disabled ? 0.5 : undefined}
	pointerEvents={disabled ? "none" : undefined}
	states={states}
	style={inlineStyle}
	{value}
	oninput={handleInput}
	{disabled}
	{...restProps}
/>

<style>
	:global([data-slot="input"]::placeholder) {
		color: var(--muted-foreground, rgb(113 113 122));
	}
	:global([data-slot="input"]::file-selector-button) {
		height: 1.75rem;
		border: 0;
		background: transparent;
		color: inherit;
		font-size: 0.875rem;
		font-weight: 500;
	}
</style>
