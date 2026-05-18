<script lang="ts">
  import CardDemoToolbar from "$lib/components/card/card-demo-toolbar.svelte";
  import * as CanvasCard from "$lib/components/card/index.js";
  import * as Badge from "$lib/components/ui/badge/index.js";
  import * as Button from "$lib/components/ui/button/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import {
    ArrowRight,
    Bath,
    BedDouble,
    CalendarDays,
    Clock3,
    Expand,
    MapPin,
    Monitor,
    Palette,
    ShoppingBag,
    Sparkles,
    Star,
    Users,
    Waves,
  } from "@lucide/svelte";

  type DemoId = "travel" | "shoe" | "hair" | "meeting" | "nft";
  type DemoPanel = "content" | "style" | "json";

  type DemoState = {
    eyebrow: string;
    title: string;
    description: string;
    badge: string;
    primaryLabel: string;
    primaryValue: string;
    secondaryLabel: string;
    secondaryValue: string;
    footerNote: string;
    imageLabel: string;
    price: string;
    cta: string;
    accent: string;
    dark?: boolean;
  };

  const demoMeta: Record<DemoId, { label: string; blurb: string; width: string }> = {
    travel: {
      label: "Travel booking website",
      blurb: "Wide property-style travel card with editorial image treatment, price badge, and specs row.",
      width: "40rem",
    },
    shoe: {
      label: "Shoe shopping app",
      blurb: "Tall mobile commerce card with a stronger product stage and compact purchase footer.",
      width: "22rem",
    },
    hair: {
      label: "Hair care e-commerce app",
      blurb: "Soft beauty-commerce card with a calmer palette and product-led merchandising.",
      width: "24rem",
    },
    meeting: {
      label: "Booking meeting rooms app",
      blurb: "Horizontal workspace booking card with room image, availability details, and quick CTA.",
      width: "42rem",
    },
    nft: {
      label: "NFT marketplace",
      blurb: "Dark collectible card with art-first composition, creator metadata, and bid summary.",
      width: "23rem",
    },
  };

  const initialStates: Record<DemoId, DemoState> = {
    travel: {
      eyebrow: "Travel / property",
      title: "Serenity cliffside suites",
      description: "15 S Aurora Ave, Santorini",
      badge: "$570,000",
      primaryLabel: "Bedrooms",
      primaryValue: "5 Bedrooms",
      secondaryLabel: "Bathrooms",
      secondaryValue: "3 Bathrooms",
      footerNote: "120m² · Ocean view · Breakfast included",
      imageLabel: "Sunset terrace · Private pool",
      price: "$570,000",
      cta: "Explore stay",
      accent: "teal",
    },
    shoe: {
      eyebrow: "Sneakers / mobile",
      title: "Nova Runner 02",
      description: "Performance knit with cloud-foam sole and glacier blue finish.",
      badge: "New drop",
      primaryLabel: "Price",
      primaryValue: "$168",
      secondaryLabel: "Sizes",
      secondaryValue: "37–44",
      footerNote: "Lightweight daily runner with premium cushioning.",
      imageLabel: "Feather foam · Carbon plate",
      price: "$168",
      cta: "Add to cart",
      accent: "sky",
    },
    hair: {
      eyebrow: "Beauty / ritual",
      title: "Repair wash ritual",
      description: "Shampoo, mask, and leave-in oil for dry or over-processed hair.",
      badge: "Bundle save 18%",
      primaryLabel: "Routine",
      primaryValue: "3 steps",
      secondaryLabel: "Price",
      secondaryValue: "$54",
      footerNote: "Argan oil · Peptides · Sulfate free",
      imageLabel: "Salon-grade care set",
      price: "$54",
      cta: "Shop bundle",
      accent: "amber",
    },
    meeting: {
      eyebrow: "Workspace / rooms",
      title: "Atlas boardroom",
      description: "Large meeting room with video wall, whiteboard, and premium conferencing setup.",
      badge: "Available now",
      primaryLabel: "Capacity",
      primaryValue: "12 people",
      secondaryLabel: "Next slot",
      secondaryValue: "10:30 AM",
      footerNote: "Display wall · Dual cameras · Acoustic panels",
      imageLabel: "Floor 8 · West wing",
      price: "$45/hr",
      cta: "Reserve room",
      accent: "violet",
    },
    nft: {
      eyebrow: "Collectibles / drop",
      title: "Celestial Bloom #184",
      description: "Generative artwork from the Aurora set with layered bloom particles and spectral light.",
      badge: "24h left",
      primaryLabel: "Current bid",
      primaryValue: "2.34 ETH",
      secondaryLabel: "Creator",
      secondaryValue: "@nova.art",
      footerNote: "Edition 1 of 20 · Verified collection",
      imageLabel: "Aurora set · Spectral bloom",
      price: "2.34 ETH",
      cta: "Place bid",
      accent: "slate",
      dark: true,
    },
  };

  const initialUi: Record<DemoId, { panel: DemoPanel }> = {
    travel: { panel: "content" },
    shoe: { panel: "content" },
    hair: { panel: "content" },
    meeting: { panel: "content" },
    nft: { panel: "content" },
  };

  const demoIds: DemoId[] = ["travel", "shoe", "hair", "meeting", "nft"];

  let states = $state(structuredClone(initialStates));
  let ui = $state(structuredClone(initialUi));

  function resetDemo(id: DemoId) {
    Object.assign(states[id], structuredClone(initialStates[id]));
  }

  function setPanel(id: DemoId, panel: DemoPanel) {
    ui[id].panel = panel;
  }

  function accentBadgeClass(accent: string, dark = false) {
    if (dark) return "bg-white/10 text-white border-white/10";
    if (accent === "teal") return "bg-teal-500/10 text-teal-600";
    if (accent === "sky") return "bg-sky-500/10 text-sky-600";
    if (accent === "amber") return "bg-amber-500/10 text-amber-700";
    if (accent === "violet") return "bg-violet-500/10 text-violet-600";
    return "bg-slate-500/10 text-slate-700";
  }

  function heroClass(accent: string, dark = false) {
    if (dark) return "from-fuchsia-500 via-violet-600 to-slate-950";
    if (accent === "teal") return "from-cyan-300 via-teal-300 to-emerald-100";
    if (accent === "sky") return "from-sky-300 via-blue-400 to-indigo-100";
    if (accent === "amber") return "from-orange-200 via-amber-300 to-rose-50";
    if (accent === "violet") return "from-violet-400 via-fuchsia-400 to-pink-100";
    return "from-slate-300 via-slate-400 to-slate-100";
  }
