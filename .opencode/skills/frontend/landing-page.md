---
name: "@octs/landing-page"
description: "Create premium, performant, SEO-optimized landing pages"
depends_on: ["@octs/project-awareness"]
tools: ["Next.js", "React", "Tailwind CSS", "Framer Motion", "GSAP"]
---

# @octs/landing-page

## Objective

Create landing pages that convert visitors through premium design, fast load times, and strong SEO. Every landing page must be responsive, accessible, animated with restraint, and built on the existing project design system — never invent new patterns where existing ones suffice.

## Dependencies

- `@octs/project-awareness`: Hard dependency. Before any code generation, analyze the existing project: architecture (Next.js App Router vs Pages Router), package versions, Tailwind config, existing components, hooks, utilities, design tokens, typography scale, color palette, and component library (shadcn/ui, MUI, etc.). Reuse existing components and patterns wherever possible. Never introduce a competing animation library, design system, or utility pattern that conflicts with what already exists.

## Guardrails (Apply to every task)

1. **Before any code generation**, analyze existing project context: architecture, stack, conventions, existing components/hooks/helpers, patterns, dependencies. Never reinvent what exists. Always prefer coherence and reuse over novelty.
2. **Never declare work "done" or "finished"** without verifying: compilation, valid imports (no dead imports), TypeScript types, tests passing, lint passing, no errors, file coherence, component/hook existence, correct paths, dependency existence, architectural compatibility. If verification is impossible in current context, explicitly label it: `Verified` / `Verifiable but not executed` / `Not verifiable in current context`.

## Structure

### Core Sections

Landing pages are built from modular, reorderable sections. Each section is a self-contained component that accepts props for configuration. The canonical section set:

- **Hero**: Primary headline, supporting subheadline, one or two CTAs (primary + secondary), hero image/illustration/video. Must communicate the core value proposition above the fold.
- **Features Grid**: 3-6 feature cards in a responsive grid (2-col md, 3-col lg). Each card: icon/illustration, title, brief description. Use Bento Grid layouts for visual interest — vary card sizes (1x1, 2x1, 1x2, 2x2) while maintaining grid integrity.
- **CTA (Call To Action)**: Bold headline, supporting copy, prominent button. High-contrast background to visually separate from surrounding sections. Single clear action — don't offer multiple competing CTAs.
- **Pricing**: Pricing tiers in cards (3-4 tiers max). Each tier: name, price, period, feature list with checkmarks, CTA button. Highlight recommended tier with visual distinction (border, badge, shadow).
- **FAQ**: Accordion pattern. Each item: question (trigger) + answer (panel). Use smooth height animation on expand/collapse. Support "open all" / "close all" controls. Schema markup for rich results.
- **Testimonials**: Carousel or grid of testimonial cards. Each: quote, avatar, name, title/company, optional star rating. Auto-advance with pause on hover. Include social proof indicators (company logos, user counts, ratings).
- **Footer**: Multi-column link layout. Columns: Product, Company, Resources, Legal. Social media icon links. Copyright line. Newsletter signup optional.

### Bento Grid Layouts

Use asymmetric grid layouts for feature showcases. CSS Grid with `grid-template-areas` or Tailwind grid utilities:

- Prefer explicit grid placement over auto-flow for Bento layouts.
- Use `col-span-{n}` and `row-span-{n}` utilities.
- Maintain touch-target sizes on mobile — collapse Bento to single-column stack.

## Design

### Responsive Design

Mobile-first breakpoint strategy. Default styles target mobile; layer on complexity at breakpoints:

| Breakpoint | Width  | Layout behavior                        |
| ---------- | ------ | -------------------------------------- |
| (default)  | <640px | Single column, stacked sections        |
| `sm:`      | 640px  | Two-column grids, inline CTAs          |
| `md:`      | 768px  | Three-column grids, side-by-side hero  |
| `lg:`      | 1024px | Full feature grids, larger typography  |
| `xl:`      | 1280px | Max-width containers, generous spacing |
| `2xl:`     | 1536px | Large hero images, wide layouts        |

- Use `max-w-{size}` containers to constrain content width on large screens. Never let content stretch edge-to-edge on viewports wider than `xl`.
- Test all sections at 375px (mobile), 768px (tablet), 1440px (desktop).

