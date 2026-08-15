---
name: "@octs/async-state"
description: "Robust server state management with TanStack Query"
depends_on: ["@octs/project-awareness"]
tools: ["TanStack Query", "React"]
---

# @octs/async-state

## Objective

Manage server state with TanStack Query in a way that is correct, performant, cache-aware, and resilient to network conditions. Every query, mutation, and cache manipulation must follow established patterns that prevent stale data, unnecessary refetches, memory leaks, and fragile optimistic updates. Server state lives in TanStack Query; client state lives in `useState`/`useReducer`/Context — never duplicate server state into local state.

## Dependencies

- `@octs/project-awareness`: Hard dependency. Before any code generation, analyze the existing project: TanStack Query version (v4 vs v5 — API differences), query client configuration (`QueryClientProvider` location, `defaultOptions`), existing query hooks and query key conventions, API client (`fetch`, `axios`, `ky`, tRPC, GraphQL), auth token handling (how tokens reach query functions), zod/validation schemas for API responses, error handling patterns, and existing optimistic update implementations. Reuse existing query hooks, query key factories, API client instances, and error handling utilities. Never introduce a competing server state library (SWR, RTK Query, Apollo Client) if TanStack Query is already used.

## Guardrails (Apply to every task)

### Guardrail 1 — Always Consider the Existing Project

Before any code generation, ALWAYS: analyze existing architecture, identify project conventions, reuse existing components/hooks/helpers/services/utilities/types/DTOs/patterns, respect naming conventions/design system/ESLint/Prettier/Git conventions/folder structure/dependencies. Never reinvent what exists. Always prefer coherence over novelty.

### Guardrail 2 — Mandatory Verification Before Declaring Done

Never say "Done"/"Finished" without verifying: code compiles, imports valid (no dead imports), TypeScript types valid, tests pass, lint passes, no errors, files coherent, referenced components/hooks exist, paths correct, dependencies exist, changes compatible with architecture. If verification impossible: state Verified / Verifiable but not executed / Not verifiable in current context.

## Setup

### QueryClient at the Root

