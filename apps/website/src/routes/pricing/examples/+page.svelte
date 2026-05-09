<script lang="ts">
  import ExampleCard from '$lib/ui/pricing/example-card.svelte';
  import PricingPageShell from '$lib/ui/pricing/pricing-page-shell.svelte';
  import SectionHeading from '$lib/ui/shared/section-heading.svelte';
  import UseCaseCard from '$lib/ui/pricing/use-case-card.svelte';
  import { pricingExamples } from '$lib/data/catalog';
  import { useCases } from '$lib/data/use-cases';
</script>

<svelte:head>
  <title>Pricing Examples · DLX Studios</title>
  <meta
    name="description"
    content="DLX Studios pricing examples for creators, streamers, ecommerce, blogs, news, service businesses, and custom apps."
  />
</svelte:head>

<PricingPageShell
  eyebrow="Pricing examples"
  title="See how modular pricing maps to real use cases."
  description="These examples show how workspaces, add-ons, optional sandbox runtime, and optional Studio Nova AI credits combine for different businesses and creators."
>
  <section class="py-16 sm:py-20">
    <div class="mx-auto max-w-container-max px-section-padding">
      <SectionHeading title="Package examples" />
      <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {#each pricingExamples as example}
          <ExampleCard {...example} />
        {/each}
      </div>
    </div>
  </section>

  <section class="border-t border-outline/10 bg-surface-container-lowest/50 py-16 sm:py-20">
    <div class="mx-auto max-w-container-max px-section-padding">
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
