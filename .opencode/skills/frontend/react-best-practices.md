---
name: "@octs/react-best-practices"
description: "Write high-quality, maintainable, performant React code"
depends_on: ["@octs/project-awareness"]
tools: ["React", "TypeScript", "ESLint"]
---

# @octs/react-best-practices

## Objective

Generate React code that is correct, maintainable, performant, and idiomatically aligned with the modern React ecosystem. Every component, hook, and pattern must prioritize readability, type safety, testability, and alignment with the existing project — never introduce novel patterns where proven ones exist.

## Dependencies

- `@octs/project-awareness`: Hard dependency. Before any code generation, analyze the existing project: React version (v17 vs v18 vs v19 — Server Components, concurrent features), framework (Next.js App Router vs Pages Router, Vite SPA, Remix, CRA), TypeScript configuration, ESLint/Prettier rules, existing hooks in `hooks/` or `lib/hooks/`, existing component patterns in `components/`, `ui/`, or `shared/`, state management (Context, Zustand, Redux, Jotai), routing approach, and data fetching strategy. Reuse existing hooks, utilities, and component patterns. Never introduce a competing state management library, hook library, or utility pattern that conflicts with what already exists.

## Guardrails (Apply to every task)

### Guardrail 1 — Always Consider the Existing Project

Before any code generation, ALWAYS: analyze existing architecture, identify project conventions, reuse existing components/hooks/helpers/services/utilities/types/DTOs/patterns, respect naming conventions/design system/ESLint/Prettier/Git conventions/folder structure/dependencies. Never reinvent what exists. Always prefer coherence over novelty.

### Guardrail 2 — Mandatory Verification Before Declaring Done

Never say "Done"/"Finished" without verifying: code compiles, imports valid (no dead imports), TypeScript types valid, tests pass, lint passes, no errors, files coherent, referenced components/hooks exist, paths correct, dependencies exist, changes compatible with architecture. If verification impossible: state Verified / Verifiable but not executed / Not verifiable in current context.

## Composition

### Composition Over Inheritance

Never use class inheritance for component logic. Composition is the only pattern. Every reusable behavior is expressed through one of these strategies:

**Nesting (children prop)**: The most basic form. A parent component renders its `children` prop, wrapping them with layout, context, or behavior:

```tsx
function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border p-4">{children}</div>;
}

function Page() {
  return (
    <Card>
      <h2>Title</h2>
      <p>Content</p>
    </Card>
  );
}
```

**Passing components as props**: When the parent needs control over what gets rendered in specific slots, accept component types or rendered elements as props:

```tsx
interface LayoutProps {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

function Layout({ header, sidebar, children }: LayoutProps) {
  return (
    <div>
      {header}
      <div className="flex">
        <aside>{sidebar}</aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
```

**Compound components**: When a set of components are designed to work together and share implicit state. Use the `Context` pattern internally. The parent component provides a context; child components consume it. This gives consumers maximum flexibility in arrangement:

```tsx
// Pattern — all components live on a namespace object:
function Select({ children, value, onChange }: SelectProps) { /* context provider */ }
Select.Option = function Option({ value, children }: OptionProps) { /* context consumer */ };
Select.Trigger = function Trigger({ children }: TriggerProps) { /* context consumer */ };
Select.Content = function Content({ children }: ContentProps) { /* context consumer */ };

// Usage:
<Select value={selected} onChange={setSelected}>
  <Select.Trigger>Choose an option</Select.Trigger>
  <Select.Content>
    <Select.Option value="a">Option A</Select.Option>
    <Select.Option value="b">Option B</Select.Option>
  </Select.Content>
</Select>
```

- Use `React.Children.map` and `React.cloneElement` sparingly — prefer context-based compound patterns instead.
- Never attach child components inside `render` or inside the component function body (they would be recreated every render). Always define them as static properties or separate named exports.

**Render props**: Use only when hooks are insufficient to share non-visual logic that also needs access to rendered output. With hooks, render props are rarely needed. Valid cases: reusable logic that must expose a callback for the consumer to render, or legacy API compatibility:

```tsx
// Prefer hooks over this pattern 95% of the time:
interface FetchProps<T> {
  url: string;
  children: (state: { data?: T; loading: boolean; error?: Error }) => React.ReactNode;
}

// Equivalent hook (preferred):
function useFetch<T>(url: string) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(url).then(r => r.json()).then(setData).finally(() => setLoading(false)); }, [url]);
  return { data, loading };
}
```

