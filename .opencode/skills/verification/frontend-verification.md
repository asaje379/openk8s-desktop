---
name: "@octs/frontend-verification"
description: "Comprehensive frontend verification covering code quality, browser behavior, visual correctness, state handling, interactions, console errors, performance, SEO, accessibility, and backoffice logic."
depends_on: ["@octs/project-awareness"]
tools: ["Playwright", "ESLint", "Biome", "Prettier", "Vitest", "Jest"]
---

# @octs/frontend-verification

## Objective

Perform a complete frontend verification across 11 phases whenever frontend code is created or modified. The goal is to catch every class of issue—from TypeScript errors and broken layouts to inaccessible UI and missing SEO metadata—before code reaches production.

## Dependencies

- `@octs/project-awareness` — all conventions, stack, architecture, and inventory must be loaded before verification begins.

## Trigger Conditions

This skill runs when:
- Creating or modifying **pages** (new route, new page component, page layout changes).
- Creating or modifying **components** (new component, props changes, refactors, behavior changes).
- Creating or modifying **UI elements** (buttons, forms, modals, dropdowns, tables, design tokens).
- Creating or modifying **forms and form workflows** (validation, submission, multi-step, wizard).
- Creating or modifying **user-facing workflows** (authentication flow, onboarding, checkout, settings).
- Fixing **frontend bugs** (rendering issues, state bugs, interaction bugs, layout shifts).
- Evolving the **design system** (new variants, new components, token updates, theme changes).

If in doubt, run it. Frontend regressions are cheap to prevent and expensive to fix later.

## Universal Guardrails

- **Always analyze existing project context before generating code.** Before verifying, read `docs/conventions.md` and `docs/architecture.md` to understand the expected patterns. Check the component inventory to verify reuse.
- **Never declare work done without verifying compile/lint/tests/imports/coherence.** All 11 phases below must be evaluated. The mandatory report at the end documents what was checked and whether each passed.

---

## Phase 1 — Understand the Change

Before any verification, build a mental model of what changed and why.

### Questions to Answer

1. **What was modified?** List all files changed, added, or deleted.
2. **Which components are affected?** Walk the component tree from pages down to leaf elements. Identify every component that directly or indirectly depends on the changed code.
3. **Which user journeys are impacted?** Map the change to one or more user flows (e.g., "user signs up", "user adds item to cart", "admin views dashboard").
4. **What are the expected behaviors?**
   - **Happy path**: The primary, successful flow. What should the user see and experience?
   - **Error states**: What happens when inputs are invalid, the server is unreachable, the user lacks permissions?
   - **Edge cases**: Empty lists, boundary values (0, max length, negative numbers), concurrent actions, rapid clicks.
   - **Loading states**: What does the user see while data is fetching or an action is processing?
   - **Empty states**: What does the user see when there is no data to display?
   - **Responsive behavior**: How should the UI adapt at different viewport widths?
5. **Is this a new feature or a fix?** New features require full verification of all states. Fixes require regression checks to ensure the fix does not break the original happy path.

### Output of Phase 1

A concise change summary:

```
## Change Summary
- Files changed: 3 (src/components/UserForm.tsx, src/hooks/useUsers.ts, src/types/user.ts)
- Affected components: UserForm, UserTable, UserPage
- User journeys: Admin creates a new user, Admin views user list
- Type: Bug fix (validation error not showing on email field)
```

---

## Phase 2 — Code Verification

Review the changed code against the project's TypeScript and architectural standards.

### TypeScript Quality

- **No unnecessary `any`**: Every variable, parameter, and return type must be explicitly typed. `any` is only acceptable in escape-hatch scenarios (third-party type gaps) and must be accompanied by a comment explaining why.
- **Valid imports**: All imports must resolve. No missing exports, no circular dependencies, no importing from forbidden layers (e.g., importing a server module in client code).
- **Typed props**: Every component must have explicit props types (TypeScript interface or type). No `Props` without a corresponding type definition.
- **Typed hooks**: Custom hooks must declare their parameter and return types.
- **Typed event handlers**: `onChange`, `onSubmit`, `onClick` handlers must be typed, not `any`.
- **Exhaustive checks**: If using discriminated unions, ensure all variants are handled.

