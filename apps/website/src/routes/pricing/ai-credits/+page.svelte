<script lang="ts">
  import PricingPageShell from '$lib/ui/pricing/pricing-page-shell.svelte';
  import PricingCard from '$lib/ui/pricing/pricing-card.svelte';
  import SectionHeading from '$lib/ui/shared/section-heading.svelte';
  import {
    aiModelCreditCosts,
    aiSubscriptionPricing,
    creditPacks,
  } from '$lib/data/catalog';

  const modes = [
    {
      name: 'Bring your own key',
      price: '$0 AI markup',
      detail: 'Use your own OpenRouter, OpenAI, Anthropic, xAI, or other supported provider key.',
    },
    {
      name: 'External coding harness',
      price: '$0 Nova AI credits',
      detail: 'Use tools like Codex, Cursor, Claude Code, or KiloCode through your own login where supported.',
    },
    {
      name: 'Studio Nova AI',
      price: 'Credits',
      detail: "Use Studio Nova's hosted models through OpenRouter-backed provider access.",
    },
  ];
</script>

<svelte:head>
  <title>AI Credits · DLX Studios Pricing</title>
  <meta
    name="description"
    content="Studio Nova AI credits, monthly AI subscriptions, one-time top-ups, BYOK, and external coding harness pricing."
  />
</svelte:head>

<PricingPageShell
  eyebrow="AI credits"
  title="Hosted Studio Nova AI is optional and credit-based."
  description="Bring your own key or external coding tools when you want. Use Studio Nova AI credits only when Nova provides the model access."
>
  <section class="py-16 sm:py-20">
    <div class="mx-auto max-w-container-max px-section-padding">
      <SectionHeading title="Choose how AI is powered." />
      <div class="grid gap-5 lg:grid-cols-3">
        {#each modes as mode}
          <article class="glass-panel rounded-2xl p-6">
            <p class="font-label-caps text-label-caps text-primary">
              {mode.price}
            </p>
            <h2
              class="mt-3 font-headline-lg text-xl font-bold text-on-surface"
            >
              {mode.name}
            </h2>
            <p class="mt-3 text-sm leading-6 text-on-surface-variant">
              {mode.detail}
            </p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="border-y border-outline/10 bg-surface-container-lowest/50 py-16 sm:py-20">
    <div class="mx-auto max-w-container-max px-section-padding">
      <SectionHeading
        eyebrow="Monthly credits"
        title="Subscribe for monthly Studio Nova AI credits."
        description="Monthly credits reset each billing cycle and are spent before purchased top-up credits."
      />
      <div class="grid gap-5 lg:grid-cols-3">
        {#each aiSubscriptionPricing as item}
          <PricingCard {item} cta="Back to overview" />
        {/each}
      </div>
    </div>
  </section>

  <section class="py-16 sm:py-20">
    <div class="mx-auto max-w-container-max px-section-padding">
      <SectionHeading
        eyebrow="Top-ups"
        title="Buy extra credits when a month gets busier."
        description="Top-up credits roll over and are used after monthly credits run out. Larger packs include more bonus credits."
      />
      <div class="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {#each creditPacks as pack}
          <article class="glass-panel rounded-2xl p-6">
            <p
              class="font-label-caps text-label-caps text-on-surface-variant"
            >
              {pack.label}
            </p>
            <p class="mt-2 font-headline-lg text-3xl font-bold text-gradient-gold">
              {pack.price}
            </p>
            <p class="mt-4 text-2xl font-bold text-on-surface">
              {pack.credits} credits
            </p>
            <p class="mt-2 text-sm text-on-surface-variant">
              {pack.effective}
            </p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="border-t border-outline/10 bg-surface-container-lowest/50 py-16 sm:py-20">
    <div class="mx-auto max-w-container-max px-section-padding">
      <SectionHeading
        title="Simple model classes."
        description="Users see credits. Studio Nova still records provider, model, tokens, estimated provider cost, and charged credits internally."
      />
      <div class="grid gap-5 lg:grid-cols-3">
        {#each aiModelCreditCosts as model}
          <article class="glass-panel rounded-2xl p-6">
            <p class="text-3xl font-bold text-gradient-gold">{model.cost}</p>
            <h2
              class="mt-4 font-headline-lg text-lg font-bold text-on-surface"
            >
              {model.name}
            </h2>
            <p class="mt-3 text-sm leading-6 text-on-surface-variant">
              {model.detail}
            </p>
          </article>
        {/each}
      </div>
    </div>
  </section>
</PricingPageShell>