### Dark Mode

- Use Tailwind `dark:` prefix with `class` strategy (`.dark` class on `<html>`).
- Every section must render correctly in both modes — check background/foreground contrast, card shadows, border visibility.
- Use CSS variables via `tailwind.config` for colors that swap between modes: define `--color-bg`, `--color-surface`, `--color-text-primary`, etc., and reference them in Tailwind classes.

### Typography

- Establish a type scale using Tailwind's font size utilities. Pair a display/heading font with a body font using `next/font`.
- Hierarchy through size, weight, and color — not just size.
- Headlines: `text-4xl` to `text-6xl` (mobile downscaled proportionally), `font-bold` or `font-extrabold`, tight leading.
- Body: `text-base` or `text-lg`, `font-normal`, comfortable leading (`leading-relaxed`).
- Never use more than 2 font families on a single page.

### Visual Hierarchy

- Size: Largest for primary headline, decreasing for subheads, smallest for body and metadata.
- Color: High-contrast text for primary content, muted colors (`gray-500`/`gray-400`) for secondary/supporting.
- Spacing: Generous whitespace between sections (`py-20` to `py-32`), tighter within sections (`gap-6` to `gap-12`).
- Weight: Bold for headings, regular for body, medium for emphasis.

## Animations

### Framer Motion (primary)

Use for React component animations. Keep animations subtle — enhance, don't distract.

- **Entrance animations**: `motion.div` with `initial`, `animate`, and `transition` props. Fade-up (`opacity: 0, y: 20` → `opacity: 1, y: 0`) with stagger children (`staggerChildren: 0.1`).
- **Scroll-triggered**: `useInView` hook with `once: true` (animate on first scroll only, not every scroll). Trigger animations when element is 20-30% in view.
- **Hover states**: `whileHover={{ scale: 1.02 }}` on cards/buttons. Use `whileTap={{ scale: 0.98 }}` for press feedback.
- **Layout animations**: `layoutId` prop for shared layout animations between states (e.g., expanding card to modal).
- **Exit animations**: `AnimatePresence` to animate components leaving the DOM.

### GSAP (complex sequences only)

Use GSAP only when Framer Motion can't achieve the effect (complex timelines, scroll-triggered animations with pinning/scrubbing, SVG animations). If GSAP is not already in the project, prefer Framer Motion for everything.

### Animation Principles

- Duration: 0.2-0.5s for micro-interactions, 0.5-1.0s for entrance animations.
- Easing: `easeOut` for entrances, `easeInOut` for continuous animations.
- Respect `prefers-reduced-motion`: wrap animations in a check — `const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')` — and disable all motion if true.
- Never animate `layout` properties (width, height, top, left) — use `transform` (translate, scale, opacity) only, which the browser can composite efficiently.

## Accessibility

- **Semantic HTML**: Use landmark elements (`<header>`, `<main>`, `<nav>`, `<footer>`, `<section>`, `<article>`). Each `<section>` should have a heading.
- **ARIA**: Add `aria-label` to icon-only buttons and links. Use `aria-expanded` on accordion triggers. Use `aria-live="polite"` for dynamically updating content regions (testimonial carousels, counters).
- **Keyboard navigation**: All interactive elements focusable and operable by keyboard. Logical tab order matching visual order. Escape closes modals/accordions. Enter/Space activates buttons and toggles.
- **Focus management**: `focus-visible:` ring on all interactive elements. Never use `focus:` outline removal without replacement. Trap focus in modals. Move focus to new content after navigation (e.g., after opening accordion panel).
- **Color contrast**: WCAG AA — 4.5:1 minimum for normal text, 3:1 for large text (18px+ bold or 24px+ regular). Use a contrast checker on all text/background combinations. Never convey information through color alone (pair with icons or text).
- **Screen reader**: Use `sr-only` Tailwind utility for visually hidden descriptive text (icon button labels, "Skip to content" links). Use `aria-hidden="true"` on decorative elements.

## SEO

### Meta Tags

Every landing page must have:

```tsx
<title>{pageTitle} | {companyName}</title>
<meta name="description" content="{compelling description, <160 chars}" />
```

### Open Graph

