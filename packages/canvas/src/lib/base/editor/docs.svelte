<script lang="ts">
import Button from "$lib/base/button/button.svelte";
import type { ComponentDef } from "$lib/base/canvas/types.js";
import Text from "$lib/base/text/index.js";
import Box from "$lib/base/view/index.js";
import { CanvasEditor } from "./index.js";
import type { EditorMode } from "./types.js";

// Sample component data for the editor
const sampleComponents: ComponentDef[] = [
	{
		id: "header",
		type: "Box",
		props: {
			class: "p-6 border-b",
			style: "background: var(--card); border-color: var(--border);",
		},
		children: [
			{
				id: "title",
				type: "Text",
				props: {
					size: "2xl",
					weight: "bold",
					text: "Welcome to Canvas Editor",
				},
			},
			{
				id: "subtitle",
				type: "Text",
				props: {
					size: "base",
					color: "var(--muted-foreground)",
					text: "Visual component editor with drag & drop functionality",
				},
			},
		],
	},
	{
		id: "content",
		type: "Box",
		props: {
			class: "p-6 space-y-4",
		},
		children: [
			{
				id: "description",
				type: "Text",
				props: {
					size: "base",
					text: "This is an editable component structure. Click on any element to select and edit its properties.",
				},
			},
			{
				id: "button-group",
				type: "Box",
				props: {
					class: "flex gap-3",
				},
				children: [
					{
						id: "primary-btn",
						type: "Button",
						props: {
							variant: "default",
						},
					},
					{
						id: "secondary-btn",
						type: "Button",
						props: {
							variant: "outline",
						},
					},
				],
			},
		],
	},
];

// Component registry for the editor
const componentRegistry = {
	Box: Box,
	Text: Text,
	Button: Button,
};

// Editor configuration for components
const editorConfig = {
	Box: {
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
			},
		},
	},
};

let editorMode: EditorMode = $state("edit");
let components = $state(sampleComponents);

function handleComponentsChange(newComponents: ComponentDef[]) {
	components = newComponents;
}

function handleModeChange(newMode: EditorMode) {
	editorMode = newMode;
}
</script>

<div class="space-y-8">
  <!-- Header -->
  <div class="space-y-2">
    <h1 class="text-3xl font-bold">Canvas Editor</h1>
    <p class="text-lg" style="color: var(--muted-foreground);">
      A comprehensive visual component editor with drag & drop functionality.
    </p>
  </div>

  <!-- Description -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Overview</h2>
    <p>
      The Canvas Editor is a powerful visual editor that allows you to create
      and modify component structures through an intuitive interface. It
      features drag & drop functionality, property editing, real-time preview,
      and comprehensive keyboard shortcuts.
    </p>

    <div class="space-y-2">
      <h3 class="text-lg font-medium">Key Features</h3>
      <ul
        class="list-disc list-inside space-y-1"
        style="color: var(--muted-foreground);"
      >
        <li>Visual component editing with drag & drop</li>
        <li>Real-time property editing sidebar</li>
        <li>Edit and preview mode switching</li>
        <li>Undo/redo functionality with history</li>
        <li>Keyboard shortcuts for common actions</li>
        <li>Component selection and highlighting</li>
        <li>Minimal sidebar inspector opened from a top-right trigger</li>
        <li>Component registry for extensibility</li>
      </ul>
    </div>
  </div>

  <!-- Live Editor Example -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Interactive Editor</h2>
    <p>
      Try the editor below - click elements to select them, use the sidebar to
      edit properties:
    </p>

    <div
      class="border rounded-lg overflow-hidden"
      style="border-color: var(--border); height: 600px;"
    >
      <CanvasEditor
        bind:components
        bind:mode={editorMode}
        {componentRegistry}
        {editorConfig}
        onChange={handleComponentsChange}
        onModeChange={handleModeChange}
        class="h-full"
      />
    </div>
  </div>

  <!-- Keyboard Shortcuts -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Keyboard Shortcuts</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        class="p-4 border rounded-lg"
        style="border-color: var(--border); background: var(--card);"
      >
        <h4 class="font-medium mb-3">Navigation & Selection</h4>
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
              style="background: var(--muted);">Delete selected</code
            >
          </div>
        </div>
      </div>

      <div
        class="p-4 border rounded-lg"
        style="border-color: var(--border); background: var(--card);"
      >
        <h4 class="font-medium mb-3">Editor Actions</h4>
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

  <!-- Editor Modes -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Editor Modes</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        class="p-4 border rounded-lg"
        style="border-color: var(--border); background: var(--card);"
      >
        <h4 class="font-medium mb-2">Edit Mode</h4>
        <p class="text-sm" style="color: var(--muted-foreground);">
          Full editing capabilities with component selection, property editing,
          and the sidebar inspector.
        </p>
      </div>

      <div
        class="p-4 border rounded-lg"
        style="border-color: var(--border); background: var(--card);"
      >
        <h4 class="font-medium mb-2">Preview Mode</h4>
        <p class="text-sm" style="color: var(--muted-foreground);">
          Clean preview without editor UI - see how your components will look in
          production.
        </p>
      </div>
    </div>
  </div>

  <!-- Inspector States -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Inspector States</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        class="p-4 border rounded-lg"
        style="border-color: var(--border); background: var(--card);"
      >
        <h4 class="font-medium mb-2">App Root</h4>
        <p class="text-sm" style="color: var(--muted-foreground);">
          When nothing is selected, the sidebar shows app-level settings and root metadata.
        </p>
      </div>

      <div
        class="p-4 border rounded-lg"
        style="border-color: var(--border); background: var(--card);"
      >
        <h4 class="font-medium mb-2">Selected Node</h4>
        <p class="text-sm" style="color: var(--muted-foreground);">
          Selecting a canvas node switches the sidebar to schema-driven node properties.
        </p>
      </div>
    </div>
  </div>

  <!-- Usage -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Usage</h2>

    <div class="space-y-4">
      <div>
        <h3 class="text-lg font-medium mb-2">Basic Setup</h3>
        <pre
          class="p-4 rounded-lg text-sm overflow-x-auto"
          style="background: var(--muted); color: var(--foreground);"><code
            >&lt;script&gt;
  import &#123; CanvasEditor &#125; from '$lib/base/editor';

  let components = [
    &#123;
      id: 'container',
      type: 'Box',
      props: &#123; class: 'p-4' &#125;,
      children: [
        &#123;
          id: 'title',
          type: 'Text',
          props: &#123; text: 'Hello World' &#125;
        &#125;
      ]
    &#125;
  ];

  const componentRegistry = &#123;
    Box: () => import('$lib/base/box').then(m => m.Box),
    Text: () => import('$lib/base/text').then(m => m.Text)
  &#125;;
