<script lang="ts">
  import PricingPageShell from "$lib/components/pricing/pricing-page-shell.svelte";
  import PricingCard from "$lib/components/pricing/pricing-card.svelte";
  import SectionHeading from "$lib/components/pricing/section-heading.svelte";
  import * as Card from "$lib/components/ui/card";
  import { aiModelCreditCosts, aiSubscriptionPricing, creditPacks } from "$lib/pricing/catalog";

  const modes = [
    {
      name: "Bring your own key",
      price: "$0 AI markup",
      detail: "Use your own OpenRouter, OpenAI, Anthropic, xAI, or other supported provider key.",
    },
    {
      name: "External coding harness",
      price: "$0 Nova AI credits",
      detail: "Use tools like Codex, Cursor, Claude Code, or KiloCode through your own login where supported.",
    },
    {
      name: "Nova AI",
      price: "Credits",
      detail: "Use Nova-provided hosted models through Nova's OpenRouter-backed provider access.",
    },
  ];
</script>

<svelte:head>
  <title>AI Credits · Nova Cloud Pricing</title>
  <meta name="description" content="Nova AI credits, monthly AI subscriptions, one-time top-ups, BYOK, and external coding harness pricing." />
</svelte:head>

<PricingPageShell
  eyebrow="AI credits"
  title="Hosted Nova AI is optional and credit-based."
  description="Bring your own key or external coding tools when you want. Use Nova AI credits only when Nova provides the model access."
>
  <section class="py-16 sm:py-20">
    <div class="mx-auto max-w-7xl px-6">
      <SectionHeading title="Choose how AI is powered." />
      <div class="grid gap-5 lg:grid-cols-3">
        {#each modes as mode}
          <article class="rounded-lg border border-border bg-background p-6">
            <p class="text-sm font-semibold text-primary">{mode.price}</p>
            <h2 class="mt-3 text-xl font-semibold">{mode.name}</h2>
            <p class="mt-3 text-sm leading-6 text-muted-foreground">{mode.detail}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="border-y border-border bg-muted/25 py-16 sm:py-20">
    <div class="mx-auto max-w-7xl px-6">
      <SectionHeading
        eyebrow="Monthly credits"
        title="Subscribe for monthly Nova AI credits."
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
    <div class="mx-auto max-w-7xl px-6">
      <SectionHeading
        eyebrow="Top-ups"
        title="Buy extra credits when a month gets busier."
        description="Top-up credits roll over and are used after monthly credits run out. Larger packs include more bonus credits."
      />
      <div class="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {#each creditPacks as pack}
          <Card.Root>
            <Card.Header>
              <Card.Description>{pack.label}</Card.Description>
              <Card.Title class="text-3xl">{pack.price}</Card.Title>
            </Card.Header>
            <Card.Content>
              <p class="text-2xl font-bold">{pack.credits} credits</p>
              <p class="mt-2 text-sm text-muted-foreground">{pack.effective}</p>
            </Card.Content>
          </Card.Root>
        {/each}
      </div>
    </div>
  </section>

  <section class="border-t border-border bg-muted/25 py-16 sm:py-20">
    <div class="mx-auto max-w-7xl px-6">
      <SectionHeading
        title="Simple model classes."
        description="Users see credits. Nova still records provider, model, tokens, estimated provider cost, and charged credits internally."
      />
      <div class="grid gap-5 lg:grid-cols-3">
        {#each aiModelCreditCosts as model}
          <article class="rounded-lg border border-border bg-background p-6">
            <p class="text-3xl font-bold">{model.cost}</p>
            <h2 class="mt-4 text-lg font-semibold">{model.name}</h2>
            <p class="mt-3 text-sm leading-6 text-muted-foreground">{model.detail}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>
</PricingPageShell>
