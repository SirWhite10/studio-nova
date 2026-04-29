<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import type { PricingItem } from "$lib/pricing/catalog";

  let { item, cta = "View details" }: { item: PricingItem; cta?: string } = $props();
</script>

<Card.Root class="flex h-full flex-col">
  <Card.Header>
    <div class="flex min-h-7 items-center justify-between gap-3">
      <Card.Title class="text-xl">{item.name}</Card.Title>
      {#if item.badge}
        <Badge variant="outline">{item.badge}</Badge>
      {/if}
    </div>
    <Card.Description class="leading-6">{item.summary}</Card.Description>
    <div class="pt-2">
      <span class="text-4xl font-extrabold">{item.price}</span>
      <span class="text-sm text-muted-foreground"> {item.cadence}</span>
    </div>
  </Card.Header>
  <Card.Content class="flex-1">
    <ul class="space-y-2 text-sm text-muted-foreground">
      {#each item.details as detail}
        <li class="flex gap-2">
          <span class="mt-2 size-1.5 shrink-0 rounded-full bg-primary"></span>
          <span>{detail}</span>
        </li>
      {/each}
    </ul>
  </Card.Content>
  {#if item.href}
    <Card.Footer>
      <Button class="w-full" href={item.href} variant="outline">{cta}</Button>
    </Card.Footer>
  {/if}
</Card.Root>
