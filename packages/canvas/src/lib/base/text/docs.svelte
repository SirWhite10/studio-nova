<script lang="ts">
import {
	DocsContainer,
	DocsOverview,
	DocsFeatures,
	DocsExample,
	DocsPropsReference,
	DocsBestPractices,
} from "$lib/site/docs/index.js";
import { Text } from "$lib/base/text/index.js";
import { textCodeTemplates } from "./code-templates.js";

const props = [
	{ name: "text", type: "string", description: "Text content to display" },
	{
		name: "size",
		type: '"xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl"',
		description: "Font size preset using CSS variables",
	},
	{
		name: "weight",
		type: '"normal" | "medium" | "semibold" | "bold"',
		description: "Font weight using CSS variables",
	},
	{
		name: "color",
		type: "string",
		description: "Text color (CSS color value or theme variable)",
	},
	{
		name: "textAlign",
		type: '"left" | "center" | "right" | "justify"',
		description: "Text alignment",
	},
	{
		name: "transform",
		type: '"none" | "uppercase" | "lowercase" | "capitalize"',
		description: "Text transformation",
	},
	{
		name: "lineHeight",
		type: '"tight" | "normal" | "relaxed" | "loose" | string',
		description: "Line height (preset or custom CSS value)",
	},
	{
		name: "letterSpacing",
		type: '"tight" | "normal" | "wide" | "wider" | string',
		description: "Letter spacing (preset or custom CSS value)",
	},
	{
		name: "as",
		type: "keyof HTMLElementTagNameMap",
		description: "HTML element to render as",
	},
	{
		name: "children",
		type: "any",
		description: "Content to render inside the text element",
	},
];

const features = [
	"8 predefined sizes using CSS variables (var(--text-xs) through var(--text-4xl))",
	"4 font weights using CSS variables (var(--font-normal) through var(--font-bold))",
	"Theme-aware color support with CSS custom properties",
	"Text alignment options (left, center, right, justify)",
	"Text transformation (uppercase, lowercase, capitalize)",
	"Preset line heights and letter spacing with CSS variables",
	"Semantic HTML element support via 'as' prop",
	"Enhanced event handling system inherited from View component",
	"State management with custom styling for different interaction states",
	"Studio Canvas integration for complex workflows",
	"Built on View component architecture for consistency",
	"Performance optimized with CSS variables and efficient styling",
	"Accessibility features with proper ARIA and keyboard support",
];

const bestPractices = [
	"Use semantic size names (base, lg, xl) that map to CSS variables for consistency",
	"Prefer theme color variables (var(--primary), var(--muted-foreground)) over hardcoded colors",
	"Use the 'text' prop for simple text, children for complex content with HTML elements",
	"Leverage the 'as' prop for semantic HTML elements (h1, h2, p, label, etc.)",
	"Use preset line heights and letter spacing for consistent typography",
	"Combine Text with View component props for advanced layouts and interactions",
	"Use state management for interactive text elements",
	"Maintain good contrast ratios for accessibility",
	"Use appropriate font weights to establish clear visual hierarchy",
	"Consider performance by using predefined state patterns for interactive text",
	"Use Studio Canvas actions for complex workflow integrations",
	"Test with screen readers to ensure proper accessibility",
];
</script>

