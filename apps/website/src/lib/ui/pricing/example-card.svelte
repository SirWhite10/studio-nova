<script lang="ts">
  interface Props {
    name: string;
    components: string[];
    total: string;
    note: string;
  }

  let { name, components, total, note }: Props = $props();
</script>

<article class="glass-panel rounded-2xl p-6">
  <div class="flex items-start justify-between gap-4">
    <h3 class="font-headline-lg text-lg font-bold text-on-surface">{name}</h3>
    <p
      class="shrink-0 rounded-full bg-primary/15 px-3 py-1 font-label-caps text-label-caps text-primary"
    >
      {total}
    </p>
  </div>
  <div class="mt-4 flex flex-wrap gap-2">
    {#each components as component}
      <span
        class="rounded-full border border-outline/20 bg-surface-container px-3 py-1 font-label-caps text-label-caps text-on-surface-variant"
      >
        {component}
      </span>
    {/each}
  </div>
  <p class="mt-4 text-sm leading-6 text-on-surface-variant">{note}</p>
</article>
