<script lang="ts">
  import * as Item from '$lib/components/ui/item';
  import ChatActions from '$lib/components/nova/chat/chat-actions.svelte';

  interface Props {
    title: string;
    description: string;
    imageUrl: string;
    url: string;
    id: string;
    onDelete?: (id: string) => Promise<void>;
  }

  let { title, description, imageUrl, url, id, onDelete }: Props = $props();
</script>

<Item.Root variant="outline" size="sm" class="flex flex-col sm:flex-row items-start sm:items-center">
  <!-- Image -->
  <Item.Media class="shrink-0">
    <a href={url}>
      <img
        src={imageUrl}
        alt={title}
        class="w-full sm:w-32 h-32 sm:h-24 object-cover rounded-lg"
      />
    </a>
  </Item.Media>

  <!-- Content -->
  <Item.Content class="flex-1 min-w-0">
    <Item.Title class="truncate mb-1">
      <a href={url} class="hover:underline">{title}</a>
    </Item.Title>
    <Item.Description class="line-clamp-2 text-sm">{description}</Item.Description>
  </Item.Content>

  <!-- Actions -->
  <Item.Actions class="flex items-center sm:self-start p-1">
    {#if onDelete}
      <ChatActions chatId={id} chatTitle={title} {url} {onDelete} />
    {/if}
  </Item.Actions>
</Item.Root>
