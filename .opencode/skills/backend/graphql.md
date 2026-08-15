---
name: "@octs/graphql"
description: "Design performant and secure GraphQL APIs"
depends_on: ["@octs/project-awareness"]
tools: ["Apollo Server", "GraphQL Yoga", "DataLoader"]
---

# @octs/graphql

## Objective

Design and implement GraphQL APIs that are performant, secure, well-structured, and production-ready. Every schema must be designed with clear domain boundaries, every resolver must be thin and delegate to the service layer, and every endpoint must be protected against common GraphQL-specific vulnerabilities.

## Dependencies

- `@octs/project-awareness` — analyze existing project architecture, conventions, and stack before generating any code.

---

## Universal Guardrails

### Guardrail 1 — Always Consider the Existing Project
Before any code generation, ALWAYS: analyze existing architecture, identify project conventions, reuse existing components/hooks/helpers/services/utilities/types/DTOs/patterns, respect naming conventions/ESLint/Prettier/Git conventions/folder structure/dependencies. Never reinvent what exists. Always prefer coherence over novelty.

### Guardrail 2 — Mandatory Verification Before Declaring Done
Never say "Done"/"Finished" without verifying: code compiles, imports valid (no dead imports), TypeScript types valid, tests pass, lint passes, no errors, files coherent, services/components exist, paths correct, dependencies exist, changes compatible with architecture. If verification impossible: state Verified / Verifiable but not executed / Not verifiable in current context.

---

## Server Choice

### Apollo Server

- The most popular, battle-tested GraphQL server for Node.js.
- Built-in support for **Apollo Federation** — federated architecture where multiple GraphQL services compose into a single supergraph. Use for microservices or multi-team setups.
- Strong plugin ecosystem: request lifecycle hooks, timing, error tracking, persisted queries.
- Tight integration with Apollo Studio for schema registry, operation monitoring, and tracing.
- Pros: mature, federation, extensive tooling. Cons: heavier, more opinionated.

### GraphQL Yoga

- Lightweight, built on the GraphQL.js reference implementation.
- **Envelope plugin system** — modular, composable plugins for every concern: error masking, logging, tracing, rate limiting.
- Ideal for smaller services, single GraphQL endpoints, or when you want full control over the server stack.
- Pros: minimal, flexible, tree-shakeable. Cons: fewer built-in features (bring your own federation, monitoring, etc.).

### Decision Criteria

- **Choose Apollo Server** if you need federation today or plan to split the Graph into multiple services within 12 months.
- **Choose GraphQL Yoga** if you have a single GraphQL endpoint, need a lightweight server, or prefer a library over a framework.
- Either choice: always pair with **DataLoader** for N+1 prevention.

---

## Schema Design

### Schema-First Approach

Define the SDL (Schema Definition Language) first, then implement resolvers. The schema is the contract between frontend and backend.

```
# Always design schema before writing any resolver code
type Query { ... }
type Mutation { ... }
type Subscription { ... }
```

- The schema is the single source of truth. It lives in `.graphql` files or template literals.
- Implement code generation from the schema to produce TypeScript types for resolvers, ensuring the implementation stays in sync.

### Field Descriptions

Every type and field must have a clear `"""description"""`:

```graphql
"""
A registered user account. Represents both customers and administrators.
"""
type User {
  """
  Unique identifier for the user. Immutable after creation.
  """
  id: ID!
}
```

Descriptions appear in GraphQL playgrounds and generated documentation. They are the primary API documentation.

### Input Types

Every mutation must use a dedicated input type, never individual arguments:

```graphql
# BAD — individual args are not extensible
type Mutation {
  createUser(name: String!, email: String!): User
}

# GOOD — input type is extensible, reusable, validatable
input CreateUserInput {
  name: String!
  email: String!
}
type Mutation {
  createUser(input: CreateUserInput!): User
}
```

- Input types are reusable across mutations and can be extended without breaking the mutation signature.
- Use nested input types for complex mutations to group related fields.

### Enums

Use enums for fields with a fixed, known set of values:

```graphql
enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}
```

- Enums provide validation, auto-complete in playgrounds, and type safety on the client.
- Never use strings for fields that have a bounded set of values.

### Interfaces and Unions

Use interfaces for shared fields across polymorphic types. Use unions for types that share no common fields:

```graphql
interface Node {
  id: ID!
}

type User implements Node {
  id: ID!
  name: String!
}

type Product implements Node {
  id: ID!
  title: String!
  price: Float!
}

union SearchResult = User | Product

type Query {
  search(term: String!): [SearchResult!]!
}
```

- Interfaces enforce a common contract. Unions allow heterogeneous result types.
- Clients use `__typename` in queries to discriminate between union/interface members.

### Non-Null and Lists

- Use `!` (non-null) for fields that are guaranteed to have a value: `String!`, `[Int!]!`.
- `[String]!` — list is never null, but items may be null.
- `[String!]!` — list is never null, items are never null. This is the most common default.
- Be deliberate: relaxing nullability on a field that was non-null is a breaking change. Start conservative (nullable by default) and add `!` only when data is guaranteed.

