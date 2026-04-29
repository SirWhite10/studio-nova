<script lang="ts">
  import PricingPageShell from "$lib/components/pricing/pricing-page-shell.svelte";
  import PricingCard from "$lib/components/pricing/pricing-card.svelte";
  import SectionHeading from "$lib/components/pricing/section-heading.svelte";
  import { addonPricing } from "$lib/pricing/catalog";

  const futureAddons = [
    "Forms",
    "Memberships",
    "Email and newsletter",
    "Analytics",
    "Booking and scheduling",
    "Creator video hub",
    "Inventory extensions",
    "Support knowledge base",
  ];

  const commerceFeatures = [
    "Product catalog",
    "Images and media",
    "Variants and options",
    "Inventory control",
    "Cart",
    "Checkout provider connection",
    "Orders",
    "Customer records",
    "Discounts and coupons",
    "Shipping and tax hooks",
    "Basic analytics",
    "Admin dashboard",
  ];
</script>

<svelte:head>
  <title>Add-on Pricing · Nova Cloud</title>
  <meta name="description" content="Nova Cloud add-on pricing for CMS, commerce, automation, and workspace capabilities." />
</svelte:head>

<PricingPageShell
  eyebrow="Add-on pricing"
  title="Flat-rate capabilities for the workspace you are building."
  description="Add-ons turn a workspace into a blog, store, portal, publication, automation hub, or business app without per-object database pricing."
>
  <section class="py-16 sm:py-20">
    <div class="mx-auto max-w-7xl px-6">
      <div class="grid gap-5 lg:grid-cols-3">
        {#each addonPricing as item}
          <PricingCard {item} cta="Back to overview" />
        {/each}
      </div>
    </div>
  </section>

  <section class="border-y border-border bg-muted/25 py-16 sm:py-20">
    <div class="mx-auto max-w-7xl px-6">
      <SectionHeading
        eyebrow="Commerce"
        title="A $25/mo store foundation."
        description="A Basic Workspace plus Commerce Add-on creates a clear entry commerce package without requiring a sandbox."
      />
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {#each commerceFeatures as feature}
          <div class="rounded-lg border border-border bg-background p-4 text-sm font-medium">{feature}</div>
        {/each}
      </div>
      <p class="mx-auto mt-8 max-w-3xl text-center text-sm leading-6 text-muted-foreground">
        The goal is to include the expected entry-store primitives without charging per product, order, object, read, or write. Exceptional usage can move to enterprise or custom credits later.
      </p>
    </div>
  </section>

  <section class="py-16 sm:py-20">
    <div class="mx-auto max-w-7xl px-6">
      <SectionHeading
        title="Future add-ons should stay modular."
        description="New capabilities can be attached to a workspace when the customer needs them, instead of forcing everyone into one large plan."
      />
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {#each futureAddons as addon}
          <div class="rounded-lg bg-muted p-4 text-sm font-medium">{addon}</div>
        {/each}
      </div>
    </div>
  </section>
</PricingPageShell>
