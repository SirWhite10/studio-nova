<script lang="ts">
  import Logo from './logo.svelte';

  const productLinks = [
    { href: '/overview', label: 'Overview' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/docs', label: 'Docs' },
  ];

  const developerLinks = [
    { href: '/docs', label: 'Documentation' },
    { href: '/docs#api', label: 'API Reference' },
  ];

  const companyLinks = [
    { href: '/about', label: 'About' },
    { href: '/about#careers', label: 'Careers' },
  ];

  const connectLinks = [
    { href: 'https://github.com/dlxstudios', label: 'GitHub' },
    { href: '/about#contact', label: 'Contact' },
  ];
</script>

<footer class="bg-surface-container-lowest w-full border-t border-outline/10 mt-24">
  <div
    class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-gutter px-section-padding py-stack-lg max-w-container-max mx-auto"
  >
    <div class="col-span-2 flex flex-col gap-6">
      <Logo size="lg" href={null} />
      <p class="text-on-surface-variant text-sm max-w-xs leading-relaxed">
        All-in-one AI-powered workspace management. Studio Nova brings your
        ideas to life with persistent workspaces and intelligent agents.
      </p>
    </div>

    <div class="flex flex-col gap-4">
      <h4
        class="font-label-caps text-label-caps text-on-surface tracking-widest uppercase mb-2"
      >
        Product
      </h4>
      {#each productLinks as link}
        <a
          href={link.href}
          class="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors underline-offset-4 hover:underline"
        >
          {link.label}
        </a>
      {/each}
    </div>

    <div class="flex flex-col gap-4">
      <h4
        class="font-label-caps text-label-caps text-on-surface tracking-widest uppercase mb-2"
      >
        Developers
      </h4>
      {#each developerLinks as link}
        <a
          href={link.href}
          class="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors underline-offset-4 hover:underline"
        >
          {link.label}
        </a>
      {/each}
    </div>

    <div class="flex flex-col gap-4">
      <h4
        class="font-label-caps text-label-caps text-on-surface tracking-widest uppercase mb-2"
      >
        Company
      </h4>
      {#each companyLinks as link}
        <a
          href={link.href}
          class="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors underline-offset-4 hover:underline"
        >
          {link.label}
        </a>
      {/each}
    </div>

    <div class="flex flex-col gap-4">
      <h4
        class="font-label-caps text-label-caps text-on-surface tracking-widest uppercase mb-2"
      >
        Connect
      </h4>
      {#each connectLinks as link}
        <a
          href={link.href}
          class="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors underline-offset-4 hover:underline"
        >
          {link.label}
        </a>
      {/each}
    </div>
  </div>

  <div class="w-full border-t border-outline/10 py-6 text-center">
    <p class="font-body-md text-sm text-on-surface-variant">
      &copy; {new Date().getFullYear()} DLX Studios. All rights reserved.
    </p>
  </div>
</footer>
