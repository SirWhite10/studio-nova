<script lang="ts">
  import type { PricingItem } from '$lib/data/catalog';

  interface Props {
    item: PricingItem;
    cta?: string;
  }

  let { item, cta = 'View details' }: Props = $props();
</script>

<article
  class="flex h-full flex-col glass-panel rounded-2xl p-8 hover:bg-surface-container/40 transition-colors duration-500"
>
  <div class="flex min-h-7 items-center justify-between gap-3 mb-4">
    <h3 class="font-headline-lg text-xl font-bold text-on-surface">
      {item.name}
    </h3>
    {#if item.badge}
      <span
        class="font-label-caps text-label-caps bg-primary/20 text-primary px-2.5 py-1 rounded-full"
      >
        {item.badge}
      </span>
    {/if}
  </div>
  <p class="text-on-surface-variant text-sm leading-relaxed mb-4">
    {item.summary}
  </p>
  <div class="pt-2 mb-6">
    <span class="text-4xl font-extrabold text-gradient-gold">{item.price}</span>
    <span class="text-sm text-on-surface-variant"> {item.cadence}</span>
  </div>
  <ul class="flex-1 space-y-2.5 text-sm text-on-surface-variant">
    {#each item.details as detail}
      <li class="flex gap-2">
        <span
          class="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
        ></span>
        <span>{detail}</span>
      </li>
    {/each}
  </ul>
  {#if item.href}
    <div class="mt-6">
      <a
        href={item.href}
        class="block w-full text-center border border-primary/50 text-primary font-label-caps text-label-caps px-6 py-3 rounded-full hover:bg-primary/10 transition-all duration-300"
      >
        {cta}
      </a>
    </div>
  {/if}
</article>