### Connections Pattern (Pagination)

Use the Relay Connection specification for paginated lists:

```graphql
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type Query {
  users(first: Int, after: String, last: Int, before: String): UserConnection!
}
```

- `edges` contains the items with their cursor. The cursor goes on the edge, not on the node, to keep domain types clean.
- `pageInfo` enables the client to know if more data exists without fetching it.
- `totalCount` gives the total number of items (optional but helpful for numbered pagination UIs).
- Support both **forward** (`first`, `after`) and **backward** (`last`, `before`) pagination.

---

## Resolvers

### Thin Resolvers

Resolvers must be thin. They delegate all business logic to the service layer:

```typescript
const resolvers = {
  Query: {
    user: (_, { id }, { userService }) => userService.findById(id),
  },
  Mutation: {
    createUser: (_, { input }, { userService }) => userService.create(input),
  },
};
```

- Zero business logic in resolvers. No validation, no database queries, no external API calls.
- The resolver's job: extract arguments, call the service, return the result.
- This makes services testable independently of GraphQL and reusable across resolvers.

### Parent Argument

The `parent` (first) argument contains the value returned by the parent resolver. Use it to resolve nested fields:

```typescript
const resolvers = {
  User: {
    orders: (user, _, { orderService }) => orderService.findByUserId(user.id),
    fullName: (user) => `${user.firstName} ${user.lastName}`,
  },
};
```

- When resolving a nested field, prefer using `parent.id` to make a DataLoader call rather than querying the database again.
- Computed fields like `fullName` are resolved directly without external data sources.

### Context

The `context` (third) argument carries per-request shared data. Construct a fresh context for every incoming request:

```typescript
const createContext = async ({ req }) => ({
  currentUser: await authenticate(req),
  loaders: createLoaders(),
  services: createServices(),
});

// Resolver
const resolvers = {
  Query: {
    me: (_, __, { currentUser }) => currentUser,
  },
};
```

- Authentication/authorization data (current user, scopes, roles).
- Dataloader instances (one per request, see DataLoader section).
- Service instances (business logic layer).
- Request utilities (logger, correlation ID, feature flags).

### Args Validation

Validate all input arguments in the resolver or middleware layer before they reach the service:

- Use the schema itself as the first validation layer (GraphQL enforces types, non-null, enums).
- Add semantic validation using the framework's validation mechanism.
- Return user-friendly validation error messages in the `extensions` field.

---

## N+1 Problem

### The Problem

Without DataLoader, a query like this triggers one query per nested resolver:

```graphql
{
  users {
    id
    name
    orders {      # Each user triggers a separate query: 1 + N queries
      id
      total
    }
  }
}
```

For 100 users, this executes 101 database queries. This is the N+1 problem.

### DataLoader Solution

DataLoader batches and caches database requests within a single GraphQL request:

```typescript
const orderLoader = new DataLoader(async (userIds: string[]) => {
  // Collect all keys → single query
  const orders = await db.query(
    'SELECT * FROM orders WHERE user_id IN (?)',
    [userIds],
  );
  // Group results by userId, maintaining order of userIds array
  const ordersByUser = groupBy(orders, 'user_id');
  return userIds.map((id) => ordersByUser[id] || []);
});
```

### DataLoader Pattern Rules

1. **Create a new DataLoader instance per request.** Do not reuse across requests — the cache must be request-scoped.
2. **Batch function: collect keys → single query `WHERE id IN (...)` → map results to correct order.** The returned array must be the same length and order as the input keys array.
3. **Per-request cache:** DataLoader caches results within a single GraphQL execution. If the same key is loaded twice, the second call returns the cached result with no database query.
4. **No sharing across resolvers:** Each entity type gets its own DataLoader instance, created in the context factory.

---

## Security

### Query Complexity Analysis

Malicious clients can craft deeply nested or massively broad queries that overwhelm the server. Assign a "cost" to each field and reject queries exceeding a threshold:

```typescript
// Each field has a cost; total query cost = sum of field costs
const complexityRule = createComplexityLimitRule(1000, {
  scalarCost: 1,
  objectCost: 5,  // Multiplier for nested objects
  listFactor: 10,  // Multiplier for list fields
});
```

- Reject any query whose total cost exceeds the threshold with a clear error message.
- Set the threshold based on profiling under realistic load.

### Depth Limiting

Limit query nesting depth (typical maximum: 5-7 levels) to prevent deeply nested recursive queries:

```typescript
const depthLimitRule = depthLimit(7);
```

### Rate Limiting

Apply rate limiting based on query complexity, not just raw request count:

- Unauthenticated requests: strict per-IP limits.
- Authenticated requests: per-user limits with a higher ceiling.
- Track "cost points" rather than request count — a complex query costs more points than a simple one.

### Introspection

- **Disable introspection in production.** Exposing the entire schema to anonymous users is a security risk.
- Enable it only in development/staging environments or behind authentication for internal tooling.
- If introspection must be available in production, restrict it to authenticated admin users.

### Persisted Queries

In production, allow only pre-registered (persisted) queries mapped to a hash ID. The client sends a hash; the server looks up the pre-approved query:

```
POST /graphql
{ "extensions": { "persistedQuery": { "sha256Hash": "abc123" } } }
```

- Prevents arbitrary queries from being executed.
- Reduces bandwidth (clients send hashes, not full queries).
- Enables whitelist-based security: only approved queries are executed.

### Timeout

Set request timeouts at the GraphQL server level (typically 10-30 seconds). Abort execution and return an error if any part of query resolution exceeds the timeout.

---

## Pagination

### Relay-Style Cursor Connections

The standard for GraphQL pagination:

```graphql
type Query {
  users(
    first: Int       # Take first N items
    after: String    # Start after this cursor
    last: Int        # Take last N items
    before: String   # End before this cursor
  ): UserConnection!
}
```

### Cursor Design

- Cursors are **opaque base64-encoded strings**. Clients treat them as black boxes — never decode them.
- A cursor typically encodes the sort field value and the ID: `base64(createdAt + ":" + id)`.
- Cursors must be **stable** — the same position always produces the same cursor.
- If the underlying data changes (new items, deletions), cursors remain valid for forward pagination from that position.

### pageInfo Fields

- `hasNextPage: Boolean!` — true if there are more items after the current page.
- `hasPreviousPage: Boolean!` — true if there are more items before the current page.
- `startCursor: String` — the cursor of the first edge (null if no edges).
- `endCursor: String` — the cursor of the last edge (null if no edges).

### Implementation Pattern

Fetch `first + 1` items from the database. If you get `N+1` items, `hasNextPage` is true, and you return the first `N` items.

### totalCount

Include `totalCount` on the Connection type. This is optional in the Relay spec but essential for UIs that show page numbers ("Page 3 of 50") or total result counts ("1,234 results").

---

## Subscriptions

### Protocol

Use the **graphql-ws** protocol (not the deprecated `subscriptions-transport-ws`). It is the current standard for GraphQL over WebSocket.

### Authentication on Connection

Authenticate during the WebSocket handshake, not per-message:

```typescript
// On connect, validate the token
const onConnect = async (ctx) => {
  const token = ctx.connectionParams?.authorization;
  const user = await verifyToken(token);
  return { currentUser: user };
};
```

- Reject the connection if authentication fails — do not let unauthenticated sockets connect.
- Pass the authenticated user into the subscription context.

### Subscription Filtering

Not every subscriber should receive every event. Filter by the subscribing user:

```typescript
const resolvers = {
  Subscription: {
    orderStatusChanged: {
      subscribe: withFilter(
        () => pubsub.asyncIterator('ORDER_STATUS_CHANGED'),
        (payload, variables, { currentUser }) => {
          return payload.order.userId === currentUser.id;
        },
      ),
    },
  },
};
```

- Subscribers only receive events they are authorized to see.
- Use `variables` to allow clients to specify filtering conditions (e.g., `subscribe(orderId: ID!)`).

### Reconnection Logic

- The client must implement reconnection with exponential backoff on connection loss.
- On reconnect, the client re-subscribes to all active subscriptions.
- The server should handle duplicate subscription IDs gracefully (idempotent subscription handling).

---

## Error Handling

### The errors Array

GraphQL errors are returned in a parallel `errors` array alongside the `data` field. A GraphQL response can have both `data` and `errors` (partial success).

```json
{
  "data": {
    "user": null
  },
  "errors": [
    {
      "message": "User not found",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["user"],
      "extensions": {
        "code": "NOT_FOUND",
        "resourceId": "abc-123"
      }
    }
  ]
}
```

### Structured Error Codes

Use the `extensions` field for machine-readable error metadata:

```typescript
class NotFoundError extends GraphQLError {
  constructor(resource: string, id: string) {
    super(`${resource} not found`, {
      extensions: {
        code: 'NOT_FOUND',
        resourceType: resource,
        resourceId: id,
      },
    });
  }
}
```

Define a consistent set of error codes across the entire API: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `RATE_LIMITED`, `INTERNAL_ERROR`.

### Error Masking in Production

- **Never expose stack traces, SQL queries, or internal paths** in production error responses.
- Apollo Server's built-in error masking strips these by default in non-development environments.
- Use a custom error formatter to control exactly what goes in the `message` and `extensions` fields.

### Partial Success

A single GraphQL request can have some fields resolve successfully and others fail. The response includes both `data` and `errors`. Clients must check both — a response with `data` is not necessarily fully successful.

---

## General Best Practices

- Define the schema first (SDL), then implement resolvers. The schema is the contract.
- Keep resolvers thin. All business logic lives in the service layer, never in resolvers.
- Use DataLoader for every relationship field — unless you're certain the parent already includes the nested data.
- Version the API through schema evolution, not URL versions. GraphQL avoids versioning: add fields, deprecate old fields with `@deprecated(reason: "...")`, never remove fields without a deprecation period.
- Log every GraphQL request: operation name, query complexity, execution duration, user ID, correlation ID, error count. Use context for tracing.
- Monitor resolver performance: identify slow queries, optimize the underlying service/database layer.
- Use persisted queries in production to avoid arbitrary query execution and reduce bandwidth.
