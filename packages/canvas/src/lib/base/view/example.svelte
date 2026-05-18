<script lang="ts">
// @ts-nocheck
import { ViewContainer } from "$lib/base/view-container/index.js";
import { ViewFlex } from "$lib/base/view-flex/index.js";
import { ViewGrid } from "$lib/base/view-grid/index.js";
import { View } from "./index.js";

// Interactive state for controls
let selectedDisplay = $state<
	"flex" | "grid" | "block" | "inline-block" | "inline-flex" | "inline-grid"
>("flex");
let selectedShadow = $state<"none" | "sm" | "md" | "lg" | "xl">("md");
let selectedElement = $state<keyof HTMLElementTagNameMap>("div");
let customBackground = $state("var(--primary)");
let customPadding = $state("1rem");
let customGap = $state("1rem");

// New architecture feature states
let showEventDemo = $state(false);
let showStateDemo = $state(false);
let showThemeDemo = $state(false);
let interactionCount = $state(0);
let hoverState = $state("Not hovering");
let buttonDisabled = $state(false);
let buttonLoading = $state(false);
let buttonSelected = $state(false);
let currentTheme = $state("light");

// Valid as prop options from the component
const elementOptions = [
	"div",
	"section",
	"article",
	"header",
	"footer",
	"main",
	"nav",
	"aside",
	"button",
	"a",
	"span",
	"p",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
];

const displayOptions = [
	"flex",
	"grid",
	"block",
	"inline-block",
	"inline-flex",
	"inline-grid",
];
const shadowOptions = ["none", "sm", "md", "lg", "xl"] as const;

// Demo content
const demoItems = ["Item 1", "Item 2", "Item 3", "Item 4"];
</script>

