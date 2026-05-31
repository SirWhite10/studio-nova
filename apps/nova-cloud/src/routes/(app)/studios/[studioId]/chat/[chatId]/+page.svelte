<script lang="ts">
	import ChatView from '$lib/components/nova/chat/chat-view.svelte';
	import type { ChatViewData } from '$lib/components/nova/chat/chat-view.svelte';
	let { data }: { data: ChatViewData } = $props();
</script>

<ChatView {data} />
