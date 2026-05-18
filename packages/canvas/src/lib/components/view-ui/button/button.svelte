<script lang="ts" module>
	export type ButtonVariant =
		| "default"
		| "outline"
		| "secondary"
		| "ghost"
		| "destructive"
		| "link";
	export type ButtonSize =
		| "default"
		| "xs"
		| "sm"
		| "lg"
		| "icon"
		| "icon-xs"
		| "icon-sm"
		| "icon-lg";
</script>

<script lang="ts">
	import { View } from "$lib/base/view/index.js";
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
	import { canvasTheme } from "$lib/components/layout/tokens.js";

	type ButtonProps = (HTMLButtonAttributes | HTMLAnchorAttributes) & {
		variant?: ButtonVariant;
		size?: ButtonSize;
		href?: string;
		class?: string;
		children?: () => any;
	};

	let {
		ref = $bindable(null),
		class: className = "",
		variant = "default",
		size = "default",
		href = undefined,
		type = "button",
		disabled = false,
		children,
		style = "",
		...restProps
	}: ButtonProps = $props();

	const sizeMap: Record<ButtonSize, Record<string, string | number>> = {
		default: { minHeight: "2.25rem", paddingInline: "0.625rem", borderRadius: "0.375rem" },
		xs: { minHeight: "1.5rem", paddingInline: "0.5rem", borderRadius: "0.5rem", fontSize: "0.75rem" },
		sm: { minHeight: "2rem", paddingInline: "0.625rem", borderRadius: "0.375rem" },
		lg: { minHeight: "2.5rem", paddingInline: "0.75rem", borderRadius: "0.375rem" },
		icon: { width: "2.25rem", height: "2.25rem", borderRadius: "0.375rem" },
		"icon-xs": { width: "1.5rem", height: "1.5rem", borderRadius: "0.5rem" },
		"icon-sm": { width: "2rem", height: "2rem", borderRadius: "0.375rem" },
		"icon-lg": { width: "2.5rem", height: "2.5rem", borderRadius: "0.375rem" },
	};

	const variantMap: Record<ButtonVariant, Record<string, string>> = {
		default: {
			background: canvasTheme.colors.primary,
			color: "white",
			border: `1px solid ${canvasTheme.colors.primary}`,
		},
		outline: {
			background: canvasTheme.colors.background,
			color: canvasTheme.colors.foreground,
			border: `1px solid color-mix(in srgb, ${canvasTheme.colors.foreground} 12%, transparent)`,
		},
		secondary: {
			background: canvasTheme.colors.muted,
			color: canvasTheme.colors.foreground,
			border: `1px solid transparent`,
		},
		ghost: {
			background: "transparent",
			color: canvasTheme.colors.foreground,
			border: "1px solid transparent",
		},
		destructive: {
			background: "color-mix(in srgb, #b42318 10%, white)",
			color: "#b42318",
			border: "1px solid color-mix(in srgb, #b42318 16%, transparent)",
		},
		link: {
			background: "transparent",
			color: canvasTheme.colors.foreground,
			border: "1px solid transparent",
		},
	};

	const palette = $derived(variantMap[variant]);
	const sizing = $derived(sizeMap[size]);
	const isIconOnly = $derived(size.startsWith("icon"));
	const fontSize = $derived((sizing.fontSize as string | undefined) ?? "0.875rem");
	const states = $derived({
		hover: {
			background:
				variant === "ghost"
					? canvasTheme.colors.muted
					: variant === "outline"
						? canvasTheme.colors.muted
						: variant === "secondary"
							? "color-mix(in srgb, #000 4%, white)"
							: variant === "default"
								? "color-mix(in srgb, black 10%, var(--button-background))"
								: palette.background,
		},
		active: {
			opacity: 0.92,
		},
		disabled: {
			opacity: 0.5,
			pointerEvents: "none",
		},
	});

	const inlineStyle = $derived.by(() => {
		const parts = [
			"display: inline-flex",
			"align-items: center",
			"justify-content: center",
			`gap: ${isIconOnly ? "0" : "0.375rem"}`,
			"box-sizing: border-box",
			"text-decoration: none",
			"font-weight: 500",
			`font-size: ${fontSize}`,
			`line-height: ${fontSize}`,
			"cursor: pointer",
			"white-space: nowrap",
			"flex-shrink: 0",
			`padding-inline: ${sizing.paddingInline ?? "0"}`,
			`min-height: ${sizing.minHeight ?? sizing.height ?? "auto"}`,
			sizing.width ? `width: ${sizing.width}` : "",
			sizing.height ? `height: ${sizing.height}` : "",
			`--button-background: ${palette.background}`,
			style,
		].filter(Boolean);

		if (variant === "link") {
			parts.push("padding-inline: 0", "min-height: auto", "text-underline-offset: 4px");
		}

		return parts.join("; ");
	});
</script>

<View
	as={href ? "a" : "button"}
	bind:ref
	class={className}
	data-slot="button"
	background={palette.background}
	color={palette.color}
	border={palette.border}
	borderRadius={sizing.borderRadius}
		shadow={variant === "outline" ? "xs" : "none"}
	opacity={disabled ? 0.5 : undefined}
	pointerEvents={disabled ? "none" : undefined}
	states={states}
	style={inlineStyle}
	href={disabled ? undefined : href}
	type={href ? undefined : type}
	aria-disabled={href && disabled ? true : undefined}
	tabindex={href && disabled ? -1 : undefined}
	{disabled}
	{...restProps}
>
	{@render children?.()}
</View>
