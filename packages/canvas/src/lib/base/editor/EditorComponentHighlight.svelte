<script lang="ts">
	import Copy from "@lucide/svelte/icons/copy";
	import Settings from "@lucide/svelte/icons/settings";
	import SquarePlus from "@lucide/svelte/icons/square-plus";
	import Trash2 from "@lucide/svelte/icons/trash-2";
	import DropdownMenu from "$lib/components/view-ui/dropdown-menu.svelte";
	import { cn } from "$lib/utils.js";
	import type { CanvasNode } from "$lib/base/canvas/types.js";

	let {
		component,
		isSelected = false,
		isHovered = false,
		label = component.type,
		onClick,
		onEdit,
		onCopy,
		onDuplicate,
		onDelete,
		onHover,
		onLeave,
		onContextMenu,
		children,
	}: {
		component: CanvasNode;
		isSelected?: boolean;
		isHovered?: boolean;
		label?: string;
		onClick?: (e: MouseEvent) => void;
		onEdit?: () => void;
		onCopy?: () => void;
		onDuplicate?: () => void;
		onDelete?: () => void;
		onHover?: () => void;
		onLeave?: () => void;
		onContextMenu?: (e: MouseEvent) => void;
		children?: any;
	} = $props();

	let suppressNextClick = $state(false);
	let longPressTimer: ReturnType<typeof setTimeout> | undefined;
	let rootElement = $state<HTMLElement | undefined>(undefined);
	let chromeHorizontal = $state<"left" | "right">("left");
	let chromeVertical = $state<"top" | "bottom">("top");

	function clearLongPress() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = undefined;
		}
	}

	function updateChromePlacement() {
		if (!rootElement || typeof window === "undefined") {
			return;
		}

		const rect = rootElement.getBoundingClientRect();
		chromeVertical = rect.top < 56 ? "bottom" : "top";
		chromeHorizontal = rect.left > window.innerWidth - 360 ? "right" : "left";
	}

	function handlePointerDown(event: PointerEvent) {
		if (event.pointerType !== "touch") {
			return;
		}

		clearLongPress();
		longPressTimer = setTimeout(() => {
			suppressNextClick = true;
			onClick?.(new MouseEvent("click"));
			onEdit?.();
		}, 450);
	}

	function handlePointerUp() {
		clearLongPress();
	}

	function handleClick(event: MouseEvent) {
		event.stopPropagation();
		if (suppressNextClick) {
			suppressNextClick = false;
			return;
		}
		onClick?.(event);
	}

	$effect(() => {
		if (isHovered || isSelected) {
			updateChromePlacement();
		}
	});

	const menuItems = $derived([
		{ id: "edit", label: "Edit", icon: Settings, onSelect: onEdit },
		{ id: "copy", label: "Copy", icon: Copy, onSelect: onCopy },
		{ id: "duplicate", label: "Duplicate", icon: SquarePlus, onSelect: onDuplicate },
		{ id: "delete", label: "Delete", icon: Trash2, destructive: true, onSelect: onDelete },
	]);
</script>

<svelte:window onresize={updateChromePlacement} onscroll={updateChromePlacement} />

<div
	bind:this={rootElement}
	class={cn("editor-component-highlight", {
		"editor-component-selected": isSelected,
		"editor-component-hovered": isHovered && !isSelected,
	})}
	data-component-id={component.id}
	data-component-type={component.type}
	role="group"
	aria-label={label}
	onmouseenter={onHover}
	onmouseleave={() => {
		onLeave?.();
	}}
