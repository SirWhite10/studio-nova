<script lang="ts">
import { SvelteMap } from "svelte/reactivity";
import {
	DocsBestPractices,
	DocsContainer,
	DocsExample,
	DocsFeatures,
	DocsOverview,
	DocsPropsReference,
} from "$lib/site/docs/index.js";
import { canvasCodeTemplates } from "./code-templates.js";
import { Canvas } from "./index.js";
import type { ComponentDef } from "./types.js";

// Basic example
const basicComponents: ComponentDef[] = [
	{
		id: "container",
		type: "Box",
		props: {
			padding: "1rem",
			background: "var(--card)",
			borderRadius: "0.5rem",
			border: "1px solid var(--border)",
		},
		children: [
			{
				id: "title",
				type: "Text",
				props: {
					variant: "h3",
					text: "Welcome to Canvas",
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
			padding: "1rem 1.5rem",
			background: "var(--primary)",
			color: "var(--primary-foreground)",
			borderRadius: "0.5rem 0.5rem 0 0",
		},
		children: [
			{
				id: "header-title",
				type: "Text",
				props: {
					variant: "h4",
					text: "Application Header",
				},
			},
		],
	},
	{
		id: "main-content",
		type: "Box",
		props: {
			display: "flex",
			gap: "1rem",
			padding: "1rem 1.5rem",
			background: "var(--card)",
			borderRadius: "0 0 0.5rem 0.5rem",
			border: "1px solid var(--border)",
		},
		children: [
			{
				id: "sidebar",
				type: "Box",
				props: {
					width: "200px",
					padding: "1rem",
					background: "var(--muted)",
					borderRadius: "0.25rem",
				},
				children: [
					{
						id: "sidebar-title",
						type: "Text",
						props: {
							variant: "h5",
							text: "Sidebar",
							marginBottom: "0.5rem",
						},
					},
					{
						id: "nav-item",
						type: "Text",
						props: {
							variant: "small",
							text: "Navigation Item",
						},
					},
				],
			},
			{
				id: "content-area",
				type: "Box",
				props: {
					flex: "1",
					padding: "1rem",
				},
				children: [
					{
						id: "content-title",
						type: "Text",
						props: {
							variant: "h5",
							text: "Main Content Area",
							marginBottom: "1rem",
						},
					},
					{
						id: "content-text",
						type: "Text",
						props: {
							variant: "p",
							text: "This is the main content area rendered dynamically.",
						},
					},
				],
			},
		],
	},
];

// Interactive example
const interactiveComponents: ComponentDef[] = [
	{
		id: "form-container",
		type: "Box",
		props: {
			padding: "1.5rem",
			background: "var(--card)",
			border: "1px solid var(--border)",
			borderRadius: "0.75rem",
			maxWidth: "400px",
		},
		children: [
			{
				id: "form-title",
				type: "Text",
				props: {
					variant: "h4",
					text: "Contact Form",
					marginBottom: "1rem",
				},
			},
			{
				id: "form-description",
				type: "Text",
				props: {
					variant: "p",
					text: "Fill out the form below to get in touch.",
					color: "var(--muted-foreground)",
					marginBottom: "1.5rem",
				},
			},
			{
				id: "button-group",
				type: "Box",
				props: {
					display: "flex",
					gap: "0.75rem",
				},
				children: [
					{
						id: "submit-btn",
						type: "Button",
						props: {
							variant: "default",
							text: "Submit Form",
						},
					},
					{
						id: "cancel-btn",
						type: "Button",
						props: {
							variant: "outline",
							text: "Cancel",
						},
					},
				],
			},
		],
	},
];

// Grid layout example
const gridComponents: ComponentDef[] = [
	{
		id: "grid-container",
		type: "Box",
		props: {
			display: "grid",
			cols: "repeat(3, 1fr)",
			gap: "1rem",
			padding: "1rem",
		},
		children: Array.from({ length: 6 }, (_, i) => ({
			id: `grid-item-${i + 1}`,
			type: "Box",
			props: {
				padding: "1rem",
				background: "var(--accent)",
				borderRadius: "0.5rem",
				textAlign: "center",
			},
			children: [
				{
					id: `grid-text-${i + 1}`,
					type: "Text",
					props: {
						variant: "p",
						text: `Item ${i + 1}`,
						fontWeight: "600",
					},
				},
			],
		})),
	},
];

// Nested complexity example
const complexComponents: ComponentDef[] = [
	{
		id: "dashboard",
		type: "Box",
		props: {
			padding: "1rem",
			background: "var(--background)",
		},
		children: [
			{
				id: "dashboard-header",
				type: "Box",
				props: {
					display: "flex",
					justifyContent: "between",
					alignItems: "center",
					marginBottom: "1.5rem",
					padding: "1rem",
					background: "var(--card)",
					borderRadius: "0.5rem",
					border: "1px solid var(--border)",
				},
				children: [
					{
						id: "dashboard-title",
						type: "Text",
						props: {
							variant: "h3",
							text: "Dashboard",
						},
					},
					{
						id: "user-info",
						type: "Box",
						props: {
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
						},
						children: [
							{
								id: "user-name",
								type: "Text",
								props: {
									variant: "small",
									text: "John Doe",
								},
							},
							{
								id: "logout-btn",
								type: "Button",
								props: {
									variant: "outline",
									text: "Logout",
								},
							},
						],
					},
				],
			},
			{
				id: "stats-grid",
				type: "Box",
				props: {
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
					gap: "1rem",
				},
				children: [
					{
						id: "stat-card-1",
						type: "Box",
						props: {
							padding: "1.5rem",
							background: "var(--card)",
							border: "1px solid var(--border)",
							borderRadius: "0.75rem",
						},
						children: [
							{
								id: "stat-title-1",
								type: "Text",
								props: {
									variant: "small",
									text: "Total Users",
									color: "var(--muted-foreground)",
									marginBottom: "0.5rem",
								},
							},
							{
								id: "stat-value-1",
								type: "Text",
								props: {
									variant: "h2",
									text: "1,234",
									fontWeight: "700",
								},
							},
						],
					},
					{
						id: "stat-card-2",
						type: "Box",
						props: {
							padding: "1.5rem",
							background: "var(--card)",
							border: "1px solid var(--border)",
							borderRadius: "0.75rem",
						},
						children: [
							{
								id: "stat-title-2",
								type: "Text",
								props: {
									variant: "small",
									text: "Revenue",
									color: "var(--muted-foreground)",
									marginBottom: "0.5rem",
								},
							},
							{
								id: "stat-value-2",
								type: "Text",
								props: {
									variant: "h2",
									text: "$12,345",
									fontWeight: "700",
								},
							},
						],
					},
				],
			},
		],
	},
];

// Error handling example
const errorComponents: ComponentDef[] = [
	{
		id: "valid-component",
		type: "Box",
		props: {
			padding: "1rem",
			background: "var(--card)",
			borderRadius: "0.5rem",
			marginBottom: "1rem",
		},
		children: [
			{
				id: "valid-text",
				type: "Text",
				props: {
					variant: "p",
					text: "This component renders successfully.",
				},
			},
		],
	},
	{
		id: "invalid-component",
		type: "NonExistentComponent",
		props: {
			someProp: "value",
		},
	},
	{
		id: "malformed-component",
		type: "",
		props: {},
	},
];

const props = [
	{
		name: "components",
		type: "ComponentDef[]",
		description: "Array of component definitions to render",
	},
	{
		name: "customComponents",
		type: "SvelteMap<string, Component>",
		description: "Map of custom components to register with the canvas",
	},
	{
		name: "renderComponent",
		type: "RenderComponentFn",
		description: "Custom render function for component rendering logic",
	},
	{
		name: "class",
		type: "string",
		description: "Additional CSS classes to apply to the canvas container",
	},
];

const features = [
	"Dynamic component rendering from JSON-like definitions",
	"Built-in component registry with Box, Text, and Button components",
	"Support for custom component registration via SvelteMap",
	"Nested component hierarchies with unlimited depth",
	"Graceful error handling for invalid or missing components",
	"Custom render function support for advanced use cases",
	"TypeScript support with full type safety",
	"Performance optimized for large component trees",
	"Reactive updates when component definitions change",
	"Flexible prop passing to rendered components",
];

const bestPractices = [
	"Keep component definitions in reactive state for dynamic updates",
	"Use unique IDs for components to help with debugging and tracking",
	"Register custom components early in your application lifecycle",
	"Handle errors gracefully by providing fallback components",
	"Optimize component definitions to avoid unnecessary re-renders",
	"Use TypeScript interfaces to define your component structures",
	"Consider performance implications with deeply nested component trees",
	"Test error scenarios to ensure robust error handling",
	"Use meaningful component types and IDs for maintainability",
	"Cache component definitions when possible to improve performance",
];
</script>

<DocsContainer>
  <DocsOverview>
    Canvas is a powerful dynamic component renderer that builds UI
    structures from JSON-like component definitions. It includes a built-in
    component registry, supports custom component registration, and handles
    nested component hierarchies with graceful error handling. Perfect for
    visual editors, dynamic layouts, and runtime UI generation.
  </DocsOverview>

  <DocsFeatures {features} />

  <DocsExample
    title="Basic Usage"
    description="Simple component rendering with built-in Box and Text components."
    code={canvasCodeTemplates.basicUsage}
  >
    <Canvas components={basicComponents} />
  </DocsExample>

  <DocsExample
    title="Layout Structure"
    description="Build complex layouts with nested components and flexbox."
    code={canvasCodeTemplates.layoutStructure}
  >
    <Canvas components={layoutComponents} />
  </DocsExample>

  <DocsExample
    title="Interactive Components"
    description="Create interactive forms and button groups."
    code={canvasCodeTemplates.interactiveForm}
  >
    <Canvas components={interactiveComponents} />
  </DocsExample>

  <DocsExample
    title="Grid Layout"
    description="Use CSS Grid for responsive card layouts."
    code={canvasCodeTemplates.gridLayout}
  >
    <Canvas components={gridComponents} />
  </DocsExample>

  <DocsExample
    title="Complex Dashboard"
    description="Demonstrate deeply nested component structures with multiple levels."
    code={canvasCodeTemplates.dashboardExample}
  >
    <Canvas components={complexComponents} />
  </DocsExample>

  <DocsExample
    title="Error Handling"
    description="Canvas gracefully handles invalid component definitions."
    code={canvasCodeTemplates.errorHandling}
  >
    <Canvas components={errorComponents} />
  </DocsExample>

  <DocsExample
    title="Custom Components"
    description="Register and use custom Svelte components within Canvas."
    code={canvasCodeTemplates.customComponents}
  >
    <!-- Example showing how custom components would work -->
    <Canvas
      components={[
        {
          id: "custom-demo",
          type: "Box",
          props: {
            padding: "1rem",
            background: "var(--muted)",
            borderRadius: "0.5rem",
            border: "1px solid var(--border)",
          },
          children: [
            {
              id: "custom-text",
              type: "Text",
              props: {
                variant: "p",
                text: "Custom components can be registered using SvelteMap and referenced by type name.",
              },
            },
          ],
        },
      ]}
    />
  </DocsExample>

  <DocsExample
    title="Dynamic Components"
    description="Build reactive UIs that update based on state changes."
    code={canvasCodeTemplates.dynamicComponents}
  >
    <!-- Simple dynamic example -->
    <Canvas
      components={[
        {
          id: "dynamic-container",
          type: "Box",
          props: {
            padding: "1rem",
            background: "var(--card)",
            borderRadius: "0.5rem",
            border: "1px solid var(--border)",
          },
          children: [
            {
              id: "dynamic-title",
              type: "Text",
              props: {
                variant: "h5",
                text: "Dynamic Component Example",
                marginBottom: "0.5rem",
              },
            },
            {
              id: "dynamic-description",
              type: "Text",
              props: {
                variant: "p",
                text: "Components can be generated dynamically and updated reactively.",
                color: "var(--muted-foreground)",
              },
            },
          ],
        },
      ]}
    />
  </DocsExample>

  <DocsPropsReference {props} />

  <DocsExample
    title="TypeScript Definitions"
    description="Type definitions for component definitions and related interfaces."
    code={canvasCodeTemplates.typeScriptDefinitions}
  >
    <div class="space-y-2">
      <p>
        Canvas provides complete TypeScript support with type-safe
        component definitions.
      </p>
      <p style="color: var(--muted-foreground);">
        Use the ComponentDef interface to define your component structures with
        full type checking.
      </p>
    </div>
  </DocsExample>

  <DocsBestPractices practices={bestPractices} />
</DocsContainer>
