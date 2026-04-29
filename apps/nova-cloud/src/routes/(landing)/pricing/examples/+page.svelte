<script lang="ts">
  import ExampleCard from "$lib/components/pricing/example-card.svelte";
  import PricingPageShell from "$lib/components/pricing/pricing-page-shell.svelte";
  import SectionHeading from "$lib/components/pricing/section-heading.svelte";
  import UseCaseCard from "$lib/components/pricing/use-case-card.svelte";
  import { pricingExamples } from "$lib/pricing/catalog";
  import { useCases } from "$lib/pricing/use-cases";
</script>

<svelte:head>
  <title>Pricing Examples · Nova Cloud</title>
  <meta name="description" content="Nova Cloud pricing examples for creators, streamers, ecommerce, blogs, news, service businesses, and custom apps." />
</svelte:head>

<PricingPageShell
  eyebrow="Pricing examples"
  title="See how modular pricing maps to real use cases."
  description="These examples show how workspaces, add-ons, optional sandbox runtime, and optional Nova AI credits combine for different businesses and creators."
>
  <section class="py-16 sm:py-20">
    <div class="mx-auto max-w-7xl px-6">
      <SectionHeading title="Package examples" />
      <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {#each pricingExamples as example}
          <ExampleCard {...example} />
        {/each}
      </div>
    </div>
  </section>

  <section class="border-t border-border bg-muted/25 py-16 sm:py-20">
    <div class="mx-auto max-w-7xl px-6">
      <SectionHeading
        eyebrow="Use cases"
        title="A foundation for future Use Cases pages."
        description="These can later become dedicated landing pages in a top navigation menu for creators, businesses, publications, stores, and custom apps."
      />
      <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {#each useCases as useCase}
          <UseCaseCard {useCase} />
        {/each}
      </div>
    </div>
  </section>
</PricingPageShell>
