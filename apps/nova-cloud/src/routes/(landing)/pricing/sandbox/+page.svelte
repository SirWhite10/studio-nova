<script lang="ts">
  import PricingPageShell from "$lib/components/pricing/pricing-page-shell.svelte";
  import SectionHeading from "$lib/components/pricing/section-heading.svelte";
  import { Button } from "$lib/components/ui/button";

  const principles = [
    {
      title: "Optional by design",
      body: "A workspace can be hosted and powered by integrations without paying for development runtime.",
    },
    {
      title: "For building, testing, and coding",
      body: "The sandbox is where agents or coding harnesses run commands, build apps, clone repos, and start dev servers.",
    },
    {
      title: "Separate from workspace hosting",
      body: "Keeping an app live and running a build environment are different costs, so Nova should bill them separately.",
    },
    {
      title: "Self-hosted runtime direction",
      body: "New pricing should treat sandbox as Nova-controlled Docker runtime infrastructure, not an E2B-specific product.",
    },
  ];
</script>

<svelte:head>
  <title>Sandbox Pricing · Nova Cloud</title>
  <meta name="description" content="Nova Cloud sandbox runtime pricing principles for optional development and build environments." />
</svelte:head>

<PricingPageShell
  eyebrow="Sandbox pricing"
  title="Sandbox runtime is for building, not merely existing."
  description="Some users will never need a sandbox. Others will use one when Nova or an external coding harness needs a development environment."
>
  <section class="py-16 sm:py-20">
    <div class="mx-auto max-w-7xl px-6">
      <SectionHeading
        title="Do not force sandbox cost into every workspace."
        description="A commerce site assembled from Nova integrations can run as a workspace without a development sandbox. A custom app under active development can add runtime only when it needs build infrastructure."
      />
      <div class="grid gap-5 md:grid-cols-2">
        {#each principles as principle}
          <article class="rounded-lg border border-border bg-background p-6">
            <h2 class="text-xl font-semibold">{principle.title}</h2>
            <p class="mt-3 text-sm leading-6 text-muted-foreground">{principle.body}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="border-y border-border bg-muted/25 py-16 sm:py-20">
    <div class="mx-auto grid max-w-7xl gap-6 px-6 lg:grid-cols-3">
      <div class="rounded-lg border border-border bg-background p-6">
        <p class="text-sm font-semibold text-primary">No sandbox</p>
        <h2 class="mt-3 text-xl font-semibold">Integration-built workspace</h2>
        <p class="mt-3 text-sm leading-6 text-muted-foreground">
          Example: a $5 workspace plus $20 commerce add-on for a $25/mo store.
        </p>
      </div>
      <div class="rounded-lg border border-border bg-background p-6">
        <p class="text-sm font-semibold text-primary">Temporary sandbox</p>
        <h2 class="mt-3 text-xl font-semibold">Build or modify code</h2>
        <p class="mt-3 text-sm leading-6 text-muted-foreground">
          Example: use runtime only while Nova builds a custom feature or runs tests.
        </p>
      </div>
      <div class="rounded-lg border border-border bg-background p-6">
        <p class="text-sm font-semibold text-primary">Dedicated sandbox</p>
        <h2 class="mt-3 text-xl font-semibold">Ongoing custom development</h2>
        <p class="mt-3 text-sm leading-6 text-muted-foreground">
          Example: a Studio with separate sandboxes for separate custom workstreams.
        </p>
      </div>
    </div>
  </section>

  <section class="py-16 sm:py-20">
    <div class="mx-auto max-w-4xl px-6 text-center">
      <h2 class="text-3xl font-bold tracking-tight">Sandbox pricing remains an open implementation decision.</h2>
      <p class="mt-4 text-base leading-7 text-muted-foreground">
        The pricing plan intentionally defers the exact runtime unit until the self-hosted Docker runtime cost profile is known. The user-facing model should stay simple and separate from workspace hosting.
      </p>
      <div class="mt-8">
        <Button href="/pricing/examples">See examples</Button>
      </div>
    </div>
  </section>
</PricingPageShell>
