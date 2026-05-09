<script lang="ts">
  import PricingPageShell from '$lib/ui/pricing/pricing-page-shell.svelte';
  import SectionHeading from '$lib/ui/shared/section-heading.svelte';

  const principles = [
    {
      title: 'Optional by design',
      body: 'A workspace can be hosted and powered by integrations without paying for development runtime.',
    },
    {
      title: 'For building, testing, and coding',
      body: 'The sandbox is where agents or coding harnesses run commands, build apps, clone repos, and start dev servers.',
    },
    {
      title: 'Separate from workspace hosting',
      body: 'Keeping an app live and running a build environment are different costs, so DLX Studios should bill them separately.',
    },
    {
      title: 'Self-hosted runtime direction',
      body: 'New pricing should treat sandbox as Docker runtime infrastructure, not a third-party-specific product.',
    },
  ];
</script>

<svelte:head>
  <title>Sandbox Pricing · DLX Studios</title>
  <meta
    name="description"
    content="DLX Studios sandbox runtime pricing principles for optional development and build environments."
  />
</svelte:head>

<PricingPageShell
  eyebrow="Sandbox pricing"
  title="Sandbox runtime is for building, not merely existing."
  description="Some users will never need a sandbox. Others will use one when Studio Nova or an external coding harness needs a development environment."
>
  <section class="py-16 sm:py-20">
    <div class="mx-auto max-w-container-max px-section-padding">
      <SectionHeading
        title="Do not force sandbox cost into every workspace."
        description="A commerce site assembled from integrations can run as a workspace without a development sandbox. A custom app under active development can add runtime only when it needs build infrastructure."
      />
      <div class="grid gap-5 md:grid-cols-2">
        {#each principles as principle}
          <article class="glass-panel rounded-2xl p-6">
            <h2
              class="font-headline-lg text-xl font-bold text-on-surface"
            >
              {principle.title}
            </h2>
            <p class="mt-3 text-sm leading-6 text-on-surface-variant">
              {principle.body}
            </p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <section class="border-y border-outline/10 bg-surface-container-lowest/50 py-16 sm:py-20">
    <div
      class="mx-auto grid max-w-container-max gap-6 px-section-padding lg:grid-cols-3"
    >
      <div class="glass-panel rounded-2xl p-6">
        <p
          class="font-label-caps text-label-caps text-primary"
        >
          No sandbox
        </p>
        <h2
          class="mt-3 font-headline-lg text-xl font-bold text-on-surface"
        >
          Integration-built workspace
        </h2>
        <p class="mt-3 text-sm leading-6 text-on-surface-variant">
          Example: a $5 workspace plus $20 commerce add-on for a $25/mo store.
        </p>
      </div>
      <div class="glass-panel rounded-2xl p-6">
        <p
          class="font-label-caps text-label-caps text-primary"
        >
          Temporary sandbox
        </p>
        <h2
          class="mt-3 font-headline-lg text-xl font-bold text-on-surface"
        >
          Build or modify code
        </h2>
        <p class="mt-3 text-sm leading-6 text-on-surface-variant">
          Example: use runtime only while Studio Nova builds a custom feature or
          runs tests.
        </p>
      </div>
      <div class="glass-panel rounded-2xl p-6">
        <p
          class="font-label-caps text-label-caps text-primary"
        >
          Dedicated sandbox
        </p>
        <h2
          class="mt-3 font-headline-lg text-xl font-bold text-on-surface"
        >
          Ongoing custom development
        </h2>
        <p class="mt-3 text-sm leading-6 text-on-surface-variant">
          Example: a Studio with separate sandboxes for separate custom
          workstreams.
        </p>
      </div>
    </div>
  </section>

  <section class="py-16 sm:py-20">
    <div class="mx-auto max-w-4xl px-section-padding text-center">
      <h2
        class="font-headline-xl text-3xl font-bold tracking-tight text-on-surface"
      >
        Sandbox pricing remains an open implementation decision.
      </h2>
      <p class="mt-4 font-body-lg text-base leading-7 text-on-surface-variant">
        The pricing plan intentionally defers the exact runtime unit until the
        self-hosted Docker runtime cost profile is known. The user-facing model
        should stay simple and separate from workspace hosting.
      </p>
      <div class="mt-8">
        <a
          href="/pricing/examples"
          class="bg-gradient-to-r from-primary to-primary-container text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-full hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all duration-300"
        >
          See examples
        </a>
      </div>
    </div>
  </section>
</PricingPageShell>
