---
name: "@octs/admin-dashboard"
description: "Create robust, feature-rich admin interfaces"
depends_on: ["@octs/project-awareness"]
tools: ["React", "TanStack Table", "Tailwind CSS", "shadcn/ui"]
---

# @octs/admin-dashboard

## Objective

Create admin interfaces that are fast, keyboard-accessible, and information-dense. Admin users are power users on desktop — prioritize data density, quick actions, and predictable interactions over flashy design. Every admin interface must handle all states: loading (skeletons), empty (helpful guidance), error (actionable recovery), and edge cases (large datasets, long text, permission restrictions).

## Dependencies

- `@octs/project-awareness`: Hard dependency. Before any code generation, analyze the existing project: auth system (NextAuth, Clerk, custom), permission/role model, existing API layer (tRPC, REST, GraphQL), existing table/filter/search patterns, component library (shadcn/ui preferred), chart library (Recharts, Chart.js, or none), export utilities, and form handling approach (React Hook Form, Formik, or custom). Reuse existing admin page layouts, sidebar navigation, breadcrumb components, and auth guards.

## Guardrails (Apply to every task)

1. **Before any code generation**, analyze existing project context: architecture, stack, conventions, existing components/hooks/helpers, patterns, dependencies. Never reinvent what exists. Always prefer coherence and reuse over novelty.
2. **Never declare work "done" or "finished"** without verifying: compilation, valid imports (no dead imports), TypeScript types, tests passing, lint passing, no errors, file coherence, component/hook existence, correct paths, dependency existence, architectural compatibility. If verification is impossible in current context, explicitly label it: `Verified` / `Verifiable but not executed` / `Not verifiable in current context`.

## DataTable

### TanStack Table Setup

Use `@tanstack/react-table` (v8+) for headless table logic. The table manages state; you render the UI.

```tsx
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type PaginationState,
} from '@tanstack/react-table'
```

### Column Definitions

Define columns as a typed array, ideally in a separate file colocated with the table component. Always type the generic:

```tsx
export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'name',
    header: 'Product',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">{/* icon + text */}</div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
    filterFn: 'equalsString',
  },
  {
    id: 'actions',
    cell: ({ row }) => <RowActions row={row} />,
    enableSorting: false,
  },
]
```

### Sorting

- Toggle asc/desc/none on column header click.
- Multi-sort: hold Shift while clicking additional column headers.
- Render sort indicator arrows in column headers: `{asc: '↑', desc: '↓', false: '↕'}` or use an icon library.

### Filtering

- **Global search**: A single search input above the table, debounced (300ms default), filtering across all text columns using a custom global filter function.
- **Column-specific filters**: Render filter inputs in column headers or in a filter row. Types:
  - Text: input with debounced onChange.
  - Select: dropdown of distinct values from the data.
  - Date range: two date pickers (from/to).
  - Numeric range: min/max inputs.
- **Faceted filters**: Show counts next to filter options (e.g., "Active (42)", "Inactive (8)").

### Pagination

- **Client-side**: Use `getPaginationRowModel()`. Provide page size selector (10, 25, 50, 100). Show "Page X of Y" with prev/next buttons. Show item range: "Showing 1-10 of 245 results".
- **Server-side**: Use `manualPagination: true`. Pass `pageIndex` and `pageSize` to the API. Use `pageCount` from the API response. Disable next/prev buttons at boundaries.
- For server-side: also use `manualSorting`, `manualFiltering` as appropriate.

### Column Visibility

- Provide a "Columns" dropdown button that toggles column visibility. Use `column.getIsVisible()` / `column.toggleVisibility()`.
- Persist visibility state to `localStorage` so user preferences survive page reloads.
- Always visible: primary identifier column, actions column. Toggleable: all others.

### Row Selection

- Checkbox column as first column. Select all checkbox in header.
- Indeterminate state when some but not all rows are selected.
- **Bulk actions bar**: appears when any row is selected, shows count ("3 selected"), provides actions: Delete Selected, Export Selected, Change Status, Assign To.
- Actions operate on `table.getSelectedRowModel().rows`.

### Expandable Rows

- Use `getExpandedRowModel()`. Toggle expansion on row click or expand button.
- Rendering: `row.getIsExpanded()` to conditionally render an expanded content row below the main row.
- Expanded content: detail view, related records, edit form, activity log.

## Exports

### CSV Export

- Export the **currently visible/filtered/sorted data** (not necessarily all data).
- Generate CSV client-side from the table row model. Build headers from column definitions, rows from row data.
- Use Blob + URL.createObjectURL + download link pattern.
- Escape commas, quotes, and newlines in cell values.
- Filename: `{entity}-export-{YYYY-MM-DD}.csv`.

