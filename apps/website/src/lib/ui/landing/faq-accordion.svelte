<script lang="ts">
  import { Accordion } from '@ark-ui/svelte/accordion';
  import { ChevronDown } from '@lucide/svelte';

  interface Props {
    items: { q: string; a: string }[];
  }

  let { items }: Props = $props();
</script>

<Accordion.Root value={[]} multiple class="space-y-3">
  {#each items as faq, i}
    <Accordion.Item
      value={'faq-' + i}
      class="glass-panel rounded-lg px-5 group"
    >
      <Accordion.ItemTrigger
        class="w-full flex items-center justify-between py-4 text-left font-headline-lg text-base font-semibold text-on-surface hover:text-primary transition-colors cursor-pointer"
      >
        <span>{faq.q}</span>
        <Accordion.ItemIndicator>
          <ChevronDown
            size={18}
            class="text-on-surface-variant group-data-[state=open]:rotate-180 transition-transform duration-200"
          />
        </Accordion.ItemIndicator>
      </Accordion.ItemTrigger>
      <Accordion.ItemContent class="pb-4 text-sm leading-relaxed text-on-surface-variant">
        {faq.a}
      </Accordion.ItemContent>
    </Accordion.Item>
  {/each}
</Accordion.Root>
