<script lang="ts">
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Button } from "$lib/components/ui/button";
  import { goto } from "$app/navigation";
  import { Trash2, Eye, Share2, Pencil } from "@lucide/svelte";
  import MoreHorizontal from "@lucide/svelte/icons/more-horizontal";
  import ShareDialog from "$lib/components/share-dialog.svelte";
  import { chatStore } from "$lib/nova/chat";

  interface Props {
    chatId: string;
    chatTitle?: string;
    url: string;
    onRename?: () => void;
    onDelete?: (id: string) => any;
  }

  let { chatId, chatTitle = "Conversation", url, onRename, onDelete }: Props = $props();

  let shareOpen = $state(false);
  let deleteOpen = $state(false);
  let isDeleting = $state(false);
</script>

<ShareDialog open={shareOpen} {url} title={chatTitle} onOpenChange={(v) => (shareOpen = v)} />

<AlertDialog.Root open={deleteOpen} onOpenChange={(v) => (deleteOpen = v)}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Conversation?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone. This will permanently delete "{chatTitle}".
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={async () => {
          isDeleting = true;
          try {
            await chatStore.deleteChat(chatId);
            onDelete?.(chatId);
          } finally {
            isDeleting = false;
            deleteOpen = false;
          }
        }}
        disabled={isDeleting}
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    <Button variant="ghost" size="icon" class="h-8 w-8 shrink-0">
      <MoreHorizontal class="h-4 w-4" />
    </Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end" class="w-40">
    <DropdownMenu.Item onclick={() => goto(url)}>
      <Eye class="mr-2 h-4 w-4" />
      View
    </DropdownMenu.Item>
    <DropdownMenu.Item onclick={() => (shareOpen = true)}>
      <Share2 class="mr-2 h-4 w-4" />
      Share
    </DropdownMenu.Item>
    {#if onRename}
      <DropdownMenu.Item onclick={onRename}>
        <Pencil class="mr-2 h-4 w-4" />
        Rename
      </DropdownMenu.Item>
    {/if}
    <DropdownMenu.Item onclick={() => (deleteOpen = true)} class="text-destructive">
      <Trash2 class="mr-2 h-4 w-4" />
      Delete
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
