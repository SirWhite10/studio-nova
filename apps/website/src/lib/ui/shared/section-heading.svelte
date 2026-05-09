<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    eyebrow?: string;
    title: string;
    description?: string;
    children?: Snippet;
  }

  let { eyebrow, title, description, children }: Props = $props();
</script>

<div class="mx-auto mb-10 max-w-3xl text-center">
  {#if eyebrow}
    <p
      class="font-label-caps text-label-caps text-primary uppercase tracking-[0.3em] mb-6"
    >
      {eyebrow}
    </p>
  {/if}
  <h2
    class="font-headline-xl text-[48px] leading-tight font-bold text-on-surface mb-4"
  >
    {title}
  </h2>
  {#if description}
    <p class="font-body-lg text-body-lg text-on-surface-variant max-w-3xl mx-auto">
      {description}
    </p>
  {/if}
</div>
