<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import MessageSquareIcon from "@lucide/svelte/icons/message-square";
  import NavNovaChatItem from "./nav-nova-chat-item.svelte";
  import { useSidebar } from "$lib/components/ui/sidebar/index.js";
  import { chatStore } from "$lib/nova/chat";
  import type { ChatItem } from "$lib/nova/chat/types";

  interface Props {
    primaryCount?: number;
  }

  let { primaryCount = 5 }: Props = $props();

  const primaryItems = $derived(chatStore.chats.slice(0, primaryCount));

	const sidebar = useSidebar();
	const currentStudioId = $derived(chatStore.chats[0]?.studioId ?? null);

  async function createNewChat() {
    if (sidebar.isMobile) sidebar.setOpenMobile(false);
    await chatStore.createChat();
  }
</script>

<Sidebar.Group>
  <Sidebar.GroupLabel>Chats</Sidebar.GroupLabel>
  <Sidebar.Menu>
    <Sidebar.MenuItem>
      <Sidebar.MenuButton onclick={createNewChat}>
        {#snippet child({ props })}
          <button {...props} type="button">
            <PlusIcon />
            <span>New Chat</span>
          </button>
        {/snippet}
      </Sidebar.MenuButton>
    </Sidebar.MenuItem>

    {#each primaryItems as chat (chat.id)}
      <NavNovaChatItem {chat} />
    {/each}

		<Sidebar.MenuItem>
			<Sidebar.MenuButton>
				{#snippet child({ props })}
					<a href={currentStudioId ? `/app/chats?studio=${currentStudioId}` : '/app/chats'} onclick={() => sidebar.isMobile && sidebar.setOpenMobile(false)} {...props}>
						<MessageSquareIcon />
						<span>All Chats ({chatStore.chats.length})</span>
					</a>
				{/snippet}
      </Sidebar.MenuButton>
    </Sidebar.MenuItem>
  </Sidebar.Menu>
</Sidebar.Group>