&lt;/script&gt;

&lt;CanvasEditor
  bind:components
  &#123;componentRegistry&#125;
  class="h-screen"
/&gt;</code
          ></pre>
      </div>

      <div>
        <h3 class="text-lg font-medium mb-2">With Editor Configuration</h3>
        <pre
          class="p-4 rounded-lg text-sm overflow-x-auto"
          style="background: var(--muted); color: var(--foreground);"><code
            >&lt;script&gt;
  const editorConfig = &#123;
    Text: &#123;
      props: &#123;&#125;,
      editorConfig: &#123;
        fields: &#123;
          text: &#123;
            type: 'text',
            label: 'Text Content',
            description: 'The text to display'
          &#125;,
          size: &#123;
            type: 'select',
            label: 'Size',
            options: ['sm', 'base', 'lg', 'xl']
          &#125;
        &#125;
      &#125;
    &#125;
  &#125;;

  function handleComponentsChange(newComponents) &#123;
    console.log('Components updated:', newComponents);
  &#125;
&lt;/script&gt;

&lt;CanvasEditor
  bind:components
  &#123;componentRegistry&#125;
  &#123;editorConfig&#125;
  onChange=&#123;handleComponentsChange&#125;
/&gt;</code
          ></pre>
      </div>
    </div>
  </div>

  <!-- Props Reference -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Props</h2>

    <div class="overflow-x-auto">
      <table class="w-full border-collapse">
        <thead>
          <tr class="border-b" style="border-color: var(--border);">
            <th class="text-left p-2 font-medium">Prop</th>
            <th class="text-left p-2 font-medium">Type</th>
            <th class="text-left p-2 font-medium">Default</th>
            <th class="text-left p-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b" style="border-color: var(--border);">
            <td class="p-2 font-mono text-sm">components</td>
            <td class="p-2 text-sm">ComponentDef[]</td>
            <td class="p-2 text-sm">[]</td>
            <td class="p-2 text-sm">Array of component definitions to edit</td>
          </tr>
          <tr class="border-b" style="border-color: var(--border);">
            <td class="p-2 font-mono text-sm">mode</td>
            <td class="p-2 text-sm">EditorMode</td>
            <td class="p-2 text-sm">'edit'</td>
            <td class="p-2 text-sm">Editor mode: 'edit' or 'preview'</td>
          </tr>
          <tr class="border-b" style="border-color: var(--border);">
            <td class="p-2 font-mono text-sm">sidebarMode</td>
            <td class="p-2 text-sm">EditorSidebarMode</td>
            <td class="p-2 text-sm">'docked'</td>
            <td class="p-2 text-sm">Optional legacy sidebar mode prop. The default CanvasEditor experience uses a minimal trigger + right inspector and starts closed.</td>
          </tr>
          <tr class="border-b" style="border-color: var(--border);">
            <td class="p-2 font-mono text-sm">componentRegistry</td>
            <td class="p-2 text-sm">Record&lt;string, Component&gt;</td>
            <td class="p-2 text-sm">{"{}"}</td>
            <td class="p-2 text-sm">Available components for the editor</td>
          </tr>
          <tr class="border-b" style="border-color: var(--border);">
            <td class="p-2 font-mono text-sm">editorConfig</td>
            <td class="p-2 text-sm">Record&lt;string, Config&gt;</td>
            <td class="p-2 text-sm">undefined</td>
            <td class="p-2 text-sm">Component editor field configurations</td>
          </tr>
          <tr class="border-b" style="border-color: var(--border);">
            <td class="p-2 font-mono text-sm">onChange</td>
            <td class="p-2 text-sm">Function</td>
            <td class="p-2 text-sm">undefined</td>
            <td class="p-2 text-sm">Callback when components change</td>
          </tr>
          <tr class="border-b" style="border-color: var(--border);">
            <td class="p-2 font-mono text-sm">onModeChange</td>
            <td class="p-2 text-sm">Function</td>
            <td class="p-2 text-sm">undefined</td>
            <td class="p-2 text-sm">Callback when editor mode changes</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Editor Field Types -->
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Editor Field Types</h2>
    <p>
      The editor supports various field types for component property editing:
    </p>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        class="p-3 border rounded"
        style="border-color: var(--border); background: var(--card);"
      >
        <h5 class="font-medium text-sm">text</h5>
        <p class="text-xs" style="color: var(--muted-foreground);">
          Single/multi-line text input
        </p>
      </div>
      <div
        class="p-3 border rounded"
        style="border-color: var(--border); background: var(--card);"
      >
        <h5 class="font-medium text-sm">number</h5>
        <p class="text-xs" style="color: var(--muted-foreground);">
          Numeric input with min/max
        </p>
      </div>
      <div
        class="p-3 border rounded"
        style="border-color: var(--border); background: var(--card);"
      >
        <h5 class="font-medium text-sm">boolean</h5>
        <p class="text-xs" style="color: var(--muted-foreground);">
          Checkbox toggle
        </p>
      </div>
      <div
        class="p-3 border rounded"
        style="border-color: var(--border); background: var(--card);"
      >
        <h5 class="font-medium text-sm">select</h5>
        <p class="text-xs" style="color: var(--muted-foreground);">
          Dropdown selection
        </p>
      </div>
      <div
        class="p-3 border rounded"
        style="border-color: var(--border); background: var(--card);"
      >
        <h5 class="font-medium text-sm">color</h5>
        <p class="text-xs" style="color: var(--muted-foreground);">
          Color picker
        </p>
      </div>
      <div
        class="p-3 border rounded"
        style="border-color: var(--border); background: var(--card);"
      >
        <h5 class="font-medium text-sm">spacing</h5>
        <p class="text-xs" style="color: var(--muted-foreground);">
          Margin/padding editor
        </p>
      </div>
      <div
        class="p-3 border rounded"
        style="border-color: var(--border); background: var(--card);"
      >
        <h5 class="font-medium text-sm">size</h5>
        <p class="text-xs" style="color: var(--muted-foreground);">
          Width/height editor
        </p>
      </div>
      <div
        class="p-3 border rounded"
        style="border-color: var(--border); background: var(--card);"
      >
        <h5 class="font-medium text-sm">link</h5>
        <p class="text-xs" style="color: var(--muted-foreground);">
          URL with target options
        </p>
      </div>
      <div
        class="p-3 border rounded"
        style="border-color: var(--border); background: var(--card);"
      >
        <h5 class="font-medium text-sm">image</h5>
        <p class="text-xs" style="color: var(--muted-foreground);">
          Image upload/selection
        </p>
      </div>
      <div
        class="p-3 border rounded"
        style="border-color: var(--border); background: var(--card);"
      >
        <h5 class="font-medium text-sm">icon</h5>
        <p class="text-xs" style="color: var(--muted-foreground);">
          Icon picker
        </p>
      </div>
      <div
        class="p-3 border rounded"
        style="border-color: var(--border); background: var(--card);"
      >
        <h5 class="font-medium text-sm">richtext</h5>
        <p class="text-xs" style="color: var(--muted-foreground);">
          Rich text editor
        </p>
      </div>
      <div
        class="p-3 border rounded"
        style="border-color: var(--border); background: var(--card);"
      >
        <h5 class="font-medium text-sm">array/object</h5>
        <p class="text-xs" style="color: var(--muted-foreground);">
          Complex data structures
        </p>
      </div>
    </div>
  </div>
</div>
