export const textCodeTemplates = {
  basicUsage: `<script>
  import { Text } from "$lib/base/text";
</script>

<Text text="Default text content" />`,

  sizes: `<Text size="xs" text="Extra Small (xs) - 12px" />
<Text size="sm" text="Small (sm) - 14px" />
<Text size="base" text="Base (base) - 16px" />
<Text size="lg" text="Large (lg) - 18px" />
<Text size="xl" text="Extra Large (xl) - 20px" />
<Text size="2xl" text="2X Large (2xl) - 24px" />
<Text size="3xl" text="3X Large (3xl) - 30px" />
<Text size="4xl" text="4X Large (4xl) - 36px" />`,

  weights: `<Text weight="normal" text="Normal weight (400)" />
<Text weight="medium" text="Medium weight (500)" />
<Text weight="semibold" text="Semibold weight (600)" />
<Text weight="bold" text="Bold weight (700)" />`,

  colors: `<Text text="Default color" />
<Text color="var(--primary)" text="Primary color" />
<Text color="var(--muted-foreground)" text="Muted foreground" />
<Text color="var(--destructive)" text="Destructive color" />
<Text color="#3b82f6" text="Custom blue color" />`,

  alignment: `<Text textAlign="left" text="Left aligned text" />
<Text textAlign="center" text="Center aligned text" />
<Text textAlign="right" text="Right aligned text" />
<Text textAlign="justify" text="Justified text that will wrap and align to both left and right edges when there is enough content to demonstrate the justification behavior." />`,

  transform: `<Text transform="none" text="No transformation" />
<Text transform="uppercase" text="uppercase text" />
<Text transform="lowercase" text="LOWERCASE TEXT" />
<Text transform="capitalize" text="capitalize each word" />`,

  usingChildren: `<Text size="lg" weight="semibold">
  This text uses children instead of the text prop.
  You can include <strong>HTML elements</strong> and other content.
</Text>`,

  advancedStyling: `<Text
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
/>`,

  cssVariables: `<!-- Using CSS variables for theming -->
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

<!-- Custom CSS variable styling -->
<div style="--custom-text-color: oklch(0.7 0.15 250);">
  <Text
    color="var(--custom-text-color)"
    text="Custom themed text"
  />
</div>`,

  semanticElements: `<!-- Using semantic HTML elements -->
<Text as="h1" size="4xl" weight="bold" text="Main Heading" />
<Text as="h2" size="3xl" weight="semibold" text="Section Heading" />
<Text as="p" size="base" text="Paragraph text content" />
<Text as="span" size="sm" color="var(--muted-foreground)" text="Inline text" />
<Text as="label" size="sm" weight="medium" text="Form label" />`,

  interactiveText: `<script>
  import { Text } from "$lib/base/text";

  let clickCount = $state(0);

  function handleClick() {
    clickCount++;
  }
</script>

<Text
  size="lg"
  color="var(--primary)"
  ontap={handleClick}
  states={{
    hover: { opacity: 0.8 },
    active: { transform: "scale(0.95)" }
  }}
  style="cursor: pointer;"
  text="Interactive text (clicked {clickCount} times)"
/>`,

  stateManagement: `<script>
  import { Text } from "$lib/base/text";

  let isDisabled = $state(false);
  let isSelected = $state(false);
</script>

<Text
  text="Text with states"
  disabled={isDisabled}
  selected={isSelected}
  states={{
    disabled: { opacity: 0.5 },
    selected: {
      background: "var(--accent)",
      color: "var(--accent-foreground)",
      padding: "0.25rem 0.5rem",
      borderRadius: "0.25rem"
    }
  }}
/>`,

  lineHeightAndSpacing: `<!-- Using preset line heights -->
<Text lineHeight="tight" text="Tight line height (1.25)" />
<Text lineHeight="normal" text="Normal line height (1.5)" />
<Text lineHeight="relaxed" text="Relaxed line height (1.625)" />
<Text lineHeight="loose" text="Loose line height (2)" />

<!-- Using preset letter spacing -->
<Text letterSpacing="tight" text="Tight letter spacing" />
<Text letterSpacing="normal" text="Normal letter spacing" />
<Text letterSpacing="wide" text="Wide letter spacing" />
<Text letterSpacing="wider" text="Wider letter spacing" />`,

  themeIntegration: `<script>
  import { Text } from "$lib/base/text";

  // Theme color examples
  const themeColors = [
    'var(--primary)',
    'var(--secondary)',
    'var(--accent)',
    'var(--muted)',
    'var(--destructive)'
  ];
</script>

{#each themeColors as color, i}
  <Text
    size="lg"
    {color}
    text="Theme color {i + 1}"
    style="margin-bottom: 0.5rem;"
  />
{/each}`,

  responsiveDesign: `<!-- Responsive text with CSS variables -->
<Text
  size="base"
  style="font-size: var(--text-sm); @media (min-width: 768px) { font-size: var(--text-lg); }"
  text="Responsive text size"
/>

<!-- Container with responsive text -->
<div class="responsive-container">
  <Text
    size="2xl"
    weight="bold"
    textAlign="center"
    text="Responsive heading"
  />
  <Text
    size="base"
    color="var(--muted-foreground)"
    textAlign="center"
    text="Responsive subtitle"
  />
</div>`,

  performanceOptimized: `<script>
  import { Text } from "$lib/base/text";

  // Predefined state patterns for performance
  const buttonStates = {
    hover: { opacity: 0.8 },
    active: { transform: "scale(0.95)" }
  };

  const linkStates = {
    hover: { textDecoration: "underline" },
    focus: { outline: "2px solid var(--ring)" }
  };
</script>

<!-- Using predefined states for better performance -->
<Text
  as="button"
  size="lg"
  states={buttonStates}
  text="Optimized button text"
/>

<Text
  as="a"
  href="#"
  states={linkStates}
  text="Optimized link text"
/>`,

  accessibilityFeatures: `<!-- Accessible text with proper ARIA -->
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

<!-- Screen reader friendly text -->
<Text
  as="span"
  aria-label="3 out of 5 stars"
  text="★★★☆☆"
/>

<!-- Accessible interactive text -->
<Text
  as="button"
  aria-pressed="false"
  tabindex="0"
  ontap={() => console.log('Accessible button clicked')}
  states={{
    focus: { outline: "2px solid var(--ring)", outlineOffset: "2px" }
  }}
  text="Accessible button"
/>`,
};
