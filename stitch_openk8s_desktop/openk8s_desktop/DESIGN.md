---
name: OpenK8s Desktop
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c3c6d6'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8d909f'
  outline-variant: '#434654'
  surface-tint: '#b2c5ff'
  primary: '#b2c5ff'
  on-primary: '#002b73'
  primary-container: '#326ce5'
  on-primary-container: '#faf9ff'
  inverse-primary: '#0b56cf'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#a16600'
  on-tertiary-container: '#fff9f5'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001848'
  on-primary-fixed-variant: '#0040a1'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-page: 24px
  sidebar-width: 260px
  table-row-height: 40px
---

## Brand & Style

The design system is engineered for the Modern DevOps professional—balancing the density required for technical infrastructure management with the refined aesthetics of high-end developer tools. The brand personality is precise, authoritative, and performant.

The design style is **Corporate / Modern** with a **Technical Minimalist** edge. It utilizes heavy whitespace within data-dense environments to prevent cognitive overload, paired with high-contrast status indicators to ensure critical information is never missed. The interface relies on a "system-first" logic where utility dictates form, using subtle glassmorphism for overlays and command palettes to maintain spatial awareness of the underlying cluster state.

## Colors

The palette is optimized for long-duration monitoring. The default mode is **Dark**, utilizing a Slate-based scale to reduce eye strain while maintaining high legibility for code blocks.

- **Primary (Kubernetes Blue):** Used for primary actions, active states, and branding elements.
- **Success (Emerald):** Denotes healthy pods, running services, and successful deployments.
- **Warning (Amber):** Used for pending states, resource pressure, or non-critical configuration issues.
- **Error (Rose/Red):** Reserved for failed pods, crash loops, and connectivity errors.
- **Neutral (Slate):** A deep range from `#020617` (Background) to `#94A3B8` (Secondary Text).

Maintain a 4.5:1 contrast ratio for all status-related text. In dark mode, surface levels are distinguished by increasing lightness, not purely by shadows.

## Typography

This design system employs a dual-font strategy. **Inter** handles all UI chrome, navigational elements, and descriptive text to provide a modern, accessible experience. **JetBrains Mono** is utilized for all technical data, including resource names, YAML editors, logs, and CLI outputs, ensuring character alignment and distinctness between similar characters (0/O, l/1).

For high-density tables, use `body-md` for row data. For the "Command Palette" or global search, use `headline-sm` to ensure the interface feels responsive and prominent.

## Layout & Spacing

The layout follows a **Fixed Sidebar + Fluid Content** model. The sidebar remains locked to the left, housing the cluster hierarchy and core navigation. The main content area utilizes a fluid grid that prioritizes horizontal space for expansive data tables.

**Rhythm:**
- Use a 4px base unit for all padding and margins.
- **Tables:** High-density with 12px horizontal padding and 8px vertical padding per cell.
- **Dashboards:** 24px gap between widgets/cards.
- **Modals:** 32px internal padding for focus.

On mobile/small screens, the sidebar collapses into a drawer, and tables transition to a "Card List" format to maintain legibility.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Subtle Outlines** rather than aggressive shadows. 

1. **Level 0 (Background):** Base slate color.
2. **Level 1 (Cards/Containers):** One step lighter than background with a 1px border (`slate-800` in dark mode).
3. **Level 2 (Popovers/Menus):** Noticeable elevation using a subtle 12% opacity black shadow with a 10px blur, plus a thin border to separate from underlying cards.
4. **Level 3 (Command Palette):** Highest elevation, utilizing a 20px backdrop blur (Glassmorphism) to dim the background and focus the user on the search input.

Borders should always be used on interactive surfaces to define hit-boxes in dark mode.

## Shapes

The shape language is "Soft-Technical." Elements use a consistent `0.5rem` (8px) radius to feel modern but structured. 

- **Buttons & Inputs:** `8px` (Rounded).
- **Cards & Resource Views:** `12px` (Rounded-LG).
- **Status Badges & Chips:** `Full` (Pill-shaped) to distinguish them from interactive buttons.
- **Sidebar Selection:** `6px` radius on the active state highlight to fit within the 260px container comfortably.

## Components

### Resource Tables
The core of the application. Headers must be sticky. Rows should feature a hover state that lightens the background slightly. Include a "Status" column as the first or second column using a pill-shaped Badge.

### Status Badges
Small, high-contrast indicators. Use a light background of the status color (15% opacity) with a bold foreground text color for maximum readability without visual noise.

### Command Palette
A centered, floating search bar. It should feature a `code-md` font for suggestions and KBD shortcuts (e.g., `⌘K`) in the trailing edge of the input.

### Code-Friendly Sidebar
A vertical navigation tree. Use subtle chevrons for nesting. Active items get a left-hand "Primary Blue" vertical indicator (3px wide) and a translucent blue background.

### Input Fields
Darker than the surface color, 1px border. Focus state must use a 2px Primary Blue ring. For YAML editors, use a true black background to maximize code contrast.

### Cards
Used for "Cluster Overview" metrics. Should include a small sparkline or status indicator in the top right corner.