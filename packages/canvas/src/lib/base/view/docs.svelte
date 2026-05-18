<script lang="ts">
// @ts-nocheck
import {
	DocsBestPractices,
	DocsContainer,
	DocsExample,
	DocsFeatures,
	DocsOverview,
	DocsPropsReference,
} from "$lib/site/docs/index.js";
import { viewCodeTemplates } from "./code-templates.js";
import { View } from "./index.js";

let clickCount = $state(0);
let isHovered = $state(false);

const handleTap = () => {
	clickCount++;
};

const handleHover = () => {
	isHovered = true;
};

const handleHoverEnd = () => {
	isHovered = false;
};

const props = [
	{
		name: "as",
		type: "keyof HTMLElementTagNameMap",
		description: "HTML element type to render",
	},
	{
		name: "display",
		type: '"flex" | "grid" | "block" | "inline-block" | "inline-flex" | "inline-grid"',
		description: "CSS display property",
	},
	{
		name: "flexDirection",
		type: '"row" | "column" | "row-reverse" | "column-reverse"',
		description: "Flex direction for flexbox layout",
	},
	{
		name: "alignItems",
		type: '"start" | "center" | "end" | "stretch" | "baseline"',
		description: "Align items for flexbox layout",
	},
	{
		name: "justifyContent",
		type: '"start" | "center" | "end" | "between" | "around" | "evenly"',
		description: "Justify content for flexbox layout",
	},
	{
		name: "gap",
		type: "string | number",
		description: "Gap between flex/grid items",
	},
	{
		name: "padding",
		type: "string | number",
		description: "Internal spacing",
	},
	{
		name: "margin",
		type: "string | number",
		description: "External spacing",
	},
	{
		name: "width",
		type: "string | number",
		description: "Element width",
	},
	{
		name: "height",
		type: "string | number",
		description: "Element height",
	},
	{
		name: "background",
		type: "string",
		description: "Background color or gradient",
	},
	{
		name: "color",
		type: "string",
		description: "Text color",
	},
	{
		name: "border",
		type: "string | number",
		description: "Border styling",
	},
	{
		name: "borderRadius",
		type: "string | number",
		description: "Border radius for rounded corners",
	},
	{
		name: "shadow",
		type: '"none" | "sm" | "md" | "lg" | "xl"',
		description: "Drop shadow preset",
	},
	{
		name: "position",
		type: '"relative" | "absolute" | "fixed" | "sticky" | "static"',
		description: "CSS position property",
	},
	{
		name: "top",
		type: "string | number",
		description: "Top position offset",
	},
	{
		name: "right",
		type: "string | number",
		description: "Right position offset",
	},
	{
		name: "bottom",
		type: "string | number",
		description: "Bottom position offset",
	},
	{
		name: "left",
		type: "string | number",
		description: "Left position offset",
	},
	{
		name: "zIndex",
		type: "number | string",
		description: "Stack order",
	},
	{
		name: "opacity",
		type: "number",
		description: "Element opacity",
	},
	{
		name: "transform",
		type: "string",
		description: "CSS transform property",
	},
	{
		name: "transition",
		type: "string",
		description: "CSS transition property",
	},
	{
		name: "overflow",
		type: '"visible" | "hidden" | "scroll" | "auto"',
		description: "Content overflow behavior",
	},
	{
		name: "cursor",
		type: "string",
		description: "Mouse cursor style",
	},
];

const eventProps = [
	{
		name: "ontap",
		type: "function",
		description: "Enhanced tap/click event handler",
	},
	{
		name: "onhover",
		type: "function",
		description: "Mouse enter event handler",
	},
	{
		name: "onhoverend",
		type: "function",
		description: "Mouse leave event handler",
	},
	{
		name: "onpress",
		type: "function",
		description: "Mouse down event handler",
	},
	{
		name: "onpressend",
		type: "function",
		description: "Mouse up event handler",
	},
	{
		name: "onfocus",
		type: "function",
		description: "Focus event handler",
	},
	{
		name: "onblur",
		type: "function",
		description: "Blur event handler",
	},
	{
		name: "onActionTap",
		type: "string",
		description: "Studio Canvas action on tap",
	},
	{
		name: "onActionHover",
		type: "string",
		description: "Studio Canvas action on hover",
	},
	{
		name: "actionParams",
		type: "object",
		description: "Parameters for Studio Canvas actions",
	},
];