## Hooks

### Rules of Hooks (non-negotiable)

1. **Only call hooks at the top level** of your component or custom hook. Never inside loops, conditions, or nested functions. React relies on call order to preserve state between renders.
2. **Only call hooks from React function components or custom hooks**. Never from regular JavaScript/TypeScript functions, event handlers, class components, or async functions (unless they are custom hooks themselves).

### Custom Hooks

- **Name**: Always start with `use` (e.g., `useDebounce`, `useMediaQuery`, `useLocalStorage`). This is required for React's lint rules to validate hook usage.
- **Single concern**: Each custom hook should encapsulate one piece of logic. `useAuth()` handles authentication; `useAuthModal()` handles the auth modal UI. Don't cram both into one hook.
- **Return values**: Prefer returning an object over a tuple when there are >2 values, or when the consumer might only need a subset. Tuples are fine for `[value, setValue]` pairs. Objects improve destructuring ergonomics and are forward-compatible (add a field without breaking callers):

```tsx
// Object return (preferred for >2 values):
const { data, isLoading, error, refetch } = useFetch(url);

// Tuple return (fine for useState-like pairs):
const [isOpen, setIsOpen] = useDisclosure();
```

### useEffect

- **Cleanup**: Every `useEffect` that creates a subscription, timer, event listener, or any external side effect MUST return a cleanup function:

```tsx
useEffect(() => {
  const handleResize = () => setSize(window.innerWidth);
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

useEffect(() => {
  const timer = setInterval(() => tick(), 1000);
  return () => clearInterval(timer);
}, []);
```

- **Dependency array**: Include every variable from the component scope that's used inside the effect. Never lie about dependencies to suppress ESLint warnings — refactor the logic instead (`useCallback`, `useRef`, or extract to a custom hook).
- **Avoid cascading effects**: If effect A triggers setState that triggers effect B, consider combining them or using a derived state approach (`useMemo`, event handler).

### useRef

- **Mutable values that don't trigger re-renders**: timer IDs, animation frame IDs, previous values, mutable flags (`isMountedRef`):
- **DOM element references**: attach `ref` to JSX elements to access the underlying DOM node for measurements, focus management, or third-party library integration.
- **Previous value pattern**: `const prevValue = useRef(value); useEffect(() => { prevValue.current = value; });` — now `prevValue.current` holds the previous render's value.
- Never read or write refs during rendering (inside the component body, outside of event handlers or effects) — this is a side effect and breaks React's pure rendering model. The exception is lazy initialization patterns where you initialize refs once.

### useMemo and useCallback

- **Profile first, memoize second**: Don't wrap everything in `useMemo`/`useCallback` by default. These hooks have overhead (memory allocation, dependency comparison). Only use them when:
  1. You pass the value as a prop to a component wrapped in `React.memo`, and want to prevent unnecessary re-renders.
  2. The value is a dependency of another hook (`useEffect`, `useMemo`, `useCallback`), and you need referential stability.
  3. The computation is genuinely expensive (sorting large arrays, complex derived data, recursive tree operations).
- **For event handlers passed as props**, if the child component is `React.memo`-wrapped or the callback is a dependency of a `useEffect`, use `useCallback`. Otherwise, inline functions are fine (React is fast at diffing).

## Performance

### React.memo

- Wrap pure functional components with `React.memo` when they receive the same props frequently but are asked to re-render by their parent. `React.memo` performs a shallow comparison of props and skips re-rendering if nothing changed.
- Don't memo everything — only components that re-render often and are expensive (large subtree, heavy computations).
- For components that receive functions/objects/arrays as props, combine `React.memo` with `useMemo`/`useCallback` on the parent side, or use a custom comparison function as the second argument of `React.memo`:

```tsx
const ListItem = React.memo(function ListItem({ item, onSelect }: ListItemProps) {
  return <div onClick={() => onSelect(item.id)}>{item.name}</div>;
}, (prev, next) => prev.item.id === next.item.id && prev.onSelect === next.onSelect);
```

### Avoid Creating Objects/Arrays/Functions in Render

- Move static objects and arrays outside the component (module scope) or memoize them:

```tsx
// Bad — new object every render:
<Component style={{ margin: 10 }} />

// Good — stable reference:
const styles = useMemo(() => ({ margin: 10 }), []);
<Component style={styles} />
```

### Lazy Loading