```tsx
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{description}" />
<meta property="og:image" content="{absolute URL to 1200x630px image}" />
<meta property="og:url" content="{canonical URL}" />
<meta property="og:type" content="website" />
```

### Twitter Cards

```tsx
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{title}" />
<meta name="twitter:description" content="{description}" />
<meta name="twitter:image" content="{absolute URL}" />
```

### Structured Data (JSON-LD)

Include relevant schema types in a `<script type="application/ld+json">` tag. Use one or more per page as applicable:

- **Organization**: Always include — name, URL, logo, sameAs (social profiles).
- **WebSite**: Include for site-level search with `potentialAction` for SearchAction.
- **FAQ**: Include when FAQ section present — each question/answer pair as `FAQPage` with `Question`/`Answer` items.
- **Product**: For product landing pages — name, description, offers (price, currency, availability).
- **BreadcrumbList**: For sub-pages within a site hierarchy.

### Technical SEO

- Generate and commit `robots.txt` (allow crawling, point to sitemap).
- Generate and commit `sitemap.xml` (list all public pages with `<lastmod>`, `<changefreq>`, `<priority>`).
- Set canonical URL via `<link rel="canonical" href="..." />` when multiple URLs serve same content.
- Add `lang` attribute to `<html>` element.

## Performance

### Core Web Vitals Targets

| Metric | Target     |
| ------ | ---------- |
| LCP    | < 2.5s     |
| CLS    | < 0.1      |
| INP    | < 200ms    |

### Image Optimization

- Use `next/image` for all images. Never use raw `<img>` tags.
- Provide explicit `width` and `height` to prevent CLS (layout shift).
- Use `sizes` attribute for responsive images: `sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"`.
- Use `priority` prop on above-the-fold images (hero image) to preload.
- Use `loading="lazy"` for below-the-fold images (default in next/image, but explicitly consider eager for critical images).
- Serve modern formats: WebP (universal), AVIF (where supported). Next.js `next/image` handles automatic format negotiation.
- Use `placeholder="blur"` with static imports for automatic blur-up loading; use `blurDataURL` for dynamic images.

### Code Splitting

- Use `next/dynamic` with `{ ssr: false }` for heavy client-only components (animation libraries, charts, carousels).
- Lazy load below-the-fold sections: wrap with `dynamic(() => import('./Section'), { loading: () => <SectionSkeleton /> })`.
- Route-level code splitting is automatic with Next.js App Router (each `page.js` is a separate chunk).

### Bundle Size

- Never import entire libraries: `import { motion } from 'framer-motion'` not `import framerMotion from 'framer-motion'`.
- Tree-shake: ensure imports are specifiers (named imports) so bundler can eliminate unused code.
- Avoid heavy runtime dependencies for simple effects — prefer CSS animations/transitions when they suffice.

### Font Optimization

- Use `next/font` for all web fonts. Never use external CSS `@import` or `<link>` for fonts.
- Set `display: 'swap'` to prevent invisible text during font load (FOIT → FOUT tradeoff is acceptable).
- Subset fonts to needed character sets (latin, latin-ext).
- Use `variable` fonts when available (single file for all weights).

### Lazy Loading

- Images below the fold: `loading="lazy"` (automatic in `next/image`).
- Videos: `loading="lazy"`, consider `poster` attribute for placeholder, never autoplay with sound.
- Heavy interactive components: dynamic import as described above.
- Third-party scripts (analytics, chat widgets): use `next/script` with `strategy="lazyOnload"` or `strategy="afterInteractive"`.

## Existing System Integration

When building within an existing project:

1. **Read the Tailwind config** to understand the design token system: colors, spacing, breakpoints, font families.
2. **Audit existing components** before creating new ones. Check `components/`, `ui/`, `shared/` directories. Reuse buttons, cards, sections, typography components.
3. **Use existing utility functions**: `cn()` / `clsx()` for class merging, existing animation wrappers, existing SEO metadata helpers, existing image components.
4. **Match existing patterns**: same component structure, same prop naming conventions, same export style (named vs default), same file organization.
5. **Do not introduce competing solutions**: if the project uses Framer Motion, don't introduce GSAP (and vice versa); if it uses shadcn/ui, don't add Radix primitives directly; if it has a Section wrapper component, use it.
