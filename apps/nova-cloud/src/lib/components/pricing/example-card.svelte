<script lang="ts">
  let {
    name,
    components,
    total,
    note,
  }: {
    name: string;
    components: string[];
    total: string;
    note: string;
  } = $props();
</script>

<article class="rounded-lg border border-border bg-background p-5">
  <div class="flex items-start justify-between gap-4">
    <h3 class="text-lg font-semibold">{name}</h3>
    <p class="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{total}</p>
  </div>
  <div class="mt-4 flex flex-wrap gap-2">
    {#each components as component}
      <span class="rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">{component}</span>
    {/each}
  </div>
  <p class="mt-4 text-sm leading-6 text-muted-foreground">{note}</p>
</article>