- Use `React.lazy()` with `<Suspense>` for code-splitting component-level imports. Suitable for: route-level components (pages), heavy libraries (charting, rich text editors), modals and drawers that users might never open:

```tsx
const HeavyChart = React.lazy(() => import('./HeavyChart'));

function Dashboard() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <HeavyChart data={data} />
    </Suspense>
  );
}
```

- `<Suspense>` must be placed somewhere above the lazy component in the tree. Provide a meaningful fallback (skeleton, spinner, nothing) — never let the UI break.

### Virtualization

- For lists > 50 items, use virtualization to render only visible rows. This dramatically reduces DOM nodes:
  - `@tanstack/virtual` (framework-agnostic, headless, highly flexible) — preferred for custom implementations.
  - `react-window` (simpler API, opinionated) — preferred for standard list/grid use cases.
- Never render all items in a large list without virtualization. The threshold depends on item complexity: for simple text rows, virtualize at ~200; for complex card layouts, virtualize at ~50.

### Image Optimization

- In Next.js: use `next/image` (never raw `<img>`). Always provide `width` and `height` to prevent CLS. Use `priority` for above-the-fold images.
- In Vite/CRA SPAs: consider `srcset`/`sizes` for responsive images, `loading="lazy"` for below-the-fold, and modern formats (WebP, AVIF) with `<picture>` fallbacks.

## Architecture

### Folder Organization

Use feature-based organization rather than type-based (`components/`, `containers/`, `hooks/`). Group related files by what they do, not what they are:

```
src/
  features/
    auth/
      components/
        LoginForm.tsx
        LoginForm.test.tsx
        LoginForm.module.css
      hooks/
        useAuth.ts
        useAuth.test.ts
      types.ts
      api.ts
      index.ts              # barrel export
    dashboard/
      components/
        ...
      hooks/
        ...
      index.ts
  shared/
    components/
      Button/
        Button.tsx
        Button.test.tsx
        Button.stories.tsx
        index.ts
    hooks/
      useDebounce.ts
    utils/
      cn.ts
    types/
      global.d.ts
```

If the existing project uses a different organization (e.g., flat `components/` directory), follow it. Consistency with the project beats theoretical ideals.

### Presentational vs Container

- **Presentational components**: Concerned only with how things LOOK. Receive data via props, render UI, fire callbacks. No side effects, no hooks beyond `useMemo`/`useCallback`, no data fetching, no context (except theme/locale).
- **Container components / hooks**: Concerned with how things WORK. Fetch data, manage state, handle events, call mutations, and pass everything down to presentational components as props.

In practice, this distinction is often implemented by extracting logic into custom hooks (`useDashboardData()`, `useUserProfile()`) that are consumed by presentational components — rather than having separate "container" wrapper components.

### One Component Per File

- Each file exports a single primary component. Co-located helpers (sub-components, styled sub-parts) that are only used by that component can live in the same file.
- Barrel exports (`index.ts` or `index.tsx`): re-export the public API of a directory. Consumers should import from `@/features/auth` not `@/features/auth/components/LoginForm.tsx`.
- Never use barrel files that re-export everything from the entire app — this creates circular dependency risks and breaks tree-shaking.

### Co-location

- Tests, styles, and types go alongside the component, not in a separate top-level directory:
  - `LoginForm.tsx`
  - `LoginForm.test.tsx`
  - `LoginForm.module.css` (or co-located if using Tailwind, styles are inline)

### Prop Drilling

