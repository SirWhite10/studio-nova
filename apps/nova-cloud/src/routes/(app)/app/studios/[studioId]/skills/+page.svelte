<script lang="ts">
	import StudioPageShell from '$lib/components/studios/studio-page-shell.svelte';
</script>

<StudioPageShell containerClass="max-w-4xl">
	<div class="rounded-[2rem] border border-border/70 bg-background/85 p-8 shadow-sm backdrop-blur">
		<p class="text-xs uppercase tracking-[0.22em] text-muted-foreground">Skills</p>
		<h1 class="mt-2 text-3xl font-semibold tracking-tight">Studio skills</h1>
		<p class="mt-4 text-sm leading-7 text-muted-foreground">
			Skills are now conceptually Studio-scoped in the shell. This page can become the dedicated view
			for enabled skills, suggested skills, and future per-Studio skill configuration.
		</p>
	</div>
</StudioPageShell>