const stateProps = [
	{
		name: "states",
		type: "ViewStateStyles",
		description: "Custom state-based styling configuration",
	},
	{
		name: "disabled",
		type: "boolean",
		description: "Disabled state",
	},
	{
		name: "loading",
		type: "boolean",
		description: "Loading state",
	},
	{
		name: "selected",
		type: "boolean",
		description: "Selected state",
	},
	{
		name: "expanded",
		type: "boolean",
		description: "Expanded state",
	},
];

const features = [
	"Comprehensive CSS properties as props for complete styling control",
	"Multiple HTML element types via 'as' prop for semantic markup",
	"Advanced flexbox and grid layout support with convenient props",
	"Built-in shadow presets and CSS custom property integration",
	"Enhanced event handling system (ontap, onhover, onpress, etc.)",
	"Studio Canvas action integration for complex workflows",
	"State-based styling with custom state configurations",
	"Component states (disabled, loading, selected, expanded)",
	"Type-safe prop validation with comprehensive TypeScript support",
	"High performance with optimized styling and event handling",
	"Responsive design ready with CSS variable theming",
	"Accessibility features with proper ARIA and keyboard support",
];

const bestPractices = [
	"Use View as the foundation for layout containers instead of custom CSS",
	"Leverage the 'as' prop for semantic HTML elements (section, article, header, etc.)",
	"Combine multiple View components for complex, maintainable layouts",
	"Prefer CSS custom properties (var(--color)) for consistent theming",
	"Use flexbox properties (display='flex', alignItems, etc.) for responsive layouts",
	"Utilize the enhanced event system (ontap, onhover) for better user interactions",
	"Configure state-based styling for interactive components",
	"Use Studio Canvas actions for complex workflow integrations",
	"Consider performance when deeply nesting View components",
	"Use shadow presets ('sm', 'md', 'lg') instead of custom box-shadow values",
	"Combine View with component states for dynamic user interfaces",
	"Structure layouts with semantic HTML elements using the 'as' prop",
];
</script>