<div class="space-y-12 p-8">
  <div class="space-y-2">
    <h1 class="text-3xl font-bold">View Component Examples</h1>
    <p class="text-lg" style="color: var(--muted-foreground);">
      The View component is a fundamental building block that serves as the
      foundation for all layout components. It provides CSS-based styling
      through props that set CSS variables, making it the most flexible
      component in our system.
    </p>
  </div>

  <!-- Overview -->
  <section class="space-y-4">
    <h2 class="text-2xl font-semibold">Overview</h2>
    <div
      style="background: var(--muted); padding: 1.5rem; border-radius: 0.5rem;"
    >
      <p class="mb-4">
        The View component is the architectural foundation of our component
        system:
      </p>
      <ul
        class="list-disc list-inside space-y-2"
        style="color: var(--muted-foreground);"
      >
        <li>
          <strong>Foundation Component:</strong> ViewContainer, ViewFlex, and ViewGrid
          are all built using View
        </li>
        <li>
          <strong>CSS Variable System:</strong> All styling is done via CSS variables
          for maximum flexibility
        </li>
        <li>
          <strong>Performance Optimized:</strong> Pure CSS approach with minimal
          runtime overhead
        </li>
        <li>
          <strong>Type Safety:</strong> Full TypeScript support with comprehensive
          prop validation
        </li>
        <li>
          <strong>Semantic HTML:</strong> Supports any HTML element via the 'as'
          prop
        </li>
        <li>
          <strong>Studio Integration:</strong> Perfect for visual editors and component
          builders
        </li>
      </ul>
    </div>
  </section>

  <!-- How View Powers Other Components -->
  <section class="space-y-4">
    <h2 class="text-2xl font-semibold">How View Powers Other Components</h2>
    <p style="color: var(--muted-foreground);">
      View is the foundation that ViewContainer, ViewFlex, and ViewGrid are
      built upon. Here's how each component uses View internally:
    </p>

    <div class="space-y-6">
      <!-- ViewContainer Example -->
      <div class="border rounded-lg" style="border-color: var(--border);">
        <div
          style="padding: 1rem; border-bottom: 1px solid var(--border); background: var(--muted);"
        >
          <h3 class="text-lg font-semibold mb-2">ViewContainer</h3>
          <p class="text-sm" style="color: var(--muted-foreground);">
            Built with View + container-specific CSS variables for max-width and
            responsive padding
          </p>
        </div>
        <div style="padding: 1rem;">
          <ViewContainer maxWidth="2xl" paddingX="2rem">
            <div
              style="background: var(--blue-100, #dbeafe); padding: 1rem; border-radius: 0.5rem; text-align: center;"
            >
              ViewContainer with 2xl max-width and 2rem padding
            </div>
          </ViewContainer>
        </div>
      </div>

      <!-- ViewFlex Example -->
      <div class="border rounded-lg" style="border-color: var(--border);">
        <div
          style="padding: 1rem; border-bottom: 1px solid var(--border); background: var(--muted);"
        >
          <h3 class="text-lg font-semibold mb-2">ViewFlex</h3>
          <p class="text-sm" style="color: var(--muted-foreground);">
            Built with View + flexbox-specific CSS variables for direction,
            alignment, and gap
          </p>
        </div>
        <div style="padding: 1rem;">
          <ViewFlex direction="row" justify="between" align="center" gap="1rem">
            <div
              style="background: var(--green-100, #dcfce7); padding: 1rem; border-radius: 0.5rem;"
            >
              Left
            </div>
            <div
              style="background: var(--purple-100, #e9d5ff); padding: 1rem; border-radius: 0.5rem;"
            >
              Center
            </div>
            <div
              style="background: var(--yellow-100, #fef3c7); padding: 1rem; border-radius: 0.5rem;"
            >
              Right
            </div>
          </ViewFlex>
        </div>
      </div>

      <!-- ViewGrid Example -->
      <div class="border rounded-lg" style="border-color: var(--border);">
        <div
          style="padding: 1rem; border-bottom: 1px solid var(--border); background: var(--muted);"
        >
          <h3 class="text-lg font-semibold mb-2">ViewGrid</h3>
          <p class="text-sm" style="color: var(--muted-foreground);">
            Built with View + grid-specific CSS variables for columns, rows, and
            alignment
          </p>
        </div>
        <div style="padding: 1rem;">
          <ViewGrid cols={3} gap="1rem">
            <div
              style="background: var(--red-100, #fee2e2); padding: 1rem; border-radius: 0.5rem; text-align: center;"
            >
              Grid 1
            </div>
            <div
              style="background: var(--orange-100, #fed7aa); padding: 1rem; border-radius: 0.5rem; text-align: center;"
            >
              Grid 2
            </div>
            <div
              style="background: var(--pink-100, #fce7f3); padding: 1rem; border-radius: 0.5rem; text-align: center;"
            >
              Grid 3
            </div>
          </ViewGrid>
        </div>
      </div>
    </div>
  </section>

  <!-- Equivalent Implementation -->
  <section class="space-y-4">
    <h2 class="text-2xl font-semibold">Equivalent View Implementation</h2>
    <p style="color: var(--muted-foreground);">
      Here's how you could achieve the same layouts using the base View
      component directly:
    </p>

    <div class="space-y-6">
      <!-- View as Container -->
      <div>
        <h3 class="text-lg font-medium mb-2">Container with View</h3>
        <View width="100%" maxWidth="42rem" margin="0 auto" padding="0 2rem">
          <div
            style="background: var(--blue-100, #dbeafe); padding: 1rem; border-radius: 0.5rem; text-align: center;"
          >
            View acting as a container (equivalent to ViewContainer)
          </div>
        </View>
      </div>

      <!-- View as Flex -->
      <div>
        <h3 class="text-lg font-medium mb-2">Flexbox with View</h3>
        <View
          display="flex"
          flexDirection="row"
          justifyContent="between"
          alignItems="center"
          gap="1rem"
        >
          <div
            style="background: var(--green-100, #dcfce7); padding: 1rem; border-radius: 0.5rem;"
          >
            Left
          </div>
          <div
            style="background: var(--purple-100, #e9d5ff); padding: 1rem; border-radius: 0.5rem;"
          >
            Center
          </div>
          <div
            style="background: var(--yellow-100, #fef3c7); padding: 1rem; border-radius: 0.5rem;"
          >
            Right
          </div>
        </View>
      </div>

      <!-- View as Grid -->
      <div>
        <h3 class="text-lg font-medium mb-2">Grid with View</h3>
        <View
          display="grid"
          style="grid-template-columns: repeat(3, 1fr);"
          gap="1rem"
        >
          <div
            style="background: var(--red-100, #fee2e2); padding: 1rem; border-radius: 0.5rem; text-align: center;"
          >
            Grid 1
          </div>
          <div
            style="background: var(--orange-100, #fed7aa); padding: 1rem; border-radius: 0.5rem; text-align: center;"
          >
            Grid 2
          </div>
          <div
            style="background: var(--pink-100, #fce7f3); padding: 1rem; border-radius: 0.5rem; text-align: center;"
          >
            Grid 3
          </div>
        </View>
      </div>
    </div>
  </section>

  <!-- Interactive Demo -->
  <section class="space-y-4">
    <h2 class="text-2xl font-semibold">Interactive Demo</h2>
    <p style="color: var(--muted-foreground);">
      Experiment with different View properties to see how they affect layout
      and styling:
    </p>

    <div class="border rounded-lg" style="border-color: var(--border);">
      <div
        style="padding: 1.5rem; border-bottom: 1px solid var(--border); background: var(--muted);"
      >
        <View
          display="grid"
          style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));"
          gap="1rem"
        >
          <View>
            <View
              as="label"
              display="block"
              margin="0 0 0.5rem 0"
              fontWeight="600">Element Type</View
            >
            <select
              bind:value={selectedElement}
              style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: 0.25rem;"
            >
              {#each elementOptions as option}
                <option value={option}>{option}</option>
              {/each}
            </select>
          </View>

          <View>
            <View
              as="label"
              display="block"
              margin="0 0 0.5rem 0"
              fontWeight="600">Display</View
            >
            <select
              bind:value={selectedDisplay}
              style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: 0.25rem;"
            >
              {#each displayOptions as option}
                <option value={option}>{option}</option>
              {/each}
            </select>
          </View>

          <View>
            <View
              as="label"
              display="block"
              margin="0 0 0.5rem 0"
              fontWeight="600">Shadow</View
            >
            <select
              bind:value={selectedShadow}
              style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: 0.25rem;"
            >
              {#each shadowOptions as option}
                <option value={option}>{option}</option>
              {/each}
            </select>
          </View>

          <View>
            <View
              as="label"
              display="block"
              margin="0 0 0.5rem 0"
              fontWeight="600">Background</View
            >
            <input
              type="text"
              bind:value={customBackground}
              style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: 0.25rem;"
            />
          </View>

          <View>
            <View
              as="label"
              display="block"
              margin="0 0 0.5rem 0"
              fontWeight="600">Padding</View
            >
            <input
              type="text"
              bind:value={customPadding}
              style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: 0.25rem;"
            />
          </View>

          <View>
            <View
              as="label"
              display="block"
              margin="0 0 0.5rem 0"
              fontWeight="600">Gap</View
            >
            <input
              type="text"
              bind:value={customGap}
              style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: 0.25rem;"
            />
          </View>
        </View>
      </div>

      <div style="padding: 1.5rem;">
        <View
          as={selectedElement}
          display={selectedDisplay}
          gap={customGap}
          padding={customPadding}
          background={customBackground}
          color="var(--primary-foreground)"
          borderRadius="0.5rem"
          shadow={selectedShadow}
        >
          {#each demoItems as item}
            <View
              padding="0.75rem"
              background="var(--card)"
              color="var(--card-foreground)"
              borderRadius="0.25rem"
              border="1px solid var(--border)"
            >
              {item}
            </View>
          {/each}
        </View>
      </div>
    </div>
  </section>

  <!-- Best Use Cases -->
  <section class="space-y-4">
    <h2 class="text-2xl font-semibold">Best Use Cases for View</h2>

    <div class="space-y-6">
      <!-- Layout Building -->
      <div class="border rounded-lg" style="border-color: var(--border);">
        <div
          style="padding: 1rem; border-bottom: 1px solid var(--border); background: var(--muted);"
        >
          <h3 class="text-lg font-semibold">1. Complex Layout Building</h3>
          <p class="text-sm" style="color: var(--muted-foreground);">
            When you need custom layouts that don't fit the standard
            ViewContainer/ViewFlex/ViewGrid patterns
          </p>
        </div>
        <div style="padding: 1rem;">
          <View
            display="grid"
            style="grid-template-areas: 'header header'; grid-template-rows: auto 1fr;"
            gap="1rem"
          >
            <View
              style="grid-area: header;"
              padding="1rem"
              background="var(--accent)"
              borderRadius="0.5rem"
              color="var(--accent-foreground)"
            >
              Custom Grid Areas Layout
            </View>
            <View display="flex" gap="1rem">
              <View
                flex="2"
                padding="1rem"
                background="var(--card)"
                border="1px solid var(--border)"
                borderRadius="0.5rem"
              >
                Main content area (flex: 2)
              </View>
              <View
                flex="1"
                padding="1rem"
                background="var(--muted)"
                borderRadius="0.5rem"
              >
                Sidebar (flex: 1)
              </View>
            </View>
          </View>
        </div>
      </div>

      <!-- Semantic HTML -->
      <div class="border rounded-lg" style="border-color: var(--border);">
        <div
          style="padding: 1rem; border-bottom: 1px solid var(--border); background: var(--muted);"
        >
          <h3 class="text-lg font-semibold">2. Semantic HTML with Styling</h3>
          <p class="text-sm" style="color: var(--muted-foreground);">
            Creating semantically correct HTML structures with precise styling
            control
          </p>
        </div>
        <div style="padding: 1rem;">
          <View
            as="article"
            padding="1.5rem"
            background="var(--card)"
            border="1px solid var(--border)"
            borderRadius="0.75rem"
          >
            <View as="header" margin="0 0 1rem 0">
              <View
                as="h3"
                fontSize="1.25rem"
                fontWeight="600"
                margin="0 0 0.5rem 0">Article Title</View
              >
              <View
                as="time"
                fontSize="0.875rem"
                color="var(--muted-foreground)"
                >Published on March 15, 2024</View
              >
            </View>
            <View as="section" lineHeight="1.6">
              <View as="p" margin="0 0 1rem 0">
                This demonstrates using View with semantic HTML elements while
                maintaining full styling control.
              </View>
              <View as="p" margin="0">
                Perfect for content that needs to be accessible and
                SEO-friendly.
              </View>
            </View>
          </View>
        </div>
      </div>

      <!-- Theming and Customization -->
      <div class="border rounded-lg" style="border-color: var(--border);">
        <div
          style="padding: 1rem; border-bottom: 1px solid var(--border); background: var(--muted);"
        >
          <h3 class="text-lg font-semibold">
            3. Advanced Theming and Customization
          </h3>
          <p class="text-sm" style="color: var(--muted-foreground);">
            Using CSS variables for dynamic theming and conditional styling
          </p>
        </div>
        <div style="padding: 1rem;">
          <View
            style="--custom-primary: oklch(0.7 0.15 280); --custom-accent: oklch(0.8 0.1 120);"
          >
            <View
              padding="1.5rem"
              background="linear-gradient(135deg, var(--custom-primary), var(--custom-accent))"
              color="white"
              borderRadius="0.75rem"
              shadow="lg"
              margin="0 0 1rem 0"
            >
              <View fontSize="1.125rem" fontWeight="600" margin="0 0 0.5rem 0">
                Custom Theme Section
              </View>
              <View fontSize="0.875rem" opacity="0.9">
                CSS variables allow for dynamic theming without component
                rerenders
              </View>
            </View>

            <View display="flex" gap="1rem">
              <View
                flex="1"
                padding="1rem"
                background="var(--custom-primary)"
                color="white"
                borderRadius="0.5rem"
                textAlign="center"
              >
                Primary Theme
              </View>
              <View
                flex="1"
                padding="1rem"
                background="var(--custom-accent)"
                color="white"
                borderRadius="0.5rem"
                textAlign="center"
              >
                Accent Theme
              </View>
            </View>
          </View>
        </div>
      </div>

      <!-- Studio Integration -->
      <div class="border rounded-lg" style="border-color: var(--border);">
        <div
          style="padding: 1rem; border-bottom: 1px solid var(--border); background: var(--muted);"
        >
          <h3 class="text-lg font-semibold">
            4. Studio Visual Editor Integration
          </h3>
          <p class="text-sm" style="color: var(--muted-foreground);">
            Perfect for visual editors where all styling properties need to be
            adjustable
          </p>
        </div>
        <div style="padding: 1rem;">
          <View
            display="flex"
            flexDirection="column"
            gap="1rem"
            padding="1.5rem"
            background="var(--card)"
            border="2px dashed var(--border)"
            borderRadius="0.5rem"
          >
            <View
              textAlign="center"
              color="var(--muted-foreground)"
              fontSize="0.875rem"
            >
              ✨ Editable Container
            </View>
            <View display="flex" gap="1rem" justifyContent="center">
              <View
                padding="0.75rem 1.5rem"
                background="var(--primary)"
                color="var(--primary-foreground)"
                borderRadius="0.25rem"
                cursor="pointer"
                as="button"
              >
                Button
              </View>
              <View
                padding="0.75rem 1.5rem"
                background="var(--secondary)"
                color="var(--secondary-foreground)"
                borderRadius="0.25rem"
                cursor="pointer"
                as="button"
              >
                Button
              </View>
            </View>
            <View
              textAlign="center"
              fontSize="0.75rem"
              color="var(--muted-foreground)"
            >
              All properties can be adjusted via visual editor
            </View>
          </View>
        </div>
      </div>
    </div>
  </section>

  <!-- Performance Benefits -->
  <section class="space-y-4">
    <h2 class="text-2xl font-semibold">Performance Benefits</h2>
    <div
      style="background: var(--muted); padding: 1.5rem; border-radius: 0.5rem;"
    >
      <View as="h3" fontSize="1.125rem" fontWeight="600" margin="0 0 1rem 0"
        >Why View is Performance-Optimized</View
      >
      <View
        as="ul"
        style="list-style: disc; padding-left: 1.5rem;"
        lineHeight="1.6"
      >
        <View as="li" margin="0 0 0.5rem 0">
          <strong>CSS Variables:</strong> All styling is done via CSS custom properties,
          eliminating JavaScript style calculations
        </View>
        <View as="li" margin="0 0 0.5rem 0">
          <strong>Minimal Runtime:</strong> No complex state management or reactive
          style updates
        </View>
        <View as="li" margin="0 0 0.5rem 0">
          <strong>Browser Optimization:</strong> Leverages native CSS cascade and
          inheritance
        </View>
        <View as="li" margin="0 0 0.5rem 0">
          <strong>Zero Dependencies:</strong> Pure Svelte component with no external
          libraries
        </View>
        <View as="li">
          <strong>Tree Shaking:</strong> Only used styles are included in the final
          bundle
        </View>
      </View>
    </div>
  </section>

  <!-- Component Comparison -->
  <section class="space-y-4">
    <h2 class="text-2xl font-semibold">When to Use Each Component</h2>

    <div class="overflow-x-auto">
      <table
        class="w-full border-collapse"
        style="border: 1px solid var(--border);"
      >
        <thead style="background: var(--muted);">
          <tr>
            <th
              class="text-left p-3 font-semibold"
              style="border: 1px solid var(--border);">Component</th
            >
            <th
              class="text-left p-3 font-semibold"
              style="border: 1px solid var(--border);">Best For</th
            >
            <th
              class="text-left p-3 font-semibold"
              style="border: 1px solid var(--border);">Key Features</th
            >
            <th
              class="text-left p-3 font-semibold"
              style="border: 1px solid var(--border);">When to Choose</th
            >
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="p-3 font-medium" style="border: 1px solid var(--border);"
              >View</td
            >
            <td class="p-3" style="border: 1px solid var(--border);"
              >Custom layouts, semantic HTML, Studio integration</td
            >
            <td class="p-3" style="border: 1px solid var(--border);"
              >All CSS props, any HTML element, CSS variables</td
            >
            <td class="p-3" style="border: 1px solid var(--border);"
              >Maximum flexibility needed</td
            >
          </tr>
          <tr style="background: var(--muted/50);">
            <td class="p-3 font-medium" style="border: 1px solid var(--border);"
              >ViewContainer</td
            >
            <td class="p-3" style="border: 1px solid var(--border);"
              >Page containers, content width limiting</td
            >
            <td class="p-3" style="border: 1px solid var(--border);"
              >Max-width presets, responsive padding</td
            >
            <td class="p-3" style="border: 1px solid var(--border);"
              >Standard container layouts</td
            >
          </tr>
          <tr>
            <td class="p-3 font-medium" style="border: 1px solid var(--border);"
              >ViewFlex</td
            >
            <td class="p-3" style="border: 1px solid var(--border);"
              >One-dimensional layouts, navigation</td
            >
            <td class="p-3" style="border: 1px solid var(--border);"
              >Flexbox presets, direction/alignment shortcuts</td
            >
            <td class="p-3" style="border: 1px solid var(--border);"
              >Row/column layouts with alignment</td
            >
          </tr>
          <tr style="background: var(--muted/50);">
            <td class="p-3 font-medium" style="border: 1px solid var(--border);"
              >ViewGrid</td
            >
            <td class="p-3" style="border: 1px solid var(--border);"
              >Two-dimensional layouts, card grids</td
            >
            <td class="p-3" style="border: 1px solid var(--border);"
              >Column/row presets, grid alignment shortcuts</td
            >
            <td class="p-3" style="border: 1px solid var(--border);"
              >Regular grid patterns</td
            >
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- Box-Style Examples -->
  <section class="space-y-4">
    <h2 class="text-2xl font-semibold">Box-Style Examples</h2>
    <p style="color: var(--muted-foreground);">
      These examples mirror the Box component documentation to showcase View's
      equivalent capabilities.
    </p>

    <div class="space-y-6">
      <!-- Basic Usage -->
      <div class="border rounded-lg" style="border-color: var(--border);">
        <div
          style="padding: 1rem; border-bottom: 1px solid var(--border); background: var(--muted);"
        >
          <h3 class="text-lg font-semibold">Basic Usage</h3>
          <p class="text-sm" style="color: var(--muted-foreground);">
            Simple View with padding and background
          </p>
        </div>
        <div style="padding: 1rem;">
          <View
            padding="1rem"
            background="var(--muted)"
            borderRadius="0.5rem"
            border="1px solid var(--border)"
          >
            Basic View with padding and background
          </View>
        </div>
      </div>

      <!-- Flexbox Layout -->
      <div class="border rounded-lg" style="border-color: var(--border);">
        <div
          style="padding: 1rem; border-bottom: 1px solid var(--border); background: var(--muted);"
        >
          <h3 class="text-lg font-semibold">Flexbox Layout</h3>
          <p class="text-sm" style="color: var(--muted-foreground);">
            Use flexbox properties for responsive layouts
          </p>
        </div>
        <div style="padding: 1rem;">
          <View
            display="flex"
            gap="1rem"
            padding="1rem"
            background="var(--muted)"
            borderRadius="0.5rem"
          >
            <View
              flex="1"
              padding="0.5rem"
              background="var(--accent)"
              borderRadius="0.25rem"
            >
              Flex Item 1
            </View>
            <View
              flex="1"
              padding="0.5rem"
              background="var(--accent)"
              borderRadius="0.25rem"
            >
              Flex Item 2
            </View>
          </View>
        </div>
      </div>

      <!-- Gradient Background -->
      <div class="border rounded-lg" style="border-color: var(--border);">
        <div
          style="padding: 1rem; border-bottom: 1px solid var(--border); background: var(--muted);"
        >
          <h3 class="text-lg font-semibold">Gradient Background</h3>
          <p class="text-sm" style="color: var(--muted-foreground);">
            Create stunning visual effects with gradient backgrounds
          </p>
        </div>
        <div style="padding: 1rem;">
          <View
            width="200px"
            height="100px"
            background="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            borderRadius="1rem"
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="white"
            fontWeight="600"
          >
            Gradient View
          </View>
        </div>
      </div>

      <!-- Card-like Container -->
      <div class="border rounded-lg" style="border-color: var(--border);">
        <div
          style="padding: 1rem; border-bottom: 1px solid var(--border); background: var(--muted);"
        >
          <h3 class="text-lg font-semibold">Card-like Container</h3>
          <p class="text-sm" style="color: var(--muted-foreground);">
            Build card components using View with shadows and borders
          </p>
        </div>
        <div style="padding: 1rem;">
          <View
            maxWidth="400px"
            padding="1.5rem"
            background="var(--card)"
            border="1px solid var(--border)"
            borderRadius="0.75rem"
            shadow="md"
          >
            <View marginBottom="1rem">
              <View fontSize="1.25rem" fontWeight="600" marginBottom="0.5rem">
                Card Title
              </View>
              <View color="var(--muted-foreground)">
                This is a card-like container built with View components.
              </View>
            </View>
            <View>Content goes here with proper spacing and styling.</View>
          </View>
        </div>
      </div>

      <!-- Semantic Elements -->
      <div class="border rounded-lg" style="border-color: var(--border);">
        <div
          style="padding: 1rem; border-bottom: 1px solid var(--border); background: var(--muted);"
        >
          <h3 class="text-lg font-semibold">Semantic Elements</h3>
          <p class="text-sm" style="color: var(--muted-foreground);">
            Use the 'as' prop to render semantic HTML elements
          </p>
        </div>
        <div style="padding: 1rem;">
          <View as="section" padding="2rem" background="var(--background)">
            <View as="header" marginBottom="1rem">
              <View as="h3" fontSize="1.5rem" fontWeight="bold"
                >Section Title</View
              >
            </View>
            <View
              as="article"
              padding="1rem"
              background="var(--card)"
              borderRadius="0.5rem"
            >
              <View as="p" lineHeight="1.6">
                Content using semantic HTML elements with View styling.
              </View>
            </View>
          </View>
        </div>
      </div>
    </div>
  </section>

  <!-- New Architecture Features -->
  <section class="space-y-4">
    <h2 class="text-2xl font-semibold">🚀 New Architecture Features</h2>
    <p style="color: var(--muted-foreground);">
      Explore the new modular architecture with event system, state management,
      and theme integration.
    </p>

    <!-- Event System Demo -->
    <div class="border rounded-lg" style="border-color: var(--border);">
      <div
        style="padding: 1rem; border-bottom: 1px solid var(--border); background: var(--muted);"
      >
        <h3 class="text-lg font-semibold">🎯 Event System</h3>
        <p class="text-sm" style="color: var(--muted-foreground);">
          Grouped event handlers with accessibility support and Studio Canvas
          integration
        </p>
      </div>
      <div style="padding: 1rem;">
        <View display="flex" flexDirection="column" gap="1rem">
          <View display="flex" gap="1rem" alignItems="center">
            <View
              padding="0.75rem 1rem"
              background="var(--primary)"
              color="var(--primary-foreground)"
              borderRadius="0.25rem"
              ontap={() => interactionCount++}
              style="cursor: pointer;"
            >
              ontap (Click or Press Enter)
            </View>
            <View
              padding="0.75rem 1rem"
              background="var(--secondary)"
              color="var(--secondary-foreground)"
              borderRadius="0.25rem"
              onhover={() => (hoverState = "Hovering!")}
              onhoverend={() => (hoverState = "Not hovering")}
              style="cursor: pointer;"
            >
              onhover + onhoverend
            </View>
            <View
              padding="0.75rem 1rem"
              background="var(--accent)"
              color="var(--accent-foreground)"
              borderRadius="0.25rem"
              onActionTap="demo-action"
              actionParams={{ message: "Action triggered!" }}
              style="cursor: pointer;"
            >
              onActionTap (Studio Canvas)
            </View>
          </View>
          <View
            padding="1rem"
            background="var(--muted)"
            borderRadius="0.5rem"
            fontSize="0.875rem"
          >
            <strong>Event Status:</strong> Taps: {interactionCount}, Hover: {hoverState}
          </View>
        </View>
      </div>
    </div>

    <!-- State Management Demo -->
    <div class="border rounded-lg" style="border-color: var(--border);">
      <div
        style="padding: 1rem; border-bottom: 1px solid var(--border); background: var(--muted);"
      >
        <h3 class="text-lg font-semibold">📊 State Management</h3>
        <p class="text-sm" style="color: var(--muted-foreground);">
          Interactive states with automatic detection and style application
        </p>
      </div>
      <div style="padding: 1rem;">
        <View display="flex" flexDirection="column" gap="1rem">
          <View display="flex" gap="1rem" alignItems="center">
            <View
              padding="0.75rem 1rem"
              background="var(--background)"
              border="2px solid var(--border)"
              borderRadius="0.25rem"
              ontap={() => {}}
              states={{
                base: { cursor: "pointer", transition: "all 0.2s ease" },
                hover: {
                  borderColor: "var(--primary)",
                  background: "var(--primary/10)",
                },
                active: { transform: "scale(0.98)" },
                focus: {
                  outline: "2px solid var(--ring)",
                  outlineOffset: "2px",
                },
              }}
            >
              Interactive (Hover/Focus/Active)
            </View>
            <View
              padding="0.75rem 1rem"
              background="var(--background)"
              border="2px solid var(--border)"
              borderRadius="0.25rem"
              disabled={buttonDisabled}
              states={{
                base: { cursor: "pointer", transition: "all 0.2s ease" },
                disabled: {
                  opacity: 0.5,
                  cursor: "not-allowed",
                  background: "var(--muted)",
                },
              }}
            >
              Disabled: {buttonDisabled ? "Yes" : "No"}
            </View>
            <View
              padding="0.75rem 1rem"
              background="var(--background)"
              border="2px solid var(--border)"
              borderRadius="0.25rem"
              loading={buttonLoading}
              states={{
                base: { cursor: "pointer", transition: "all 0.2s ease" },
                loading: {
                  opacity: 0.6,
                  cursor: "wait",
                  background: "var(--muted)",
                },
              }}
            >
              Loading: {buttonLoading ? "Yes" : "No"}
            </View>
            <View
              padding="0.75rem 1rem"
              background="var(--background)"
              border="2px solid var(--border)"
              borderRadius="0.25rem"
              selected={buttonSelected}
              states={{
                base: { cursor: "pointer", transition: "all 0.2s ease" },
                selected: {
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                  borderColor: "var(--primary)",
                },
              }}
            >
              Selected: {buttonSelected ? "Yes" : "No"}
            </View>
          </View>
          <View display="flex" gap="1rem" alignItems="center">
            <View
              as="button"
              padding="0.5rem 1rem"
              background="var(--secondary)"
              color="var(--secondary-foreground)"
              borderRadius="0.25rem"
              border="none"
              ontap={() => (buttonDisabled = !buttonDisabled)}
              style="cursor: pointer;"
            >
              Toggle Disabled
            </View>
            <View
              as="button"
              padding="0.5rem 1rem"
              background="var(--secondary)"
              color="var(--secondary-foreground)"
              borderRadius="0.25rem"
              border="none"
              ontap={() => {
                buttonLoading = !buttonLoading;
              }}
              style="cursor: pointer;"
            >
              Toggle Loading
            </View>
            <View
              as="button"
              padding="0.5rem 1rem"
              background="var(--secondary)"
              color="var(--secondary-foreground)"
              borderRadius="0.25rem"
              border="none"
              ontap={() => (buttonSelected = !buttonSelected)}
              style="cursor: pointer;"
            >
              Toggle Selected
            </View>
          </View>
        </View>
      </div>
    </div>

    <!-- Theme Integration Demo -->
    <div class="border rounded-lg" style="border-color: var(--border);">
      <div
        style="padding: 1rem; border-bottom: 1px solid var(--border); background: var(--muted);"
      >
        <h3 class="text-lg font-semibold">🎨 Theme Integration</h3>
        <p class="text-sm" style="color: var(--muted-foreground);">
          Theme tokens, CSS variables, and dynamic theming capabilities
        </p>
      </div>
      <div style="padding: 1rem;">
        <View display="flex" flexDirection="column" gap="1rem">
          <View display="flex" gap="1rem" alignItems="center">
            <View
              padding="0.75rem 1rem"
              background="$primary"
              color="$text"
              borderRadius="$radius-md"
              border="1px solid $border"
            >
              Theme Tokens ($primary, $text)
            </View>
            <View
              padding="0.75rem 1rem"
              background="var(--view-color-secondary)"
              color="var(--view-color-text)"
              borderRadius="var(--view-radius-md)"
            >
              CSS Variables
            </View>
            <View
              padding="0.75rem 1rem"
              style="--custom-bg: oklch(0.9 0.1 120); --custom-text: oklch(0.2 0.05 120);"
              background="var(--custom-bg)"
              color="var(--custom-text)"
              borderRadius="0.25rem"
            >
              Custom Variables
            </View>
          </View>
          <View
            padding="1rem"
            background="var(--muted)"
            borderRadius="0.5rem"
            fontSize="0.875rem"
          >
            <strong>Theme System:</strong> Uses theme tokens ($primary) that resolve
            to CSS variables (--view-color-primary) for dynamic theming
          </View>
        </View>
      </div>
    </div>

    <!-- Modular Architecture Demo -->
    <div class="border rounded-lg" style="border-color: var(--border);">
      <div
        style="padding: 1rem; border-bottom: 1px solid var(--border); background: var(--muted);"
      >
        <h3 class="text-lg font-semibold">🏗️ Modular Architecture</h3>
        <p class="text-sm" style="color: var(--muted-foreground);">
          Separate managers for different responsibilities - all working
          together
        </p>
      </div>
      <div style="padding: 1rem;">
        <View display="flex" flexDirection="column" gap="0.75rem">
          <View
            padding="0.75rem 1rem"
            background="var(--background)"
            border="1px solid var(--border)"
            borderRadius="0.25rem"
            display="flex"
            justifyContent="between"
            alignItems="center"
          >
            <View
              ><strong>Style Manager:</strong> createViewStyles(), CSS variable generation</View
            >
            <View
              padding="0.25rem 0.5rem"
              background="var(--primary)"
              color="var(--primary-foreground)"
              borderRadius="0.125rem"
              fontSize="0.75rem"
            >
              Active
            </View>
          </View>
          <View
            padding="0.75rem 1rem"
            background="var(--background)"
            border="1px solid var(--border)"
            borderRadius="0.25rem"
            display="flex"
            justifyContent="between"
            alignItems="center"
          >
            <View
              ><strong>Layout Manager:</strong> useViewLayout(), flexbox/grid optimization</View
            >
            <View
              padding="0.25rem 0.5rem"
              background="var(--primary)"
              color="var(--primary-foreground)"
              borderRadius="0.125rem"
              fontSize="0.75rem"
            >
              Active
            </View>
          </View>
          <View
            padding="0.75rem 1rem"
            background="var(--background)"
            border="1px solid var(--border)"
            borderRadius="0.25rem"
            display="flex"
            justifyContent="between"
            alignItems="center"
          >
            <View
              ><strong>Event Manager:</strong> createViewEventHandlers(), grouped
              events</View
            >
            <View
              padding="0.25rem 0.5rem"
              background="var(--primary)"
              color="var(--primary-foreground)"
              borderRadius="0.125rem"
              fontSize="0.75rem"
            >
              Active
            </View>
          </View>
          <View
            padding="0.75rem 1rem"
            background="var(--background)"
            border="1px solid var(--border)"
            borderRadius="0.25rem"
            display="flex"
            justifyContent="between"
            alignItems="center"
          >
            <View
              ><strong>State Manager:</strong> useViewStates(), interactive state
              detection</View
            >
            <View
              padding="0.25rem 0.5rem"
              background="var(--primary)"
              color="var(--primary-foreground)"
              borderRadius="0.125rem"
              fontSize="0.75rem"
            >
              Active
            </View>
          </View>
          <View
            padding="0.75rem 1rem"
            background="var(--background)"
            border="1px solid var(--border)"
            borderRadius="0.25rem"
            display="flex"
            justifyContent="between"
            alignItems="center"
          >
            <View
              ><strong>Theme Manager:</strong> useViewTheme(), theme tokens & CSS
              variables</View
            >
            <View
              padding="0.25rem 0.5rem"
              background="var(--primary)"
              color="var(--primary-foreground)"
              borderRadius="0.125rem"
              fontSize="0.75rem"
            >
              Active
            </View>
          </View>
        </View>
      </div>
    </div>
  </section>

  <!-- Advanced Examples -->
  <section class="space-y-4">
    <h2 class="text-2xl font-semibold">Advanced Examples</h2>

    <!-- Dashboard Layout -->
    <div class="border rounded-lg" style="border-color: var(--border);">
      <div
        style="padding: 1rem; border-bottom: 1px solid var(--border); background: var(--muted);"
      >
        <h3 class="text-lg font-semibold">Dashboard Layout</h3>
        <p class="text-sm" style="color: var(--muted-foreground);">
          Complex application layout using only View components
        </p>
      </div>
      <div style="padding: 1rem;">
        <View
          display="grid"
          style="grid-template-areas: 'sidebar header' 'sidebar main'; grid-template-columns: 200px 1fr; grid-template-rows: auto 1fr;"
          gap="1rem"
          height="300px"
        >
          <!-- Sidebar -->
          <View
            style="grid-area: sidebar;"
            padding="1rem"
            background="var(--card)"
            border="1px solid var(--border)"
            borderRadius="0.5rem"
            display="flex"
            flexDirection="column"
            gap="0.5rem"
          >
            <View
              fontSize="0.875rem"
              fontWeight="600"
              color="var(--muted-foreground)">Navigation</View
            >
            <View
              padding="0.5rem"
              background="var(--accent)"
              borderRadius="0.25rem"
              fontSize="0.875rem">Dashboard</View
            >
            <View padding="0.5rem" borderRadius="0.25rem" fontSize="0.875rem"
              >Analytics</View
            >
            <View padding="0.5rem" borderRadius="0.25rem" fontSize="0.875rem"
              >Settings</View
            >
          </View>

          <!-- Header -->
          <View
            style="grid-area: header;"
            padding="1rem"
            background="var(--card)"
            border="1px solid var(--border)"
            borderRadius="0.5rem"
            display="flex"
            justifyContent="between"
            alignItems="center"
          >
            <View fontSize="1.125rem" fontWeight="600">Dashboard</View>
            <View
              padding="0.5rem 1rem"
              background="var(--primary)"
              color="var(--primary-foreground)"
              borderRadius="0.25rem"
              fontSize="0.875rem"
            >
              User Menu
            </View>
          </View>

          <!-- Main Content -->
          <View
            style="grid-area: main;"
            padding="1rem"
            background="var(--card)"
            border="1px solid var(--border)"
            borderRadius="0.5rem"
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            gap="1rem"
          >
            <View fontSize="1rem" fontWeight="500">Main Content Area</View>
            <View
              display="grid"
              style="grid-template-columns: repeat(2, 1fr);"
              gap="0.75rem"
              width="100%"
            >
              <View
                padding="0.75rem"
                background="var(--muted)"
                borderRadius="0.25rem"
                textAlign="center"
                fontSize="0.875rem"
              >
                Widget 1
              </View>
              <View
                padding="0.75rem"
                background="var(--muted)"
                borderRadius="0.25rem"
                textAlign="center"
                fontSize="0.875rem"
              >
                Widget 2
              </View>
            </View>
          </View>
        </View>
      </div>
    </div>

    <!-- Responsive Card Layout -->
    <div class="border rounded-lg" style="border-color: var(--border);">
      <div
        style="padding: 1rem; border-bottom: 1px solid var(--border); background: var(--muted);"
      >
        <h3 class="text-lg font-semibold">Responsive Card Layout</h3>
        <p class="text-sm" style="color: var(--muted-foreground);">
          Auto-fitting card grid with View components
        </p>
      </div>
      <div style="padding: 1rem;">
        <View
          display="grid"
          style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));"
          gap="1rem"
        >
          {#each [1, 2, 3, 4] as card}
            <View
              padding="1.5rem"
              background="var(--card)"
              border="1px solid var(--border)"
              borderRadius="0.75rem"
              shadow="sm"
              display="flex"
              flexDirection="column"
              gap="1rem"
            >
              <View
                height="120px"
                background="var(--muted)"
                borderRadius="0.5rem"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="0.875rem"
                color="var(--muted-foreground)"
              >
                Card Image {card}
              </View>
              <View>
                <View
                  fontSize="1.125rem"
                  fontWeight="600"
                  margin="0 0 0.5rem 0"
                >
                  Card Title {card}
                </View>
                <View
                  fontSize="0.875rem"
                  color="var(--muted-foreground)"
                  lineHeight="1.5"
                >
                  This is a sample card description that demonstrates responsive
                  layout capabilities.
                </View>
              </View>
              <View marginTop="auto">
                <View
                  padding="0.5rem 1rem"
                  background="var(--primary)"
                  color="var(--primary-foreground)"
                  borderRadius="0.25rem"
                  textAlign="center"
                  fontSize="0.875rem"
                  cursor="pointer"
                  as="button"
                >
                  Learn More
                </View>
              </View>
            </View>
          {/each}
        </View>
      </div>
    </div>
  </section>
</div>

<style>
  .space-y-12 > * + * {
    margin-top: 3rem;
  }

  .space-y-6 > * + * {
    margin-top: 1.5rem;
  }

  .space-y-4 > * + * {
    margin-top: 1rem;
  }

  .space-y-2 > * + * {
    margin-top: 0.5rem;
  }

  .list-disc {
    list-style-type: disc;
  }

  .list-inside {
    list-style-position: inside;
  }
</style>