### Architecture Compliance

- **Respect component organization**: Components are in the correct directory per the detected conventions (Phase 3 of `@octs/project-awareness`).
- **Reuse existing components**: Check the inventory. If a similar component exists, the change must reuse or extend it—not duplicate it.
- **No code duplication**: Identical or near-identical logic must be extracted into shared hooks, utilities, or components.
- **Design system consistency**: Colors, spacing, typography, and tokens must come from the design system. No hardcoded `#ff0000` or `margin: 13px` unless it is a one-off that is explicitly justified.
- **No props drilling beyond 3 levels**: If props travel deeper, use context, composition, or a state management solution.

### Code Quality

- **Readable code**: Self-documenting variable names, no magic numbers, clear conditional logic.
- **Decoupled components**: Components should do one thing. Business logic goes in hooks or services, not in JSX/TSX. Presentation-only components are preferred.
- **Hooks used correctly**: Follow the Rules of Hooks (no conditional hooks, hooks only at top level). `useEffect` dependencies must be complete.
- **No business logic in UI**: API calls, data transformations, and business rules belong in hooks, services, or state management—not directly in component bodies or event handlers.
- **Controlled vs uncontrolled**: Form inputs must not mix controlled and uncontrolled patterns. Pick one and be consistent.
- **Key props**: Every element in a list (`map`) must have a stable, unique `key` prop.

### Output of Phase 2

A checklist of findings, with pass/fail per category:

```
## Code Verification
- [✅] TypeScript quality: No unnecessary `any`, all imports resolve
- [✅] Architecture: Component in correct directory, reuse verified
- [✅] Code quality: No business logic in UI, hooks correct
- [⚠️] Design system: One hardcoded color found — consider using `--color-danger`
```

---

## Phase 3 — Auto Validation

Run the project's automated quality tools.

### Checks

| Check | Command | Must Pass? |
|---|---|---|
| **Build compiles** | `npm run build` or equivalent | Yes |
| **Lint passes** | `npm run lint` or equivalent | Yes |
| **Tests pass** | `npm run test` or equivalent (unit tests only at this stage) | Yes |

### Rules

- Use the exact commands from `package.json` scripts, not assumed commands.
- All three must produce exit code 0.
- If the build fails, fix it before proceeding—the remaining phases may require a running build.
- If lint fails with auto-fixable issues, run the auto-fix command first (`npm run lint -- --fix`, `npx eslint --fix`, `npx biome check --fix`), then re-verify.
- If tests fail, analyze failures. Determine if they are pre-existing or introduced by the change. If pre-existing, document them; if new, fix them.

---

## Phase 4 — Playwright Browser Validation

For significant UI changes (pages, forms, interactive components, workflows), verify behavior in a real browser using Playwright.

### What to Verify

1. **Page renders without crashing**: Navigate to the affected page. No white screen, no uncaught errors, no infinite loading.
2. **Critical user journey works**: Execute the primary happy-path flow (e.g., fill form → submit → see success).
3. **Navigation works**: Links, programmatic navigation, back/forward browser buttons.
4. **Data appears correctly**: API data renders as expected in components.

### Scope

- Browser validation is required for: new pages, form workflows, authentication flows, significant UI refactors.
- Browser validation is optional for: trivial prop changes, text copy changes, purely visual tweaks with no behavior change.
- Use the project's existing Playwright/Cypress config if available. If not, create a minimal script.

---

## Phase 5 — Visual Verification

Check that the UI looks correct and consistent.

### Layout and Alignment

- **Layout structure**: Elements are in the expected order and position. Grid and flex layouts render correctly.
- **Alignment**: Text, buttons, inputs, and icons are aligned properly within their containers.
- **Spacing**: Padding, margin, and gap are consistent with the design system. No elements overlapping or touching.
- **Overflow**: No horizontal scroll on viewport-fitting pages unless intentional. Long text is truncated with ellipsis, not escaping its container. No content is clipped or hidden unexpectedly.

