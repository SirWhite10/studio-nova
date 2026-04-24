<script lang="ts">
  import { Loader2 } from "@lucide/svelte";
  import { cn } from "$lib/utils";
  import { chatStore } from "$lib/nova/chat";

  interface Props {
    chatId: string;
    class?: string;
    showMenu?: boolean;
  }

  let { chatId, class: className, showMenu = true }: Props = $props();

  // Read title directly from the store — always in sync
  let title = $derived(
    chatStore.chats.find((c) => c.id === chatId)?.title ?? chatStore.chatTitle
  );

  let isEditing = $state(false);
  let editTitle = $state("");
  let isLoading = $state(false);
  let inputEl = $state<HTMLInputElement | null>(null);

  function startEdit() {
    editTitle = title;
    isEditing = true;
    queueMicrotask(() => {
      if (isEditing && inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    });
  }

  export function beginEdit() {
    if (!isLoading) startEdit();
  }

  async function saveTitle() {
    const newTitle = editTitle.trim();
    if (!newTitle || newTitle === title) {
      isEditing = false;
      return;
    }
    isLoading = true;
    const ok = await chatStore.renameChat(chatId, newTitle);
    isLoading = false;
    if (ok) isEditing = false;
    // on failure: stay in edit mode (store already showed toast)
  }

  function cancelEdit() {
    isEditing = false;
    editTitle = title;
  }
</script>

<span class={cn("flex items-center gap-1", className)}>
  {#if isEditing}
    <input
      bind:this={inputEl}
      type="text"
      bind:value={editTitle}
      onmousedown={() => {}}
      onclick={() => {}}
      onkeydown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); saveTitle(); }
        else if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
      }}
      onblur={saveTitle}
      class="text-sm font-medium bg-transparent border rounded px-1 py-0.5 min-w-[120px]"
      disabled={isLoading}
    />
    {#if isLoading}<Loader2 class="size-4 animate-spin" />{/if}
  {:else}
    <span class="truncate text-sm font-medium">{title}</span>
    {#if showMenu}
      <!-- inline rename button (used in page header) -->
      <button onclick={startEdit} class="ml-1 text-muted-foreground hover:text-foreground">
        ✎
      </button>
    {/if}
  {/if}
</span>
