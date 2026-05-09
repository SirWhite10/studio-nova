<script lang="ts">
  import PricingPageShell from '$lib/ui/pricing/pricing-page-shell.svelte';
  import PricingCard from '$lib/ui/pricing/pricing-card.svelte';
  import SectionHeading from '$lib/ui/shared/section-heading.svelte';
  import { workspacePricing } from '$lib/data/catalog';

  const workspaceRules = [
    {
      title: 'A Workspace is the live product',
      body: 'A workspace is the public app, site, store, portal, API, dashboard, or product surface that users can visit.',
    },
    {
      title: 'A Studio is not a paid workspace',
      body: 'Studios organize memory, chats, integrations, and work. They stay free so users can plan freely.',
    },
    {
      title: 'A Sandbox is separate',
      body: 'A sandbox is the development runtime used to build or modify custom code. A workspace can exist without one.',
    },
  ];
</script>

<svelte:head>
  <title>Workspace Pricing · DLX Studios</title>
  <meta
    name="description"
    content="Workspace pricing for hosted DLX Studios apps, sites, stores, and product surfaces."
  />
</svelte:head>

<PricingPageShell
  eyebrow="Workspace pricing"
  title="Pay for the public surfaces you keep live."
  description="Workspaces are the deployable websites, apps, stores, portals, and product surfaces built or assembled in DLX Studios."
>
  <section class="py-16 sm:py-20">
    <div class="mx-auto max-w-container-max px-section-padding">
      <div class="grid gap-5 md:grid-cols-2">
        {#each workspacePricing as item}
          <PricingCard {item} cta="Back to overview" />
        {/each}
      </div>
    </div>
  </section>

  <section class="border-y border-outline/10 bg-surface-container-lowest/50 py-16 sm:py-20">
    <div class="mx-auto max-w-container-max px-section-padding">
      <SectionHeading
        title="What counts as a workspace?"
        description="The workspace is the thing the outside world sees or your team operates from."
      />
      <div class="grid gap-5 lg:grid-cols-3">
        {#each workspaceRules as rule}
          <article class="glass-panel rounded-2xl p-6">
            <h2 class="font-headline-lg text-lg font-bold text-on-surface">
              {rule.title}
            </h2>
            <p class="mt-3 text-sm leading-6 text-on-surface-variant">
              {rule.body}
            </p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="py-16 sm:py-20">
    <div
      class="mx-auto grid max-w-container-max gap-6 px-section-padding lg:grid-cols-[0.45fr_0.55fr] lg:items-start"
    >
      <div>
        <p
          class="font-label-caps text-label-caps text-primary uppercase tracking-[0.24em]"
        >
          Capacity model
        </p>
        <h2
          class="mt-3 font-headline-xl text-3xl font-bold tracking-tight text-on-surface"
        >
          High caps first, enterprise later.
        </h2>
        <p class="mt-4 font-body-md text-base leading-7 text-on-surface-variant">
          DLX Studios should avoid nickel-and-diming normal users for routine
          hosting activity. If a workspace grows into enterprise traffic,
          storage, or operational needs, it can move to custom pricing or extra
          credits.
        </p>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="glass-panel rounded-lg p-5">
          <p class="text-sm font-semibold text-on-surface">Generated domains</p>
          <p class="mt-2 text-sm text-on-surface-variant">
            Basic workspaces can launch on a DLX-hosted subdomain.
          </p>
        </div>
        <div class="glass-panel rounded-lg p-5">
          <p class="text-sm font-semibold text-on-surface">Custom domains</p>
          <p class="mt-2 text-sm text-on-surface-variant">
            Pro workspaces are the clean place to include custom domains.
          </p>
        </div>
        <div class="glass-panel rounded-lg p-5">
          <p class="text-sm font-semibold text-on-surface">
            Storage and bandwidth
          </p>
          <p class="mt-2 text-sm text-on-surface-variant">
            Use generous caps instead of per-GB anxiety for normal customers.
          </p>
        </div>
        <div class="glass-panel rounded-lg p-5">
          <p class="text-sm font-semibold text-on-surface">
            Drafts and planning
          </p>
          <p class="mt-2 text-sm text-on-surface-variant">
            Do not charge for organizing ideas inside free Studios.
          </p>
        </div>
      </div>
    </div>
    <div class="mx-auto mt-10 flex max-w-container-max px-section-padding">
      <a
        href="/pricing/add-ons"
        class="bg-gradient-to-r from-primary to-primary-container text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-full hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all duration-300"
      >
        Explore add-ons
      </a>
    </div>
  </section>
</PricingPageShell>