### Responsive Verification

Test at two canonical breakpoints:

| Breakpoint | Width × Height | Target |
|---|---|---|
| **Desktop** | 1440 × 900 | Standard laptop/desktop |
| **Mobile** | 390 × 844 | iPhone 14/15 Pro size (representative small viewport) |

For each breakpoint, verify:
- Layout adapts (columns collapse, navigation transforms, sidebars hide).
- Text remains readable (no overflow, appropriate font size).
- Interactive elements have adequate touch targets (minimum 44×44 CSS pixels on mobile).
- Images scale correctly.

### Accessibility Verification

- **Keyboard navigation**: All interactive elements are reachable and usable via Tab / Shift+Tab / Enter / Escape / Arrow keys. Focus order follows visual order. No focus traps (except in modals, where they are expected and escape works).
- **Focus visible**: Every focused element has a visible focus indicator. No `outline: none` without a replacement.
- **Labels**: Every input, select, and textarea has an associated `<label>`, `aria-label`, or `aria-labelledby`.
- **ARIA**: Roles, states, and properties are used correctly. No ARIA misuse (e.g., `aria-hidden` on focusable elements, missing required ARIA children).
- **Contrast**: Text meets WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text). Interactive elements and boundaries have sufficient contrast.
- **Screen reader**: Key information is conveyed via semantic HTML or ARIA. Dynamic content changes use `aria-live` regions.

---

## Phase 6 — State Verification

Every UI component has states. Verify all of them.

### Required States

| State | What to Check |
|---|---|
| **Loading** | Skeleton or spinner is displayed. Content area is reserved (no layout shift when data arrives). No flash of "No data" before loading completes. |
| **Empty** | Empty state is shown when data is an empty array/object. Includes a human-readable message (e.g., "No items yet"). Includes an action if applicable (e.g., "Create your first item" button). |
| **Error** | Error state is shown when a request fails. Message is clear and user-friendly (not "TypeError: Cannot read properties of undefined"). Includes a recovery action (Retry button, "Go back" link). Technical details are only shown in development or behind a toggle. |
| **Success** | Confirmation message or UI update after a successful action (form submission, deletion, update). Action feedback is visible (toast, inline message, redirect). UI reflects the new state without requiring a manual refresh. |
| **Edge cases** | Very long text (truncated or wrapped). Very short text (no broken layout). Boundary numeric values (0, negative, very large). Rapid double-click on submit buttons (prevent duplicate submissions). |

### Implementation Check

- Loading and error states are implemented using the project's standard patterns (e.g., Suspense + ErrorBoundary in React, async pipe in Angular).
- If the project has a standard `LoadingState`, `EmptyState`, or `ErrorState` component from the inventory, it must be used—not recreated.

---

## Phase 7 — Interaction Verification

Verify all interactive behaviors.

### Coverage

- **Clicks**: Buttons, links, and interactive elements respond on click. Disabled elements do not respond. No double-submit without protection.
- **Forms**: All fields accept input. Validation triggers at the correct time (on blur, on submit, or real-time as per project convention). Error messages appear next to the corresponding field. Successful submission clears or redirects. File uploads show progress.
- **Validation**: Client-side validation errors are displayed before form submission (unless the project convention is server-only). Server-side validation errors are displayed inline. Validation clears when the user corrects the field.
- **Navigation**: Internal links navigate without full-page reload (SPA behavior if applicable). External links open correctly (`target="_blank"` with `rel="noopener noreferrer"`). Active navigation item is highlighted. Breadcrumbs are correct and navigable.
- **Modals**: Open on trigger. Close on X button, Cancel button, clicking backdrop, and pressing Escape. Focus is trapped inside. Focus returns to the trigger element on close. Scroll is locked on the body while open.
- **Dropdowns / Selects**: Open on click. Close on selecting an option, clicking outside, pressing Escape. Keyboard navigation with Arrow keys. Options are scrollable if many.
- **Menus**: Open on trigger. Close on item selection, outside click, Escape. Keyboard navigation. Nested menus open on hover or Arrow Right.
- **Keyboard shortcuts**: If the project defines shortcuts, they work and do not conflict with browser or OS shortcuts. Shortcuts are documented or discoverable.

