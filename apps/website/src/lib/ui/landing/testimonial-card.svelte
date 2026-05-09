<script lang="ts">
  interface Props {
    quote: string;
    name: string;
    role: string;
    initials: string;
  }

  let { quote, name, role, initials }: Props = $props();
</script>

<article class="glass-panel rounded-2xl p-6">
  <p class="mb-5 text-sm italic leading-relaxed text-on-surface-variant">
    "{quote}"
  </p>
  <div class="border-t border-outline/10 pt-4 flex items-center gap-3">
    <div
      class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 font-label-caps text-label-caps text-primary"
    >
      {initials}
    </div>
    <div>
      <p class="text-sm font-semibold text-on-surface">{name}</p>
      <p class="text-xs text-on-surface-variant">{role}</p>
    </div>
  </div>
</article>
