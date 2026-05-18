# Text Component

The Text component provides consistent typography across your application with multiple size options and styling.

## Features

- Multiple text sizes (sm, base, lg, xl, 2xl, 3xl, 4xl)
- Consistent typography scale
- Responsive design
- Accessible markup
- Easy styling customization

## Sizes

- **sm**: Small text (14px)
- **base**: Default text (16px)
- **lg**: Large text (18px)
- **xl**: Extra large text (20px)
- **2xl**: 2x large text (24px)
- **3xl**: 3x large text (30px)
- **4xl**: 4x large text (36px)

## Usage

### Basic Text

```svelte
<Text.Root>Default text size</Text.Root>
```

### Different Sizes

```svelte
<Text.Root size="sm">Small text</Text.Root>
<Text.Root size="base">Base text</Text.Root>
<Text.Root size="lg">Large text</Text.Root>
<Text.Root size="xl">Extra large text</Text.Root>
```

### Custom Styling

```svelte
<Text.Root
  size="lg"
  color="var(--primary)"
  fontWeight="600"
>
  Styled text
</Text.Root>
```

## Accessibility

- Proper semantic markup
- Readable font sizes
- Good contrast ratios
- Screen reader friendly
