---
name: Aura Gold
colors:
  surface: "#16130b"
  surface-dim: "#16130b"
  surface-bright: "#3d392f"
  surface-container-lowest: "#110e07"
  surface-container-low: "#1f1b13"
  surface-container: "#231f17"
  surface-container-high: "#2d2a21"
  surface-container-highest: "#38342b"
  on-surface: "#eae1d4"
  on-surface-variant: "#d0c5af"
  inverse-surface: "#eae1d4"
  inverse-on-surface: "#343027"
  outline: "#99907c"
  outline-variant: "#4d4635"
  surface-tint: "#e9c349"
  primary: "#f2ca50"
  on-primary: "#3c2f00"
  primary-container: "#d4af37"
  on-primary-container: "#554300"
  inverse-primary: "#735c00"
  secondary: "#c8c8b0"
  on-secondary: "#303221"
  secondary-container: "#494a38"
  on-secondary-container: "#b9baa3"
  tertiary: "#bfcdff"
  on-tertiary: "#082b72"
  tertiary-container: "#97b0ff"
  on-tertiary-container: "#254188"
  error: "#ffb4ab"
  on-error: "#690005"
  error-container: "#93000a"
  on-error-container: "#ffdad6"
  primary-fixed: "#ffe088"
  primary-fixed-dim: "#e9c349"
  on-primary-fixed: "#241a00"
  on-primary-fixed-variant: "#574500"
  secondary-fixed: "#e4e4cc"
  secondary-fixed-dim: "#c8c8b0"
  on-secondary-fixed: "#1b1d0e"
  on-secondary-fixed-variant: "#474836"
  tertiary-fixed: "#dbe1ff"
  tertiary-fixed-dim: "#b4c5ff"
  on-tertiary-fixed: "#00174b"
  on-tertiary-fixed-variant: "#27438a"
  background: "#16130b"
  on-background: "#eae1d4"
  surface-variant: "#38342b"
typography:
  headline-xl:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: "700"
    lineHeight: "1.1"
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: "600"
    lineHeight: "1.2"
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: "400"
    lineHeight: "1.6"
    letterSpacing: 0.01em
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: "400"
    lineHeight: "1.6"
    letterSpacing: 0.01em
  label-caps:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: "600"
    lineHeight: "1"
    letterSpacing: 0.2em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1440px
  gutter: 2rem
  margin-mobile: 1.5rem
  section-padding: 8rem
  stack-sm: 0.5rem
  stack-md: 1.5rem
  stack-lg: 4rem
---

## Brand & Style

This design system embodies a high-end tech aesthetic where luxury meets technical precision. Inspired by the immersive depth of modern database interfaces, it swaps conventional tech purples for a prestigious palette of gold, obsidian, and alabaster.

The style is a blend of **Minimalism** and **Glassmorphism**. It utilizes expansive negative space, ultra-refined typography, and translucent layered surfaces to create a sense of infinite digital space. The emotional goal is to evoke "Prestige Engineering"—a product that feels as much like a luxury timepiece or a high-end architectural firm as it does a powerful software platform.

Visual signature elements include:

- Immersive, full-width mega-menus with blurred backdrops.
- Subtle gold radial gradients that mimic light hitting brushed metal.
- Sharp, intentional focus on hairline strokes and generous kerning.

## Colors

The palette is strictly limited to three core pillars: **Obsidian**, **Cream**, and **Rich Gold**.

- **Primary Accent:** Rich Yellow-Gold (#D4AF37). Used for primary actions, critical path highlights, and delicate gradients.
- **Dark Mode (Default):** The background is a deep, near-black (#0A0A0A) to provide maximum contrast for gold accents. Text is rendered in a soft, near-white yellow (#F5F5DC) to reduce eye strain compared to pure white.
- **Light Mode:** A "champagne" experience using a very pale, white-gold background (#FDFCF0) with dark gray text (#1A1A1A) for a classic editorial feel.

Gradients should be used sparingly, primarily as radial "glows" behind key content blocks or as linear "brushed metal" fills for buttons, moving from `#D4AF37` to a slightly deeper `#B8860B`.

## Typography

The typography strategy relies on the contrast between high-character geometric sans-serifs and technical monospaced elements.

- **Headlines:** Use **Manrope**. Its refined, balanced structure provides a modern professional look. Large headings should use tight tracking, while sub-headers benefit from increased breathing room.
- **Body:** Use **Hanken Grotesk**. It is chosen for its sharp legibility and contemporary feel, performing exceptionally well in both light and dark modes.
- **Labels & Micro-copy:** Use **Geist**. This adds a subtle "developer-centric" or "precision" feel to the luxury aesthetic.
- **Stylistic Note:** All uppercase labels must feature generous letter spacing (0.15em to 0.25em) to maintain the premium, spacious brand feel.

## Layout & Spacing

This design system employs a **Fixed Grid** philosophy for desktop to maintain the "editorial" integrity of the layout, while transitioning to a fluid model for tablet and mobile.

- **Grid:** A 12-column grid with a 1440px max-width.
- **Negative Space:** Emphasis is placed on "Vertical Luxury"—using significant padding between sections (8rem+) to allow the eye to rest and focus on individual value propositions.
- **Mega-menus:** These should span the full width of the viewport, utilizing a blur effect (backdrop-filter) to keep the user grounded in their current context while exploring deep navigation.

## Elevation & Depth

Depth is achieved through **Tonal Layers** and **Glassmorphism**, rather than heavy shadows.

- **Surfaces:** In dark mode, primary cards use a slightly lighter gray (#161616) than the background.
- **Glass Effects:** Overlays, such as navigation bars and mega-menus, use a 70% opacity background with a `blur(20px)` effect.
- **Borders:** Instead of shadows, use "Ghost Outlines"—thin, 1px borders in Gold (#D4AF37) at 20% opacity. This defines the shape without adding visual weight.
- **Glows:** Use subtle radial gradients of gold (#D4AF37 at 10% opacity) behind primary CTA areas to draw the eye without disrupting the flat, clean aesthetic.

## Shapes

The shape language is disciplined and "Soft-Industrial."

We use a **Soft (0.25rem)** base radius for standard components like input fields and small buttons. Larger containers, such as cards or the mega-menu dropdowns, should scale to **rounded-lg (0.5rem)**.

This minimal rounding maintains a technical, precise appearance while being more approachable than perfectly sharp 90-degree corners. Icons should follow this logic, using consistent 1.5px or 2px stroke weights with slightly rounded terminals.

## Components

- **Buttons:** Primary buttons feature a gold-to-dark-gold linear gradient with dark text. Secondary buttons are "Ghost" style: 1px gold border with gold text and no fill.
- **Input Fields:** Minimalist design—bottom border only or a very faint 4-sided outline. On focus, the border transitions to full-opacity gold with a very subtle outer glow.
- **Mega-Menus:** These are the centerpiece. Use large, descriptive icons in gold, organized into clear columns. Use Hanken Grotesk for descriptions to ensure readability.
- **Cards:** No shadows. Use a 1px border (#D4AF37 at 15% opacity). On hover, the border opacity increases to 50%, and the background shifts slightly lighter.
- **Chips/Badges:** Use Geist (Monospaced) for the text. Backgrounds should be a desaturated, semi-transparent gold with high-contrast gold text.
- **Checkboxes & Radios:** Sharp, custom-styled components. When checked, they fill with solid Gold (#D4AF37) and a dark checkmark/dot.
