<script lang="ts">
  import BugIcon from '@lucide/svelte/icons/bug';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';
  import ChatRename from './chat-rename.svelte';

  interface Props {
    chatId: string;
    canInspectAgentContext?: boolean;
    oninspectcontext?: () => void;
  }

  let { chatId, canInspectAgentContext = false, oninspectcontext }: Props = $props();
</script>

<header class="grid h-14 grid-cols-[auto_1fr_auto] items-center gap-3 border-b px-4">
  <div class="flex items-center gap-2">
    <Sidebar.Trigger class="-ms-1" />
    <Separator orientation="vertical" class="me-2 h-4" />
  </div>
  <div class="flex-1 text-center">
    <ChatRename {chatId} class="mx-auto justify-center" />
  </div>
  <div class="flex justify-end">
    {#if canInspectAgentContext}
      <Button variant="outline" size="sm" class="gap-2 rounded-full" onclick={() => oninspectcontext?.()}>
        <BugIcon class="size-4" />
        Inspect context
      </Button>
    {/if}
  </div>
</header>
