<script lang="ts">
import { StudioCanvas } from "./index.js";
import type { ComponentDef } from "./types.js";

// Basic example
const basicComponents: ComponentDef[] = [
	{
		id: "simple-container",
		type: "Box",
		props: {
			class: "p-4 border rounded",
			style: "background: var(--card); border-color: var(--border);",
		},
		children: [
			{
				id: "simple-title",
				type: "Text",
				props: {
					size: "lg",
					weight: "semibold",
					text: "Hello from StudioCanvas!",
				},
			},
		],
	},
];

// Layout example
const layoutComponents: ComponentDef[] = [
	{
		id: "header",
		type: "Box",
		props: {
			class: "p-4 border-b",
			style: "background: var(--card); border-color: var(--border);",
		},
		children: [
			{
				id: "nav",
				type: "Box",
				props: { class: "flex items-center justify-between" },
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
						type: "Box",
						props: { class: "flex gap-2" },
						children: [
							{
								id: "home-btn",
								type: "Button",
								props: { variant: "ghost" },
							},
							{
								id: "about-btn",
								type: "Button",
								props: { variant: "ghost" },
							},
						],
					},
				],
			},
		],
	},
	{
		id: "content",
		type: "Box",
		props: { class: "p-6" },
		children: [
			{
				id: "main-title",
				type: "Text",
				props: {
					size: "2xl",
					weight: "bold",
					text: "Welcome to the Canvas",
				},
			},
			{
				id: "description",
				type: "Text",
				props: {
					size: "base",
					color: "var(--muted-foreground)",
					text: "This layout is built dynamically from component definitions.",
				},
			},
		],
	},
];

// Grid example
const gridComponents: ComponentDef[] = [
	{
		id: "grid-container",
		type: "Box",
		props: {
			class: "grid grid-cols-1 md:grid-cols-3 gap-4 p-4",
		},
		children: [
			{
				id: "card-1",
				type: "Box",
				props: {
					class: "p-4 border rounded-lg",
					style: "background: var(--card); border-color: var(--border);",
				},
				children: [
					{
						id: "card-1-title",
						type: "Text",
						props: {
							size: "lg",
							weight: "semibold",
							text: "Feature One",
						},
					},
					{
						id: "card-1-desc",
						type: "Text",
						props: {
							size: "sm",
							color: "var(--muted-foreground)",
							text: "Description of the first feature",
						},
					},
				],
			},
			{
				id: "card-2",
				type: "Box",
				props: {
					class: "p-4 border rounded-lg",
					style: "background: var(--card); border-color: var(--border);",
				},
				children: [
					{
						id: "card-2-title",
						type: "Text",
						props: {
							size: "lg",
							weight: "semibold",
							text: "Feature Two",
						},
					},
					{
						id: "card-2-desc",
						type: "Text",
						props: {
							size: "sm",
							color: "var(--muted-foreground)",
							text: "Description of the second feature",
						},
					},
				],
			},
			{
				id: "card-3",
				type: "Box",
				props: {
					class: "p-4 border rounded-lg",
					style: "background: var(--card); border-color: var(--border);",
				},
				children: [
					{
						id: "card-3-title",
						type: "Text",
						props: {
							size: "lg",
							weight: "semibold",
							text: "Feature Three",
						},
					},
					{
						id: "card-3-desc",
						type: "Text",
						props: {
							size: "sm",
							color: "var(--muted-foreground)",
							text: "Description of the third feature",
						},
					},
				],
			},
		],
	},
];

// Button showcase
const buttonComponents: ComponentDef[] = [
	{
		id: "button-showcase",
		type: "Box",
		props: { class: "p-6 space-y-4" },
		children: [
			{
				id: "button-title",
				type: "Text",
				props: {
					size: "xl",
					weight: "semibold",
					text: "Button Variants",
				},
			},
			{
				id: "button-row-1",
				type: "Box",
				props: { class: "flex flex-wrap gap-2" },
				children: [
					{
						id: "default-btn",
						type: "Button",
						props: { variant: "default" },
					},
					{
						id: "secondary-btn",
						type: "Button",
						props: { variant: "secondary" },
					},
					{
						id: "outline-btn",
						type: "Button",
						props: { variant: "outline" },
					},
				],
			},
			{
				id: "button-row-2",
				type: "Box",
				props: { class: "flex flex-wrap gap-2" },
				children: [
					{
						id: "ghost-btn",
						type: "Button",
						props: { variant: "ghost" },
					},
					{
						id: "link-btn",
						type: "Button",
						props: { variant: "link" },
					},
					{
						id: "destructive-btn",
						type: "Button",
						props: { variant: "destructive" },
					},
				],
			},
		],
	},
];

// Error demo components
const errorComponents: ComponentDef[] = [
	{
		id: "valid-component",
		type: "Text",
		props: {
			text: "This component renders correctly",
		},
	},
	{
		id: "invalid-component",
		type: "NonExistentComponent",
		props: {},
	},
	{
		id: "malformed-component",
		type: "",
		props: {},
	},
];
</script>

<div class="p-8 space-y-12">
  <h1 class="text-3xl font-bold">StudioCanvas Examples</h1>

  <!-- Basic Example -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Basic Usage</h2>
    <p style="color: var(--muted-foreground);">
      Simple container with text content rendered from component definitions.
    </p>
    <div class="border rounded-lg" style="border-color: var(--border);">
      <StudioCanvas components={basicComponents} />
    </div>
  </div>

  <!-- Layout Example -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Layout Structure</h2>
    <p style="color: var(--muted-foreground);">
      Complex layout with header navigation and content area.
    </p>
    <div class="border rounded-lg overflow-hidden" style="border-color: var(--border);">
      <StudioCanvas components={layoutComponents} />
    </div>
  </div>

  <!-- Grid Example -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Grid Layout</h2>
    <p style="color: var(--muted-foreground);">
      Responsive grid with feature cards.
    </p>
    <div class="border rounded-lg" style="border-color: var(--border);">
      <StudioCanvas components={gridComponents} />
    </div>
  </div>

  <!-- Button Example -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Interactive Components</h2>
    <p style="color: var(--muted-foreground);">
      Various button variants rendered through the canvas.
    </p>
    <div class="border rounded-lg" style="border-color: var(--border);">
      <StudioCanvas components={buttonComponents} />
    </div>
  </div>

  <!-- Error Handling -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Error Handling</h2>
    <p style="color: var(--muted-foreground);">
      How the canvas handles invalid or malformed component definitions.
    </p>
    <div class="border rounded-lg p-4" style="border-color: var(--border);">
      <StudioCanvas components={errorComponents} />
    </div>
  </div>

  <!-- Custom Styling -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Custom Canvas Styling</h2>
    <p style="color: var(--muted-foreground);">
      Canvas with custom CSS classes and styling.
    </p>
    <div class="border rounded-lg" style="border-color: var(--border);">
      <StudioCanvas 
        components={basicComponents} 
        class="p-8"
        style="background: var(--muted); min-height: 150px;"
      />
    </div>
  </div>

  <!-- Empty Canvas -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Empty Canvas</h2>
    <p style="color: var(--muted-foreground);">
      Canvas with no components - shows minimum height behavior.
    </p>
    <div class="border rounded-lg" style="border-color: var(--border);">
      <StudioCanvas components={[]} class="border-2 border-dashed" style="border-color: var(--muted-foreground);" />
    </div>
  </div>
</div>