---

## Phase 8 — Console Verification

The browser console must be clean.

### What to Check

- **No uncaught JavaScript errors**: `console.error` with stack traces must not appear during normal operation. Exceptions from React, Vue, Angular, etc. are caught by error boundaries or equivalent.
- **No unexplained warnings**: React `key` warnings, invalid prop types, deprecated API usage—all must be resolved. Warnings from third-party libraries should be investigated.
- **No failed network requests**: All API calls, asset loads (JS, CSS, images, fonts), and WebSocket connections must succeed (no 404, 500, CORS errors, or connection refused).
- **No excessive re-renders**: If using React, no "Warning: Maximum update depth exceeded" or visible render thrashing.

### Scope

- Check the console during the full happy-path execution in Phase 4 (Playwright).
- Also check during state transitions: loading → loaded, form submit → success, navigation between pages.

---

## Phase 9 — Performance

Performance is a feature. Check the basics.

### Checks

- **Load time**: Page loads within acceptable thresholds (FCP < 1.8s, LCP < 2.5s per Google Core Web Vitals). Use `lighthouse` or Playwright performance API.
- **Bundle size**: No unexpectedly large chunks. `node_modules` is not accidentally bundled. Analyze with `npx vite-bundle-visualizer` or `@next/bundle-analyzer` if configured.
- **Image optimization**: Images use appropriate formats (WebP, AVIF). Responsive images use `srcset` or `sizes`. Lazy loading is applied (`loading="lazy"` or framework equivalent). Images are not larger than their display size.
- **Lazy loading**: Routes, components below the fold, and heavy dependencies are code-split and lazy-loaded.
- **Core Web Vitals** (landing pages and high-traffic pages only): Check LCP (Largest Contentful Paint), FID/INP (Interaction to Next Paint), CLS (Cumulative Layout Shift). Use Playwright's `webVitals` or Lighthouse.

### Rules

- Performance checks are mandatory for: landing pages, marketing pages, public-facing product pages.
- Performance checks are advisory for: backoffice/admin pages, internal tools, authenticated-only pages.

---

## Phase 10 — SEO (Public Pages)

For pages that are publicly accessible and indexed by search engines, verify SEO metadata.

### Checks

- **Title tag**: `<title>` is present, unique, descriptive, and under 60 characters. Format follows the project convention (e.g., "Page Name | Site Name").
- **Meta description**: `<meta name="description">` is present, unique, compelling, and between 120–160 characters.
- **Open Graph**: `og:title`, `og:description`, `og:image`, `og:url`, `og:type` are present and correct. `og:image` dimensions meet social platform requirements (1200×630 recommended).
- **Twitter Cards**: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` are present.
- **JSON-LD structured data**: Where applicable (articles, products, breadcrumbs, organization, FAQ), `application/ld+json` is present and valid per schema.org.
- **Canonical URL**: `<link rel="canonical">` is present and points to the correct URL.
- **Robots**: No `<meta name="robots" content="noindex">` on pages that should be indexed (unless intentional).
- **Hreflang**: If the site is multilingual, `hreflang` tags are present and correct.
- **Semantic HTML**: Proper use of `<header>`, `<main>`, `<nav>`, `<footer>`, `<article>`, `<section>`, and heading hierarchy (`h1` → `h2` → `h3`, no skipped levels).
- **Sitemap / robots.txt**: If the project has these files, verify the new page appears in the sitemap or is appropriately excluded.

### Scope

- Required for: landing pages, marketing pages, blog, documentation, public product pages.
- Not required for: authenticated-only pages, backoffice/admin pages, dashboards, internal tools.

---

## Phase 11 — Backoffice / Admin Verification

If the change affects backoffice or admin pages, apply additional verification specific to data-intensive UIs.

### Checks

- **Tables**: Columns are sortable where expected. Column widths are appropriate—no content truncation without a tooltip. Sticky headers work on scroll if implemented. Row selection (single, multi) works.
- **Filters**: Filter controls (dropdowns, date pickers, search inputs) work. Filters combine correctly (AND logic). Active filters are visible and removable individually. "Clear all filters" works. Filter state is preserved in the URL (`?search=...&status=active`).
- **Pagination**: Page size selector works. Next/Previous/First/Last buttons work and disable at boundaries. Total count is displayed. Current page is indicated. Pagination state is preserved in the URL.
- **Search**: Debounced search input. Search triggers on Enter or after a delay. Loading indicator during search. Empty result message ("No results for 'xyz'").
- **Bulk actions**: Select all / deselect all works. Individual row selection works. Bulk action buttons are disabled until at least one row is selected. Confirmation dialog before destructive bulk actions. Success/error feedback after bulk action completes.
- **Permissions**: UI elements are hidden or disabled based on the user's role/permissions (not just hidden—back-end enforcement is mandatory, this is a frontend double-check). Guard routes: navigating directly to a URL for which the user lacks permission shows an appropriate "Forbidden" message, not a broken page.
- **API errors**: Graceful handling of API errors in data tables and forms. Error toasts or inline messages. Retry capability. No white screen on API failure.
- **Exports**: Export buttons (CSV, PDF, XLSX) trigger a download. File format is correct. Exported data respects current filters. Loading state during export generation.
- **Real-time updates** (if applicable): WebSocket or polling updates reflect changes without full page reload. Optimistic UI updates where appropriate.

---

## Mandatory Report Template

After completing all applicable phases, produce a report using this exact structure:

```markdown
# Frontend Verification Report

