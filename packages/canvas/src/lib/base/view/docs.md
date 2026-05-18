<script lang="ts">
  import {
    DocsContainer,
    DocsOverview,
    DocsFeatures,
    DocsExample,
    DocsPropsReference,
    DocsBestPractices,
    CodeBlock
  } from "$lib/site/docs/index.js";
  import { View } from "./index.js";
  import { viewCodeTemplates } from "./code-templates.js";

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

  const layoutProps = [
    {
      name: "as",
      type: "keyof HTMLElementTagNameMap",
      default: "div",
      description: "HTML element type to render"
    },
    {
      name: "display",
      type: '"flex" | "grid" | "block" | "inline-block" | "inline-flex" | "inline-grid"',
      default: "block",
      description: "CSS display property"
    },
    {
      name: "flexDirection",
      type: '"row" | "column" | "row-reverse" | "column-reverse"',
      default: "row",
      description: "Flex direction for flexbox layout"
    },
    {
      name: "alignItems",
      type: '"start" | "center" | "end" | "stretch" | "baseline"',
      default: "stretch",
      description: "Align items for flexbox layout"
    },
    {
      name: "justifyContent",
      type: '"start" | "center" | "end" | "between" | "around" | "evenly"',
      default: "start",
      description: "Justify content for flexbox layout"
    },
    {
      name: "gap",
      type: "string | number",
      default: "0",
      description: "Gap between flex/grid items"
    },
    {
      name: "width",
      type: "string | number",
      default: "auto",
      description: "Element width"
    },
    {
      name: "height",
      type: "string | number",
      default: "auto",
      description: "Element height"
    },
    {
      name: "position",
      type: '"relative" | "absolute" | "fixed" | "sticky" | "static"',
      default: "static",
      description: "CSS position property"
    },
    {
      name: "top",
      type: "string | number",
      default: "auto",
      description: "Top position offset"
    },
    {
      name: "right",
      type: "string | number",
      default: "auto",
      description: "Right position offset"
    },
    {
      name: "bottom",
      type: "string | number",
      default: "auto",
      description: "Bottom position offset"
    },
    {
      name: "left",
      type: "string | number",
      default: "auto",
      description: "Left position offset"
    },
    {
      name: "zIndex",
      type: "number | string",
      default: "auto",
      description: "Stack order"
    }
  ];

  const stylingProps = [
    {
      name: "padding",
      type: "string | number",
      default: "0",
      description: "Internal spacing"
    },
    {
      name: "margin",
      type: "string | number",
      default: "0",
      description: "External spacing"
    },
    {
      name: "background",
      type: "string",
      default: "transparent",
      description: "Background color or gradient"
    },
    {
      name: "color",
      type: "string",
      default: "inherit",
      description: "Text color"
    },
    {
      name: "border",
      type: "string | number",
      default: "none",
      description: "Border styling"
    },
    {
      name: "borderRadius",
      type: "string | number",
      default: "0",
      description: "Border radius for rounded corners"
    },
    {
      name: "shadow",
      type: '"none" | "sm" | "md" | "lg" | "xl"',
      default: "none",
      description: "Drop shadow preset"
    },
    {
      name: "opacity",
      type: "number",
      default: "1",
      description: "Element opacity"
    },
    {
      name: "transform",
      type: "string",
      default: "none",
      description: "CSS transform property"
    },
    {
      name: "transition",
      type: "string",
      default: "none",
      description: "CSS transition property"
    },
    {
      name: "overflow",
      type: '"visible" | "hidden" | "scroll" | "auto"',
      default: "visible",
      description: "Content overflow behavior"
    },
    {
      name: "cursor",
      type: "string",
      default: "auto",
      description: "Mouse cursor style"
    }
  ];

  const eventProps = [
    {
      name: "ontap",
      type: "function",
      default: "undefined",
      description: "Enhanced tap/click event handler"
    },
    {
      name: "onhover",
      type: "function",
      default: "undefined",
      description: "Mouse enter event handler"
    },
    {
      name: "onhoverend",
      type: "function",
      default: "undefined",
      description: "Mouse leave event handler"
    },
    {
      name: "onpress",
      type: "function",
      default: "undefined",
      description: "Mouse down event handler"
    },
    {
      name: "onpressend",
      type: "function",
      default: "undefined",
      description: "Mouse up event handler"
    },
    {
      name: "onfocus",
      type: "function",
      default: "undefined",
      description: "Focus event handler"
    },
    {
      name: "onblur",
      type: "function",
      default: "undefined",
      description: "Blur event handler"
    },
    {
      name: "onActionTap",
      type: "string",
      default: "undefined",
      description: "Studio Canvas action on tap"
    },
    {
      name: "onActionHover",
      type: "string",
      default: "undefined",
      description: "Studio Canvas action on hover"
    },
    {
      name: "actionParams",
      type: "object",
      default: "undefined",
      description: "Parameters for Studio Canvas actions"
    }
  ];

  const stateProps = [
    {
      name: "states",
      type: "ViewStateStyles",
      default: "undefined",
      description: "Custom state-based styling configuration"
    },
    {
      name: "disabled",
      type: "boolean",
      default: "false",
      description: "Disabled state"
    },
    {
      name: "loading",
      type: "boolean",
      default: "false",
      description: "Loading state"
    },
    {
      name: "selected",
      type: "boolean",
      default: "false",
      description: "Selected state"
    },
    {
      name: "expanded",
      type: "boolean",
      default: "false",
      description: "Expanded state"
    }
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
    "Accessibility features with proper ARIA and keyboard support"
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
    "Structure layouts with semantic HTML elements using the 'as' prop"
  ];
