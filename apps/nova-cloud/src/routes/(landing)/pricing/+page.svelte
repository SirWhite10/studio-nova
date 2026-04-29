<script lang="ts">
  import PricingPageShell from "$lib/components/pricing/pricing-page-shell.svelte";
  import PricingCard from "$lib/components/pricing/pricing-card.svelte";
  import SectionHeading from "$lib/components/pricing/section-heading.svelte";
  import ExampleCard from "$lib/components/pricing/example-card.svelte";
  import { Button } from "$lib/components/ui/button";
  import {
    addonPricing,
    aiSubscriptionPricing,
    pricingExamples,
    workspacePricing,
  } from "$lib/pricing/catalog";
</script>

<svelte:head>
  <title>Pricing · Nova Cloud</title>
  <meta
    name="description"
    content="Nova Cloud pricing for workspaces, add-ons, optional sandbox runtime, and Nova AI credits."
  />
</svelte:head>

<PricingPageShell
  title="Modular pricing for websites, apps, stores, and AI-powered building."
  description="Start with a free Studio, add a hosted workspace when something goes live, then attach only the business capabilities and AI credits you actually need."
>
  <section class="py-16 sm:py-20">
    <div class="mx-auto max-w-7xl px-6">
      <SectionHeading
        eyebrow="Start here"
        title="Studios are free. Workspaces start at $5/mo."
        description="Nova pricing is built around live surfaces and optional capabilities, not rigid user seats or vague all-in-one plans."
      />
      <div class="grid gap-5 md:grid-cols-2">
        {#each workspacePricing as item}
          <PricingCard {item} />
        {/each}
      </div>
    </div>
  </section>

  <section class="border-y border-border bg-muted/25 py-16 sm:py-20">
    <div class="mx-auto max-w-7xl px-6">
      <SectionHeading
        eyebrow="Capabilities"
        title="Add the business layer your workspace needs."
        description="CMS, commerce, and automation are flat monthly add-ons with generous caps. Normal content and store operations are not metered per object, read, or write."
      />
      <div class="grid gap-5 lg:grid-cols-3">
        {#each addonPricing as item}
          <PricingCard {item} />
        {/each}
      </div>
    </div>
  </section>

  <section class="py-16 sm:py-20">
    <div class="mx-auto max-w-7xl px-6">
      <SectionHeading
        eyebrow="Nova AI"
        title="Use your own key, external coding tools, or Nova AI credits."
        description="Hosted Nova AI is optional. Bring your own model key or use coding harnesses without spending Nova AI credits."
      />
      <div class="grid gap-5 lg:grid-cols-3">
        {#each aiSubscriptionPricing as item}
          <PricingCard {item} />
        {/each}
      </div>
      <div class="mt-8 flex justify-center">
        <Button href="/pricing/ai-credits" variant="outline">Compare AI credit options</Button>
      </div>
    </div>
  </section>

  <section class="border-y border-border bg-muted/25 py-16 sm:py-20">
    <div class="mx-auto max-w-7xl px-6">
      <SectionHeading
        eyebrow="Examples"
        title="Clear package examples."
        description="These examples show how modular workspace pricing maps to real businesses and creator workflows."
      />
      <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {#each pricingExamples.slice(0, 6) as example}
          <ExampleCard {...example} />
        {/each}
      </div>
      <div class="mt-8 flex justify-center">
        <Button href="/pricing/examples">See more examples</Button>
      </div>
    </div>
  </section>
</PricingPageShell>