</script>

<svelte:head>
  <title>Canvas Cards</title>
  <meta
    name="description"
    content="Reference-inspired card templates using Canvas card wrappers with plain HTML and Tailwind utilities."
  />
</svelte:head>

<div class="min-h-dvh bg-background text-foreground">
  <div class="mx-auto grid w-full max-w-[88rem] gap-6 px-4 py-5 md:px-6 md:py-8">
    <section class="grid gap-4 rounded-3xl border bg-white p-4 md:grid-cols-[1.2fr_0.8fr] md:p-6">
      <div class="grid gap-4">
        <Badge.Badge variant="secondary" class="w-fit">Cards</Badge.Badge>
        <h1 class="max-w-[11ch] text-4xl font-semibold tracking-tight md:text-6xl">
          Distinct, data-driven templates built from the Canvas card base.
        </h1>
        <p class="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
          This page does not use <code>View</code> inside the demos. Each card is composed from the
          Canvas card wrapper plus regular HTML tags and Tailwind classes, so the templates stay
          flexible while the base card remains aligned with shadcn structure.
        </p>
        <div class="flex flex-wrap gap-3">
          <Button.Root href="/">Back to landing</Button.Root>
          <Button.Root href="#card-demos" variant="outline">Jump to demos</Button.Root>
        </div>
      </div>
      <div class="grid gap-3 rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
        <p class="font-medium text-foreground">Reference-inspired categories</p>
        <ul class="grid gap-2 pl-4">
          <li>Travel booking website</li>
          <li>Shoe shopping app</li>
          <li>Hair care e-commerce app</li>
          <li>Booking meeting rooms app</li>
          <li>NFT marketplace</li>
        </ul>
      </div>
    </section>

    <section id="card-demos" class="grid gap-4">
      {#each demoIds as id (id)}
        {@const state = states[id]}
        {@const panel = ui[id].panel}
        <article class="grid gap-4 rounded-3xl border bg-white md:p-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
          <div class="grid min-w-0 self-start gap-3">
            <div class="grid gap-2">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h2 class="text-xl font-semibold tracking-tight">{demoMeta[id].label}</h2>
                  <p class="mt-1 text-sm leading-6 text-muted-foreground">{demoMeta[id].blurb}</p>
                </div>
                <Badge.Badge variant="outline">template</Badge.Badge>
              </div>
            </div>

            <CardDemoToolbar
              title={demoMeta[id].label}
              panel={ui[id].panel}
              onPanelChange={(next) => setPanel(id, next)}
              onReset={() => resetDemo(id)}
            />

            {#if panel !== "json"}
              <div class="rounded-2xl border bg-white p-4">
                <Field.Group class="grid gap-4">
                  {#if panel === "content"}
                    <Field.Field>
                      <Field.Label for={`${id}-eyebrow`}>Eyebrow</Field.Label>
                      <Input id={`${id}-eyebrow`} bind:value={state.eyebrow} placeholder="Travel / property" />
                    </Field.Field>
                    <Field.Field>
                      <Field.Label for={`${id}-title`}>Title</Field.Label>
                      <Input id={`${id}-title`} bind:value={state.title} placeholder="Serenity cliffside suites" />
                    </Field.Field>
                    <Field.Field>
                      <Field.Label for={`${id}-description`}>Description</Field.Label>
                      <Textarea id={`${id}-description`} bind:value={state.description} class="min-h-28 resize-none" />
                      <Field.Description>Short supporting copy for the card body.</Field.Description>
                    </Field.Field>
                    <div class="grid gap-4 md:grid-cols-2">
                      <Field.Field>
                        <Field.Label for={`${id}-badge`}>Badge</Field.Label>
                        <Input id={`${id}-badge`} bind:value={state.badge} />
                      </Field.Field>
                      <Field.Field>
                        <Field.Label for={`${id}-image-label`}>Image label</Field.Label>
                        <Input id={`${id}-image-label`} bind:value={state.imageLabel} />
                      </Field.Field>
                      <Field.Field>
                        <Field.Label for={`${id}-primary-label`}>Primary label</Field.Label>
                        <Input id={`${id}-primary-label`} bind:value={state.primaryLabel} />
                      </Field.Field>
                      <Field.Field>
                        <Field.Label for={`${id}-primary-value`}>Primary value</Field.Label>
                        <Input id={`${id}-primary-value`} bind:value={state.primaryValue} />
                      </Field.Field>
                      <Field.Field>
                        <Field.Label for={`${id}-secondary-label`}>Secondary label</Field.Label>
                        <Input id={`${id}-secondary-label`} bind:value={state.secondaryLabel} />
                      </Field.Field>
                      <Field.Field>
                        <Field.Label for={`${id}-secondary-value`}>Secondary value</Field.Label>
                        <Input id={`${id}-secondary-value`} bind:value={state.secondaryValue} />
                      </Field.Field>
                    </div>
                    <Field.Field>
                      <Field.Label for={`${id}-footer-note`}>Footer note</Field.Label>
                      <Input id={`${id}-footer-note`} bind:value={state.footerNote} />
                    </Field.Field>
                  {:else}
                    <div class="grid gap-4 md:grid-cols-2">
                      <Field.Field>
                        <Field.Label for={`${id}-price`}>Badge / price</Field.Label>
                        <Input id={`${id}-price`} bind:value={state.price} />
                      </Field.Field>
                      <Field.Field>
                        <Field.Label for={`${id}-cta`}>CTA</Field.Label>
                        <Input id={`${id}-cta`} bind:value={state.cta} />
                      </Field.Field>
                      <Field.Field class="md:col-span-2">
                        <Field.Label for={`${id}-accent`}>Accent</Field.Label>
                        <Select.Root type="single" bind:value={state.accent}>
                          <Select.Trigger id={`${id}-accent`}>
                            <span>{state.accent}</span>
                          </Select.Trigger>
                          <Select.Content>
                            <Select.Item value="teal">teal</Select.Item>
                            <Select.Item value="sky">sky</Select.Item>
                            <Select.Item value="amber">amber</Select.Item>
                            <Select.Item value="violet">violet</Select.Item>
                            <Select.Item value="slate">slate</Select.Item>
                          </Select.Content>
                        </Select.Root>
                        <Field.Description>Switch the accent palette used by the template.</Field.Description>
                      </Field.Field>
                    </div>
                  {/if}
                </Field.Group>
              </div>
            {:else}
              <pre class="max-h-[30rem] overflow-auto rounded-2xl border bg-muted/20 p-4 text-xs leading-6 text-muted-foreground">{JSON.stringify(state, null, 2)}</pre>
            {/if}
          </div>

          <div class="min-w-0 self-start overflow-hidden rounded-3xl border bg-muted/20 p-4 md:p-6">
            <div class="grid justify-items-center">
              {#if id === "travel"}
                <CanvasCard.CardRoot class="group w-full max-w-[40rem] gap-0 overflow-hidden rounded-[1.5rem] py-0 shadow-sm transition duration-300 hover:shadow-2xl">
                  <div class="relative overflow-hidden rounded-t-[1.5rem]">
                    <div class={`h-72 w-full bg-gradient-to-br ${heroClass(state.accent)}`}></div>
                    <div class="absolute inset-x-0 bottom-0 flex items-end justify-between p-6 text-white">
                      <div>
                        <p class="text-sm/6 opacity-80">{state.imageLabel}</p>
                      </div>
                    </div>
                    <div class="absolute right-6 top-6 rounded-full bg-white p-4 opacity-0 transition duration-300 group-hover:opacity-100">
                      <ArrowRight class="text-card-foreground" size={18} />
                    </div>
                  </div>
                  <div class="p-6">
                    <div class="mb-6 flex justify-between gap-5">
                      <div>
                        <p class="text-sm text-muted-foreground">{state.eyebrow}</p>
                        <h3 class="text-xl font-medium transition duration-300 group-hover:text-primary">{state.title}</h3>
                        <p class="text-base font-normal text-muted-foreground">{state.description}</p>
                      </div>
                      <Badge.Badge class={`rounded-full px-5 py-3 text-base font-normal ${accentBadgeClass(state.accent)}`}>
                        {state.price}
                      </Badge.Badge>
                    </div>
                    <div class="flex flex-wrap gap-y-4">
                      <div class="flex min-w-28 flex-col gap-2 border-e border-border pe-6">
                        <BedDouble size={20} />
                        <p class="text-sm sm:text-base">{state.primaryValue}</p>
                      </div>
                      <div class="flex min-w-28 flex-col gap-2 border-e border-border px-6">
                        <Bath size={20} />
                        <p class="text-sm sm:text-base">{state.secondaryValue}</p>
                      </div>
                      <div class="flex min-w-28 flex-col gap-2">
                        <Expand size={20} />
                        <p class="text-sm sm:text-base">{state.footerNote}</p>
                      </div>
                    </div>
                  </div>
                </CanvasCard.CardRoot>
              {:else if id === "shoe"}
                <CanvasCard.CardRoot class="w-full max-w-[22rem] gap-0 rounded-[2rem] border-0 bg-white py-0 shadow-xl">
                  <div class="p-5 pb-0">
                    <div class="mb-4 flex items-center justify-between">
                      <Badge.Badge class={`rounded-full px-4 py-2 ${accentBadgeClass(state.accent)}`}>{state.badge}</Badge.Badge>
                      <span class="text-sm text-muted-foreground">{state.eyebrow}</span>
                    </div>
                    <div class={`relative flex h-[19rem] items-end justify-center overflow-hidden rounded-[1.75rem] bg-gradient-to-br ${heroClass(state.accent)} p-6`}>
                      <div class="absolute left-5 top-5 rounded-full bg-white/70 px-3 py-1 text-xs font-medium backdrop-blur">{state.imageLabel}</div>
                      <div class="h-28 w-52 rounded-[999px] bg-white/35 blur-2xl"></div>
                    </div>
                  </div>
                  <div class="space-y-4 p-5">
                    <div>
                      <h3 class="text-2xl font-semibold">{state.title}</h3>
                      <p class="mt-2 text-sm leading-6 text-muted-foreground">{state.description}</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <span class="rounded-full border bg-background px-3 py-1 text-xs font-medium">{state.primaryLabel}: {state.primaryValue}</span>
                      <span class="rounded-full border bg-background px-3 py-1 text-xs font-medium">{state.secondaryLabel}: {state.secondaryValue}</span>
                    </div>
                    <div class="flex items-center justify-between rounded-[1.25rem] bg-slate-950 px-4 py-4 text-white">
                      <div>
                        <p class="text-xs uppercase tracking-[0.12em] text-white/60">Price</p>
                        <p class="text-xl font-semibold">{state.price}</p>
                      </div>
                      <button class="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">
                        <ShoppingBag size={16} /> {state.cta}
                      </button>
                    </div>
                  </div>
                </CanvasCard.CardRoot>
              {:else if id === "hair"}
                <CanvasCard.CardRoot class="w-full max-w-[24rem] gap-0 rounded-[2rem] border-0 bg-[#fff8f1] py-0 shadow-sm">
                  <div class="space-y-5 p-6">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <p class="text-sm text-muted-foreground">{state.eyebrow}</p>
                        <h3 class="mt-1 text-2xl font-semibold text-balance">{state.title}</h3>
                      </div>
                      <Badge.Badge class={`rounded-full px-4 py-2 ${accentBadgeClass(state.accent)}`}>{state.badge}</Badge.Badge>
                    </div>
                    <p class="text-sm leading-6 text-muted-foreground">{state.description}</p>
                    <div class="grid grid-cols-3 gap-3">
                      {#each [0, 1, 2] as item}
                        <div class={`flex h-36 items-end justify-center rounded-[1.4rem] bg-gradient-to-b ${heroClass(state.accent)} p-4`}>
                          <div class="h-16 w-8 rounded-t-full rounded-b-2xl bg-white/80 shadow-sm"></div>
                        </div>
                      {/each}
                    </div>
                    <div class="grid grid-cols-2 gap-3 rounded-[1.5rem] bg-white p-4">
                      <div>
                        <p class="text-xs uppercase tracking-[0.12em] text-muted-foreground">{state.primaryLabel}</p>
                        <p class="mt-1 text-lg font-semibold">{state.primaryValue}</p>
                      </div>
                      <div>
                        <p class="text-xs uppercase tracking-[0.12em] text-muted-foreground">{state.secondaryLabel}</p>
                        <p class="mt-1 text-lg font-semibold">{state.secondaryValue}</p>
                      </div>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <p class="text-sm text-muted-foreground">{state.footerNote}</p>
                      <button class="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">{state.cta}</button>
                    </div>
                  </div>
                </CanvasCard.CardRoot>
              {:else if id === "meeting"}
                <CanvasCard.CardRoot class="w-full max-w-[42rem] gap-0 rounded-[2rem] py-0 shadow-sm">
                  <div class="grid gap-4 p-4 md:grid-cols-[15rem_minmax(0,1fr)] md:p-5">
                    <div class={`relative min-h-64 overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${heroClass(state.accent)} p-5`}>
                      <div class="absolute inset-0 bg-black/10"></div>
                      <div class="relative flex h-full flex-col justify-between text-white">
                        <Badge.Badge class="w-fit rounded-full bg-white/15 px-3 py-1 text-white">{state.badge}</Badge.Badge>
                        <div>
                          <p class="text-sm/6 text-white/80">{state.imageLabel}</p>
                        </div>
                      </div>
                    </div>
                    <div class="flex min-w-0 flex-col justify-between gap-4 py-1">
                      <div>
                        <p class="text-sm text-muted-foreground">{state.eyebrow}</p>
                        <h3 class="mt-1 text-2xl font-semibold">{state.title}</h3>
                        <p class="mt-2 text-sm leading-6 text-muted-foreground">{state.description}</p>
                      </div>
                      <div class="grid gap-3 sm:grid-cols-2">
                        <div class="rounded-[1.25rem] border p-4">
                          <div class="mb-2 flex items-center gap-2 text-muted-foreground"><Users size={16} /> {state.primaryLabel}</div>
                          <p class="text-lg font-semibold">{state.primaryValue}</p>
                        </div>
                        <div class="rounded-[1.25rem] border p-4">
                          <div class="mb-2 flex items-center gap-2 text-muted-foreground"><Clock3 size={16} /> {state.secondaryLabel}</div>
                          <p class="text-lg font-semibold">{state.secondaryValue}</p>
                        </div>
                      </div>
                      <div class="flex flex-wrap gap-2">
                        <span class="rounded-full border px-3 py-1 text-xs font-medium">09:30</span>
                        <span class="rounded-full border px-3 py-1 text-xs font-medium">10:30</span>
                        <span class="rounded-full border px-3 py-1 text-xs font-medium">11:00</span>
                      </div>
                      <div class="flex items-center justify-between gap-3">
                        <div class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span class="inline-flex items-center gap-1"><Monitor size={15} /> Video wall</span>
                          <span class="inline-flex items-center gap-1"><CalendarDays size={15} /> {state.price}</span>
                        </div>
                        <button class="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">{state.cta}</button>
                      </div>
                    </div>
                  </div>
                </CanvasCard.CardRoot>
              {:else}
                <CanvasCard.CardRoot class="w-full max-w-[23rem] gap-0 rounded-[2rem] border-0 bg-slate-950 py-0 text-white shadow-2xl">
                  <div class="space-y-5 p-5">
                    <div class="flex items-center justify-between gap-3">
                      <div>
                        <p class="text-sm text-white/60">{state.eyebrow}</p>
                        <h3 class="mt-1 text-2xl font-semibold text-white">{state.title}</h3>
                      </div>
                      <Badge.Badge class="rounded-full border-white/10 bg-white/10 px-4 py-2 text-white">{state.badge}</Badge.Badge>
                    </div>
                    <div class={`relative h-80 overflow-hidden rounded-[1.6rem] bg-gradient-to-br ${heroClass(state.accent, true)} p-5`}>
                      <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.38),transparent_35%),radial-gradient(circle_at_70%_60%,rgba(255,255,255,0.22),transparent_40%)]"></div>
                      <div class="relative flex h-full items-end">
                        <p class="text-sm text-white/85">{state.imageLabel}</p>
                      </div>
                    </div>
                    <p class="text-sm leading-6 text-white/70">{state.description}</p>
                    <div class="grid grid-cols-2 gap-3">
                      <div class="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                        <p class="text-xs uppercase tracking-[0.12em] text-white/50">{state.primaryLabel}</p>
                        <p class="mt-1 text-lg font-semibold">{state.primaryValue}</p>
                      </div>
                      <div class="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                        <p class="text-xs uppercase tracking-[0.12em] text-white/50">{state.secondaryLabel}</p>
                        <p class="mt-1 text-lg font-semibold">{state.secondaryValue}</p>
                      </div>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex items-center gap-2 text-sm text-white/65">
                        <Sparkles size={15} />
                        {state.footerNote}
                      </div>
                      <button class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950">{state.cta}</button>
                    </div>
                  </div>
                </CanvasCard.CardRoot>
              {/if}
            </div>
          </div>
        </article>
      {/each}
    </section>
  </div>
</div>