>
	<div class="editor-component-content">
		{@render children?.()}
	</div>

	<div
		class="editor-component-hitbox"
		role="button"
		tabindex="0"
		aria-label={`Select ${label}`}
		onclick={handleClick}
		oncontextmenu={(event) => {
			event.stopPropagation();
			onContextMenu?.(event);
		}}
		onkeydown={(event) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				onClick?.(new MouseEvent("click"));
			}
		}}
		onpointerdown={handlePointerDown}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerUp}
	></div>

	{#if isSelected}
		<div
			class={cn(
				"editor-component-chrome",
				chromeVertical === "bottom" && "editor-component-chrome-bottom",
				chromeHorizontal === "right" && "editor-component-chrome-right",
			)}
		>
			<div class="editor-component-badge">
				<div class="editor-component-label">{label}</div>
				<div class="editor-component-actions">
					<DropdownMenu
						triggerClass="editor-component-menu-button"
						menuClass="editor-component-menu"
						ariaLabel={`Open options for ${label}`}
						iconOnly={true}
						items={menuItems}
					>
						<span aria-hidden="true">•••</span>
					</DropdownMenu>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.editor-component-highlight {
		position: relative;
		min-height: 5px;
		min-width: 5px;
		width: fit-content;
		height: fit-content;
		border-radius: 0.75rem;
		overflow: visible;
		isolation: isolate;
	}

	.editor-component-content {
		position: relative;
		z-index: 1;
	}

	.editor-component-hitbox {
		position: absolute;
		inset: 0;
		z-index: 2;
		border-radius: 0.75rem;
		background: transparent;
		cursor: pointer;
	}

	.editor-component-hovered::after,
	.editor-component-selected::after {
		content: "";
		position: absolute;
		inset: -4px;
		border-radius: 0.9rem;
		pointer-events: none;
	}

	.editor-component-hovered::after {
		border: 1px dashed color-mix(in srgb, var(--primary) 50%, white 50%);
		background: color-mix(in srgb, var(--primary) 6%, transparent);
	}

	.editor-component-selected::after {
		border: 2px solid color-mix(in srgb, var(--primary) 70%, white 30%);
		background: color-mix(in srgb, var(--primary) 10%, transparent);
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary) 10%, transparent);
	}

	.editor-component-chrome {
		position: absolute;
		left: 0;
		bottom: calc(100% + 0.5rem);
		z-index: 4;
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		pointer-events: none;
		max-width: min(100vw - 2rem, 24rem);
	}

	.editor-component-chrome-bottom {
		top: calc(100% + 0.5rem);
		bottom: auto;
	}

	.editor-component-chrome-right {
		left: auto;
		right: 0;
	}

	.editor-component-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		max-width: 100%;
		padding: 0.2rem;
		border: 1px solid color-mix(in srgb, var(--primary) 25%, white 75%);
		border-radius: 999px;
		background: color-mix(in srgb, white 94%, var(--primary) 6%);
		box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
		pointer-events: auto;
	}

	.editor-component-label {
		max-width: min(320px, calc(100vw - 7rem));
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding: 0.35rem 0.55rem;
		color: color-mix(in srgb, var(--foreground) 88%, var(--primary) 12%);
		font-size: 0.75rem;
		font-weight: 600;
		line-height: 1;
	}

	.editor-component-actions {
		position: relative;
		display: inline-flex;
		align-items: center;
		pointer-events: auto;
	}

	.editor-component-menu-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.75rem;
		height: 1.75rem;
		padding: 0 0.45rem;
		border: 1px solid color-mix(in srgb, var(--border) 85%, white 15%);
		border-radius: 999px;
		background: color-mix(in srgb, white 96%, var(--accent) 4%);
		color: var(--foreground);
		font-size: 0.95rem;
		line-height: 1;
		cursor: pointer;
		box-shadow: none;
	}

	:global(.editor-component-menu.canvas-dropdown-menu) {
		z-index: 260;
	}

	@media (max-width: 1023px) {
		.editor-component-hovered::after {
			border-width: 2px;
		}

		.editor-component-selected::after {
			border-width: 3px;
		}

		.editor-component-label {
			max-width: min(260px, calc(100vw - 7.5rem));
			padding: 0.45rem 0.65rem;
			font-size: 0.8rem;
		}

		.editor-component-menu-button {
			min-width: 2.5rem;
			height: 2.5rem;
			font-size: 1rem;
		}
	}
</style>
