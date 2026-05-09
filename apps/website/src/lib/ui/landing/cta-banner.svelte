<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    description: string;
    children: Snippet;
  }

  let { title, description, children }: Props = $props();
</script>

<section class="relative bg-surface-container-lowest py-24 overflow-hidden">
  <div
    class="absolute inset-0 hero-glow pointer-events-none"
  ></div>
  <div class="relative mx-auto max-w-3xl px-section-padding text-center">
    <h2
      class="mb-4 font-headline-xl text-4xl font-extrabold tracking-tight text-on-surface"
    >
      {title}
    </h2>
    <p class="mb-10 font-body-lg text-body-lg text-on-surface-variant">
      {description}
    </p>
    <div
      class="flex flex-col items-center justify-center gap-4 sm:flex-row"
    >
      {@render children()}
    </div>
  </div>
</section>