<DocsContainer>
  <DocsOverview>
    The Text component provides consistent typography across your application with CSS variable-based sizing, theme-aware colors, and enhanced functionality. Built on the View component architecture, it offers advanced event handling, state management, and Studio Canvas integration while maintaining excellent performance and type safety.
  </DocsOverview>

  <DocsFeatures {features} />

  <DocsExample
    title="Basic Usage"
    code={textCodeTemplates.basicUsage}
  >
    <Text text="Default text content" />
  </DocsExample>

  <DocsExample
    title="Text Sizes"
    description="Choose from 8 predefined sizes for consistent typography hierarchy."
    code={textCodeTemplates.sizes}
  >
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <Text size="xs" text="Extra Small (xs) - 12px" />
      <Text size="sm" text="Small (sm) - 14px" />
      <Text size="base" text="Base (base) - 16px" />
      <Text size="lg" text="Large (lg) - 18px" />
      <Text size="xl" text="Extra Large (xl) - 20px" />
      <Text size="2xl" text="2X Large (2xl) - 24px" />
      <Text size="3xl" text="3X Large (3xl) - 30px" />
      <Text size="4xl" text="4X Large (4xl) - 36px" />
    </div>
  </DocsExample>

  <DocsExample
    title="Font Weights"
    description="Use different font weights to create visual hierarchy."
    code={textCodeTemplates.weights}
  >
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <Text weight="normal" text="Normal weight (400)" />
      <Text weight="medium" text="Medium weight (500)" />
      <Text weight="semibold" text="Semibold weight (600)" />
      <Text weight="bold" text="Bold weight (700)" />
    </div>
  </DocsExample>

  <DocsExample
    title="Colors"
    description="Apply custom colors using CSS custom properties or any CSS color value."
    code={textCodeTemplates.colors}
  >
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <Text text="Default color" />
      <Text color="var(--primary)" text="Primary color" />
      <Text color="var(--muted-foreground)" text="Muted foreground" />
      <Text color="var(--destructive)" text="Destructive color" />
      <Text color="#3b82f6" text="Custom blue color" />
    </div>
  </DocsExample>

  <DocsExample
    title="Text Alignment"
    description="Control text alignment for different layout needs."
    code={textCodeTemplates.alignment}
  >
    <div style="display: flex; flex-direction: column; gap: 1rem; border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem;">
      <Text textAlign="left" text="Left aligned text" />
      <Text textAlign="center" text="Center aligned text" />
      <Text textAlign="right" text="Right aligned text" />
      <Text textAlign="justify" text="Justified text that will wrap and align to both left and right edges when there is enough content to demonstrate the justification behavior." />
    </div>
  </DocsExample>

  <DocsExample
    title="Text Transform"
    description="Transform text case automatically with transform props."
    code={textCodeTemplates.transform}
  >
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <Text transform="none" text="No transformation" />
      <Text transform="uppercase" text="uppercase text" />
      <Text transform="lowercase" text="LOWERCASE TEXT" />
      <Text transform="capitalize" text="capitalize each word" />
    </div>
  </DocsExample>

  <DocsExample
    title="Using Children"
    description="Use children for complex content with HTML elements."
    code={textCodeTemplates.usingChildren}
  >
    <Text size="lg" weight="semibold">
      This text uses children instead of the text prop.
      You can include <strong>HTML elements</strong> and other content.
    </Text>
  </DocsExample>

  <DocsExample
    title="Advanced Styling"
    description="Combine multiple props for sophisticated typography effects."
    code={textCodeTemplates.advancedStyling}
  >
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <Text
        size="xl"
        weight="bold"
        color="var(--primary)"
        lineHeight="1.2"
        letterSpacing="0.05em"
        text="Advanced styled text"
      />
      <Text
        size="lg"
        transform="uppercase"
        letterSpacing="0.1em"
        color="var(--muted-foreground)"
        text="Spaced uppercase"
      />
    </div>
  </DocsExample>

  <DocsExample
    title="CSS Variables and Theming"
    description="Leverage CSS variables for theme-aware styling and custom theming"
    code={textCodeTemplates.cssVariables}
  >
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <Text
        size="lg"
        color="var(--primary)"
        text="Theme-aware primary text"
      />
      <Text
        size="base"
        color="var(--muted-foreground)"
        text="Theme-aware muted text"
      />
      <div style="--custom-text-color: oklch(0.7 0.15 250);">
        <Text
          color="var(--custom-text-color)"
          text="Custom themed text"
        />
      </div>
    </div>
  </DocsExample>

  <DocsExample
    title="Semantic HTML Elements"
    description="Use the 'as' prop to render semantic HTML elements"
    code={textCodeTemplates.semanticElements}
  >
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <Text as="h1" size="4xl" weight="bold" text="Main Heading" />
      <Text as="h2" size="3xl" weight="semibold" text="Section Heading" />
      <Text as="p" size="base" text="Paragraph text content" />
      <Text as="span" size="sm" color="var(--muted-foreground)" text="Inline text" />
      <Text as="label" size="sm" weight="medium" text="Form label" />
    </div>
  </DocsExample>

  <DocsExample
    title="Interactive Text"
    description="Add interactivity with event handlers and state management"
    code={textCodeTemplates.interactiveText}
  >
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <Text
        size="lg"
        color="var(--primary)"
        ontap={() => console.log('Text clicked!')}
        states={{
          hover: { opacity: 0.8 },
          active: { transform: "scale(0.95)" }
        }}
        style="cursor: pointer;"
        text="Click me! (Interactive text)"
      />
    </div>
  </DocsExample>

  <DocsExample
    title="Line Height and Letter Spacing"
    description="Use preset or custom line heights and letter spacing"
    code={textCodeTemplates.lineHeightAndSpacing}
  >
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div>
        <Text weight="medium" text="Line Height Presets:" />
        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">
          <Text lineHeight="tight" text="Tight line height (1.25)" />
          <Text lineHeight="normal" text="Normal line height (1.5)" />
          <Text lineHeight="relaxed" text="Relaxed line height (1.625)" />
          <Text lineHeight="loose" text="Loose line height (2)" />
        </div>
      </div>

      <div>
        <Text weight="medium" text="Letter Spacing Presets:" />
        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">
          <Text letterSpacing="tight" text="Tight letter spacing" />
          <Text letterSpacing="normal" text="Normal letter spacing" />
          <Text letterSpacing="wide" text="Wide letter spacing" />
          <Text letterSpacing="wider" text="Wider letter spacing" />
        </div>
      </div>
    </div>
  </DocsExample>

  <DocsExample
    title="State Management"
    description="Use component states for dynamic styling"
    code={textCodeTemplates.stateManagement}
  >
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <Text
        text="Text with disabled state"
        disabled={true}
        states={{
          disabled: { opacity: 0.5 }
        }}
      />
      <Text
        text="Text with selected state"
        selected={true}
        states={{
          selected: {
            background: "var(--accent)",
            color: "var(--accent-foreground)",
            padding: "0.25rem 0.5rem",
            borderRadius: "0.25rem"
          }
        }}
      />
    </div>
  </DocsExample>

  <DocsExample
    title="Performance Optimization"
    description="Use predefined state patterns for better performance"
    code={textCodeTemplates.performanceOptimized}
  >
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <Text
        as="button"
        size="lg"
        states={{
          hover: { opacity: 0.8 },
          active: { transform: "scale(0.95)" }
        }}
        text="Optimized button text"
        style="cursor: pointer;"
      />
      <Text
        as="a"
        href="#"
        states={{
          hover: { textDecoration: "underline" },
          focus: { outline: "2px solid var(--ring)" }
        }}
        text="Optimized link text"
      />
    </div>
  </DocsExample>

  <DocsExample
    title="Accessibility Features"
    description="Built-in accessibility features with proper ARIA support"
    code={textCodeTemplates.accessibilityFeatures}
  >
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <Text
        as="label"
        for="username"
        size="sm"
        weight="medium"
        text="Username"
      />
      <Text
        as="p"
        aria-live="polite"
        color="var(--destructive)"
        text="Error message"
      />
      <Text
        as="span"
        aria-label="3 out of 5 stars"
        text="★★★☆☆"
      />
      <Text
        as="button"
        aria-pressed="false"
        tabindex="0"
        ontap={() => console.log('Accessible button clicked')}
        states={{
          focus: { outline: "2px solid var(--ring)", outlineOffset: "2px" }
        }}
        text="Accessible button"
        style="cursor: pointer;"
      />
    </div>
  </DocsExample>

  <DocsPropsReference {props} />

  <DocsBestPractices practices={bestPractices} />
</DocsContainer>
