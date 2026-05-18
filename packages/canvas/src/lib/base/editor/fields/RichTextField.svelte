<script lang="ts">
import { cn } from "$lib/utils.js";
import * as Label  from "$lib/components/view-ui/label/index.js";
import * as Button  from "$lib/base/button/index.js";
import * as Separator  from "$lib/components/view-ui/separator/index.js";
import Bold from "@lucide/svelte/icons/bold";
import Italic from "@lucide/svelte/icons/italic";
import Underline from "@lucide/svelte/icons/underline";
import Link from "@lucide/svelte/icons/link";
import List from "@lucide/svelte/icons/list";
import ListOrdered from "@lucide/svelte/icons/list-ordered";
import Heading1 from "@lucide/svelte/icons/heading-1";
import Heading2 from "@lucide/svelte/icons/heading-2";
import Quote from "@lucide/svelte/icons/quote";
import Code from "@lucide/svelte/icons/code";
import Undo from "@lucide/svelte/icons/undo";
import Redo from "@lucide/svelte/icons/redo";
import AlignLeft from "@lucide/svelte/icons/align-left";
import AlignCenter from "@lucide/svelte/icons/align-center";
import AlignRight from "@lucide/svelte/icons/align-right";
import AlignJustify from "@lucide/svelte/icons/align-justify";
import type { RichTextFieldConfig } from "../types.js";

let {
	name,
	config,
	value = "",
	onChange,
}: {
	name: string;
	config: RichTextFieldConfig;
	value?: string;
	onChange?: (value: string) => void;
} = $props();

let isInitialized = $state(false);

// Default toolbar items
const defaultToolbar = [
	"bold",
	"italic",
	"underline",
	"separator",
	"heading1",
	"heading2",
	"separator",
	"link",
	"list",
	"orderedList",
	"quote",
	"code",
];

// Get toolbar items
const toolbarItems = $derived(
	config.toolbar?.length ? config.toolbar : defaultToolbar,
);

// Format commands
const formatCommands = {
	bold: () => document.execCommand("bold", false),
	italic: () => document.execCommand("italic", false),
	underline: () => document.execCommand("underline", false),
	link: () => {
		const url = prompt("Enter URL:");
		if (url) document.execCommand("createLink", false, url);
	},
	unlink: () => document.execCommand("unlink", false),
	list: () => document.execCommand("insertUnorderedList", false),
	orderedList: () => document.execCommand("insertOrderedList", false),
	heading1: () => document.execCommand("formatBlock", false, "<h1>"),
	heading2: () => document.execCommand("formatBlock", false, "<h2>"),
	paragraph: () => document.execCommand("formatBlock", false, "<p>"),
	quote: () => document.execCommand("formatBlock", false, "<blockquote>"),
	code: () => document.execCommand("formatBlock", false, "<pre>"),
	undo: () => document.execCommand("undo", false),
	redo: () => document.execCommand("redo", false),
	alignLeft: () => document.execCommand("justifyLeft", false),
	alignCenter: () => document.execCommand("justifyCenter", false),
	alignRight: () => document.execCommand("justifyRight", false),
	alignJustify: () => document.execCommand("justifyFull", false),
};

// Toolbar button icons
const toolbarIcons = {
	bold: Bold,
	italic: Italic,
	underline: Underline,
	link: Link,
	list: List,
	orderedList: ListOrdered,
	heading1: Heading1,
	heading2: Heading2,
	quote: Quote,
	code: Code,
	undo: Undo,
	redo: Redo,
	alignLeft: AlignLeft,
	alignCenter: AlignCenter,
	alignRight: AlignRight,
	alignJustify: AlignJustify,
};

// Initialize editor with content
function initializeEditor(node: HTMLElement) {
	if (node && !isInitialized) {
		node.innerHTML = value || "";
		node.addEventListener("input", handleEditorChange);
		node.addEventListener("blur", handleEditorChange);
		isInitialized = true;
	}

	return {
		destroy() {
			if (node) {
				node.removeEventListener("input", handleEditorChange);
				node.removeEventListener("blur", handleEditorChange);
			}
		},
	};
}

// Handle editor content change
function handleEditorChange() {
	if (onChange && editorDiv) {
		onChange(editorDiv.innerHTML);
	}
}

// Format content with the selected command
function formatContent(command: string) {
	const cmd = formatCommands as any;
	if (cmd[command]) {
		cmd[command]();
		editorDiv.focus();
		handleEditorChange();
	}
}

// Handle toolbar button click
function handleToolbarClick(item: string) {
	if (item !== "separator") {
		formatContent(item);
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

  <div class="rich-text-editor overflow-hidden rounded-md border">
    <!-- Toolbar -->
    <div
      class="rich-text-toolbar bg-muted/30 flex flex-wrap items-center border-b p-1"
    >
      {#each toolbarItems as item}
        {#if item === "separator"}
          <Separator.Root orientation="vertical" class="mx-1 h-6" />
        {:else if toolbarIcons[item as keyof typeof toolbarIcons]}
          <Button.Root
            variant="ghost"
            size="sm"
            class="h-8 w-8 p-1"
            onclick={() => handleToolbarClick(item)}
          >
            {@const IconComponent =
              toolbarIcons[item as keyof typeof toolbarIcons]}
            <IconComponent class="h-4 w-4" />
          </Button.Root>
        {/if}
      {/each}
    </div>

    <!-- Content editable area -->
    <div
      id={name}
      class="rich-text-content min-h-[200px] p-3 focus:outline-none"
      contenteditable="true"
      bind:this={editorDiv}
      use:initializeEditor
    ></div>
  </div>
</div>

<style>
  .rich-text-content {
    font-family: inherit;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .rich-text-content:focus {
    outline: none;
  }
  /*
  .rich-text-content h1 {
    font-size: 1.5rem;
    font-weight: bold;
    margin: 0.5em 0;
  }

  .rich-text-content h2 {
    font-size: 1.25rem;
    font-weight: bold;
    margin: 0.5em 0;
  }

  .rich-text-content blockquote {
    border-left: 3px solid var(--border);
    padding-left: 1em;
    margin: 0.5em 0;
    font-style: italic;
  }

  .rich-text-content pre {
    background-color: var(--muted);
    padding: 0.5em;
    border-radius: var(--radius);
    overflow-x: auto;
    font-family: monospace;
  }

  .rich-text-content ul,
  .rich-text-content ol {
    padding-left: 1.5em;
    margin: 0.5em 0;
  }

  .rich-text-content a {
    color: var(--primary);
    text-decoration: underline;
  } */
</style>
