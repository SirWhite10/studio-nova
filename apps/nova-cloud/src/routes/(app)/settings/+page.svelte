<script lang="ts">
	import { page } from '$app/stores';
	
	let model = $state($page.url.searchParams.get('model') || '');
</script>

<svelte:head>
	<title>Settings | Nova</title>
</svelte:head>

<div class="flex flex-col gap-6 p-6">
	<div>
		<h1 class="text-2xl font-bold">Settings</h1>
		<p class="text-muted-foreground">Configure your Nova experience</p>
	</div>
	
	<div class="rounded-lg border p-6">
		<h2 class="text-lg font-semibold mb-4">Model Configuration</h2>
		<p class="text-muted-foreground text-sm mb-4">
			Currently configured model: <code class="bg-muted px-2 py-1 rounded">x-ai/grok-4.1-fast</code>
		</p>
		<p class="text-muted-foreground text-sm">
			Model selection is configured in <code class="bg-muted px-2 py-1 rounded">src/lib/ai-config.ts</code>
		</p>
	</div>
	
	<div class="rounded-lg border p-6">
		<h2 class="text-lg font-semibold mb-4">About</h2>
		<p class="text-muted-foreground text-sm">
			Nova is an AI assistant powered by multiple frontier models including xAI Grok, OpenAI GPT, and Google Gemini.
		</p>
	</div>
</div>
