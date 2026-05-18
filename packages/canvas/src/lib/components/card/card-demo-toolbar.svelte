<script lang="ts">
  import Code2 from "@lucide/svelte/icons/code-2";
  import Palette from "@lucide/svelte/icons/palette";
  import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
  import SlidersHorizontal from "@lucide/svelte/icons/sliders-horizontal";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import { cn } from "$lib/utils.js";

  type DemoPanel = "content" | "style" | "json";

  let {
    panel = "content",
    title = "Card demo",
    onPanelChange,
    onReset,
    class: className = "",
  }: {
    panel?: DemoPanel;
    title?: string;
    onPanelChange?: (panel: DemoPanel) => void;
    onReset?: () => void;
    class?: string;
  } = $props();

  const panelOptions = [
    { id: "content", label: "Content", icon: SlidersHorizontal },
    { id: "style", label: "Style", icon: Palette },
    { id: "json", label: "JSON", icon: Code2 },
  ] as const;
</script>

<div class={cn("card-demo-toolbar", className)}>
  <div class="card-demo-toolbar__top">
    <div class="card-demo-toolbar__title">{title}</div>
    <button class="card-demo-toolbar__icon" type="button" onclick={() => onReset?.()} aria-label="Reset demo">
      <RotateCcw size={16} />
    </button>
  </div>

  <Tabs.Root value={panel} onValueChange={(value) => value && onPanelChange?.(value as DemoPanel)}>
    <Tabs.List class="card-demo-toolbar__tabs w-full" variant="default">
      {#each panelOptions as option}
        <Tabs.Trigger value={option.id} class="card-demo-toolbar__trigger">
          <option.icon size={15} />
          <span>{option.label}</span>
        </Tabs.Trigger>
      {/each}
    </Tabs.List>
  </Tabs.Root>
</div>

<style>
  .card-demo-toolbar {
    display: grid;
    gap: 0.75rem;
    padding: 0.875rem;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 1rem;
    background: color-mix(in srgb, var(--background, white) 92%, transparent);
  }

  .card-demo-toolbar__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .card-demo-toolbar__title {
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: rgba(15, 23, 42, 0.65);
  }

  .card-demo-toolbar__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border: 1px solid rgba(15, 23, 42, 0.1);
    border-radius: 999px;
    background: white;
    color: inherit;
    font: inherit;
    flex: 0 0 auto;
  }

  .card-demo-toolbar__tabs {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .card-demo-toolbar__trigger {
    min-height: 2.5rem;
    font-size: 0.78rem;
  }
</style>