### Excel Export

- Use `xlsx` library if available in the project. If not, fall back to CSV.
- Support multiple sheets if exporting related data.
- Apply basic formatting: header row bold, column widths auto-fitted.

### PDF Export

- Use for reports, invoices, certificates. Typically server-generated.
- If client-side: use `@react-pdf/renderer` for React-based PDF generation, or `jspdf` for imperative PDF.
- Include: title, date range, summary statistics, table data, branding (logo).

## Components

### Drawer (Slide-over Panel)

- Slides in from right (or left for navigation). Fixed position, z-index above content.
- Backdrop overlay with `bg-black/50`, click to close. Escape key to close.
- Trap focus inside drawer while open.
- Use cases: detail view (click row → drawer with full record), create/edit form, advanced filters panel, user profile.
- Width: 400px (narrow), 560px (default), 720px (wide), `max-w-md` / `max-w-lg` / `max-w-xl`.
- Prevent body scroll while open (`overflow: hidden` on body).

### Dialog / Modal

- Centered overlay for focused interactions. Smaller than drawer.
- Use cases: confirm destructive action, quick-create form (simple entity), image/file preview, settings dialog.
- Use shadcn/ui `Dialog` or custom implementation with Radix `@radix-ui/react-dialog`.
- Sizes: `sm` (400px), `md` (560px), `lg` (720px).
- Focus trap, Escape to close, click outside to close (unless `preventOutsideClose`).
- Confirm dialogs: "Are you sure?" with Cancel and Confirm (destructive) buttons.

### Wizard (Multi-Step Form)

- Horizontal progress indicator (steps with labels, active/completed/upcoming states).
- Step content area with form fields.
- Navigation: Back (previous step), Next (validate current step, advance), Submit (final step).
- Validate each step before advancing. Show inline errors on fields, not just toast.
- Keep step state in parent component. Each step is a sub-component receiving `onNext` / `onBack` callbacks.
- Optional: allow clicking step indicator to jump to completed steps (not upcoming).
- Persist wizard state to sessionStorage to survive accidental navigation away.

## KPIs and Charts

### KPI Cards

Dashboard grid of metric cards. Each card:

- **Current value**: large, prominent number (formatted: 1.2k, 54.3%, $12,450).
- **Trend indicator**: up/down arrow with percentage change (green for positive, red for negative — invert for cost metrics). Show comparison period label ("vs last month").
- **Sparkline** (optional): tiny chart showing trend over time.
- **Skeleton state**: pulse placeholder matching card dimensions while loading.
- **Error state**: "Failed to load" with retry button.
- **Empty state**: metric at zero with appropriate messaging.

### Charts

- Use Recharts (preferred) or Chart.js if already in project. Never add a new chart library if one exists.
- Chart types: Bar (comparisons, rankings), Line (time series, trends), Pie/Donut (composition, distribution), Area (volume over time).
- Provide date range picker for time-series charts: presets (7d, 30d, 90d, YTD, 1y, All) and custom date range.
- Responsive: charts resize with container using `ResponsiveContainer` (Recharts) or `resize` option (Chart.js).
- Tooltip on hover showing exact values.
- Legend (hide on small charts, show on large).
- Colors from design system tokens (primary, secondary, accent).
- Empty state when no data: "No data for the selected period" with illustration.

### Dashboard Layout

- Responsive grid using Tailwind grid utilities.
- Skeleton cards while loading — match layout grid exactly.
- Grid column count: 1 (mobile), 2 (tablet), 3 (desktop medium), 4 (desktop wide).
- Cards can span multiple columns for larger charts: `col-span-2`, `col-span-3`.

## States

### Skeleton Loaders

- Shape-matching skeletons: cards for card layouts, rectangle blocks for text lines, circles for avatars.
- Pulse animation (`animate-pulse`) — subtle, not distracting.
- Show skeleton for initial load (not on every refetch — use `isFetching` background indicator for refresh).
- Never show a blank white page while loading.

### Error States

- Distinguish error types: network error ("Check your connection"), server error ("Something went wrong. Try again."), permission error ("You don't have access to this"), validation error (field-specific).
- Every error state must include: human-readable message, retry action button, optional "Go back" or "Go to dashboard" link.
- Use Error Boundaries around major sections to prevent one failing widget from crashing the entire page.
- Log errors to monitoring service if configured (Sentry, LogRocket).

### Empty States