The `QueryClient` must wrap the entire application (or at minimum, the subtree that uses queries). Configure global defaults once:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,       // 5 minutes — data is fresh for 5min, no refetch
      gcTime: 1000 * 60 * 30,           // 30 minutes — unused cache cleaned after 30min
      retry: 3,                         // retry 3 times on failure (exponential backoff)
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
      refetchOnWindowFocus: true,       // refetch when user returns to tab
      refetchOnReconnect: true,         // refetch when network reconnects
    },
    mutations: {
      retry: 0,                         // don't retry mutations by default
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
```

### staleTime vs gcTime (critical distinction)

- **`staleTime`**: How long (ms) data is considered "fresh" and won't trigger a background refetch. `staleTime: 0` (default) means every mount triggers a refetch — useful for rapidly changing data. `staleTime: Infinity` means data is always fresh and never auto-refetches — useful for static data (country lists, configs). Choose explicitly per query or globally.
- **`gcTime`** (formerly `cacheTime` in v4): How long (ms) inactive data stays in the cache before garbage collection. Default is 5 minutes. Queries with no active observers for this duration are removed. `gcTime: 0` disables caching entirely. `gcTime: Infinity` keeps data forever (use with caution — memory grows indefinitely).

### QueryClientProvider

- Must be placed above any component that uses `useQuery`, `useMutation`, `useQueryClient`, etc.
- Should be placed as close to the root as possible but inside any Router, Theme, Auth providers that queries depend on.
- If the project uses Next.js App Router, create a client-side wrapper component (`'use client'`) that renders `QueryClientProvider` and wraps children. The `QueryClient` instance should be created with `useState` to ensure it's not recreated on every render (Next.js Server Component behavior).

## useQuery

### Basic Pattern

Every `useQuery` call requires a **query key** (array) and a **query function** that returns a promise:

```tsx
import { useQuery } from '@tanstack/react-query';

function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then(res => {
      if (!res.ok) throw new Error(`Failed to fetch user: ${res.status}`);
      return res.json() as Promise<User>;
    }),
  });
}
```

### Destructuring the Result

Destructure only what the component needs. Handle all states explicitly:

```tsx
function UserProfile({ userId }: { userId: string }) {
  const {
    data: user,
    isLoading,      // true on first load (no data yet, no cache)
    isPending,      // true when query has no data (includes isLoading + background updates with no cached data)
    isError,
    error,
    isFetching,     // true whenever the queryFn is running (includes background refetches)
    refetch,
  } = useUser(userId);

  if (isLoading) return <UserSkeleton />;
  if (isError) return <ErrorDisplay error={error} onRetry={refetch} />;
  if (!user) return <NotFound />;

  return <div>{user.name}</div>;
}
```

- **Always handle `isPending`/`isLoading`** — never assume `data` is non-null. TypeScript may narrow `data` to `T`, but the query could have no cached data yet.
- **Always handle `isError`** — show a user-friendly error message with a retry button. Log the `error` to an error reporting service if available.
- **`isFetching` vs `isLoading`**: `isLoading` is true only on the first load (no data in cache). `isFetching` is true during any query execution including background refetches. Use `isFetching` for subtle loading indicators; use `isLoading` for skeleton screens.

### Conditional Queries

Use the `enabled` option to prevent automatic execution until a condition is met:

```tsx
function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then(res => res.json()),
    enabled: !!userId,  // won't fetch until userId is truthy
  });
}
```

- **`enabled: false`** means the query will never run automatically — only `refetch()` triggers it.
- Useful for: search-as-you-type (enabled when query length ≥ 3), dependent queries, feature-flagged queries.

### Dependent Queries

When one query depends on the result of another, chain them with `enabled`:

```tsx
function useUserPosts(userId: string) {
  const { data: user, isLoading: userLoading } = useUser(userId);

  return useQuery({
    queryKey: ['user', userId, 'posts'],
    queryFn: () => fetch(`/api/users/${userId}/posts`).then(res => res.json()),
    enabled: !userLoading && !!user,
  });
}
```

- The second query won't fire until the first succeeds. `isLoading` on the second query is true while waiting for the first.
- For parallel dependent queries, use multiple `useQuery` calls with chained `enabled` booleans.

## Query Keys

### Structured & Hierarchical

Query keys are the cache's identity system. They must be:

1. **Arrays**, not strings. TanStack Query serializes the entire array for cache matching.
2. **Hierarchical**, from generic to specific: `['resource', id, 'sub-resource', subId]`.
3. **Predictable**, so that `invalidateQueries` and `setQueryData` can target them precisely.

```tsx
// Hierarchy examples:
['users']                         // all users
['users', userId]                 // specific user
['users', userId, 'posts']       // user's posts
['users', userId, 'posts', postId] // specific post
['posts', { filter, sort }]      // posts with query params
```

### Query Key Factories

Abstract query keys into a key factory object to avoid typos and ensure consistency:

```tsx
const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  posts: (id: string) => [...userKeys.detail(id), 'posts'] as const,
};

// Usage:
useQuery({ queryKey: userKeys.detail(userId), queryFn: ... });
queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
```

### Stable References for Objects

When query keys contain filter/sort objects, ensure the object reference is stable across renders (memoize it, or spread it inline only if it's a static value):

```tsx
// Good — filter object is stable (from URL search params, state, etc.):
const filters = useMemo(() => ({ status, sort: 'name' }), [status]);
useQuery({ queryKey: ['users', filters], queryFn: ... });

// Also fine if the object is inferred as stable by the compiler:
useQuery({ queryKey: ['users', { status: 'active' }], queryFn: ... });
```

- If the object is created inline from `useState` values, either memoize it or destructure into individual key array elements.

## Cache Strategy

### staleTime

- **Never leave `staleTime` at its default (0) without consideration**. `staleTime: 0` means every component mount triggers a refetch. For static data (country lists, locales, feature flags), this is wasteful.
- Guidelines:
  - **Static / rarely-changing data**: `staleTime: Infinity` or `staleTime: 1000 * 60 * 60` (1 hour) — country lists, config, feature flags.
  - **User data / profiles**: `staleTime: 1000 * 60 * 5` (5 min) — user profiles, team data, settings.
  - **Near-real-time data**: `staleTime: 1000 * 30` (30s) or `0` — notifications, live feeds, chat messages.
  - **Dashboard / analytics**: `staleTime: 1000 * 60 * 2` (2 min) or `0` — balances between freshness and load.

### Invalidation

When data changes (after a mutation), invalidate queries to mark them as stale and trigger a refetch:

```tsx
const queryClient = useQueryClient();

// Invalidate all queries matching a key prefix:
queryClient.invalidateQueries({ queryKey: ['users'] });
// This matches: ['users'], ['users', id], ['users', id, 'posts'], etc.

