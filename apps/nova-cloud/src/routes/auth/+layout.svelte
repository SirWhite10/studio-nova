<script lang="ts">
  import NovaLogo from '$lib/components/nova-logo.svelte';
  let { children } = $props();
</script>

<div class="min-h-screen bg-background">
  <header class="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div class="flex h-12 items-center px-4 md:px-6 lg:px-8">
      <NovaLogo size="sm" />
    </div>
  </header>
  <main class="bg-muted flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center p-6 md:p-10">
    {@render children()}
  </main>
</div>