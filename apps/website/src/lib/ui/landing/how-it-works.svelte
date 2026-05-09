<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    description?: string;
    steps: { n: string; title: string; body: string }[];
    children?: Snippet;
  }

  let { title, description, steps, children }: Props = $props();
</script>

<section class="py-32 px-section-padding w-full max-w-container-max mx-auto">
  <div class="flex flex-col items-center text-center mb-24">
    <span
      class="font-label-caps text-label-caps text-primary uppercase tracking-[0.3em] mb-6"
    >
      How it works
    </span>
    <h2
      class="font-headline-xl text-[48px] leading-tight font-bold text-on-surface"
    >
      {title}
    </h2>
    {#if description}
      <p class="mt-4 font-body-lg text-body-lg text-on-surface-variant max-w-3xl">
        {description}
      </p>
    {/if}
  </div>

  <div class="grid gap-10 md:grid-cols-3 max-w-4xl mx-auto">
    {#each steps as step}
      <div class="flex flex-col items-center text-center">
        <div
          class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary font-bold text-lg"
        >
          {step.n}
        </div>
        <h3 class="mb-2 font-headline-lg text-lg font-bold text-on-surface">
          {step.title}
        </h3>
        <p class="text-sm leading-relaxed text-on-surface-variant">
          {step.body}
        </p>
      </div>
    {/each}
  </div>

  {#if children}
    {@render children()}
  {/if}
</section>
