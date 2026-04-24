<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import MessageSquareIcon from "@lucide/svelte/icons/message-square";
  import ChatActions from "./chat-actions.svelte";
  import ChatRename from "./chat-rename.svelte";
  import { useSidebar } from "$lib/components/ui/sidebar/index.js";
  import type { ChatItem } from "$lib/nova/chat/types";

  interface Props {
    chat: ChatItem;
  }

  let { chat }: Props = $props();

  let renameRef: ChatRename | null = null;
  const sidebar = useSidebar();

  function handleNavClick() {
    if (sidebar.isMobile) sidebar.setOpenMobile(false);
  }
</script>

<Sidebar.MenuItem>
  <Sidebar.MenuButton>
    {#snippet child({ props })}
      <a href={chat.url} onclick={handleNavClick} {...props}>
        <MessageSquareIcon />
        <ChatRename
          bind:this={renameRef}
          chatId={chat.id}
          showMenu={false}
          class="truncate flex-1 min-w-0"
        />
      </a>
    {/snippet}
  </Sidebar.MenuButton>
  <Sidebar.MenuAction>
    <ChatActions
      chatId={chat.id}
      chatTitle={chat.title}
      url={chat.url}
      onRename={() => renameRef?.beginEdit?.()}
    />
  </Sidebar.MenuAction>
</Sidebar.MenuItem>
