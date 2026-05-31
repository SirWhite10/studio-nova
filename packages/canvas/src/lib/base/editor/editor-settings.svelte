<script lang="ts">
	import XIcon from "@lucide/svelte/icons/x";
	import * as Dialog from "$lib/components/view-ui/dialog/index.js";

	let {
		open = $bindable(false),
	}: {
		open?: boolean;
	} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-xl border-[color:var(--editor-border)] bg-[color:var(--editor-panel)] text-[color:var(--editor-fg)] shadow-2xl" showCloseButton={false}>
		<div class="flex items-center justify-between border-b px-5 py-4 [border-color:var(--editor-border)]">
			<div>
				<h2 class="text-base font-semibold tracking-tight">Editor Settings</h2>
				<p class="text-sm [color:var(--editor-fg-muted)]">Preferences for the Canvas editor shell and workflow.</p>
			</div>
			<Dialog.Close class="inline-flex size-9 items-center justify-center rounded-md border [border-color:var(--editor-border)] [background:var(--editor-panel-elevated)] [color:var(--editor-fg)]">
				<XIcon size={16} />
				<span class="sr-only">Close editor settings</span>
			</Dialog.Close>
		</div>

		<div class="grid gap-4 p-5">
			<div class="rounded-xl border p-4 [border-color:var(--editor-border)] [background:var(--editor-panel-muted)]">
				<h3 class="text-sm font-semibold">Editor shell</h3>
				<p class="mt-1 text-sm [color:var(--editor-fg-muted)]">The editor uses a fixed branded appearance separate from Canvas app preview themes.</p>
			</div>
			<div class="rounded-xl border p-4 [border-color:var(--editor-border)] [background:var(--editor-panel-muted)]">
				<h3 class="text-sm font-semibold">Preview controls</h3>
				<p class="mt-1 text-sm [color:var(--editor-fg-muted)]">Use the toolbar toggle to preview the Canvas app in system, light, or dark mode without changing the editor shell.</p>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
