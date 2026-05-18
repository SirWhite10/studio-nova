<script lang="ts">
import { cn } from "$lib/utils.js";
import * as Input from "$lib/components/view-ui/input/index.js";
import * as Label  from "$lib/components/view-ui/label/index.js";
import * as Tabs from "$lib/components/view-ui/tabs/index.js";
import * as Button  from "$lib/base/button/index.js";
import * as Badge from "$lib/components/view-ui/badge/index.js"
import * as Select from "$lib/components/view-ui/select/index.js"
import ExternalLink from "@lucide/svelte/icons/external-link";
import LinkIcon from "@lucide/svelte/icons/link";
import Globe from "@lucide/svelte/icons/globe";
import Settings from "@lucide/svelte/icons/settings";
import Newspaper from "@lucide/svelte/icons/newspaper";
import { formatLinkValue, isInternalLink } from "../utils.js";
import type { LinkFieldConfig, LinkValue } from "../types.js";

let {
	name,
	config,
	value = "",
	onChange,
}: {
	name: string;
	config: LinkFieldConfig;
	value?: string | LinkValue;
	onChange?: (value: string | LinkValue) => void;
} = $props();

// Local state
let linkValue = $state(formatLinkValue(value || ""));
let showAdvanced = $state(false);
let activeTab = $state("url"); // 'url' or 'page'
let pages = $state([
	{ path: "/", title: "Home" },
	{ path: "/about", title: "About" },
	{ path: "/contact", title: "Contact" },
	{ path: "/blog", title: "Blog" },
	{ path: "/services", title: "Services" },
	{ path: "/portfolio", title: "Portfolio" },
]); // Demo pages

// Check input restrictions
const urlDisabled = $derived(config.internalOnly && !linkValue.internal);
const internalDisabled = $derived(config.externalOnly && linkValue.internal);
const showPageSelector = $derived(
	(config.internalOnly || !config.externalOnly) && activeTab === "page",
);
const showUrlInput = $derived(!(config.internalOnly && activeTab === "page"));

// Helper functions
function isPageSelected(path: string): boolean {
	return linkValue.url === path;
}

// Handle URL change
function handleUrlChange(event: Event) {
	const target = event.target as HTMLInputElement;
	const url = target.value;

	// Update internal flag based on URL
	const internal = isInternalLink(url);

	// If options restrict the type of link, validate
	if ((config.internalOnly && !internal) || (config.externalOnly && internal)) {
		return; // Prevent invalid URLs
	}

	linkValue = {
		...linkValue,
		url,
		internal,
	};

	if (onChange) {
		onChange(linkValue);
	}
}

// Select internal page
function selectPage(path: string, title: string) {
	linkValue = {
		...linkValue,
		url: path,
		internal: true,
		title: title,
	};

	if (onChange) {
		onChange(linkValue);
	}
}

// Handle target change
function handleTargetChange(target: string) {
	linkValue = {
		...linkValue,
		target: target as LinkValue["target"],
	};

	if (onChange) {
		onChange(linkValue);
	}
}

// Handle title change
function handleTitleChange(event: Event) {
	const target = event.target as HTMLInputElement;

	linkValue = {
		...linkValue,
		title: target.value,
	};

	if (onChange) {
		onChange(linkValue);
	}
}

// Handle rel change
function handleRelChange(event: Event) {
	const target = event.target as HTMLInputElement;

	linkValue = {
		...linkValue,
		rel: target.value,
	};

	if (onChange) {
		onChange(linkValue);
	}
}

// Toggle advanced options
function toggleAdvanced() {
	showAdvanced = !showAdvanced;
}

// Handle tab change
function handleTabChange(tab: string) {
	activeTab = tab;

	// If switching to page tab and external only is set, prevent it
	if (tab === "page" && config.externalOnly) {
		activeTab = "url";
	}
}
</script>

