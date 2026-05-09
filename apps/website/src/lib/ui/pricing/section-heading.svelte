<script lang="ts">
  let {
    eyebrow,
    title,
    description,
  }: {
    eyebrow?: string;
    title: string;
    description?: string;
  } = $props();
</script>

<div class="mx-auto mb-10 max-w-3xl text-center">
  {#if eyebrow}
    <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
  {/if}
  <h2 class="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
  {#if description}
    <p class="mt-4 text-base leading-7 text-muted-foreground">{description}</p>
  {/if}
</div>
