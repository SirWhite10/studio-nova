<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button";
  import { Copy, Check } from "@lucide/svelte";
  import { toast } from "svelte-sonner";

  interface Props {
    open: boolean;
    url: string;
    title?: string;
    onOpenChange: (open: boolean) => void;
  }

  let { open, url, title = "Conversation", onOpenChange }: Props = $props();

  let copied = $state(false);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
      toast.success("URL copied to clipboard!");
      setTimeout(() => (copied = false), 2000);
    } catch (err) {
      toast.error("Failed to copy URL");
    }
  }
</script>

<Dialog.Root {open} onOpenChange={onOpenChange}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Share Conversation</Dialog.Title>
      <Dialog.Description>
        Share "{title}" via URL or QR code
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      <!-- URL Copy -->
      <div class="flex items-center gap-2">
        <input
          type="text"
          value={url}
          readonly
          class="flex-1 rounded-md border bg-muted px-3 py-2 text-sm"
        />
        <Button size="icon" variant="outline" onclick={copyUrl}>
          {#if copied}
            <Check class="h-4 w-4 text-green-600" />
          {:else}
            <Copy class="h-4 w-4" />
          {/if}
        </Button>
      </div>

      <!-- QR Code -->
      <div class="flex flex-col items-center gap-2">
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`}
          alt="QR Code"
          class="h-48 w-48 rounded-md border"
        />
        <span class="text-xs text-muted-foreground">Scan to open</span>
      </div>
    </div>

    <Dialog.Footer>
      <Button onclick={() => onOpenChange(false)}>Close</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
