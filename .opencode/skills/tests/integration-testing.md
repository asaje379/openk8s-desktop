---
name: "@octs/integration-testing"
description: "Test integration between system components in isolation"
depends_on: ["@octs/project-awareness", "@octs/isolated-test-environment"]
tools: ["Supertest", "Testcontainers", "Docker", "Vitest", "Jest"]
---

# @octs/integration-testing

## Objective

Test the integration between multiple system components working together in isolation from external systems. Integration tests verify that components communicate correctly — API to database, service to cache, multiple services to each other, migrations against a real database. They differ from unit tests (everything mocked) and E2E tests (through the UI).

### Guardrail 1 — Always Consider the Existing Project
Before any code generation, ALWAYS: analyze existing architecture, identify project conventions, reuse existing components/hooks/helpers/services/utilities/types/DTOs/patterns, respect naming conventions/ESLint/Prettier/Git conventions/folder structure/dependencies. Never reinvent what exists. Always prefer coherence over novelty.

### Guardrail 2 — Mandatory Verification Before Declaring Done
Never say "Done"/"Finished" without verifying: code compiles, imports valid (no dead imports), TypeScript types valid, tests pass, lint passes, no errors, files coherent, components exist, paths correct, dependencies exist, changes compatible with architecture. If verification impossible: state Verified / Verifiable but not executed / Not verifiable in current context.

## Dependencies

- `@octs/project-awareness` — required to understand the existing project stack, database technology, ORM, caching layer, and existing integration test patterns.
- `@octs/isolated-test-environment` — required to spin up isolated Docker containers (database, cache, message broker) for the test run and tear them down afterward.

---

## Scope: What Integration Tests Cover

### In Scope
- **API + Database**: full HTTP request through routing, controllers, services, ORM, to the database and back
- **Service + Cache**: service writes to Redis, reads back, handles cache misses, invalidates on mutation
- **Multiple Services**: orchestrator calls service A, which calls service B — test the full chain
- **Migrations**: run all pending migrations against a real database, verify schema matches expectations
- **Queue/Message Broker**: publish a message → consumer picks it up → processes it → updates state
- **File Storage**: upload a file → verify it's stored → retrieve it → verify content
- **Third-party API integration**: mock the external API with nock/msw, test error handling, retry logic, timeouts

### Out of Scope
- Individual function logic (unit tests)
- UI interactions (E2E tests)
- Full deployment verification (smoke tests)

### vs Unit Tests
| Aspect | Unit | Integration |
|--------|------|-------------|
| Database | Mocked | Real (isolated) |
| HTTP | Not involved | Real request/response |
| External APIs | Mocked | Mocked (nock/msw) |
| Speed | ms | ms to seconds |
| Confidence | Low | Medium |

### vs E2E Tests
| Aspect | Integration | E2E |
|--------|-------------|-----|
| UI | Not involved | Real browser |
| Coverage | Component boundaries | User journeys |
| Speed | seconds | seconds to minutes |
| Confidence | Medium | High |

---

## Tooling

### Supertest (HTTP assertions)
- Provides a high-level API for testing HTTP servers
- Works with Express, Fastify, Koa, Hapi, and any Node.js HTTP server
- Chainable: `request(app).get("/api/users").set("Authorization", token).expect(200)`
- Built-in assertions for status, headers, body

```typescript
import request from "supertest";
import { createApp } from "@/app";

const app = createApp();

it("should return 200 and user list when authenticated", async () => {
  const response = await request(app)
    .get("/api/users")
    .set("Authorization", `Bearer ${validToken}`)
    .expect(200);

  expect(response.body).toHaveProperty("data");
  expect(response.body.data).toBeInstanceOf(Array);
});
```

### Testcontainers (programmatic Docker)
- Programmatically manage Docker containers for tests
- Auto-start containers before tests, auto-stop after
- Supported: PostgreSQL, MySQL, Redis, RabbitMQ, Kafka, MongoDB, Elasticsearch, MinIO (S3), and generic containers via `GenericContainer`

```typescript
import { PostgreSqlContainer } from "@testcontainers/postgresql";

let container: PostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("testdb")
    .withUsername("test")
    .withPassword("test")
    .start();

  process.env.DATABASE_URL = container.getConnectionUri();
}, 30000);

afterAll(async () => {
  await container.stop();
});
```

### Docker Compose (CI / complex setups)
- Define multi-service environments in `docker-compose.test.yml`
- Use when Testcontainers is insufficient (e.g., orchestrating 5+ services)
- Start: `docker compose -f docker-compose.test.yml up -d`
- Stop: `docker compose -f docker-compose.test.yml down -v`

---

## Test Environment Isolation

### Database Isolation Strategies (ordered by preference)

#### 1. Transaction Rollback (fastest, preferred for PostgreSQL/MySQL)
- Begin a transaction before each test
- Run the test within the transaction
- Rollback after the test — no data persists

```typescript
import { getConnection } from "@/db";

beforeEach(async () => {
  await getConnection().query("BEGIN");
});

afterEach(async () => {
  await getConnection().query("ROLLBACK");
});
```

