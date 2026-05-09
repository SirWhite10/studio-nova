<script lang="ts">
  import { X } from '@lucide/svelte';

  let visible = $state(true);
</script>

{#if visible}
  <div
    class="w-full border-b border-outline/10 bg-surface-container-highest/30 text-center py-2 px-4 flex justify-center items-center gap-4 text-sm font-label-caps tracking-widest text-on-surface-variant"
  >
    <span
      class="bg-primary/20 text-primary px-2 py-1 rounded text-xs font-bold uppercase"
    >
      New
    </span>
    <span>Studio Nova is here — AI-powered workspace management</span>
    <a
      href="/overview"
      class="text-primary hover:text-primary-fixed transition-colors flex items-center gap-1 group"
    >
      Learn more
      <span
        class="text-sm group-hover:translate-x-1 transition-transform inline-block"
      >
        &rarr;
      </span>
    </a>
    <button
      onclick={() => (visible = false)}
      class="ml-2 text-on-surface-variant hover:text-on-surface transition-colors"
    >
      <X size={14} />
    </button>
  </div>
{/if}