// Invalidate only an exact match:
queryClient.invalidateQueries({ queryKey: ['users', userId], exact: true });
// This matches only: ['users', userId]
```

- **Targeted invalidation**: prefer invalidating the smallest possible set of queries. After updating a user's name, invalidate `['users', userId]` and `['users']` — not the entire app.
- **`exact: true`**: use when you want to invalidate only one specific query, not all queries that share a prefix.

### Manual Cache Updates (setQueryData)

For instant feedback, update the cache directly with `setQueryData`, then invalidate to re-sync with the server:

```tsx
// Immediately show the updated user in the cache:
queryClient.setQueryData(['users', userId], (oldData) => {
  if (!oldData) return oldData;
  return { ...oldData, name: newName };
});

// Then invalidate to ensure backend sync:
queryClient.invalidateQueries({ queryKey: ['users', userId] });
```

- `setQueryData` is synchronous and optimistically shows data. It does NOT call the server.
- Always follow `setQueryData` with `invalidateQueries` (in the mutation's `onSettled` or manually) to ensure cache eventually matches the server.
- The updater function receives the current cached data — use it for additive updates (appending to a list, updating a field).

## Optimistic Updates

### When to Use

Optimistic updates are for mutations where you are **highly confident** the server will succeed, and you want the UI to respond instantly (no loading spinner). Use cases: toggling a "like", updating a todo's completion status, renaming a file, reordering a list.

### Pattern

Use `useMutation`'s `onMutate`, `onError`, and `onSettled` callbacks:

```tsx
const mutation = useMutation({
  mutationFn: (updatedTodo: Todo) =>
    fetch(`/api/todos/${updatedTodo.id}`, {
      method: 'PATCH',
      body: JSON.stringify(updatedTodo),
    }).then(res => res.json()),

  onMutate: async (updatedTodo) => {
    // 1. Cancel any in-flight refetches for this query (so they don't overwrite optimistic data)
    await queryClient.cancelQueries({ queryKey: ['todos'] });

    // 2. Snapshot the current cache state (for rollback)
    const previousTodos = queryClient.getQueryData(['todos']);

    // 3. Optimistically update the cache
    queryClient.setQueryData(['todos'], (old) =>
      old?.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo))
    );

    // 4. Return the snapshot (used in onError)
    return { previousTodos };
  },

  onError: (_err, _updatedTodo, context) => {
    // Rollback to the snapshot on failure
    if (context?.previousTodos) {
      queryClient.setQueryData(['todos'], context.previousTodos);
    }
    // Show error toast
  },

  onSettled: () => {
    // Always invalidate after mutation completes (success or error) to sync with server
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

- **Always cancel in-flight queries** in `onMutate` for the queries you're about to overwrite. This prevents a race condition where a pending refetch writes stale data after your optimistic update.
- **Always return a snapshot** from `onMutate` so `onError` can rollback.
- **Always invalidate in `onSettled`** — whether success or error, the cache should re-sync with the server.
- Never use optimistic updates for **destructive operations** (deletion, payments, permission changes). Show a loading spinner for those.

## Mutations

### Basic Pattern

`useMutation` for any operation that changes server state (POST, PUT, PATCH, DELETE):

```tsx
const mutation = useMutation({
  mutationFn: (newUser: CreateUserDTO) =>
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    }).then(res => {
      if (!res.ok) throw new Error(`Failed to create user: ${res.status}`);
      return res.json() as Promise<User>;
    }),

  onSuccess: (data, variables) => {
    // data = server response, variables = the input passed to mutationFn
    queryClient.invalidateQueries({ queryKey: ['users'] });
    toast.success(`User ${data.name} created`);
  },

  onError: (error, variables) => {
    // error = Error object, variables = input that caused the failure
    toast.error(`Failed to create user: ${error.message}`);
  },

  onSettled: (data, error, variables) => {
    // always runs — good for clearing form state, resetting UI
    // data and error are mutually exclusive (one is defined, one is null)
  },
});
```

### Triggering Mutations

Call `mutation.mutate()` from an event handler:

```tsx
function CreateUserForm() {
  const mutation = useCreateUser();

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      mutation.mutate({
        name: formData.get('name') as string,
        email: formData.get('email') as string,
      });
    }}>
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating...' : 'Create User'}
      </button>
      {mutation.error && <p className="text-danger-500">{mutation.error.message}</p>}
    </form>
  );
}
```

- **`isPending`**: true while the mutation is executing. Use for loading states (spinner on button, disabled form).
- **`error`**: the error object if the mutation failed. Show inline or as a toast.
- **`mutation.reset()`**: clears `data`, `error`, and `isPending` back to initial state. Useful when re-opening a form that previously failed.

### Mutation Side Effects

| Callback    | Fires when...                                   | Use for...                                 |
| ----------- | ----------------------------------------------- | ------------------------------------------ |
| `onSuccess` | mutation succeeds (200, 201)                    | cache invalidation, success toast, navigate |
| `onError`   | mutation fails (network error, 4xx, 5xx)        | error toast, retry prompt, log to Sentry   |
| `onSettled` | always after success or error                   | reset form, clear loading, always-run cleanup |

## Advanced

### useInfiniteQuery

For cursor-based or page-based paginated lists that load more on scroll:

```tsx
function useInfinitePosts() {
  return useInfiniteQuery({
    queryKey: ['posts', 'infinite'],
    queryFn: ({ pageParam }) =>
      fetch(`/api/posts?cursor=${pageParam}`).then(res => res.json()),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.length === 0) return undefined; // no more pages
      return lastPageParam + 1;
    },
    getPreviousPageParam: (firstPage, _allPages, firstPageParam) => {
      if (firstPageParam <= 0) return undefined;
      return firstPageParam - 1;
    },
  });
}

// Rendering:
function PostFeed() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfinitePosts();

  return (
    <div>
      {data?.pages.map((page, i) => (
        <Fragment key={i}>
          {page.map(post => <PostCard key={post.id} post={post} />)}
        </Fragment>
      ))}
      <button onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>
        {isFetchingNextPage ? 'Loading more...' : 'Load More'}
      </button>
    </div>
  );
}
```

- `data.pages` is an array of pages (each page is the array returned by `queryFn`). Flatten before rendering.
- `getNextPageParam` receives the last page of data, all pages, and the last page param. Return `undefined` when there are no more pages.
- `fetchNextPage` and `fetchPreviousPage` are functions that trigger fetching. Check `hasNextPage` / `isFetchingNextPage` for UI states.

### Prefetching

Fetch data before the user needs it — hover over a link, preload a detail view:

```tsx
const queryClient = useQueryClient();

function usePrefetchUser() {
  const prefetchUser = async (userId: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['user', userId],
      queryFn: () => fetch(`/api/users/${userId}`).then(res => res.json()),
      staleTime: 1000 * 60 * 5,
    });
  };
  return prefetchUser;
}

// Usage:
<Link
  to={`/users/${user.id}`}
  onMouseEnter={() => prefetchUser(user.id)}
>
  {user.name}
</Link>
```

- `prefetchQuery` fetches and caches data but doesn't return it. When the user navigates and `useQuery` mounts, it reads from cache instantly with no loading state.
- Set `staleTime` on the prefetch to avoid refetching if the user navigates shortly after.

### Query Cancellation

When the user navigates away or the query becomes `disabled`, cancel in-flight requests to free network resources:

```tsx
useQuery({
  queryKey: ['search', query],
  queryFn: ({ signal }) =>
    fetch(`/api/search?q=${query}`, { signal }).then(res => res.json()),
  enabled: query.length >= 3,
});
```

- TanStack Query passes an `AbortSignal` (via the `signal` property on the query function context) to every `queryFn`. Pass it to `fetch`, `axios`, or `ky`.
- The signal is automatically aborted when the query is canceled (component unmounts, query becomes disabled, query key changes, or manual `queryClient.cancelQueries`).
- Always forward the signal — it prevents setting state on unmounted components and avoids wasting bandwidth.

### Parallel Queries

Run multiple queries simultaneously:

```tsx
// Multiple useQuery calls — components render when each resolves independently:
function Dashboard({ userId }: { userId: string }) {
  const { data: user, isLoading: userLoading } = useUser(userId);
  const { data: posts, isLoading: postsLoading } = useUserPosts(userId);
  const { data: stats, isLoading: statsLoading } = useUserStats(userId);

  if (userLoading || postsLoading || statsLoading) return <DashboardSkeleton />;
  // ...
}

// Or use useQueries for a variable number of queries:
import { useQueries } from '@tanstack/react-query';

function useMultipleUsers(userIds: string[]) {
  return useQueries({
    queries: userIds.map(id => ({
      queryKey: ['user', id],
      queryFn: () => fetch(`/api/users/${id}`).then(res => res.json()),
    })),
    combine: (results) => ({
      data: results.map(r => r.data).filter(Boolean),
      isLoading: results.some(r => r.isLoading),
      isError: results.some(r => r.isError),
    }),
  });
}
```

- `useQueries` returns an array of query results. Use the `combine` option to aggregate them into a single result object.
- Parallel queries are fired simultaneously — TanStack Query does not serialize them. Use dependent queries (`enabled` option) if one query needs the result of another.

### Retry Configuration

Configure retry behavior globally or per-query:

```tsx
// Per-query:
useQuery({
  queryKey: ['sensitive-data'],
  queryFn: fetchSensitiveData,
  retry: 0,  // never retry
});

useQuery({
  queryKey: ['critical-data'],
  queryFn: fetchCriticalData,
  retry: 5,                              // retry up to 5 times
  retryDelay: (attempt, error) => {
    if (error instanceof RateLimitError) return 5000; // wait 5s on rate limit
    return Math.min(1000 * 2 ** attempt, 30000);      // exponential backoff
  },
});
```

- `retry: false` — never retry (equivalent to `retry: 0`).
- `retry: true` — retry with default settings (3 times, exponential backoff).
- The `retryDelay` function receives `attempt` (1-based) and `error`. Return millisecond delay before the next retry.

## Patterns

### Server State vs Client State

- **Server state** (data owned by the backend): users, posts, products, search results, analytics data. Managed by **TanStack Query**.
- **Client state** (data owned by the UI): form values, modal open/close, selected tabs, current page, filter selections, theme preference. Managed by **`useState`**, **`useReducer`**, or **React Context**.

### Don't Duplicate Server State into Local State

```tsx
// Bad — copying query data into useState:
const { data } = useUsers();
const [users, setUsers] = useState<User[]>([]);
useEffect(() => { if (data) setUsers(data); }, [data]);
// Now you have two sources of truth that can diverge.

// Good — read directly from the query:
const { data: users } = useUsers();
if (!users) return <Skeleton />;
return <UserList users={users} />;
```

- If you need to edit a piece of server data locally (before saving), use local state for the **draft** only, and keep the query data as the original:

```tsx
const { data: user } = useUser(userId);
const [draftName, setDraftName] = useState('');

useEffect(() => { if (user) setDraftName(user.name); }, [user]);

// Save sends the mutation, which invalidates the query.
// The draft is derived from the server data, not a duplicate.
```

### The `select` Option

Transform query data with `select` (runs when data changes, cached until data changes):

```tsx
function useActiveUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    select: (users) => users.filter((u) => u.status === 'active'),
  });
}
```

- `select` is called only when `data` changes (not on every render). It's memoized.
- Use `select` for: filtering, sorting, computing derived values, formatting (dates, currency), selecting a subtree of a large response.
- Don't put data transformation logic inside `queryFn`. The `queryFn` should be pure: fetch + return the raw response.

### Keep Query Functions Pure

`queryFn` should do exactly one thing: **fetch data and return it**. All transformation, filtering, sorting, and formatting belong in `select` or in the consuming component/hook:

```tsx
// Good — pure queryFn, transform in select:
useQuery({
  queryKey: ['users'],
  queryFn: () => fetch('/api/users').then(res => res.json()),
  select: (users: User[]) => users.map(formatUser),
});

// Bad — mixing concerns in queryFn:
useQuery({
  queryKey: ['users'],
  queryFn: () => fetch('/api/users')
    .then(res => res.json())
    .then(users => users.map(formatUser)), // transform in queryFn — avoid
});
```

## Code Output Conventions

- Every `useQuery` call must handle `isPending`/`isLoading`, `isError`, and the data-present state. Never assume data is available.
- Every `useMutation` call must handle `isPending` (loading button), `error` (inline or toast), and use `onSuccess`/`onSettled` to invalidate relevant queries.
- Export custom hooks wrapping `useQuery` and `useMutation`, not raw TanStack Query calls in components. Components should call `useUser(id)`, not `useQuery({ queryKey: ['user', id], ... })`.
- All query keys must be defined in a key factory or at minimum as `as const` arrays — never ad-hoc string arrays scattered across files.
- Every fetch call inside `queryFn` must handle non-OK responses (throw on `!res.ok`) so TanStack Query sees them as errors, not successful with bad data.