<div class="space-y-2">
  <Label.Root for={name} class="text-sm font-medium">
    {config.label}
    {#if config.required}
      <span class="text-destructive ml-1">*</span>
    {/if}
  </Label.Root>

  {#if config.description}
    <p class="text-muted-foreground text-xs">{config.description}</p>
  {/if}

  <!-- Display badges for link type restrictions -->
  {#if config.internalOnly || config.externalOnly}
    <div class="mb-2 flex gap-1.5">
      {#if config.internalOnly}
        <Badge.Badge
          variant="outline"
          class="bg-muted/50 h-5 px-2 py-0 text-xs"
        >
          <LinkIcon class="mr-1 h-3 w-3" /> Internal links only
        </Badge.Badge>
      {/if}

      {#if config.externalOnly}
        <Badge.Badge
          variant="outline"
          class="bg-muted/50 h-5 px-2 py-0 text-xs"
        >
          <ExternalLink class="mr-1 h-3 w-3" /> External links only
        </Badge.Badge>
      {/if}
    </div>
  {/if}

  <!-- Tabs for URL or Internal Page selection -->
  {#if !config.externalOnly}
    <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
      <Tabs.List class="grid grid-cols-2">
        <Tabs.Trigger
          value="url"
          class="flex items-center justify-center gap-1.5"
        >
          <Globe class="h-3.5 w-3.5" />
          <span>URL</span>
        </Tabs.Trigger>
        <Tabs.Trigger
          value="page"
          class="flex items-center justify-center gap-1.5"
          disabled={config.externalOnly}
        >
          <Newspaper class="h-3.5 w-3.5" />
          <span>Page</span>
        </Tabs.Trigger>
      </Tabs.List>

      <div class="pt-2">
        <Tabs.Content value="url" class="space-y-2">
          <!-- URL input -->
          <div class="flex items-center gap-2">
            <div class="relative flex-1">
              <Input.Root
                id={name}
                type="text"
                value={linkValue.url}
                oninput={handleUrlChange}
                placeholder={config.internalOnly
                  ? "/path/to/page"
                  : "https://example.com"}
                class="pl-8"
                disabled={urlDisabled}
              />
              <div class="absolute top-1/2 left-2 -translate-y-1/2">
                {#if linkValue.url && linkValue.internal}
                  <LinkIcon class="text-muted-foreground h-4 w-4" />
                {:else if linkValue.url}
                  <ExternalLink class="text-muted-foreground h-4 w-4" />
                {:else}
                  <Globe class="text-muted-foreground h-4 w-4" />
                {/if}
              </div>
            </div>

            <Button.Root
              variant="outline"
              size="icon"
              onclick={toggleAdvanced}
              class={cn({ "text-primary": showAdvanced })}
            >
              <Settings class="h-4 w-4" />
            </Button.Root>
          </div>

          {#if urlDisabled}
            <p class="text-destructive text-xs">
              Only internal links are allowed. Use format "/path" or select from
              Pages tab.
            </p>
          {/if}

          {#if internalDisabled}
            <p class="text-destructive text-xs">
              Only external links are allowed. Use format "https://example.com".
            </p>
          {/if}
        </Tabs.Content>

        <Tabs.Content value="page" class="space-y-2">
          <!-- Internal page selection -->
          <div class="overflow-hidden rounded-md border">
            {#each pages as page}
              <div
                class={cn(
                  "hover:bg-muted/50 flex cursor-pointer items-center border-b px-3 py-2 last:border-0",
                  isPageSelected(page.path) && "bg-muted"
                )}
                role="button"
                tabindex="0"
                onclick={() => selectPage(page.path, page.title)}
                onkeydown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectPage(page.path, page.title);
                  }
                }}
              >
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{page.title}</span>
                  </div>
                  <div class="text-muted-foreground text-xs">{page.path}</div>
                </div>

                {#if isPageSelected(page.path)}
                  <Badge.Badge variant="default" class="h-5 px-1.5"
                    >Selected</Badge.Badge
                  >
                {/if}
              </div>
            {/each}
          </div>
        </Tabs.Content>
      </div>
    </Tabs.Root>
  {:else}
    <!-- URL only (no tabs) -->
    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <Input.Root
          id={name}
          type="text"
          value={linkValue.url}
          oninput={handleUrlChange}
          placeholder="https://example.com"
          class="pl-8"
        />
        <div class="absolute top-1/2 left-2 -translate-y-1/2">
          <ExternalLink class="text-muted-foreground h-4 w-4" />
        </div>
      </div>

      <Button.Root
        variant="outline"
        size="icon"
        onclick={toggleAdvanced}
        class={cn({ "text-primary": showAdvanced })}
      >
        <Settings class="h-4 w-4" />
      </Button.Root>
    </div>
  {/if}

  <!-- Advanced options -->
  {#if showAdvanced}
    <div class="space-y-2 rounded-md border p-2">
      <div class="space-y-1">
        <Label.Root for={`${name}-target`} class="text-xs">Open in</Label.Root>
        <Select.Root
          type="single"
          value={linkValue.target}
          onValueChange={handleTargetChange}
        >
          <Select.Trigger id={`${name}-target`} class="w-full">
            {linkValue.target || ""}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="_self">Same window</Select.Item>
            <Select.Item value="_blank">New window</Select.Item>
            <Select.Item value="_parent">Parent frame</Select.Item>
            <Select.Item value="_top">Top frame</Select.Item>
          </Select.Content>
        </Select.Root>
      </div>

      <div class="space-y-1">
        <Label.Root for={`${name}-title`} class="text-xs"
          >Title (tooltip)</Label.Root
        >
        <Input.Root
          id={`${name}-title`}
          type="text"
          value={linkValue.title || ""}
          placeholder="Link title"
          oninput={handleTitleChange}
        />
      </div>

      <div class="space-y-1">
        <Label.Root for={`${name}-rel`} class="text-xs">Relationship</Label.Root
        >
        <Input.Root
          id={`${name}-rel`}
          type="text"
          value={linkValue.rel || ""}
          placeholder="nofollow, noreferrer, etc."
          oninput={handleRelChange}
        />
        <p class="text-muted-foreground mt-1 text-xs">
          Common values: nofollow, noreferrer, noopener, sponsored, ugc
        </p>
      </div>
    </div>
  {/if}
</div>
