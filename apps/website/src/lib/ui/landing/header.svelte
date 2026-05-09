<script lang="ts">
  import Logo from './logo.svelte';
  import { Menu, X } from '@lucide/svelte';
  import MobileNav from './mobile-nav.svelte';

  let mobileOpen = $state(false);

  const navLinks = [
    { href: '/overview', label: 'Overview' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/docs', label: 'Docs' },
    { href: '/about', label: 'About' },
  ];
</script>

<nav
  class="bg-background/70 backdrop-blur-xl w-full sticky top-0 z-50 border-b border-outline/20"
>
  <div
    class="flex justify-between items-center w-full px-section-padding py-4 max-w-container-max mx-auto"
  >
    <Logo />

    <div class="hidden md:flex items-center gap-8">
      {#each navLinks as link}
        <a
          href={link.href}
          class="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors duration-300"
        >
          {link.label}
        </a>
      {/each}
    </div>

    <div class="flex items-center gap-6">
      <a
        href="/auth/sign-in"
        class="hidden md:inline-block font-label-caps text-label-caps text-on-surface hover:text-primary transition-colors"
      >
        Sign In
      </a>
      <a
        href="/auth/sign-up"
        class="hidden md:inline-block bg-gradient-to-r from-primary to-primary-container text-on-primary font-label-caps text-label-caps px-6 py-3 rounded-full hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all duration-300"
      >
        Get Started
      </a>

      <button
        class="md:hidden text-on-surface p-2"
        onclick={() => (mobileOpen = !mobileOpen)}
      >
        {#if mobileOpen}
          <X size={24} />
        {:else}
          <Menu size={24} />
        {/if}
      </button>
    </div>
  </div>

  {#if mobileOpen}
    <MobileNav links={navLinks} onclose={() => (mobileOpen = false)} />
  {/if}
</nav>
