<script lang="ts">
  import type { UseCase } from "$lib/pricing/use-cases";

  let { useCase }: { useCase: UseCase } = $props();
</script>

<article class="flex h-full flex-col rounded-lg border border-border bg-background p-5">
  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{useCase.audience}</p>
  <h3 class="mt-3 text-xl font-semibold">{useCase.title}</h3>
  <p class="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{useCase.summary}</p>
  <div class="mt-5 flex flex-wrap gap-2">
    {#each useCase.recommended as item}
      <span class="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{item}</span>
    {/each}
  </div>
  <div class="mt-5 border-t border-border pt-4">
    <p class="text-sm font-semibold">{useCase.estimate}</p>
    <ul class="mt-3 space-y-1.5 text-sm text-muted-foreground">
      {#each useCase.benefits as benefit}
        <li>{benefit}</li>
      {/each}
    </ul>
  </div>
</article>
