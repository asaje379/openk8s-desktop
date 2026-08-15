---
name: OpenK8s Desktop Light
colors:
  surface: '#ffffff'
  surface-dim: '#f8fafc'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f4'
  surface-container: '#f1f5f9'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#0f172a'
  on-surface-variant: '#475569'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#cbd5e1'
  outline-variant: '#c3c6d6'
  surface-tint: '#0b56cf'
  primary: '#0052ca'
  on-primary: '#ffffff'
  primary-container: '#326ce5'
  on-primary-container: '#faf9ff'
  inverse-primary: '#b2c5ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#7afac0'
  on-secondary-container: '#00734e'
  tertiary: '#805000'
  on-tertiary: '#ffffff'
  tertiary-container: '#a16600'
  on-tertiary-container: '#fff9f5'
  error: '#d32f2f'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001848'
  on-primary-fixed-variant: '#0040a1'
  secondary-fixed: '#7afac0'
  secondary-fixed-dim: '#5cdda5'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb7'
  tertiary-fixed-dim: '#ffb95e'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
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
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
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
  base: 4px
  gutter: 16px
  margin-page: 24px
  sidebar-width: 260px
  table-row-height: 40px
  widget-gap: 24px
---

## Brand & Style
This design system translates the technical rigor of Kubernetes management into a high-productivity, light-mode environment. The brand personality is professional, transparent, and high-performance, catering specifically to developers and platform engineers who require clarity during long working hours.

The design style is **Corporate / Modern** with a focus on **Information Density**. It emphasizes a "Clean Room" aesthetic—using a stark white foundation to maximize the legibility of complex data structures. The UI feels systematic and reliable, utilizing subtle structural lines and a refined use of the signature Kubernetes blue to guide the eye without causing visual fatigue.

## Colors
The palette is centered around a pure white background (`#ffffff`) to provide maximum contrast for technical data. 

- **Primary (Kubernetes Blue):** Maintained at `#326ce5`. In this light theme, it serves as the anchor for primary actions, selected navigation states, and progress indicators.
- **Surface Tiers:** Hierarchy is created using a Slate-based scale. `surface-dim` is used for sidebars and background fills, while `surface-container` provides clear containment for cards and data tables.
- **Typography Colors:** Primary text uses a deep Navy/Charcoal (`#0f172a`) to ensure it meets AAA contrast requirements against white surfaces. Secondary text and labels use a muted Slate (`#475569`).
- **Semantic Colors:** Success (Emerald), Warning (Amber), and Error (Red) are adjusted for higher saturation to remain vibrant and legible against light backgrounds.

## Typography
The system employs **Inter** for all interface elements to ensure high legibility and a modern, neutral feel. **JetBrains Mono** is strictly reserved for technical data: resource names, YAML manifests, log streams, and terminal outputs. 

For high-density tables, `body-md` is the standard for data rows, while `body-sm` is used for metadata or secondary information within those rows. All monospaced text should have a slightly increased line-height to improve the readability of complex code blocks.

## Layout & Spacing
The layout uses a **Fixed Sidebar + Fluid Content** model. The sidebar remains on the left to anchor the user's mental model of the cluster hierarchy. 

**Rhythm and Density:**
- Use a 4px base unit for all padding and margins.
- **Resource Tables:** High-density alignment. Cells should have 12px horizontal and 8px vertical padding.
- **Responsive Behavior:** Below 1024px, the sidebar collapses into a hamburger menu. Data tables on mobile must transform into card stacks to avoid horizontal scrolling of critical status information.

## Elevation & Depth
In light mode, hierarchy is achieved through **Tonal Layering** and **Soft Shadows**. 

1.  **Level 0 (Base):** Pure white background (`#ffffff`).
2.  **Level 1 (In-page Containers):** Off-white surface (`#f8fafc`) with a subtle `1px` border (`#cbd5e1`). Shadows are not used here.
3.  **Level 2 (Dropdowns & Modals):** White surfaces with a soft, diffused shadow (`0 4px 12px rgba(0,0,0,0.08)`) and a `1px` neutral border.
4.  **Level 3 (Command Palette):** Highest priority. Uses a significant shadow (`0 12px 32px rgba(0,0,0,0.12)`) and a subtle backdrop blur on the page content to isolate the search experience.

## Shapes
The shape language is "Soft-Technical," utilizing 8px (0.5rem) as the standard radius.

- **Interactive Elements:** Buttons and Inputs use the 8px standard.
- **Structural Elements:** Cards and resource containers use 16px (Rounded-LG) to create a clear visual distinction from buttons.
- **Status Indicators:** Badges and Chips use the Pill-shape (Full) to ensure they are never confused with clickable buttons or input fields.

## Components

### Buttons
Primary buttons use the signature blue background with white text. Secondary buttons use a `1px` border of the primary blue with a transparent background. Action buttons in tables should be icon-only or ghost-style to reduce visual noise.

### Resource Tables
The primary data component. Headers must be `label-caps` in Slate-600 with a subtle bottom border. Rows feature a `surface-container` background on hover.

### Status Badges
Pill-shaped. Use a 10% opacity background of the semantic color (e.g., light green background for Success) with a high-contrast bold foreground text.

### Input Fields
Inputs use a white background with a `1px` Slate-300 border. On focus, they transition to a `2px` Primary Blue ring. 

### YAML Editor
Unlike the rest of the light theme, the YAML editor should maintain a "Dark-Cell" style or a very high-contrast "Solarized Light" style to differentiate it from the UI chrome and protect the readability of syntax highlighting.

### Sidebar Navigation
Active items feature a 3px wide vertical bar on the left in Primary Blue and a light blue tint (`#eff6ff`) across the entire row.