<DocsContainer>
  <DocsOverview>
    The View component is the foundational building block of the component
    system. It provides comprehensive styling capabilities, advanced event
    handling, state management, and Studio Canvas integration. View serves as
    the base for all enhanced components and can render as any HTML element.
  </DocsOverview>

  <DocsFeatures {features} />

  <DocsExample
    title="Basic Usage"
    description="Simple View component with basic styling"
    code={viewCodeTemplates.basicUsage}
  >
    <View
      padding="1rem"
      background="var(--muted)"
      borderRadius="0.5rem"
      border="1px solid var(--border)"
    >
      Basic View with padding, background, and border
    </View>
  </DocsExample>

  <DocsExample
    title="Flexbox Layout"
    description="Use flexbox properties for responsive layouts"
    code={viewCodeTemplates.flexboxLayout}
  >
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
        color="var(--accent-foreground)"
      >
        Flex Item 1
      </View>
      <View
        flex="1"
        padding="0.5rem"
        background="var(--accent)"
        borderRadius="0.25rem"
        color="var(--accent-foreground)"
      >
        Flex Item 2
      </View>
    </View>
  </DocsExample>

  <DocsExample
    title="Grid Layout"
    description="Create grid layouts with CSS Grid properties"
    code={viewCodeTemplates.gridLayout}
  >
    <View
      display="grid"
      style="grid-template-columns: repeat(3, 1fr);"
      gap="1rem"
      padding="1rem"
      background="var(--muted)"
      borderRadius="0.5rem"
    >
      <View
        padding="1rem"
        background="var(--primary)"
        color="var(--primary-foreground)"
        borderRadius="0.25rem"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        Grid Item 1
      </View>
      <View
        padding="1rem"
        background="var(--secondary)"
        color="var(--secondary-foreground)"
        borderRadius="0.25rem"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        Grid Item 2
      </View>
      <View
        padding="1rem"
        background="var(--accent)"
        color="var(--accent-foreground)"
        borderRadius="0.25rem"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        Grid Item 3
      </View>
    </View>
  </DocsExample>

  <DocsExample
    title="Semantic Elements"
    description="Use the 'as' prop to render semantic HTML elements"
    code={viewCodeTemplates.semanticElements}
  >
    <View as="section" padding="2rem" background="var(--background)">
      <View as="header" marginBottom="1rem">
        <View
          as="h3"
          style="font-size: 1.5rem; font-weight: bold;"
          marginBottom="0.5rem"
        >
          Section Title
        </View>
      </View>
      <View
        as="article"
        padding="1rem"
        background="var(--card)"
        borderRadius="0.5rem"
        border="1px solid var(--border)"
      >
        <View as="p" style="line-height: 1.6;">
          Content using semantic HTML elements with View styling capabilities.
        </View>
      </View>
    </View>
  </DocsExample>

  <DocsExample
    title="Gradient Background"
    description="Create stunning visual effects with gradient backgrounds"
    code={viewCodeTemplates.gradientBackground}
  >
    <View
      width="200px"
      height="100px"
      background="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      borderRadius="1rem"
      display="flex"
      alignItems="center"
      justifyContent="center"
      color="white"
      style="font-weight: 600;"
    >
      Gradient View
    </View>
  </DocsExample>

  <DocsExample
    title="Card Container"
    description="Build card components using View with shadows and borders"
    code={viewCodeTemplates.cardContainer}
  >
    <View
      style="max-width: 400px;"
      padding="1.5rem"
      background="var(--card)"
      border="1px solid var(--border)"
      borderRadius="0.75rem"
      shadow="md"
    >
      <View marginBottom="1rem">
        <View
          style="font-size: 1.25rem; font-weight: 600;"
          marginBottom="0.5rem"
        >
          Card Title
        </View>
        <View color="var(--muted-foreground)">
          This is a card-like container built with View components.
        </View>
      </View>
      <View>Content goes here with proper spacing and styling.</View>
    </View>
  </DocsExample>

  <DocsExample
    title="Enhanced Event Handling"
    description="View provides advanced event handling capabilities"
    code={viewCodeTemplates.eventSystem}
  >
    <div class="flex gap-4 flex-wrap">
      <View
        padding="1rem"
        background="var(--primary)"
        color="var(--primary-foreground)"
        borderRadius="0.5rem"
        cursor="pointer"
        ontap={handleTap}
        transition="all 0.2s"
        states={{
          hover: { transform: "scale(1.05)" },
          active: { transform: "scale(0.95)" },
        }}
      >
        Clicked {clickCount} times
      </View>

      <View
        padding="1rem"
        background={isHovered ? "var(--accent)" : "var(--secondary)"}
        color={isHovered
          ? "var(--accent-foreground)"
          : "var(--secondary-foreground)"}
        borderRadius="0.5rem"
        cursor="pointer"
        onhover={handleHover}
        onhoverend={handleHoverEnd}
        transition="all 0.2s"
      >
        {isHovered ? "Hovered!" : "Hover me"}
      </View>
    </div>
  </DocsExample>

  <DocsExample
    title="Component States"
    description="View supports various component states for dynamic interfaces"
    code={viewCodeTemplates.stateManagement}
  >
    <div class="flex gap-4 flex-wrap">
      <View
        padding="1rem"
        background="var(--muted)"
        borderRadius="0.5rem"
        disabled={true}
      >
        Disabled View
      </View>

      <View
        padding="1rem"
        background="var(--primary)"
        color="var(--primary-foreground)"
        borderRadius="0.5rem"
        loading={true}
      >
        Loading View
      </View>

      <View
        padding="1rem"
        background="var(--accent)"
        color="var(--accent-foreground)"
        borderRadius="0.5rem"
        selected={true}
      >
        Selected View
      </View>
    </div>
  </DocsExample>

  <DocsExample
    title="Custom State Styles"
    description="Define custom styling for different interaction states"
    code={viewCodeTemplates.cssVariableCustomization}
  >
    <View
      padding="1rem 2rem"
      background="var(--background)"
      border="2px solid var(--border)"
      borderRadius="0.5rem"
      cursor="pointer"
      transition="all 0.3s"
      states={{
        hover: {
          borderColor: "var(--primary)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          transform: "translateY(-2px)",
        },
        active: {
          transform: "translateY(0px)",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        },
        focus: {
          outline: "2px solid var(--ring)",
        },
      }}
    >
      Hover for custom state styling
    </View>
  </DocsExample>

  <DocsExample
    title="Studio Canvas Actions"
    description="Integrate with Studio Canvas for complex workflows"
    code={viewCodeTemplates.responsiveLayout}
  >
    <div class="flex gap-4 flex-wrap">
      <View
        padding="1rem"
        background="var(--primary)"
        color="var(--primary-foreground)"
        borderRadius="0.5rem"
        cursor="pointer"
        onActionTap="navigate"
        actionParams={{ url: "/dashboard" }}
      >
        Navigate Action
      </View>

      <View
        padding="1rem"
        background="var(--secondary)"
        color="var(--secondary-foreground)"
        borderRadius="0.5rem"
        cursor="pointer"
        onActionTap="setState"
        actionParams={{ key: "theme", value: "dark" }}
      >
        Set State Action
      </View>

      <View
        padding="1rem"
        background="var(--destructive)"
        color="var(--destructive-foreground)"
        borderRadius="0.5rem"
        cursor="pointer"
        onActionTap="fetch"
        actionParams={{ url: "/api/data", method: "GET" }}
      >
        Fetch Action
      </View>
    </div>
  </DocsExample>

  <DocsExample
    title="Button Element"
    description="Create accessible button components using the 'as' prop"
    code={viewCodeTemplates.buttonElement}
  >
    <View
      as="button"
      padding="0.5rem 1rem"
      background="var(--primary)"
      color="var(--primary-foreground)"
      border="none"
      borderRadius="0.375rem"
      transition="all 0.2s"
      style="cursor: pointer;"
    >
      Button View
    </View>
  </DocsExample>

  <DocsExample
    title="Link Element"
    description="Create styled link components with custom styling"
    code={viewCodeTemplates.linkElement}
  >
    <View
      as="a"
      href="/docs"
      padding="0.5rem 1rem"
      background="var(--accent)"
      color="var(--accent-foreground)"
      borderRadius="0.375rem"
      style="text-decoration: none; display: inline-block;"
    >
      Link View
    </View>
  </DocsExample>

  <DocsExample
    title="Complex Form"
    description="Build complete form layouts with semantic HTML elements"
    code={viewCodeTemplates.complexForm}
  >
    <View
      as="form"
      display="flex"
      flexDirection="column"
      gap="1rem"
      padding="2rem"
      background="var(--card)"
      border="1px solid var(--border)"
      borderRadius="0.5rem"
      shadow="sm"
    >
      <View>
        <View as="label" style="font-weight: 500; margin-bottom: 0.5rem; display: block;">
          Name
        </View>
        <View
          as="input"
          padding="0.5rem"
          border="1px solid var(--border)"
          borderRadius="0.25rem"
          width="100%"
        />
      </View>

      <View>
        <View as="label" style="font-weight: 500; margin-bottom: 0.5rem; display: block;">
          Message
        </View>
        <View
          as="textarea"
          padding="0.5rem"
          border="1px solid var(--border)"
          borderRadius="0.25rem"
          width="100%"
          height="100px"
        />
      </View>

      <View
        as="button"
        padding="0.75rem 1.5rem"
        background="var(--primary)"
        color="var(--primary-foreground)"
        border="none"
        borderRadius="0.375rem"
        style="cursor: pointer; font-weight: 500;"
      >
        Submit
      </View>
    </View>
  </DocsExample>

  <DocsExample
    title="Theme Integration"
    description="Advanced theming with CSS variables and custom properties"
    code={viewCodeTemplates.themeIntegration}
  >
    <div class="flex gap-4 flex-wrap">
      <View
        padding="1rem"
        background="var(--card)"
        color="var(--card-foreground)"
        borderRadius="0.5rem"
        border="1px solid var(--border)"
      >
        Using CSS variables
      </View>

      <View
        style="--custom-primary: oklch(0.7 0.15 250); --custom-bg: oklch(0.98 0.02 250);"
      >
        <View
          background="var(--custom-bg)"
          border="2px solid var(--custom-primary)"
          borderRadius="0.5rem"
          padding="1rem"
        >
          <View
            background="var(--custom-primary)"
            color="white"
            padding="0.5rem 1rem"
            borderRadius="0.25rem"
            style="display: inline-block;"
          >
            Custom Theme
          </View>
        </View>
      </View>
    </div>
  </DocsExample>

  <DocsExample
    title="Modular Architecture"
    description="Build reusable components with advanced state management"
    code={viewCodeTemplates.modularArchitecture}
  >
    <div class="flex gap-4 flex-wrap">
      <View
        padding="1rem"
        background="var(--primary)"
        color="var(--primary-foreground)"
        borderRadius="0.5rem"
        display="flex"
        alignItems="center"
        justifyContent="center"
        ontap={() => console.log('View component clicked')}
        states={{
          hover: { opacity: 0.8 },
          active: { transform: 'scale(0.95)' }
        }}
        style="cursor: pointer;"
      >
        Complete View Component
      </View>
    </div>
  </DocsExample>

  <DocsExample
    title="Performance Optimization"
    description="Optimize rendering performance with efficient state patterns"
    code={viewCodeTemplates.performanceOptimization}
  >
    <div class="flex gap-4 flex-wrap">
      <View
        padding="0.75rem 1rem"
        background="var(--primary)"
        color="var(--primary-foreground)"
        borderRadius="0.25rem"
        states={{
          hover: { opacity: 0.9 },
          active: { transform: 'scale(0.98)' },
          focus: { outline: '2px solid var(--ring)' }
        }}
        ontap={() => console.log('Button clicked')}
        style="cursor: pointer;"
      >
        Button with preset states
      </View>

      <View
        padding="1.5rem"
        background="var(--card)"
        border="1px solid var(--border)"
        borderRadius="0.5rem"
        states={{
          hover: { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
          active: { transform: 'translateY(0)' }
        }}
        style="cursor: pointer;"
      >
        Card with preset states
      </View>
    </div>
  </DocsExample>

  <DocsExample
    title="Accessibility Features"
    description="Build accessible components with proper keyboard navigation and ARIA support"
    code={viewCodeTemplates.accessibilityFeatures}
  >
    <div class="flex gap-4 flex-wrap">
      <View
        as="button"
        padding="0.75rem 1rem"
        background="var(--primary)"
        color="var(--primary-foreground)"
        borderRadius="0.25rem"
        border="none"
        ontap={() => console.log('Accessible button clicked')}
        aria-label="Save document"
        states={{
          focus: { outline: '2px solid var(--ring)', outlineOffset: '2px' },
          hover: { opacity: 0.9 }
        }}
        style="cursor: pointer;"
      >
        Save Document
      </View>

      <View
        as="nav"
        display="flex"
        gap="1rem"
        padding="1rem"
        background="var(--muted)"
        borderRadius="0.5rem"
      >
        <View
          as="a"
          href="/home"
          padding="0.5rem 1rem"
          borderRadius="0.25rem"
          states={{
            hover: { background: 'var(--muted)' },
            focus: { outline: '2px solid var(--ring)' }
          }}
          style="text-decoration: none;"
        >
          Home
        </View>
        <View
          as="a"
          href="/about"
          padding="0.5rem 1rem"
          borderRadius="0.25rem"
          states={{
            hover: { background: 'var(--muted)' },
            focus: { outline: '2px solid var(--ring)' }
          }}
          style="text-decoration: none;"
        >
          About
        </View>
      </View>
    </div>
  </DocsExample>

  <DocsPropsReference {props} />

  <DocsPropsReference props={eventProps} />

  <DocsPropsReference props={stateProps} />

  <DocsBestPractices practices={bestPractices} />
</DocsContainer>

<style>
  .flex {
    display: flex;
  }

  .gap-4 {
    gap: 1rem;
  }

  .flex-wrap {
    flex-wrap: wrap;
  }
</style>