**Limitations**: Does not work if the code under test manages its own transactions (nested transactions may commit despite outer rollback). In that case, fall back to truncation or schema recreation.

#### 2. Table Truncation
- Truncate all tables after each test or test suite
- Slower than rollback but handles nested transactions
- Must respect foreign key constraints (use `TRUNCATE ... CASCADE`)

#### 3. Schema Recreation
- Drop and recreate the schema for every test
- Slowest, but guaranteed clean state
- Use only when rollback and truncation are not feasible

### NEVER
- Use a shared development database for tests
- Run integration tests against production or staging
- Leave test data in the database after test completion
- Rely on test execution order (each test must be independent)

---

## Test Data Factories

### Principles
- Use factory functions or classes to generate test data
- Use `@faker-js/faker` for realistic random data
- Support traits for common variations
- Support both `build()` (in-memory, unsaved) and `create()` (persisted to DB)
- Properly handle associations (belongsTo, hasMany)

```typescript
import { faker } from "@faker-js/faker";

class UserFactory {
  private data: Partial<User> = {};

  static new() {
    return new UserFactory();
  }

  admin() {
    this.data.role = "admin";
    return this;
  }

  verified() {
    this.data.emailVerifiedAt = new Date();
    return this;
  }

  build(): User {
    return {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: "user",
      ...this.data,
    };
  }

  async create(): Promise<User> {
    return db.user.create({ data: this.build() });
  }
}

// Usage
const adminUser = await UserFactory.new().admin().verified().create();
const plainUser = UserFactory.new().build(); // not saved to DB
```

---

## What to Test

### API Endpoints
- **Full request → response cycle**: middleware, validation, controller, service, database, response serialization
- **HTTP methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Authentication**: valid token, expired token, missing token, wrong role
- **Validation**: missing required fields, invalid formats, boundary values
- **Error handling**: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 500 Internal Server Error (deliberate triggers)

### Database Operations
- **Migrations**: up (creates tables, columns, indexes), down (reverts cleanly), idempotency (running twice doesn't fail)
- **Queries**: complex joins, aggregations, window functions, raw SQL
- **Transactions**: commit on success, rollback on error, concurrent modifications
- **Constraints**: unique, foreign key, check, not null — test that violations throw

### Cache Integration
- **Set then Get**: write to cache, read back, verify value
- **Invalidation**: delete from cache, verify subsequent get returns null/miss
- **Fallback**: cache miss triggers DB fetch and cache population
- **TTL**: verify entries expire after the configured time

### Queue/Message Broker
- **Publish → Consume**: send message, verify consumer processes it
- **Dead Letter Queue (DLQ)**: messages that fail processing end up in DLQ
- **Retry**: verify configured retry count and backoff
- **Ordering**: if order matters, verify messages processed in order

### External Services
- **Mock with nock** (Node.js HTTP mocking library) or **msw** (Mock Service Worker)
- Test: successful response, error response (4xx, 5xx), timeout, network failure, malformed response
- Verify retry logic, circuit breaker behavior, fallback behavior

---

## Response Assertions

### Status Code
```typescript
expect(response.status).toBe(200);
// or with Supertest:
await request(app).get("/api/users").expect(200);
```

### Body Structure and Values
```typescript
expect(response.body).toEqual({
  id: expect.any(String),
  name: "Alice",
  createdAt: expect.any(String),
});
```

### Headers
```typescript
expect(response.headers["content-type"]).toMatch(/application\/json/);
expect(response.headers["cache-control"]).toBe("no-store");
expect(response.headers["location"]).toBe("/api/users/123");
```

### Error Format (RFC 9457 Problem Details)
```typescript
expect(response.body).toMatchObject({
  type: "https://api.example.com/errors/validation-error",
  title: "Validation Error",
  status: 422,
  detail: expect.any(String),
  instance: "/api/users",
});
```

### Pagination
```typescript
expect(response.body).toMatchObject({
  data: expect.any(Array),
  pagination: {
    total: 100,
    nextCursor: expect.any(String),
    hasMore: true,
  },
});
expect(response.body.data.length).toBeLessThanOrEqual(20); // page size
```

---

## Database Assertions

After an API call, verify the database state directly:
```typescript
const user = await db.user.findUnique({ where: { id: userId } });
expect(user.status).toBe("active");

const auditLogs = await db.auditLog.findMany({
  where: { userId, action: "USER_CREATED" },
});
expect(auditLogs).toHaveLength(1);
```

Verify no unwanted side effects:
```typescript
const allUsers = await db.user.count();
expect(allUsers).toBe(initialCount + 1); // only one user created
```

---

## Cleanup Checklist

**Always verify these are done after every integration test run:**

- [ ] All database connections closed
- [ ] All Testcontainers stopped (`container.stop()`)
- [ ] All Docker Compose services stopped (`docker compose down -v`)
- [ ] All mock servers (nock) cleaned or restored (`nock.cleanAll()`)
- [ ] All temporary files deleted
- [ ] No test data persists anywhere

```typescript
afterAll(async () => {
  await db.$disconnect();
  await redis.quit();
  await container.stop();
  nock.cleanAll();
});
```
