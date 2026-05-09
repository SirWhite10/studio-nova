<script lang="ts">
  import PricingPageShell from '$lib/ui/pricing/pricing-page-shell.svelte';
  import PricingCard from '$lib/ui/pricing/pricing-card.svelte';
  import SectionHeading from '$lib/ui/shared/section-heading.svelte';
  import ExampleCard from '$lib/ui/pricing/example-card.svelte';
  import {
    addonPricing,
    aiSubscriptionPricing,
    pricingExamples,
    workspacePricing,
  } from '$lib/data/catalog';
</script>

<svelte:head>
  <title>Pricing · DLX Studios</title>
  <meta
    name="description"
    content="DLX Studios pricing for workspaces, add-ons, optional sandbox runtime, and Studio Nova AI credits."
  />
</svelte:head>

<PricingPageShell
  title="Modular pricing for websites, apps, stores, and AI-powered building."
  description="Start with a free Studio, add a hosted workspace when something goes live, then attach only the business capabilities and AI credits you actually need."
>
  <section class="py-16 sm:py-20">
    <div class="mx-auto max-w-container-max px-section-padding">
      <SectionHeading
        eyebrow="Start here"
        title="Studios are free. Workspaces start at $5/mo."
        description="DLX Studios pricing is built around live surfaces and optional capabilities, not rigid user seats or vague all-in-one plans."
      />
      <div class="grid gap-5 md:grid-cols-2">
        {#each workspacePricing as item}
          <PricingCard {item} />
        {/each}
      </div>
    </div>
  </section>

  <section class="border-y border-outline/10 bg-surface-container-lowest/50 py-16 sm:py-20">
    <div class="mx-auto max-w-container-max px-section-padding">
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
    <div class="mx-auto max-w-container-max px-section-padding">
      <SectionHeading
        eyebrow="Studio Nova AI"
        title="Use your own key, external coding tools, or Studio Nova AI credits."
        description="Hosted Studio Nova AI is optional. Bring your own model key or use coding harnesses without spending AI credits."
      />
      <div class="grid gap-5 lg:grid-cols-3">
        {#each aiSubscriptionPricing as item}
          <PricingCard {item} />
        {/each}
      </div>
      <div class="mt-8 flex justify-center">
        <a
          href="/pricing/ai-credits"
          class="border border-primary/50 text-primary font-label-caps text-label-caps px-6 py-3 rounded-full hover:bg-primary/10 transition-all duration-300"
        >
          Compare AI credit options
        </a>
      </div>
    </div>
  </section>

  <section class="border-y border-outline/10 bg-surface-container-lowest/50 py-16 sm:py-20">
    <div class="mx-auto max-w-container-max px-section-padding">
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
        <a
          href="/pricing/examples"
          class="bg-gradient-to-r from-primary to-primary-container text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-full hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all duration-300"
        >
          See more examples
        </a>
      </div>
    </div>
  </section>
</PricingPageShell>