- **Avoid deep prop drilling** (passing props through many intermediate layers that don't use them). Solutions in order of preference:
  1. **Composition**: Pass the component that needs props as children/parent props to the deeply nested location.
  2. **Context**: For truly global state that many distant components need (theme, auth, locale, feature flags). Don't overuse — too many context providers cause unnecessary re-renders.
  3. **State management library**: When the state is complex, frequently updated, and shared across many unrelated components. Use whatever the project already uses (Zustand, Redux, Jotai, MobX). Don't introduce a new one.

## Patterns

### Controlled vs Uncontrolled

- **Prefer controlled components** in almost all cases. The parent owns the state and passes it via `value` and `onChange`. This makes the component's behavior predictable and the state auditable:

```tsx
// Controlled (preferred):
function Parent() {
  const [value, setValue] = useState('');
  return <Input value={value} onChange={setValue} />;
}

// Uncontrolled (only when necessary — integration with non-React libraries, file inputs):
function Parent() {
  const ref = useRef<HTMLInputElement>(null);
  return <Input defaultValue="" ref={ref} />;
}
```

- When building reusable form components, support both modes — accept `value`/`onChange` for controlled mode, and `defaultValue` for uncontrolled initialization.
- File inputs are inherently uncontrolled (browser security). Use `useRef` + `FormData` to read file values.

### Error Boundaries

- Wrap sections of the UI that might crash (third-party integrations, dynamic content, complex interactive views) in error boundaries. A crash in one section should not bring down the entire app:

```tsx
class ErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
```

- Error boundaries must be class components (no hook equivalent yet). Provide a meaningful fallback UI (user-friendly message + retry button, not a blank screen).

### Context

- Use React Context **only** for values that are truly global and change infrequently: theme, authenticated user, locale, feature flags, design system tokens.
- Do NOT use Context for: frequently updated state (use a state manager), form state (use form libraries or local state), data fetching results (use TanStack Query), any state needed by only 2-3 components (prop drilling is fine at that depth).
- **Split contexts**: Don't put all global state in a single context. Changes to any part of the context object will re-render all consumers. Split into separate contexts by concern (e.g., `ThemeContext`, `AuthContext`, `LocaleContext`).
- Memoize context values with `useMemo` to prevent unnecessary re-renders:

```tsx
const value = useMemo(() => ({ user, login, logout }), [user]);
```

### useReducer for Complex State

- When a component's state logic involves multiple sub-values that change together, or the next state depends on the previous state in complex ways, use `useReducer` instead of multiple `useState` calls:

```tsx
type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; data: Data[] }
  | { type: 'FETCH_ERROR'; error: Error };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START': return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS': return { ...state, isLoading: false, data: action.data };
    case 'FETCH_ERROR': return { ...state, isLoading: false, error: action.error };
  }
}
```

- `useReducer` is also useful for undo/redo, multi-step forms, and finite state machines.

## TypeScript

### Typed Props

- Always use `interface` for props (not `type`). React component props benefit from interface extension/merging behavior, and it's the prevailing convention:

```tsx
interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
  disabled?: boolean;
  children?: React.ReactNode; // always include when using children
}
```

### No `any`

- Never use `any`. It defeats TypeScript's purpose. Use `unknown` + type narrowing when the type is genuinely unknown at compile time:

```tsx
// Bad:
function handle(data: any) { data.foo(); }

// Good:
function handle(data: unknown) {
  if (typeof data === 'object' && data !== null && 'foo' in data && typeof data.foo === 'function') {
    data.foo();
  }
}
```

- Narrow types with type guards (`typeof`, `instanceof`, `in`, custom `is` predicates) and assertion functions.
- Use `Record<string, unknown>` instead of `any` for objects with unknown shape.

### Generic Components

- When a component's props include a value and a callback that operates on the same value, make the component generic to preserve the specific type through the prop chain:

```tsx
interface SelectProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}

function Select<T extends string>({ options, value, onChange }: SelectProps<T>) {
  // TypeScript knows value is T and onChange takes T
}
```

### Discriminated Unions for Variant Props

- When a component has mutually exclusive props (e.g., a link that is either `href` or `onClick`, never both), use a discriminated union:

```tsx
type ButtonProps =
  | { as: 'button'; onClick: () => void; href?: never }
  | { as: 'link'; href: string; onClick?: never };
```

- This prevents impossible states and gives precise autocomplete. Combine with `children`, `disabled`, and style props that are common to all variants.

### `as const` for Literal Types

- Use `as const` to narrow arrays and objects to their literal types when defining options, configs, or status lists:

```tsx
const STATUSES = ['idle', 'loading', 'success', 'error'] as const;
type Status = (typeof STATUSES)[number]; // 'idle' | 'loading' | 'success' | 'error'
```

### Event Typing

- Always type event handler parameters correctly using React's built-in event types:

```tsx
// For native HTML elements:
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => { /* ... */ };
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... */ };
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); /* ... */ };
const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => { /* ... */ };
```

- For custom components that expose event-like callbacks, use descriptive names and avoid raw `any`: `onSelect(value: string)` not `onChange(e: any)`.

## Code Output Conventions

- Only output code that adheres to all the patterns and rules above.
- When suggesting a new component or hook, verify it doesn't duplicate existing project code.
- Prefer explicit, readable code over clever one-liners. If a pattern saves 3 lines but takes 10 seconds longer to understand, use the explicit version.
- Always use TypeScript. Never output `.js` or `.jsx` files unless the project explicitly doesn't use TypeScript.