</script>

<DocsContainer>
  <DocsOverview
    title="View Component"
    description="The View component is the foundational building block of the component system. It provides comprehensive styling capabilities, advanced event handling, state management, and Studio Canvas integration. View serves as the base for all enhanced components and can render as any HTML element."
  />

<DocsFeatures {features} />

<DocsExample
title="Basic Usage"
description="Simple View component with basic styling"

>

    <View
      padding="1rem"
      background="var(--muted)"
      borderRadius="0.5rem"
      border="1px solid var(--border)"
      slot="preview"
    >
      Basic View with padding, background, and border
    </View>
    <CodeBlock
      slot="code"
      code={viewCodeTemplates.basicUsage}
      language="svelte"
    />

  </DocsExample>

<DocsExample
title="Flexbox Layout"
description="Use flexbox properties for responsive layouts"

>

    <View
      display="flex"
      gap="1rem"
      padding="1rem"
      background="var(--muted)"
      borderRadius="0.5rem"
      slot="preview"
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
    <CodeBlock
      slot="code"
      code={viewCodeTemplates.flexboxLayout}
      language="svelte"
    />

  </DocsExample>

<DocsExample
title="Grid Layout"
description="Create grid layouts with CSS Grid properties"

>

    <View
      display="grid"
      style="grid-template-columns: repeat(3, 1fr);"
      gap="1rem"
      padding="1rem"
      background="var(--muted)"
      borderRadius="0.5rem"
      slot="preview"
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
    <CodeBlock
      slot="code"
      code={viewCodeTemplates.gridLayout}
      language="svelte"
    />

  </DocsExample>

<DocsExample
title="Semantic Elements"
description="Use the 'as' prop to render semantic HTML elements"

>

    <View as="section" padding="2rem" background="var(--background)" slot="preview">
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
    <CodeBlock
      slot="code"
      code={viewCodeTemplates.semanticElements}
      language="svelte"
    />

  </DocsExample>

<DocsExample
title="Gradient Background"
description="Create stunning visual effects with gradient backgrounds"

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
      slot="preview"
    >
      Gradient View
    </View>
    <CodeBlock
      slot="code"
      code={viewCodeTemplates.gradientBackground}
      language="svelte"
    />

  </DocsExample>

<DocsExample
title="Card Container"
description="Build card components using View with shadows and borders"

>

    <View
      style="max-width: 400px;"
      padding="1.5rem"
      background="var(--card)"
      border="1px solid var(--border)"
      borderRadius="0.75rem"
      shadow="md"
      slot="preview"
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
    <CodeBlock
      slot="code"
      code={viewCodeTemplates.cardContainer}
      language="svelte"
    />

  </DocsExample>

<DocsExample
title="Enhanced Event Handling"
description="View provides advanced event handling capabilities"

>

    <div class="flex gap-4 flex-wrap" slot="preview">
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
    <CodeBlock
      slot="code"
      code={viewCodeTemplates.eventHandling}
      language="svelte"
    />

  </DocsExample>

<DocsExample
title="Component States"
description="View supports various component states for dynamic interfaces"

>

    <div class="flex gap-4 flex-wrap" slot="preview">
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
    <CodeBlock
      slot="code"
      code={viewCodeTemplates.componentStates}
      language="svelte"
    />

  </DocsExample>

<DocsExample
title="Custom State Styles"
description="Define custom styling for different interaction states"

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
      slot="preview"
    >
      Hover for custom state styling
    </View>
    <CodeBlock
      slot="code"
      code={viewCodeTemplates.customStates}
      language="svelte"
    />

  </DocsExample>

<DocsExample
title="Studio Canvas Actions"
description="Integrate with Studio Canvas for complex workflows"

>

    <div class="flex gap-4 flex-wrap" slot="preview">
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
    <CodeBlock
      slot="code"
      code={viewCodeTemplates.studioActions}
      language="svelte"
    />

  </DocsExample>

<DocsPropsReference
    title="Layout & Position Props"
    description="Properties for controlling layout, positioning, and display behavior"
    props={layoutProps}
  />

<DocsPropsReference
    title="Styling & Appearance Props"
    description="Properties for visual styling, colors, borders, and effects"
    props={stylingProps}
  />

<DocsPropsReference
    title="Event Handling Props"
    description="Enhanced event handling capabilities for interactive components"
    props={eventProps}
  />

<DocsPropsReference
    title="State Management Props"
    description="Component state management and state-based styling"
    props={stateProps}
  />

<DocsBestPractices
    title="Best Practices"
    practices={bestPractices}
  />
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
