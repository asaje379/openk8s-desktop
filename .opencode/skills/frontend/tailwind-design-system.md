---
name: "@octs/tailwind-design-system"
description: "Build a coherent, scalable design system with Tailwind CSS"
depends_on: ["@octs/project-awareness"]
tools: ["Tailwind CSS", "CVA", "clsx"]
---

# @octs/tailwind-design-system

## Objective

Build design systems with Tailwind CSS that are coherent, scalable, accessible, and consistent across every component and page. Every utility choice must tie back to a design token; every variant must be defined systematically with CVA; every component must work in light and dark mode and across all breakpoints. Never introduce ad-hoc spacing, colors, or typography — always defer to the configured design tokens.

## Dependencies

- `@octs/project-awareness`: Hard dependency. Before any code generation, analyze the existing project: Tailwind config (`tailwind.config.ts` or `tailwind.config.js`), `postcss.config`, design token definitions (colors, spacing, font sizes, breakpoints, border radii, shadows, z-indices), existing `cn()`/`clsx()` utility, existing component variants (button, input, card, badge), existing CVA usage patterns, dark mode strategy (`class` vs `media`), CSS custom properties in `globals.css`, and any existing component library (shadcn/ui, Radix, MUI, etc.). Reuse existing tokens, utilities, and component structures. Never override or duplicate project design tokens with local Tailwind classes.

## Guardrails (Apply to every task)

### Guardrail 1 — Always Consider the Existing Project

Before any code generation, ALWAYS: analyze existing architecture, identify project conventions, reuse existing components/hooks/helpers/services/utilities/types/DTOs/patterns, respect naming conventions/design system/ESLint/Prettier/Git conventions/folder structure/dependencies. Never reinvent what exists. Always prefer coherence over novelty.

### Guardrail 2 — Mandatory Verification Before Declaring Done

Never say "Done"/"Finished" without verifying: code compiles, imports valid (no dead imports), TypeScript types valid, tests pass, lint passes, no errors, files coherent, referenced components/hooks exist, paths correct, dependencies exist, changes compatible with architecture. If verification impossible: state Verified / Verifiable but not executed / Not verifiable in current context.

## Design Tokens

Design tokens are the single source of truth for every visual property. Define them in `tailwind.config` (extending the `theme` key) or using `@theme` in CSS (if using Tailwind v4). Never use raw values in component classes — always reference tokens via Tailwind utility classes.

### Colors

Define a complete color palette with semantic names. Each semantic color gets a scale (50–950). Minimally required:

| Token       | Purpose                                                |
| ----------- | ------------------------------------------------------ |
| `primary`   | Main brand color, primary CTAs, active states          |
| `secondary` | Supporting brand color, secondary CTAs                 |
| `accent`    | Highlights, badges, decorative elements                |
| `neutral`   | Backgrounds, borders, text, surfaces (gray/grey scale) |
| `success`   | Positive actions, confirmations, success badges        |
| `warning`   | Cautions, pending states, warning badges               |
| `danger`    | Destructive actions, errors, deletion confirmations    |
| `info`      | Informational messages, help tooltips, info badges     |

