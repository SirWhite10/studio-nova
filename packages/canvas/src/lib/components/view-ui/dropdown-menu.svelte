<script lang="ts">
import type { Component } from "svelte";
import { cn } from "$lib/utils.js";

export type DropdownMenuItem = {
	id: string;
	label: string;
	icon?: Component<any>;
	destructive?: boolean;
	disabled?: boolean;
	onSelect?: () => void;
};

let {
	open = $bindable(false),
	triggerLabel = "",
	triggerIcon = undefined,
	triggerClass = "",
	menuClass = "",
	align = "end",
	side = "bottom",
	offset = 8,
	ariaLabel = "Open menu",
	items = [],
	iconOnly = false,
	children,
}: {
	open?: boolean;
	triggerLabel?: string;
	triggerIcon?: Component<any>;
	triggerClass?: string;
	menuClass?: string;
	align?: "start" | "end";
	side?: "top" | "bottom";
	offset?: number;
	ariaLabel?: string;
	items?: DropdownMenuItem[];
	iconOnly?: boolean;
	children?: any;
} = $props();

let rootElement = $state<HTMLElement | undefined>(undefined);
let triggerElement = $state<HTMLButtonElement | undefined>(undefined);
let menuPosition = $state({ top: 0, left: 0, minWidth: 0 });

function updatePosition() {
	if (!triggerElement || typeof window === "undefined") {
		return;
	}

	const rect = triggerElement.getBoundingClientRect();
	const top = side === "bottom" ? rect.bottom + offset : rect.top - offset;
	const left = align === "end" ? rect.right : rect.left;

	menuPosition = {
		top,
		left,
		minWidth: Math.max(rect.width, 164),
	};
}

function toggleMenu() {
	open = !open;
	if (open) {
		updatePosition();
	}
}

function closeMenu() {
	open = false;
}

function handleDocumentPointerDown(event: PointerEvent) {
	if (!open || !rootElement) {
		return;
	}

	const target = event.target;
	if (target instanceof Node && !rootElement.contains(target)) {
		closeMenu();
	}
}

function handleWindowChange() {
	if (open) {
		updatePosition();
	}
}

function selectItem(item: DropdownMenuItem) {
	if (item.disabled) {
		return;
	}

	closeMenu();
	item.onSelect?.();
}

const contentStyles = $derived.by(() => {
	const vertical = side === "bottom"
		? `top: ${menuPosition.top}px`
		: `top: calc(${menuPosition.top}px - 100%)`;
	const horizontal = align === "end"
		? `right: calc(100vw - ${menuPosition.left}px); left: auto`
		: `left: ${menuPosition.left}px; right: auto`;

	return `${vertical}; ${horizontal}; min-width: ${menuPosition.minWidth}px`;
});
</script>

<svelte:document onpointerdown={handleDocumentPointerDown} />
<svelte:window onresize={handleWindowChange} onscroll={handleWindowChange} onkeydown={(event) => {
	if (event.key === "Escape") {
		closeMenu();
	}
}} />

<div bind:this={rootElement} class="canvas-dropdown-root">
	<button
		bind:this={triggerElement}
		type="button"
		class={cn("canvas-dropdown-trigger", iconOnly && "canvas-dropdown-trigger-icon-only", triggerClass)}
		aria-haspopup="menu"
		aria-expanded={open}
		aria-label={ariaLabel}
		onclick={toggleMenu}
	>
		{#if triggerIcon}
			{@const TriggerIcon = triggerIcon}
			<TriggerIcon size={15} />
		{/if}
		{#if !iconOnly && triggerLabel}
			<span>{triggerLabel}</span>
		{/if}
		{@render children?.()}
	</button>

	{#if open}
		<div
			class={cn("canvas-dropdown-menu", menuClass)}
			role="menu"
			style={contentStyles}
		>
			{#each items as item (item.id)}
				<button
					type="button"
					role="menuitem"
					disabled={item.disabled}
					class={cn(
						"canvas-dropdown-item",
						item.destructive && "canvas-dropdown-item-destructive",
					)}
					onclick={() => selectItem(item)}
				>
					{#if item.icon}
						<item.icon size={14} />
					{/if}
					<span>{item.label}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.canvas-dropdown-root {
		position: relative;
		display: inline-flex;
	}

	.canvas-dropdown-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		min-height: 2rem;
		padding: 0.45rem 0.7rem;
		border: 1px solid rgba(15, 23, 42, 0.12);
		border-radius: 999px;
		background: #fff;
		color: inherit;
		font: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
	}

	.canvas-dropdown-trigger-icon-only {
		width: 2rem;
		padding-inline: 0;
	}

	.canvas-dropdown-menu {
		position: fixed;
		z-index: 250;
		display: grid;
		gap: 0.2rem;
		padding: 0.35rem;
		border: 1px solid rgba(15, 23, 42, 0.1);
		border-radius: 0.9rem;
		background: rgba(255, 255, 255, 0.98);
		box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
		backdrop-filter: blur(12px);
	}

	.canvas-dropdown-item {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		width: 100%;
		min-height: 2.35rem;
		padding: 0.55rem 0.7rem;
		border: none;
		border-radius: 0.7rem;
		background: transparent;
		color: inherit;
		font: inherit;
		font-size: 0.84rem;
		font-weight: 500;
		text-align: left;
	}

	.canvas-dropdown-item:hover {
		background: rgba(15, 23, 42, 0.05);
	}

	.canvas-dropdown-item:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.canvas-dropdown-item-destructive {
		color: #b42318;
	}

	@media (max-width: 1023px) {
		.canvas-dropdown-trigger {
			min-height: 2.4rem;
			font-size: 0.78rem;
		}

		.canvas-dropdown-trigger-icon-only {
			width: 2.5rem;
		}

		.canvas-dropdown-item {
			min-height: 2.75rem;
			font-size: 0.92rem;
		}
	}
</style>