## Changes Checked
- **Files changed**: <count> (<file list>)
- **Affected components**: <component list>
- **User journeys**: <journey list>
- **Type**: <new feature | bug fix | refactor | design change>

## Tests Executed

| Step | Command | Status |
|---|---|---|
| Build | `<cmd>` | ✅ / ❌ |
| Lint | `<cmd>` | ✅ / ❌ |
| Unit Tests | `<cmd>` | ✅ / ❌ |

## UI Checks

### Desktop (1440×900)
- [✅/❌] Layout correct
- [✅/❌] Alignment and spacing
- [✅/❌] No overflow or clipping

### Mobile (390×844)
- [✅/❌] Responsive layout
- [✅/❌] Touch targets adequate
- [✅/❌] Text readable

### Accessibility
- [✅/❌] Keyboard navigation
- [✅/❌] Focus indicators visible
- [✅/❌] Labels and ARIA correct
- [✅/❌] Contrast sufficient

### States
- [✅/❌] Loading state
- [✅/❌] Empty state
- [✅/❌] Error state
- [✅/❌] Success state

### Interactions
- [✅/❌] Clicks and buttons
- [✅/❌] Forms and validation
- [✅/❌] Navigation
- [✅/❌] Modals / Dropdowns / Menus

### Console
- [✅/❌] No JS errors
- [✅/❌] No failed network requests
- [✅/❌] No excessive warnings

### Performance (if applicable)
- [✅/❌] Load time within thresholds
- [✅/❌] Bundle size acceptable
- [✅/❌] Images optimized

### SEO (if applicable)
- [✅/❌] Title and meta description
- [✅/❌] Open Graph and Twitter Cards
- [✅/❌] Structured data

### Backoffice (if applicable)
- [✅/❌] Tables and filters
- [✅/❌] Pagination
- [✅/❌] Bulk actions
- [✅/❌] Permissions

## Problems Detected

| # | Severity | Phase | Description | Recommendation |
|---|---|---|---|---|
| 1 | High | 5 | Focus indicator missing on modal close button | Add visible `:focus-visible` style |
| 2 | Medium | 8 | Console warning: missing `key` prop in `UserList.tsx:23` | Add unique `key` to list items |
| ... | ... | ... | ... | ... |

## Conclusion

**Status**: ✅ Validated / ❌ Not Validated — <count> issues found (<count> high, <count> medium, <count> low)

**Summary**: <brief 1–3 sentence summary of findings and whether the change is safe to ship.>
```
