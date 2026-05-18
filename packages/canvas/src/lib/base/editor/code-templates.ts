export const editorCodeTemplates = {
  basicUsage: `<script>
  import { StudioEditor } from "$lib/base/editor";

  let components = [
    {
      id: "container",
      type: "Box",
      props: { class: "p-4" },
      children: [
        {
          id: "title",
          type: "Text",
          props: { text: "Hello World", size: "lg" }
        }
      ]
    }
  ];

  const componentRegistry = {
    Box: () => import("$lib/base/box").then(m => m.Box),
    Text: () => import("$lib/base/text").then(m => m.Text)
  };
</script>

<StudioEditor
  bind:components
  {componentRegistry}
  class="h-screen"
/>`,

  withEditorConfig: `<script>
  import { StudioEditor } from "$lib/base/editor";

  const componentRegistry = {
    Box: () => import("$lib/base/box").then(m => m.Box),
    Text: () => import("$lib/base/text").then(m => m.Text),
    Button: () => import("$lib/base/button").then(m => m.Button)
  };

  const editorConfig = {
    Text: {
      props: {},
      editorConfig: {
        fields: {
          text: {
            type: "text",
            label: "Text Content",
            description: "The text to display"
          },
          size: {
            type: "select",
            label: "Size",
            options: ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"]
          },
          weight: {
            type: "select",
            label: "Weight",
            options: ["normal", "medium", "semibold", "bold"]
          },
          color: {
            type: "color",
            label: "Color",
            description: "Text color"
          }
        },
        groups: {
          content: {
            label: "Content",
            fields: ["text"]
          },
          styling: {
            label: "Styling",
            fields: ["size", "weight", "color"]
          }
        }
      }
    },
    Button: {
      props: {},
      editorConfig: {
        fields: {
          variant: {
            type: "select",
            label: "Variant",
            options: ["default", "destructive", "outline", "secondary", "ghost", "link"]
          },
          size: {
            type: "select",
            label: "Size",
            options: ["sm", "default", "lg", "icon"]
          },
          disabled: {
            type: "boolean",
            label: "Disabled",
            description: "Disable the button"
          }
        }
      }
    }
  };

  let components = [
    {
      id: "header",
      type: "Box",
      props: { class: "p-6" },
      children: [
        {
          id: "title",
          type: "Text",
          props: { text: "Welcome", size: "2xl", weight: "bold" }
        },
        {
          id: "cta",
          type: "Button",
          props: { variant: "default", text: "Get Started" }
        }
      ]
    }
  ];
</script>

<StudioEditor
  bind:components
  {componentRegistry}
  {editorConfig}
  class="h-screen"
/>`,

  withCallbacks: `<script>
  import { StudioEditor } from "$lib/base/editor";

  let components = [];
  let mode = "edit";

  function handleComponentsChange(newComponents) {
    console.log("Components updated:", newComponents);
    // Save to localStorage, API, etc.
    localStorage.setItem("editor-components", JSON.stringify(newComponents));
  }

  function handleModeChange(newMode) {
    console.log("Mode changed to:", newMode);
    mode = newMode;
  }

  // Load components from storage on mount
  onMount(() => {
    const saved = localStorage.getItem("editor-components");
    if (saved) {
      components = JSON.parse(saved);
    }
  });
</script>

<StudioEditor
  bind:components
  bind:mode
  {componentRegistry}
  onChange={handleComponentsChange}
  onModeChange={handleModeChange}
/>`,

  customSidebarMode: `// Docked sidebar (default)
<StudioEditor
  {components}
  sidebarMode="docked"
  {componentRegistry}
/>

// Floating sidebar
<StudioEditor
  {components}
  sidebarMode="floating"
  {componentRegistry}
/>

// Hidden sidebar
<StudioEditor
  {components}
  sidebarMode="hidden"
  {componentRegistry}
/>

// Auto mode (responsive)
<StudioEditor
  {components}
  sidebarMode="auto"
  {componentRegistry}
/>`,

  fieldTypes: `const editorConfig = {
  MyComponent: {
    props: {},
    editorConfig: {
      fields: {
        // Text input
        title: {
          type: "text",
          label: "Title",
          placeholder: "Enter title..."
        },

        // Multiline text
        description: {
          type: "text",
          label: "Description",
          multiline: true
        },

        // Number input
        count: {
          type: "number",
          label: "Count",
          min: 0,
          max: 100,
          step: 1
        },

        // Boolean toggle
        visible: {
          type: "boolean",
          label: "Visible",
          default: true
        },

        // Select dropdown
        variant: {
          type: "select",
          label: "Variant",
          options: [
            { value: "primary", label: "Primary" },
            { value: "secondary", label: "Secondary" }
          ]
        },

        // Color picker
        backgroundColor: {
          type: "color",
          label: "Background Color",
          default: "#ffffff",
          alpha: true
        },

        // Spacing editor
        margin: {
          type: "spacing",
          label: "Margin",
          unit: "px"
        },

        // Size editor
        dimensions: {
          type: "size",
          label: "Dimensions",
          unit: "px"
        },

        // Link editor
        link: {
          type: "link",
          label: "Link",
          default: { url: "", target: "_self" }
        },

        // Image upload
        image: {
          type: "image",
          label: "Image",
          maxSize: 5000000 // 5MB
        },

        // Icon picker
        icon: {
          type: "icon",
          label: "Icon",
          collection: "lucide"
        },

        // Rich text editor
        content: {
          type: "richtext",
          label: "Content",
          toolbar: ["bold", "italic", "link"]
        },

        // Array field
        items: {
          type: "array",
          label: "Items",
          itemConfig: {
            type: "text",
            label: "Item"
          }
        },

        // Object field
        settings: {
          type: "object",
          label: "Settings",
          fields: {
            enabled: {
              type: "boolean",
              label: "Enabled"
            },
            value: {
              type: "text",
              label: "Value"
            }
          }
        }
      }
    }
  }
};`,

  conditionalFields: `const editorConfig = {
  ConditionalComponent: {
    props: {},
    editorConfig: {
      fields: {
        type: {
          type: "select",
          label: "Type",
          options: ["text", "image", "video"]
        },

        // Only show if type is "text"
        textContent: {
          type: "text",
          label: "Text Content",
          showIf: (data) => data.type === "text"
        },

        // Only show if type is "image"
        imageUrl: {
          type: "image",
          label: "Image",
          showIf: (data) => data.type === "image"
        },

        // Only show if type is "video"
        videoUrl: {
          type: "text",
          label: "Video URL",
          showIf: (data) => data.type === "video"
        }
      }
    }
  }
};`,

  fieldGroups: `const editorConfig = {
  GroupedComponent: {
    props: {},
    editorConfig: {
      fields: {
        title: { type: "text", label: "Title" },
        subtitle: { type: "text", label: "Subtitle" },

        backgroundColor: { type: "color", label: "Background" },
        textColor: { type: "color", label: "Text Color" },

        width: { type: "number", label: "Width" },
        height: { type: "number", label: "Height" },
        padding: { type: "spacing", label: "Padding" }
      },
      groups: {
        content: {
          label: "Content",
          fields: ["title", "subtitle"],
          icon: "type"
        },
        colors: {
          label: "Colors",
          fields: ["backgroundColor", "textColor"],
          icon: "palette"
        },
        layout: {
          label: "Layout",
          fields: ["width", "height", "padding"],
          icon: "layout"
        }
      }
    }
  }
};`,

  customRenderer: `<script>
  import { StudioEditor } from "$lib/base/editor";

  // Custom render function for special component handling
  function customRenderComponent(component) {
    // Add custom wrapper, effects, or handling
    if (component.type === "SpecialComponent") {
      // Return custom rendering logic
      return renderSpecialComponent(component);
    }

    // Default rendering for other components
    return null; // Let editor handle normally
  }
</script>

<StudioEditor
  {components}
  {componentRegistry}
  renderComponent={customRenderComponent}
/>`,

  keyboardShortcuts: `// The editor includes built-in keyboard shortcuts:

// Navigation & Selection
// Click element - Select component
// Delete/Backspace - Delete selected component

// Editor Actions
// Ctrl/Cmd + Z - Undo
// Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y - Redo
// Ctrl/Cmd + P - Toggle preview mode
// Ctrl/Cmd + B - Toggle sidebar

// These work automatically when the editor is mounted`,

  responsiveEditor: `<script>
  import { StudioEditor } from "$lib/base/editor";

  let sidebarMode = "auto"; // Automatically handles responsive behavior
  let isMobile = false;

  onMount(() => {
    if (typeof window !== "undefined") {
      // Detect mobile and adjust editor accordingly
      isMobile = window.innerWidth < 768;
      sidebarMode = isMobile ? "hidden" : "docked";

      // Listen for resize events
      window.addEventListener("resize", () => {
        const wasMobile = isMobile;
        isMobile = window.innerWidth < 768;
        if (wasMobile !== isMobile) {
          sidebarMode = isMobile ? "hidden" : "docked";
        }
      });
    }
  });
</script>

<StudioEditor
  {components}
  {componentRegistry}
  {sidebarMode}
  class="h-screen"
/>`,

  fullExample: `<script>
  import { StudioEditor } from "$lib/base/editor";
  import { onMount } from "svelte";

  // Component registry
  const componentRegistry = {
    Box: () => import("$lib/base/box").then(m => m.Box),
    Text: () => import("$lib/base/text").then(m => m.Text),
    Button: () => import("$lib/base/button").then(m => m.Button)
  };

  // Editor configuration
  const editorConfig = {
    Box: {
      props: {},
      editorConfig: {
        fields: {
          class: {
            type: "text",
            label: "CSS Classes",
            description: "Tailwind CSS classes"
          },
          style: {
            type: "text",
            label: "Inline Styles"
          }
        }
      }
    },
    Text: {
      props: {},
      editorConfig: {
        fields: {
          text: {
            type: "text",
            label: "Text Content"
          },
          size: {
            type: "select",
            label: "Size",
            options: ["xs", "sm", "base", "lg", "xl", "2xl"]
          },
          weight: {
            type: "select",
            label: "Weight",
            options: ["normal", "medium", "semibold", "bold"]
          }
        }
      }
    },
    Button: {
      props: {},
      editorConfig: {
        fields: {
          variant: {
            type: "select",
            label: "Variant",
            options: ["default", "destructive", "outline", "secondary", "ghost"]
          }
        }
      }
    }
  };

  // Initial components
  let components = [
    {
      id: "page",
      type: "Box",
      props: { class: "min-h-screen p-8" },
      children: [
        {
          id: "header",
          type: "Box",
          props: { class: "mb-8" },
          children: [
            {
              id: "title",
              type: "Text",
              props: {
                text: "Welcome to My App",
                size: "2xl",
                weight: "bold"
              }
            },
            {
              id: "subtitle",
              type: "Text",
              props: {
                text: "Built with Studio Editor",
                size: "lg"
              }
            }
          ]
        },
        {
          id: "actions",
          type: "Box",
          props: { class: "flex gap-4" },
          children: [
            {
              id: "primary-btn",
              type: "Button",
              props: { variant: "default" }
            },
            {
              id: "secondary-btn",
              type: "Button",
              props: { variant: "outline" }
            }
          ]
        }
      ]
    }
  ];

  let mode = "edit";
  let sidebarMode = "docked";

  function handleComponentsChange(newComponents) {
    console.log("Components updated:", newComponents);
    // Auto-save to localStorage
    localStorage.setItem("editor-state", JSON.stringify(newComponents));
  }

  function handleModeChange(newMode) {
    console.log("Mode changed:", newMode);
    mode = newMode;
  }

  // Load saved state
  onMount(() => {
    const saved = localStorage.getItem("editor-state");
    if (saved) {
      try {
        components = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load saved state:", e);
      }
    }
  });
</script>

<div class="h-screen flex flex-col">
  <StudioEditor
    bind:components
    bind:mode
    {sidebarMode}
    {componentRegistry}
    {editorConfig}
    onChange={handleComponentsChange}
    onModeChange={handleModeChange}
    class="flex-1"
  />
</div>`,
};