- Each should have at minimum: `50`, `100`, `200`, `300`, `400`, `500` (base), `600`, `700`, `800`, `900`, `950`.
- Foreground text colors for each background: `primary-foreground`, `secondary-foreground`, etc. (typically white or near-black depending on the base color's luminosity).
- Define in `tailwind.config` under `theme.extend.colors`:

```ts
colors: {
  primary: {
    50: '#eff6ff',
    // ... scales
    500: '#3b82f6', // base
    600: '#2563eb',
    // ...
    950: '#172554',
    foreground: '#ffffff',
  },
  // secondary, accent, neutral, success, warning, danger, info
}
```

### Spacing

- Base unit: **4px** (consistent with Tailwind's default spacing scale where `1 = 4px`).
- Extend the default scale only when needed (e.g., project-specific tight layouts, generous layouts). Never replace the default scale.
- All padding, margin, gap, and sizing must use spacing tokens: `p-4`, `m-2`, `gap-6`, `w-64`. Never use arbitrary values (`w-[237px]`) unless absolutely no spacing token fits.
- Consistent component-level spacing: group padding (`p-4`, `p-6`, `p-8`), element gaps (`gap-2`, `gap-4`, `gap-6`), section margins (`mb-8`, `mt-12`).

### Typography

- **Font families**: Define at most 3 families: `sans` (body), `mono` (code), and optionally `display` (headings). Extend `fontFamily` in config.
- **Font sizes**: Use the Tailwind default scale (`text-xs` through `text-9xl`) unless project requires a custom modular scale. Extend cautiously.
- **Font weights**: Use the defaults (`font-light`, `font-normal`, `font-medium`, `font-semibold`, `font-bold`, `font-extrabold`). Avoid `font-thin` and `font-black` unless design explicitly demands them.
- **Line heights**: `leading-none` for tight headings, `leading-tight` for subheads, `leading-normal` for body, `leading-relaxed` for long-form reading.
- **Letter spacing**: `tracking-tight` for large headings, `tracking-normal` for body, `tracking-wide` for labels/overlines.

### Border Radius

- Consistent scale across all components:
  - `rounded-sm` — small elements (checkboxes, tags, badges, tooltips)
  - `rounded-md` — default for inputs, buttons, cards, dropdowns
  - `rounded-lg` — larger containers, modals, dialogs
  - `rounded-full` — pills, avatars, circular buttons

### Shadows

- Defined in `boxShadow` config extension:
  - `sm` — subtle elevation (cards in light mode, input borders)
  - `md` — moderate elevation (hovered cards, dropdowns)
  - `lg` — strong elevation (modals, dialogs, popovers)
  - `xl` — maximum elevation (fixed headers, mega menus)
- Never vary shadow size ad-hoc per component. Map component states to shadow tokens consistently.

### Z-Index Scale

- Define a z-index scale in config to prevent random stacking conflicts:
  - `0` — default content
  - `10` — dropdowns, selects, autocompletes
  - `20` — sticky headers, floating action buttons
  - `30` — modals, dialogs, drawers
  - `40` — tooltips, popovers
  - `50` — toasts, notifications, alerts
  - `9999` — loading overlay, full-screen covers

## CVA (Class Variance Authority)

### Core Pattern

Define component variants with `cva()` — a function that takes base classes, variant definitions, optional `compoundVariants`, and `defaultVariants`. Always export a TypeScript type for the variant props alongside the component:

```tsx
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  // Base classes — applied to every instance:
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        solid: 'bg-primary-500 text-primary-foreground hover:bg-primary-600',
        outline: 'border border-primary-500 text-primary-500 hover:bg-primary-50',
        ghost: 'text-primary-500 hover:bg-primary-50',
        danger: 'bg-danger-500 text-danger-foreground hover:bg-danger-600',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    compoundVariants: [
      // Special combinations that override base + variant classes:
      { variant: 'outline', size: 'lg', class: 'border-2' },
    ],
    defaultVariants: {
      variant: 'solid',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button className={buttonVariants({ variant, size, className })} {...props} />;
}
```

### Variants Structure

Every component that has visual alternatives should define variants for:

- **Size**: `sm`, `md`, `lg` — consistent across all components. `sm` is for compact UIs, `md` is the default, `lg` is for prominent calls to action.
- **Color/Intent**: `primary`, `secondary`, `success`, `danger`, `warning`, `info` — semantic meanings, consistent color mapping across components.
- **State**: handled via Tailwind state modifiers (`hover:`, `focus-visible:`, `active:`, `disabled:`) — always include `disabled` and `focus-visible` styles in base classes.

### compoundVariants

Use `compoundVariants` when two or more variant props interact to produce specific styles:

```tsx
compoundVariants: [
  { size: 'lg', variant: 'outline', class: 'border-2' },
  { size: 'sm', iconOnly: true, class: 'h-8 w-8 p-0' },
  { variant: 'ghost', intent: 'danger', class: 'text-danger-500 hover:bg-danger-50' },
];
```

- Each compound variant condition uses `class` (singular, a string), not `className`.
- Document non-obvious compound interactions in a comment.

### TypeScript Integration

- Export `VariantProps<typeof variantFn>` as the component's variant prop type.
- Mix variant props with standard HTML element props via `extends React.ComponentPropsWithoutRef<'element'>` for proper ref forwarding.
- Use `forwardRef` when the underlying DOM element needs to be accessible via ref:

```tsx
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, className, ...props }, ref) => {
    return <button ref={ref} className={buttonVariants({ variant, size, className })} {...props} />;
  }
);
Button.displayName = 'Button';
```

## Dark Mode

### Strategy

- Use Tailwind's `class` strategy (`.dark` class on the `<html>` or `<body>` element, toggled by JavaScript). This is preferred over `media` (OS preference) because it allows manual toggling by the user.
- If the project already uses `media` strategy, follow it — don't convert without explicit instruction.

### Dark Variants

- Every component MUST define its dark mode styles alongside its light mode styles. Use Tailwind's `dark:` prefix:

```html
<div class="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
```

- For each base color in a component, define its `dark:` counterpart. Never leave a component without dark mode styles — it will appear broken.
- Cards/surfaces: `bg-white` → `dark:bg-neutral-800`
- Text: `text-neutral-900` → `dark:text-neutral-100`
- Borders: `border-neutral-200` → `dark:border-neutral-700`

### WCAG AA Contrast in Both Modes

- Normal text: **4.5:1** minimum contrast ratio against its background.
- Large text (≥18px bold or ≥24px regular): **3:1** minimum.
- UI components (borders, icons): **3:1** minimum.
- Verify contrast for every color combination in both light and dark modes. Use a contrast checker tool.

### CSS Variables for Color Swapping

- When using `class` strategy, the simplest approach is `dark:` prefix on individual utilities. When the design gets complex, maintainability improves with CSS variables:

```css
/* globals.css */
:root {
  --color-bg: 255 255 255;        /* white in light */
  --color-surface: 249 250 251;   /* gray-50 in light */
  --color-text: 17 24 39;         /* gray-900 in light */
}
.dark {
  --color-bg: 15 23 42;           /* gray-900 in dark */
  --color-surface: 30 41 59;       /* gray-800 in dark */
  --color-text: 241 245 249;       /* gray-100 in dark */
}
```

```ts
// tailwind.config.ts
colors: {
  bg: 'rgb(var(--color-bg) / <alpha-value>)',
  surface: 'rgb(var(--color-surface) / <alpha-value>)',
  text: 'rgb(var(--color-text) / <alpha-value>)',
}
```

- This approach allows components to use `bg-bg`, `text-text`, `bg-surface` without `dark:` prefixes. The variable values swap automatically when `.dark` class changes.

## Responsive Design

### Breakpoints

| Breakpoint | Width  | Usage                                    |
| ---------- | ------ | ---------------------------------------- |
| (default)  | <640px | Mobile layout (single column)            |
| `sm`       | 640px  | Large phones, small tablets (2 columns)  |
| `md`       | 768px  | Tablets (sidebars, multi-column layouts) |
| `lg`       | 1024px | Small desktops (full navigation, grids)  |
| `xl`       | 1280px | Desktops (max-width containers)          |
| `2xl`      | 1536px | Large desktops (wider max-width)         |

- **Mobile-first**: always write base styles for mobile, then layer on `sm:`, `md:`, `lg:`, etc. for larger breakpoints. Never write desktop-first (`max-width` breakpoints) unless the project consistently uses that pattern.
- **Component-level decisions**: each component decides how to adapt. A section might stack on mobile (`flex-col`) and go row on desktop (`md:flex-row`).
- **Avoid fixed widths**: prefer `max-w-*`, `min-w-*`, and grid-based layouts (`grid-cols-*`). Fixed widths (`w-[320px]`, `w-[600px]`) break responsiveness and should only be used when absolutely necessary (e.g., fixed sidebar width).

### Responsive Patterns

- **Grid**: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — cards, features, pricing tiers.
- **Flex**: `flex flex-col md:flex-row` — hero sections, CTAs with image + text, form rows.
- **Containers**: wrap pages in `<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">`. Consistent horizontal padding across all pages.
- **Responsive typography**: `text-2xl md:text-3xl lg:text-4xl` — scale headings up at larger breakpoints.

## Accessibility

### Contrast (WCAG AA)

- **4.5:1** for normal text (<18px or <24px regular weight) against its background.
- **3:1** for large text (≥18px bold or ≥24px regular) and UI components/icons.
- Check every color pair: text on background, text on surface, icons on buttons, borders on backgrounds (in both light and dark modes).

### Focus Styles

- **Use `focus-visible:`**, not `focus:`. `focus-visible` only shows focus styles when the user is navigating via keyboard, not when clicking with a mouse. `focus` shows on every click, which is visually noisy:

```html
<!-- Good — keyboard-only focus ring: -->
<button class="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
```

- Never remove focus indicators entirely without providing a replacement. If you override `outline-none`, always add `focus-visible:ring-*` or `focus-visible:border-*`.
- The focus ring must have sufficient contrast against adjacent content (3:1 minimum).

### prefers-reduced-motion

- Respect the user's OS motion preference. Add `motion-reduce:` or wrap component variants with a check:

```css
/* In tailwind.config or directly: */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- For complex animated components, provide a static fallback or disable animation entirely when the user prefers reduced motion.

### Screen Reader Only

- Use the `sr-only` utility (Tailwind ships it) for visually hidden text that screen readers must announce: icon-only button labels, "Skip to content" links, section headings that are visually replaced by images:

```html
<button aria-label="Close dialog" class="...">
  <XIcon aria-hidden="true" class="h-5 w-5" />
  <span class="sr-only">Close</span>
</button>
```

- Use `aria-hidden="true"` on decorative elements (icons in buttons that have text, background images, ornamental graphics).

## Conventions

### Class Ordering

Maintain a consistent order of Tailwind utilities in every `className`. The recommended order (from structural to cosmetic):

1. **Layout**: `flex`, `grid`, `flex-col`, `items-center`, `justify-between`, `absolute`, `relative`
2. **Sizing**: `w-full`, `h-10`, `max-w-md`, `min-h-screen`, `size-4`
3. **Spacing**: `p-4`, `px-6`, `m-2`, `gap-4`, `space-y-2`
4. **Typography**: `text-sm`, `font-medium`, `leading-tight`, `tracking-wide`, `text-center`
5. **Visual**: `bg-white`, `border`, `rounded-md`, `shadow-sm`
6. **State & Modifiers**: `hover:bg-gray-100`, `focus-visible:ring-2`, `dark:bg-gray-800`, `disabled:opacity-50`, `sm:flex-row`

This order improves scanning — other developers will know exactly where to look for a specific type of property. Tools like `prettier-plugin-tailwindcss` enforce this automatically.

### Component Extraction

- **Extract to a component when a pattern appears 3+ times.** If you copy-paste the same set of Tailwind classes across multiple files, it's time for a shared component.
- Extract shared components regardless of size — even a 1-element wrapper (`<SectionTitle>`) is worth extracting if it ensures consistent `text-2xl font-bold tracking-tight`.
- The component can be as small as a single `div` with specific classes. The goal is design consistency, not code abstraction.

### No CSS Modules (unless necessary)

- Prefer Tailwind utilities for everything. Avoid CSS modules (`.module.css`) unless:
  1. You need complex CSS that Tailwind can't express (child selectors, `@container` queries, complex `@keyframes`, `::backdrop` styles, CSS Grid named areas).
  2. You're integrating with a third-party library that requires CSS scoping.
  3. The project already heavily uses CSS modules — then follow the existing convention.
- When CSS modules are used, still reference design tokens (CSS variables) inside them; never hardcode colors or spacing.

### Class Merging Utility

- Always use the project's class merging utility (typically `cn()` wrapping `clsx` + `tailwind-merge`) to combine consumer-provided `className` with component-default classes:

```tsx
import { cn } from '@/lib/utils'; // or '@/shared/utils/cn'

function Card({ className, children }: CardProps) {
  return <div className={cn('rounded-lg border bg-white p-4', className)}>{children}</div>;
}
```

- `tailwind-merge` resolves Tailwind class conflicts (e.g., if the consumer passes `p-2`, it correctly overrides the component's default `p-4`).

## Code Output Conventions

- Every component must include all state styles: default, hover, focus-visible, active, and disabled.
- Every component must include `dark:` variants for backgrounds, text, and borders.
- Every component must use the project's design tokens — never raw hex codes (`#3b82f6`) in JSX, only Tailwind utility classes.
- If a component has size or visual variants, define them with CVA and export the variant prop types.
- Always use the `cn()` utility for merging `className` — never string concatenation or template literals.
