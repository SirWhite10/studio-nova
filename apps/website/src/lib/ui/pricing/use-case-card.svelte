<script lang="ts">
  import type { UseCase } from '$lib/data/use-cases';

  interface Props {
    useCase: UseCase;
  }

  let { useCase }: Props = $props();
</script>

<article
  class="flex h-full flex-col glass-panel rounded-2xl p-6"
>
  <p
    class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-[0.18em]"
  >
    {useCase.audience}
  </p>
  <h3 class="mt-3 font-headline-lg text-xl font-bold text-on-surface">
    {useCase.title}
  </h3>
  <p class="mt-3 flex-1 text-sm leading-6 text-on-surface-variant">
    {useCase.summary}
  </p>
  <div class="mt-5 flex flex-wrap gap-2">
    {#each useCase.recommended as item}
      <span
        class="rounded-full bg-surface-container px-3 py-1 font-label-caps text-label-caps text-on-surface-variant"
      >
        {item}
      </span>
    {/each}
  </div>
  <div class="mt-5 border-t border-outline/10 pt-4">
    <p class="text-sm font-semibold text-gradient-gold">{useCase.estimate}</p>
    <ul class="mt-3 space-y-1.5 text-sm text-on-surface-variant">
      {#each useCase.benefits as benefit}
        <li>{benefit}</li>
      {/each}
    </ul>
  </div>
</article>
