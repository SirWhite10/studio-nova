<script lang="ts">
  import PricingPageShell from "$lib/components/pricing/pricing-page-shell.svelte";
  import PricingCard from "$lib/components/pricing/pricing-card.svelte";
  import SectionHeading from "$lib/components/pricing/section-heading.svelte";
  import { Button } from "$lib/components/ui/button";
  import { workspacePricing } from "$lib/pricing/catalog";

  const workspaceRules = [
    {
      title: "A Workspace is the live product",
      body: "A workspace is the public app, site, store, portal, API, dashboard, or product surface that users can visit.",
    },
    {
      title: "A Studio is not a paid workspace",
      body: "Studios organize memory, chats, integrations, and work. They stay free so users can plan freely.",
    },
    {
      title: "A Sandbox is separate",
      body: "A sandbox is the development runtime used to build or modify custom code. A workspace can exist without one.",
    },
  ];
</script>

<svelte:head>
  <title>Workspace Pricing · Nova Cloud</title>
  <meta name="description" content="Workspace pricing for hosted Nova Cloud apps, sites, stores, and product surfaces." />
</svelte:head>

<PricingPageShell
  eyebrow="Workspace pricing"
  title="Pay for the public surfaces you keep live."
  description="Workspaces are the deployable websites, apps, stores, portals, and product surfaces built or assembled in Nova."
>
  <section class="py-16 sm:py-20">
    <div class="mx-auto max-w-7xl px-6">
      <div class="grid gap-5 md:grid-cols-2">
        {#each workspacePricing as item}
          <PricingCard {item} cta="Back to overview" />
        {/each}
      </div>
    </div>
  </section>

  <section class="border-y border-border bg-muted/25 py-16 sm:py-20">
    <div class="mx-auto max-w-7xl px-6">
      <SectionHeading
        title="What counts as a workspace?"
        description="The workspace is the thing the outside world sees or your team operates from."
      />
      <div class="grid gap-5 lg:grid-cols-3">
        {#each workspaceRules as rule}
          <article class="rounded-lg border border-border bg-background p-6">
            <h2 class="text-lg font-semibold">{rule.title}</h2>
            <p class="mt-3 text-sm leading-6 text-muted-foreground">{rule.body}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="py-16 sm:py-20">
    <div class="mx-auto grid max-w-7xl gap-6 px-6 lg:grid-cols-[0.45fr_0.55fr] lg:items-start">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Capacity model</p>
        <h2 class="mt-3 text-3xl font-bold tracking-tight">High caps first, enterprise later.</h2>
        <p class="mt-4 text-base leading-7 text-muted-foreground">
          Nova should avoid nickel-and-diming normal users for routine hosting activity. If a workspace grows into enterprise traffic, storage, or operational needs, it can move to custom pricing or extra credits.
        </p>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-lg border border-border p-5">
          <p class="text-sm font-semibold">Generated domains</p>
          <p class="mt-2 text-sm text-muted-foreground">Basic workspaces can launch on a Nova-hosted subdomain.</p>
        </div>
        <div class="rounded-lg border border-border p-5">
          <p class="text-sm font-semibold">Custom domains</p>
          <p class="mt-2 text-sm text-muted-foreground">Pro workspaces are the clean place to include custom domains.</p>
        </div>
        <div class="rounded-lg border border-border p-5">
          <p class="text-sm font-semibold">Storage and bandwidth</p>
          <p class="mt-2 text-sm text-muted-foreground">Use generous caps instead of per-GB anxiety for normal customers.</p>
        </div>
        <div class="rounded-lg border border-border p-5">
          <p class="text-sm font-semibold">Drafts and planning</p>
          <p class="mt-2 text-sm text-muted-foreground">Do not charge for organizing ideas inside free Studios.</p>
        </div>
      </div>
    </div>
    <div class="mx-auto mt-10 flex max-w-7xl px-6">
      <Button href="/pricing/add-ons">Explore add-ons</Button>
    </div>
  </section>
</PricingPageShell>
