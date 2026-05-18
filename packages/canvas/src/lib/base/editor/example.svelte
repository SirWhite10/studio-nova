<script lang="ts">
import type { ComponentDef } from "$lib/base/canvas/types.js";
import Button from "$lib/components/view-ui/button/button.svelte";
import Text from "../text/text.svelte";
import View from "../view/view.svelte";
import { StudioEditor } from "./index.js";
import type { EditorMode, EditorSidebarMode } from "./types.js";

// Sample component structures for different examples
const basicComponents: ComponentDef[] = [
	{
		id: "simple-container",
		type: "View",
		props: {
			class: "p-6 border rounded-lg",
			style: "background: var(--card); border-color: var(--border);",
		},
		children: [
			{
				id: "simple-title",
				type: "Text",
				props: {
					size: "xl",
					weight: "bold",
					text: "Simple Editor Example",
				},
			},
			{
				id: "simple-subtitle",
				type: "Text",
				props: {
					size: "base",
					color: "var(--muted-foreground)",
					text: "Click on any element to edit its properties",
				},
			},
		],
	},
];

const complexComponents: ComponentDef[] = [
	{
		id: "page-layout",
		type: "View",
		props: {
			class: "min-h-96",
			style: "background: var(--background);",
		},
		children: [
			{
				id: "header-section",
				type: "View",
				props: {
					class: "p-6 border-b",
					style: "background: var(--card); border-color: var(--border);",
				},
				children: [
					{
						id: "header-nav",
						type: "View",
						props: {
							class: "flex items-center justify-between",
						},
						children: [
							{
								id: "logo",
								type: "Text",
								props: {
									size: "xl",
									weight: "bold",
									text: "MyApp",
								},
							},
							{
								id: "nav-buttons",
								type: "View",
								props: {
									class: "flex gap-2",
								},
								children: [
									{
										id: "home-btn",
										type: "Button",
										props: {
											variant: "ghost",
										},
									},
									{
										id: "about-btn",
										type: "Button",
										props: {
											variant: "ghost",
										},
									},
								],
							},
						],
					},
				],
			},
			{
				id: "hero-section",
				type: "View",
				props: {
					class: "p-12 text-center",
				},
				children: [
					{
						id: "hero-title",
						type: "Text",
						props: {
							size: "3xl",
							weight: "bold",
							text: "Welcome to Studio Editor",
						},
					},
					{
						id: "hero-subtitle",
						type: "Text",
						props: {
							size: "lg",
							color: "var(--muted-foreground)",
							text: "Build amazing interfaces with visual editing",
						},
					},
					{
						id: "hero-cta",
						type: "View",
						props: {
							class: "mt-8 flex gap-4 justify-center",
						},
						children: [
							{
								id: "primary-cta",
								type: "Button",
								props: {
									variant: "default",
								},
							},
							{
								id: "secondary-cta",
								type: "Button",
								props: {
									variant: "outline",
								},
							},
						],
					},
				],
			},
		],
	},
];

// Component registry
const componentRegistry = {
	View: View,
	Text: Text,
	Button: Button,
};

// Editor configuration
const editorConfig = {
	View: {
		props: {},
		editorConfig: {
			fields: {
				class: {
					type: "text",
					label: "CSS Classes",
					description: "Tailwind CSS classes",
				},
				style: {
					type: "text",
					label: "Inline Styles",
					description: "CSS styles",
				},
			},
			groups: {
				styling: {
					label: "Styling",
					fields: ["class", "style"],
				},
			},
		},
	},
	Text: {
		props: {},
		editorConfig: {
			fields: {
				text: {
					type: "text",
					label: "Text Content",
					description: "The text content to display",
				},
				size: {
					type: "select",
					label: "Size",
					options: ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"],
				},
				weight: {
					type: "select",
					label: "Weight",
					options: ["normal", "medium", "semibold", "bold"],
				},
				color: {
					type: "color",
					label: "Color",
					description: "Text color",
				},
			},
			groups: {
				content: {
					label: "Content",
					fields: ["text"],
				},
				typography: {
					label: "Typography",
					fields: ["size", "weight", "color"],
				},
			},
		},
	},
	Button: {
		props: {},
		editorConfig: {
			fields: {
				variant: {
					type: "select",
					label: "Variant",
					options: [
						"default",
						"destructive",
						"outline",
						"secondary",
						"ghost",
						"link",
					],
				},
				size: {
					type: "select",
					label: "Size",
					options: ["sm", "default", "lg", "icon"],
				},
				disabled: {
					type: "boolean",
					label: "Disabled",
					description: "Disable the button",
				},
			},
			groups: {
				appearance: {
					label: "Appearance",
					fields: ["variant", "size"],
				},
				state: {
					label: "State",
					fields: ["disabled"],
				},
			},
		},
	},
};