- Every list/table/chart must have an empty state.
- Content: illustration or icon, descriptive heading ("No products yet"), helpful subtext ("Create your first product to get started"), primary CTA button ("Create Product").
- Different empty states for different scenarios: no data ever created, no data matching filters ("No results for 'xyz'. Try adjusting your search."), no data in current view/period.

### Loading Indicators

- Inline button spinners for async actions: replace button text with spinner while `isPending`.
- Table overlay: semi-transparent overlay with spinner during server-side operations (data fetching, bulk actions).
- Progress bar for long-running operations (imports, exports, batch processing).
- Optimistic UI where possible: show the result immediately, revert on error.

## UX

### Undo Pattern

- Implement for destructive actions (delete, archive, status change).
- Flow: user clicks Delete → item removed from UI immediately + toast appears ("Item deleted. Undo?") → if user clicks Undo, restore item + dismiss toast → if toast expires or user dismisses, action is committed.
- Implementation: `onMutate` optimistically removes from cache, `onError` restores from snapshot, toast has an Undo button that calls an "undo mutation" or reverts the cache.
- Toast auto-dismiss: 5-8 seconds. Toast position: bottom-right.

### Command Palette

- Triggered by `Ctrl+K` / `Cmd+K`. Use `cmdk` library or custom.
- Search all navigable pages, actions, and recently viewed items.
- Sections: Pages (navigate to), Actions (quick create, search, settings), Recent (last 5 viewed items).
- Keyboard: arrow keys to navigate results, Enter to select, Escape to close.
- Empty query: show recent and suggested results. With query: filter and rank results.
- Dialog-style centered overlay with search input.

### Keyboard Shortcuts

- `Escape`: close modals, drawers, dropdowns.
- `Enter`: submit focused form, activate focused button.
- `Ctrl/Cmd + Enter`: submit form from any field.
- `Arrow keys`: navigate table rows, list items, autocomplete options.
- `Tab`/`Shift+Tab`: navigate between form fields in logical order.
- `Space`: toggle checkbox, activate focused button.
- Document all shortcuts in a help panel accessible via `?` key or help button.

### Desktop-First Responsive

Admin users are predominantly on desktop/laptop. Design desktop-first (unlike consumer landing pages which are mobile-first).

- Optimize for 1440px+ viewports. Minimum supported: 1024px.
- Tablets: simplified table (hide low-priority columns, stack filters), reduced card grid columns.
- Mobile (<768px): card-based layouts instead of tables where possible, bottom sheet instead of drawer, full-screen instead of modal. Mobile admin is secondary — prioritize desktop but don't break on mobile.

## Security

### Permission-Based UI

- All UI elements (buttons, menu items, pages, tabs) must check user permissions before rendering.
- Use a permissions hook: `const { can } = usePermissions()` returning `can('products:delete')`, `can('users:manage')`.
- Never rely solely on UI hiding — server must enforce permissions independently.
- Graceful handling: if user navigates directly to a page they can't access, show permission error (not a generic error).
- For list pages: filter out actions user can't perform (hide delete button, hide bulk actions).

### Destructive Actions

- All destructive actions require confirmation dialog.
- Dialog must clearly state: what will be deleted, what the consequences are (cascade deletion, data loss), and a final "Delete" button.
- Delete button: red/danger variant, labeled with the action + entity ("Delete Product", "Remove User").
- For irreversible actions: add a typing confirmation step ("Type DELETE to confirm").

### Validation

- Validate all form inputs on client (for instant feedback) and on server (for security).
- Client validation: required fields, format validation (email, URL, number ranges), length limits, business rules.
- Server validation: re-validate everything. Return structured errors keyed by field name for form mapping.
- After mutation: refresh affected queries to ensure UI reflects server state.

## Existing System Integration

1. **Auth system**: Integrate with existing auth. Read user permissions from session/token. Use existing auth hooks (`useSession`, `useUser`, `usePermissions`).
2. **API layer**: Use existing API patterns (tRPC procedures, REST endpoints, GraphQL queries). Match existing error handling, request patterns, and caching strategies.
3. **Component library**: Use existing components (Button, Input, Dialog, DropdownMenu, Table from shadcn/ui). Extend, don't replace.
4. **Layout**: Use existing admin layout (sidebar navigation, top bar, breadcrumbs). Add new pages under existing navigation patterns.
5. **Forms**: Use existing form library (React Hook Form, Formik). Match existing validation schemas (Zod, Yup).
6. **State management**: Match existing patterns for server state (TanStack Query, SWR) and client state (useState, useReducer, Zustand).
