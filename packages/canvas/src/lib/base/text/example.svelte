<script lang="ts">
import { Text } from "$lib/base/text/index.js";
</script>

<div class="p-8 space-y-8">
  <h1 class="text-2xl font-bold">Text Component Test</h1>

  <!-- Text Sizes -->
  <div>
    <h2 class="text-lg font-semibold mb-4">Text Sizes</h2>
    <div class="space-y-2">
      <Text size="xs" text="Extra Small Text (xs)" />
      <Text size="sm" text="Small Text (sm)" />
      <Text size="base" text="Base Text (base)" />
      <Text size="lg" text="Large Text (lg)" />
      <Text size="xl" text="Extra Large Text (xl)" />
      <Text size="2xl" text="2X Large Text (2xl)" />
      <Text size="3xl" text="3X Large Text (3xl)" />
      <Text size="4xl" text="4X Large Text (4xl)" />
    </div>
  </div>

  <!-- Text Weights -->
  <div>
    <h2 class="text-lg font-semibold mb-4">Text Weights</h2>
    <div class="space-y-2">
      <Text weight="normal" text="Normal Weight Text" />
      <Text weight="medium" text="Medium Weight Text" />
      <Text weight="semibold" text="Semibold Weight Text" />
      <Text weight="bold" text="Bold Weight Text" />
    </div>
  </div>

  <!-- Text Alignment -->
  <div>
    <h2 class="text-lg font-semibold mb-4">Text Alignment</h2>
    <div class="space-y-2 border p-4">
      <Text align="left" text="Left aligned text" />
      <Text align="center" text="Center aligned text" />
      <Text align="right" text="Right aligned text" />
      <Text
        align="justify"
        text="Justified text that should wrap and justify properly when it's long enough to span multiple lines in the container."
      />
    </div>
  </div>

  <!-- Text Transform -->
  <div>
    <h2 class="text-lg font-semibold mb-4">Text Transform</h2>
    <div class="space-y-2">
      <Text transform="none" text="Normal Text Transform" />
      <Text transform="uppercase" text="Uppercase Text Transform" />
      <Text transform="lowercase" text="LOWERCASE TEXT TRANSFORM" />
      <Text transform="capitalize" text="capitalize text transform" />
    </div>
  </div>

  <!-- Custom Colors -->
  <div>
    <h2 class="text-lg font-semibold mb-4">Custom Colors</h2>
    <div class="space-y-2">
      <Text color="red" text="Red colored text" />
      <Text color="blue" text="Blue colored text" />
      <Text color="green" text="Green colored text" />
      <Text color="var(--primary)" text="Primary color text (CSS variable)" />
      <Text color="oklch(0.7 0.15 330)" text="OKLCH color text" />
    </div>
  </div>

  <!-- Custom Line Height and Letter Spacing -->
  <div>
    <h2 class="text-lg font-semibold mb-4">Custom Spacing</h2>
    <div class="space-y-4 border p-4">
      <Text
        lineHeight="1.2"
        text="Tight line height (1.2) - This text has a tighter line height which makes the lines closer together when the text wraps to multiple lines."
      />
      <Text
        lineHeight="2"
        text="Loose line height (2.0) - This text has a looser line height which makes the lines further apart when the text wraps to multiple lines."
      />
      <Text letterSpacing="0.1em" text="Wide letter spacing (0.1em)" />
      <Text letterSpacing="-0.05em" text="Tight letter spacing (-0.05em)" />
    </div>
  </div>

  <!-- Combined Styles -->
  <div>
    <h2 class="text-lg font-semibold mb-4">Combined Styles</h2>
    <div class="space-y-4">
      <Text
        size="2xl"
        weight="bold"
        color="oklch(0.6 0.2 270)"
        align="center"
        transform="uppercase"
        letterSpacing="0.05em"
        text="Styled Heading"
      />

      <Text
        size="lg"
        weight="medium"
        color="var(--muted-foreground)"
        align="center"
        lineHeight="1.6"
        text="This is a subtitle with custom styling that demonstrates multiple properties working together."
      />
    </div>
  </div>

  <!-- Children Content -->
  <div>
    <h2 class="text-lg font-semibold mb-4">Children Content</h2>
    <div class="space-y-2">
      <Text size="lg" weight="semibold">
        This text uses children instead of the text prop
      </Text>

      <Text size="base" color="blue">
        Mixed content: <strong>bold text</strong> and <em>italic text</em>
      </Text>
    </div>
  </div>
</div>