// State for different examples
let basicExample = $state([...basicComponents]);
let complexExample = $state([...complexComponents]);
let responsiveExample = $state([...basicComponents]);

let basicMode: EditorMode = $state("edit");
let complexMode: EditorMode = $state("edit");
let responsiveMode: EditorMode = $state("edit");

function handleBasicChange(newComponents: ComponentDef[]) {
	basicExample = newComponents;
}

function handleComplexChange(newComponents: ComponentDef[]) {
	complexExample = newComponents;
}

function handleResponsiveChange(newComponents: ComponentDef[]) {
	responsiveExample = newComponents;
}
</script>

<div class="p-8 space-y-12">
  <h1 class="text-3xl font-bold">Studio Editor Examples</h1>

  <!-- Basic Editor -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Basic Editor</h2>
    <p style="color: var(--muted-foreground);">
      Simple editor setup with basic components. Click elements to select and
      edit properties.
    </p>

    <div
      class="border rounded-lg overflow-hidden"
      style="border-color: var(--border); height: 500px;"
    >
      <StudioEditor
        bind:components={basicExample}
        bind:mode={basicMode}
        sidebarMode="docked"
        {componentRegistry}
        {editorConfig}
        onChange={handleBasicChange}
        class="h-full"
      />
    </div>
  </div>

  <!-- Complex Layout Editor -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Complex Layout Editor</h2>
    <p style="color: var(--muted-foreground);">
      More complex component structure with nested layouts, navigation, and hero
      section.
    </p>

    <div
      class="border rounded-lg overflow-hidden"
      style="border-color: var(--border); height: 600px;"
    >
      <StudioEditor
        bind:components={complexExample}
        bind:mode={complexMode}
        sidebarMode="docked"
        {componentRegistry}
        {editorConfig}
        onChange={handleComplexChange}
        class="h-full"
      />
    </div>
  </div>

  <!-- Floating Sidebar Mode -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Floating Sidebar Mode</h2>
    <p style="color: var(--muted-foreground);">
      Editor with floating sidebar that can be repositioned.
    </p>

    <div
      class="border rounded-lg overflow-hidden"
      style="border-color: var(--border); height: 500px;"
    >
      <StudioEditor
        bind:components={responsiveExample}
        bind:mode={responsiveMode}
        sidebarMode="floating"
        {componentRegistry}
        {editorConfig}
        onChange={handleResponsiveChange}
        class="h-full"
      />
    </div>
  </div>

  <!-- Preview Mode Demo -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Preview Mode</h2>
    <p style="color: var(--muted-foreground);">
      Toggle between edit and preview modes to see how your components look
      without editor UI. Use Ctrl/Cmd + P or the toolbar button to switch modes.
    </p>

    <div
      class="border rounded-lg overflow-hidden"
      style="border-color: var(--border); height: 500px;"
    >
      <StudioEditor
        components={basicComponents}
        mode="preview"
        sidebarMode="hidden"
        {componentRegistry}
        {editorConfig}
        class="h-full"
      />
    </div>
  </div>

  <!-- Mobile/Responsive Demo -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Mobile Responsive</h2>
    <p style="color: var(--muted-foreground);">
      Editor optimized for mobile devices with auto sidebar mode.
    </p>

    <div
      class="max-w-sm border rounded-lg overflow-hidden"
      style="border-color: var(--border); height: 600px;"
    >
      <StudioEditor
        components={basicComponents}
        sidebarMode="auto"
        {componentRegistry}
        {editorConfig}
        class="h-full"
      />
    </div>
  </div>

  <!-- Keyboard Shortcuts Demo -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Keyboard Shortcuts</h2>
    <p style="color: var(--muted-foreground);">
      Try these keyboard shortcuts in any editor above:
    </p>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        class="p-4 border rounded-lg"
        style="border-color: var(--border); background: var(--card);"
      >
        <h4 class="font-medium mb-3">Selection & Editing</h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span>Click element</span>
            <code
              class="px-2 py-1 rounded text-xs"
              style="background: var(--muted);">Select</code
            >
          </div>
          <div class="flex justify-between">
            <span>Delete/Backspace</span>
            <code
              class="px-2 py-1 rounded text-xs"
              style="background: var(--muted);">Delete</code
            >
          </div>
        </div>
      </div>

      <div
        class="p-4 border rounded-lg"
        style="border-color: var(--border); background: var(--card);"
      >
        <h4 class="font-medium mb-3">Editor Controls</h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span>Ctrl/Cmd + Z</span>
            <code
              class="px-2 py-1 rounded text-xs"
              style="background: var(--muted);">Undo</code
            >
          </div>
          <div class="flex justify-between">
            <span>Ctrl/Cmd + Y</span>
            <code
              class="px-2 py-1 rounded text-xs"
              style="background: var(--muted);">Redo</code
            >
          </div>
          <div class="flex justify-between">
            <span>Ctrl/Cmd + P</span>
            <code
              class="px-2 py-1 rounded text-xs"
              style="background: var(--muted);">Toggle preview</code
            >
          </div>
          <div class="flex justify-between">
            <span>Ctrl/Cmd + B</span>
            <code
              class="px-2 py-1 rounded text-xs"
              style="background: var(--muted);">Toggle sidebar</code
            >
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Field Types Demo -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Field Types Showcase</h2>
    <p style="color: var(--muted-foreground);">
      The editor supports various field types for component property editing.
      Select different components in the editors above to see various field
      types in action:
    </p>

    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      <div
        class="p-3 border rounded text-center"
        style="border-color: var(--border); background: var(--card);"
      >
        <div class="font-medium text-sm">Text</div>
        <div class="text-xs" style="color: var(--muted-foreground);">
          Single/multi-line
        </div>
      </div>
      <div
        class="p-3 border rounded text-center"
        style="border-color: var(--border); background: var(--card);"
      >
        <div class="font-medium text-sm">Number</div>
        <div class="text-xs" style="color: var(--muted-foreground);">
          With min/max
        </div>
      </div>
      <div
        class="p-3 border rounded text-center"
        style="border-color: var(--border); background: var(--card);"
      >
        <div class="font-medium text-sm">Boolean</div>
        <div class="text-xs" style="color: var(--muted-foreground);">
          Toggle switch
        </div>
      </div>
      <div
        class="p-3 border rounded text-center"
        style="border-color: var(--border); background: var(--card);"
      >
        <div class="font-medium text-sm">Select</div>
        <div class="text-xs" style="color: var(--muted-foreground);">
          Dropdown
        </div>
      </div>
      <div
        class="p-3 border rounded text-center"
        style="border-color: var(--border); background: var(--card);"
      >
        <div class="font-medium text-sm">Color</div>
        <div class="text-xs" style="color: var(--muted-foreground);">
          Color picker
        </div>
      </div>
      <div
        class="p-3 border rounded text-center"
        style="border-color: var(--border); background: var(--card);"
      >
        <div class="font-medium text-sm">Spacing</div>
        <div class="text-xs" style="color: var(--muted-foreground);">
          Margin/padding
        </div>
      </div>
      <div
        class="p-3 border rounded text-center"
        style="border-color: var(--border); background: var(--card);"
      >
        <div class="font-medium text-sm">Size</div>
        <div class="text-xs" style="color: var(--muted-foreground);">
          Width/height
        </div>
      </div>
      <div
        class="p-3 border rounded text-center"
        style="border-color: var(--border); background: var(--card);"
      >
        <div class="font-medium text-sm">Link</div>
        <div class="text-xs" style="color: var(--muted-foreground);">
          URL editor
        </div>
      </div>
    </div>
  </div>

  <!-- Performance Note -->
  <div
    class="p-4 border rounded-lg"
    style="border-color: var(--border); background: var(--muted);"
  >
    <h4 class="font-medium mb-2">Performance Note</h4>
    <p class="text-sm" style="color: var(--muted-foreground);">
      These examples use dynamic imports for components to demonstrate
      real-world usage. In production, you might want to pre-import components
      for better performance.
    </p>
  </div>
</div>
