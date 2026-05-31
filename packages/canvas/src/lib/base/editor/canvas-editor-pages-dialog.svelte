<script lang="ts">
	import FileTextIcon from "@lucide/svelte/icons/file-text";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import XIcon from "@lucide/svelte/icons/x";
	import * as Command from "$lib/components/view-ui/command/index.js";
	import * as Dialog from "$lib/components/view-ui/dialog/index.js";

	let {
		open = $bindable(false),
		pages = [{ id: "landing", title: "Landing Canvas", description: "Primary landing page document" }],
	}: {
		open?: boolean;
		pages?: Array<{ id: string; title: string; description?: string }>;
	} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-2xl border-[color:var(--editor-border)] bg-[color:var(--editor-panel)] text-[color:var(--editor-fg)] shadow-2xl" showCloseButton={false}>
		<div class="flex items-center justify-between border-b px-5 py-4 [border-color:var(--editor-border)]">
			<div>
				<h2 class="text-base font-semibold tracking-tight">Pages</h2>
				<p class="text-sm [color:var(--editor-fg-muted)]">Manage the pages that belong to this Canvas app.</p>
			</div>
			<div class="flex items-center gap-2">
				<button type="button" class="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium [border-color:var(--editor-border)] [background:var(--editor-panel-elevated)] [color:var(--editor-fg)]">
					<PlusIcon size={14} />
					New Page
				</button>
				<Dialog.Close class="inline-flex size-9 items-center justify-center rounded-md border [border-color:var(--editor-border)] [background:var(--editor-panel-elevated)] [color:var(--editor-fg)]">
					<XIcon size={16} />
					<span class="sr-only">Close pages dialog</span>
				</Dialog.Close>
			</div>
		</div>

		<div class="p-4">
			<Command.Root class="rounded-xl border p-2 [border-color:var(--editor-border)] [background:var(--editor-panel-muted)] text-[color:var(--editor-fg)]">
				<Command.List class="max-h-[24rem] overflow-auto">
					<Command.Group heading="Pages">
						{#each pages as page (page.id)}
							<Command.Item class="rounded-lg px-3 py-3 data-[selected=true]:[background:var(--editor-panel-elevated)] data-[selected=true]:text-[color:var(--editor-fg)]">
								<FileTextIcon size={16} />
								<div class="flex min-w-0 flex-col gap-1">
									<div class="truncate text-sm font-medium">{page.title}</div>
									{#if page.description}
										<div class="truncate text-xs [color:var(--editor-fg-muted)]">{page.description}</div>
									{/if}
								</div>
							</Command.Item>
						{/each}
					</Command.Group>
				</Command.List>
			</Command.Root>
		</div>
	</Dialog.Content>
</Dialog.Root>
