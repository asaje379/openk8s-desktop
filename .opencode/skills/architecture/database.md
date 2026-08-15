---
name: "@octs/database"
description: "Professional database management, optimization, and patterns"
depends_on: ["@octs/project-awareness"]
tools: ["PostgreSQL", "MySQL", "Prisma", "Drizzle", "TypeORM"]
---

## Objective

Design, manage, and optimize database systems with professional-grade patterns covering schema evolution, query performance, data integrity, auditability, multi-tenancy, concurrency control, and operational best practices — applicable across PostgreSQL, MySQL, and major TypeScript ORMs.

### Guardrail 1 — Always Consider the Existing Project
Before any code generation, ALWAYS: analyze existing architecture, identify project conventions, reuse existing components/hooks/helpers/services/utilities/types/DTOs/patterns, respect naming conventions/ESLint/Prettier/Git conventions/folder structure/dependencies. Never reinvent what exists. Always prefer coherence over novelty.

### Guardrail 2 — Mandatory Verification Before Declaring Done
Never say "Done"/"Finished" without verifying: code compiles, imports valid (no dead imports), TypeScript types valid, tests pass, lint passes, no errors, files coherent, components exist, paths correct, dependencies exist, changes compatible with architecture. If verification impossible: state Verified / Verifiable but not executed / Not verifiable in current context.

---

## Migrations

Migrations are version-controlled, incremental transformations of the database schema. They are the single source of truth for schema state and must be reproducible, reversible, and safe.

### Versioned Migrations

Every migration has a unique identifier. Two naming conventions:

| Convention | Example | Pros / Cons |
|---|---|---|
| **Timestamp-based** | `20250714_103000_add_users_table.sql` | Natural ordering, non-sequential, avoids merge conflicts |
| **Sequential** | `001_add_users_table.sql`, `002_add_orders.sql` | Simple numbering, merge conflicts when two branches create the same number |

**Prefer timestamp-based** in multi-developer projects — no coordination needed for naming.

### Up and Down Scripts

Each migration must have both:
- **Up** (forward): Applies the change. `CREATE TABLE`, `ADD COLUMN`, `CREATE INDEX`.
- **Down** (rollback): Reverses the change. `DROP TABLE`, `DROP COLUMN`, `DROP INDEX`.

Test rollback in CI: apply → verify → rollback → verify schema is clean.

### Reproducibility

A new developer must be able to clone the repo, run `migrate up`, and get a fully provisioned database identical to production. Never rely on a shared dump as the bootstrap mechanism — migrations are the bootstrap.

### CI/CD Integration

```yaml
# Example CI step
- name: Test migrations
  run: |
    docker compose up -d db           # spin up clean DB
    npx prisma migrate deploy         # apply all migrations
    npx prisma migrate status         # verify schema matches
    # Optionally: restore production anonymized snapshot and test migration
```

### NEVER Modify Applied Migrations

Once a migration is committed and applied (in any environment, especially production), it is immutable. To change the schema, create a NEW migration that applies the delta. Modifying an applied migration breaks the migration history and makes reproducibility impossible.

The only exception is modifying an uncommitted or unreleased migration on a feature branch — and only if it has never been applied to a shared environment.

### Always Test Rollback

Rollback testing catches:
- A `down` script that doesn't fully reverse the `up`
- Missing constraints/indexes after rollback
- Rollback to a state that breaks the application

```sh
npx prisma migrate dev --name test_migration  # apply
npx prisma migrate reset                       # roll back and re-apply all
```

### Migration Tools

| Tool | Ecosystem | Notes |
|---|---|---|
| **Prisma Migrate** | TypeScript/Node.js | Declarative schema → SQL diff. `prisma migrate dev` for development, `prisma migrate deploy` for CI/production. |
| **Drizzle Kit** | TypeScript/Node.js | Type-safe schema definition. `drizzle-kit generate` for SQL diffs, `drizzle-kit migrate` for application. |
| **Knex.js** | TypeScript/Node.js | Programmatic migrations. `knex migrate:make`, `knex migrate:latest`. Full control over SQL. |
| **Flyway** | JVM / any | SQL-based, strong versioning, widely used in enterprises. |
| **Liquibase** | JVM / any | XML/YAML/JSON/SQL changelogs, supports rollback contexts. |

### Best Practices

- **One concern per migration**: Don't add a table and add a column and create an index in one migration. Split them so failures are pinpointable.
- **Idempotent migrations when possible**: `CREATE TABLE IF NOT EXISTS`, `DROP INDEX IF EXISTS`, `ADD COLUMN IF NOT EXISTS` (PostgreSQL 9.6+).
- **Lock-aware migrations**: Adding a column with a default value locks the table in some databases. Use `ADD COLUMN ... NULL` + backfill in batches + `SET NOT NULL` + `SET DEFAULT`.
- **Data-only migrations**: Schema = one migration; data transformation/backfill = a separate migration. Schema changes should always succeed; data migrations may fail on bad data.
- **Stored migration logs**: Track which migrations ran, when, and by whom in a dedicated `migrations_history` table (some tools do this automatically).

---

## Indexes

Indexes are the primary mechanism for query performance. Choosing the right index is the difference between 1 ms and 10 s on a query against a large table.

### Index Types (PostgreSQL)

| Type | Data Structure | Best For | Example |
|---|---|---|---|
| **B-tree** (default) | Balanced tree | Equality (`=`), range (`<`, `>`, `BETWEEN`), `ORDER BY`, `IS NULL` | `CREATE INDEX idx_users_email ON users (email);` |
| **GiST** (Generalized Search Tree) | Tree with pluggable strategies | Geometric data, full-text search, KNN | `CREATE INDEX idx_locations ON locations USING gist (coordinates);` |
| **GIN** (Generalized Inverted Index) | Inverted index | Array containment (`@>`), JSONB keys/values, full-text search (`tsvector`) | `CREATE INDEX idx_tags ON posts USING gin (tags);` |
| **BRIN** (Block Range INdex) | Summaries per block range | Very large, naturally ordered tables (time-series, logs) | `CREATE INDEX idx_events_ts ON events USING brin (created_at);` |
| **Hash** | Hash table | Equality only (`=`), smaller than B-tree but no range support | Rarely used; B-tree handles equality well. |

### Composite Indexes

Order of columns in a composite index is critical. The index is usable by queries that filter on a **leading subset** of columns.

```sql
CREATE INDEX idx_orders_customer_status ON orders (customer_id, status, created_at DESC);
```

This index serves:
- `WHERE customer_id = ?` — uses leading column ✓
- `WHERE customer_id = ? AND status = ?` — uses first two ✓
- `WHERE customer_id = ? AND status = ? ORDER BY created_at DESC` — uses all three ✓
- `WHERE status = ?` — cannot use the index ✗ (customer_id is not in the WHERE clause)

**Rule**: Put the most selective column first (highest cardinality, most `=` filters). Equal-match columns before range columns. `ORDER BY` columns last.

### Covering Indexes (Index-Only Scans)

Add extra columns via `INCLUDE` so the query can be satisfied entirely from the index, avoiding a heap lookup:

```sql
CREATE INDEX idx_users_email_covering ON users (email) INCLUDE (name, avatar_url);
```

Query `SELECT name, avatar_url FROM users WHERE email = ?` now uses an index-only scan — no heap access. Use sparingly: every `INCLUDE` column increases index size and write overhead.

### Partial Indexes

Index only a subset of rows, reducing index size and write overhead:

```sql
CREATE INDEX idx_orders_active ON orders (customer_id)
  WHERE status NOT IN ('cancelled', 'completed');  -- only active orders

CREATE INDEX idx_users_not_deleted ON users (email)
  WHERE deleted_at IS NULL;  -- for soft-delete tables
```

### EXPLAIN ANALYZE

Always verify that indexes are actually being used:

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42 AND status = 'pending';
```

Key signals to read:
- **Seq Scan** on a large table → missing index. Add one.
- **Index Scan** → good. Index + heap lookup.
- **Index Only Scan** → ideal. All data from the index.
- **Bitmap Index Scan → Bitmap Heap Scan** → index used, but rows are scattered. A covering index might help.
- **Nested Loop** → join strategy. Fine for small inner sets; bad for large ones.
- **Hash Join** → good for medium/large sets.
- **cost=0.00..X.XX** and **actual time=0.123..Y.YYY** → compare estimates to reality.

Also check `pg_stat_user_indexes` for index usage statistics — drop unused indexes.

### Index Maintenance

- **Unused indexes**: Query `pg_stat_user_indexes` for `idx_scan = 0` and high write activity. Drop them.
- **Bloat**: `pgstattuple` extension. `REINDEX INDEX CONCURRENTLY` to rebuild without locking.
- **Duplicate indexes**: Find overlapping indexes (e.g., `(a, b)` and `(a)` — the second is usually redundant if `a` is the leading column of the first). Drop the redundant one.

### When NOT to Index

- Small tables (under a few thousand rows) — sequential scan is faster.
- Tables with heavy write throughput — each index adds write overhead.
- Columns with very low cardinality (boolean, enum with 2–3 values) — the planner often ignores the index.
- **Measure first, index second**: Don't index prematurely. Profile slow queries, add targeted indexes, verify with EXPLAIN.

---

## Audit Trail

An audit trail records who changed what and when for every data mutation. It is essential for compliance (SOC 2, GDPR, HIPAA), debugging, and operational forensics.

### Design: Append-Only Audit Table

Create a separate audit table per audited entity table. The audit table is insert-only and never updated or deleted.

```sql
CREATE TABLE users_audit (
  audit_id     BIGSERIAL PRIMARY KEY,
  operation    TEXT NOT NULL,            -- 'INSERT', 'UPDATE', 'DELETE'
  entity_id    UUID NOT NULL,            -- FK to users.id (or just the ID, no FK constraint since rows may be deleted)
  user_id      UUID,                     -- Who performed the action
  old_values   JSONB,                    -- NULL for INSERT
  new_values   JSONB,                    -- NULL for DELETE
  changed_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_audit_entity ON users_audit (entity_id, changed_at DESC);
```

### What to Capture

| Field | Description |
|---|---|
| `operation` | `INSERT`, `UPDATE`, `DELETE` |
| `entity_id` | Primary key of the affected row |
| `user_id` | The authenticated user who performed the action (from request context) |
| `old_values` | JSON snapshot of the row BEFORE the change (null for INSERT) |
| `new_values` | JSON snapshot of the row AFTER the change (null for DELETE) |
| `changed_at` | Server-side timestamp (never client-supplied) |
| Optional: `ip_address` | Client IP for forensics |
| Optional: `request_id` | Correlation ID to trace back to specific API call |

### Implementation Approaches

**1. Database Triggers** (PostgreSQL)

```sql
CREATE OR REPLACE FUNCTION audit_trigger() RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get user_id from transaction-local setting (set at request start)
  current_user_id := current_setting('app.current_user_id', true)::UUID;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO users_audit (operation, entity_id, user_id, new_values)
    VALUES ('INSERT', NEW.id, current_user_id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO users_audit (operation, entity_id, user_id, old_values, new_values)
    VALUES ('UPDATE', NEW.id, current_user_id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO users_audit (operation, entity_id, user_id, old_values)
    VALUES ('DELETE', OLD.id, current_user_id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_audit
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

Triggers are reliable and require no application code changes, but they add overhead to every write and are harder to test.

**2. ORM Hooks / Middleware**

Prisma example:

```typescript
prisma.$use(async (params, next) => {
  const result = await next(params);
  if (['create', 'update', 'delete'].includes(params.action) && params.model === 'User') {
    await prisma.usersAudit.create({
      data: {
        operation: params.action.toUpperCase(),
        entityId: params.args.where?.id ?? result.id,
        userId: requestContext.userId, // injected via AsyncLocalStorage
        oldValues: params.action === 'update' ? params.args.data : undefined,
        newValues: params.action !== 'delete' ? result : undefined,
      },
    });
  }
  return result;
});
```

Easier to test and maintain, but tightly coupled to ORM and can be bypassed by direct SQL.

### Separation of Concerns

Audit tables must be stored separately from operational tables — ideally in a different database or schema. Audit data grows unbounded and should not compete for resources with operational data. Apply different backup/retention/archival policies to audit data.

### Querying Audits

```sql
-- View entire change history for one entity
SELECT * FROM users_audit WHERE entity_id = 'abc-123' ORDER BY changed_at DESC;

-- Find who changed a specific field
SELECT user_id, changed_at, old_values->>'email' AS old_email, new_values->>'email' AS new_email
FROM users_audit WHERE entity_id = 'abc-123' AND operation = 'UPDATE';
```

---

## Soft Delete

Soft delete marks rows as logically removed without physically deleting them, enabling recovery and preserving referential integrity.

### Implementation

Add a nullable `deleted_at TIMESTAMPTZ` column. `NULL` = active; non-null = deleted.

```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;
```

### Mandatory Filtering

Every query against a soft-deleted table MUST include `WHERE deleted_at IS NULL`. This is non-negotiable. A single query without this filter leaks deleted data.

**ORM mitigation**: Use query scopes or default filters.

Prisma: Use a middleware or a custom base query function.
Drizzle: Use a base query object with the filter applied.

```typescript
// Drizzle base query pattern
const activeUsers = db.select().from(users).where(isNull(users.deleted_at));
// Always derive queries from this base
```

**Performance**: Create a partial index:
```sql
CREATE INDEX idx_users_active_email ON users (email) WHERE deleted_at IS NULL;
```

### Restoration

```sql
UPDATE users SET deleted_at = NULL WHERE id = ?;
```

Restoration must cascade to child records if they were also soft-deleted. Track this relationship — either use a shared `deleted_at` timestamp or cascade the restore operation.

### Unique Constraints

A deleted row still occupies the unique constraint space. Solution: create a partial unique index that excludes deleted rows.

```sql
-- Instead of: ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email);
-- Use a partial unique index:
CREATE UNIQUE INDEX uq_users_email_active ON users (email) WHERE deleted_at IS NULL;
```

A user `foo@bar.com` can be deleted, and a new user with the same email can be created. The deleted row's email does not block it.

### Cascade Soft Delete

When soft-deleting a parent row (e.g., a `project`), also soft-delete all children (`tasks`, `comments`):

```typescript
async function softDeleteProject(projectId: string) {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(tasks).set({ deletedAt: now }).where(eq(tasks.projectId, projectId));
    await tx.update(comments).set({ deletedAt: now })
      .where(inArray(comments.taskId, tx.select({ id: tasks.id }).from(tasks).where(eq(tasks.projectId, projectId))));
    await tx.update(projects).set({ deletedAt: now }).where(eq(projects.id, projectId));
  });
}
```

### Cleanup: Hard Delete After T + 30 Days

Soft-deleted rows accumulate indefinitely. Define a retention policy (e.g., permanently delete rows soft-deleted more than 30 days ago). Run this as a scheduled background job:

```sql
DELETE FROM users WHERE deleted_at < NOW() - INTERVAL '30 days';
DELETE FROM orders WHERE deleted_at < NOW() - INTERVAL '30 days';
-- Cascade manually or with ON DELETE CASCADE if using FK cleanup
```

**Implementation**: A cron job or a database-side `pg_cron` task. Batch deletes (e.g., 1000 rows at a time) to avoid long locks.

---

## Multi-tenancy

Multi-tenancy isolates data belonging to different tenants (customers, organizations, teams) within the same application.

### Strategy Comparison

| Strategy | Isolation | Overhead | Tenant Count | Regulatory Fit |
|---|---|---|---|---|
| **Database-per-tenant** | Strongest | Highest (one DB per tenant, separate connection pools) | Low (dozens to hundreds) | HIPAA, PCI-DSS, strict data isolation |
| **Schema-per-tenant** | Good | Medium (shared DB, separate schemas) | Medium (hundreds to low thousands) | GDPR, moderate isolation |
| **Row-level** | Weakest (relies on application/RLS) | Lowest (shared everything) | High (thousands to millions) | Multi-tenant SaaS, lower sensitivity data |

### Database-per-Tenant

Each tenant gets their own PostgreSQL database. Connection pools are tenant-specific. Migrations must run against every tenant DB. This complicates operations (N x backup, N x migration) but provides the strongest isolation and blast radius.

```typescript
function getTenantDb(tenantId: string): Pool {
  if (!pools.has(tenantId)) {
    pools.set(tenantId, new Pool({ database: `tenant_${tenantId}`, ... }));
  }
  return pools.get(tenantId)!;
}
```

### Schema-per-Tenant

One PostgreSQL database, one schema per tenant: `tenant_a.users`, `tenant_b.users`, etc. The `search_path` is set per-request to route queries to the correct schema. Migrations must be applied to all schemas.

```sql
SET search_path = 'tenant_acme_corp';
SELECT * FROM users; -- resolves to tenant_acme_corp.users
```

### Row-level (Shared Tables + tenant_id)

All tenants share one set of tables. Every row has a `tenant_id` column. Every query must filter by `tenant_id`. Row-Level Security (RLS) enforces this at the database level.

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

```typescript
// Set tenant context at request start
await db.execute(`SET app.current_tenant_id = '${tenantId}'`);
// All subsequent queries are automatically filtered by RLS
```

### Choosing a Strategy

- **< 100 tenants, strong regulatory requirements** → Database-per-tenant.
- **100–1000 tenants, moderate isolation needs** → Schema-per-tenant.
- **> 1000 tenants, B2C or SaaS, lower sensitivity** → Row-level with RLS.
- **Hybrid**: Row-level for most tenants, database-per-tenant for enterprise customers.

### Non-Negotiables

- **Never leak tenant data**: A missing `WHERE tenant_id = ?` is a data breach. Use RLS as a safety net, not the primary filter.
- **Tenant-aware connection caching**: When using database-per-tenant, evict connections after tenant deprovisioning.
- **Cross-tenant queries are forbidden**: No joins across tenants. No aggregations that span tenants unless specifically authorized (e.g., admin dashboard).

---

## SQL Optimization

Writing correct SQL is table stakes. Writing performant SQL requires understanding the query planner, execution strategies, and common anti-patterns.

### EXPLAIN / EXPLAIN ANALYZE

The foundation of query optimization. `EXPLAIN` shows the plan; `EXPLAIN ANALYZE` runs the query and shows actual timings.

```sql
EXPLAIN ANALYZE
SELECT o.*, oi.product_name
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.customer_id = 42
ORDER BY o.created_at DESC
LIMIT 20;
```

Read the output bottom-up (innermost nodes first). Look for:
- **"Seq Scan" on a table with millions of rows** → add an index on the filter column.
- **"(cost=X..Y)" — compare `rows` estimate to `actual rows`** → stale statistics (run `ANALYZE`).
- **Nested Loop with a large inner set** → consider a Hash Join or an index on the join column.
- **"Sort" with `external merge` disk** → increase `work_mem` or add an index that provides sort order.

### N+1 Detection and Prevention

The N+1 problem: query N rows, then execute 1 additional query per row to fetch related data.

```typescript
// BAD — N+1
const orders = await db.select().from(orders).where(eq(orders.status, 'pending'));
for (const order of orders) {
  order.items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  // 1 query for orders + N queries for items = N+1
}
```

**Solutions:**

1. **Eager Loading (JOIN)**:

```typescript
// Single query with JOIN
const ordersWithItems = await db
  .select()
  .from(orders)
  .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
  .where(eq(orders.status, 'pending'));
```

Use ORM eager-loading features: Prisma's `include`, Drizzle's `with` relation queries, TypeORM's `relations`.

2. **Batch Loading (WHERE IN)**:

```typescript
// Two queries: 1 for orders, 1 for all items in batch
const orders = await db.select().from(orders).where(eq(orders.status, 'pending'));
const orderIds = orders.map(o => o.id);
const allItems = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
// Group items by orderId in application code
```

Better than N+1. Use DataLoader (`dataloader` npm package) for automatic batching and caching.

### Pagination

**Keyset / Cursor Pagination** (recommended for large datasets):

```sql
-- Page 1
SELECT id, title, created_at FROM posts ORDER BY created_at DESC, id DESC LIMIT 20;

-- Page 2 (using cursor from last row of page 1)
SELECT id, title, created_at FROM posts
WHERE (created_at, id) < ('2025-06-01', 'uuid-123')
ORDER BY created_at DESC, id DESC LIMIT 20;
```

Advantages:
- Stable under concurrent inserts/deletes — no skipping or duplicates.
- Constant performance regardless of page depth (uses index seek, not offset scan).
- Index-friendly: uses `(created_at DESC, id DESC)` index efficiently.

**OFFSET Pagination** (acceptable for small or admin datasets):

```sql
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 1000;
```

Disadvantages: PostgreSQL still scans and discards the first 1000 rows. Performance degrades with high offsets. Rows may shift between pages under concurrent writes.

### Window Functions

Analytical queries benefit from window functions, which compute values across a set of rows related to the current row:

```sql
-- Rank orders by value per customer
SELECT customer_id, order_id, total,
  ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY total DESC) AS rank
FROM orders;

-- Running total per customer
SELECT customer_id, created_at, total,
  SUM(total) OVER (PARTITION BY customer_id ORDER BY created_at) AS running_total
FROM orders;

-- Compare current row to previous
SELECT created_at, total,
  LAG(total, 1) OVER (ORDER BY created_at) AS prev_total,
  LEAD(total, 1) OVER (ORDER BY created_at) AS next_total
FROM daily_summary;
```

Common window functions: `ROW_NUMBER`, `RANK`, `DENSE_RANK`, `NTILE`, `LAG`, `LEAD`, `FIRST_VALUE`, `LAST_VALUE`.

### CTEs (Common Table Expressions)

Use `WITH` clauses to break down complex queries into readable, named subqueries:

```sql
WITH recent_orders AS (
  SELECT customer_id, MAX(created_at) AS last_order_date
  FROM orders WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY customer_id
),
customer_totals AS (
  SELECT customer_id, SUM(total) AS lifetime_value
  FROM orders GROUP BY customer_id
)
SELECT u.email, ro.last_order_date, COALESCE(ct.lifetime_value, 0) AS ltv
FROM users u
LEFT JOIN recent_orders ro ON ro.customer_id = u.id
LEFT JOIN customer_totals ct ON ct.customer_id = u.id
WHERE ro.last_order_date IS NOT NULL;
```

**Materialized vs. non-materialized**: By default, CTEs are optimization fences in PostgreSQL (pre-12). For optimization, use `MATERIALIZED` or `NOT MATERIALIZED` hints:

```sql
WITH materialized_cte AS MATERIALIZED (...)
WITH inline_cte AS NOT MATERIALIZED (...)
```

For multi-use CTEs, materialize to avoid recomputation. For single-use CTEs, skip materialization to allow predicate push-down.

### Additional Optimization Techniques

- **`ANALYZE` regularly**: After large data changes, update statistics so the planner makes accurate cost estimates.
- **`work_mem`**: Increase for sessions running complex sorts/hashes (e.g., `SET work_mem = '256MB'` per session).
- **Denormalization**: For read-heavy workloads, add a redundant column to avoid a JOIN (e.g., `orders.customer_email`). Document the denormalization decision.
- **Table partitioning**: Split large tables by range (e.g., `orders_2025_q1`, `orders_2025_q2`). Queries targeting specific partitions run faster. PostgreSQL 10+ supports declarative partitioning.
- **Connection pooling**: Use PgBouncer or `pg-pool` for a bounded connection pool. Never open a new connection per request.

---

## Transactions

Transactions group operations into an atomic, consistent, isolated, and durable (ACID) unit of work.

### ACID Properties

| Property | Meaning | PostgreSQL |
|---|---|---|
| **A**tomicity | All operations succeed or all roll back | `COMMIT` / `ROLLBACK` |
| **C**onsistency | Data moves from one valid state to another | Constraints, triggers, foreign keys |
| **I**solation | Concurrent transactions don't interfere | Multiple isolation levels (see below) |
| **D**urability | Committed data survives crashes | WAL (Write-Ahead Logging) |

### Isolation Levels

| Level | Dirty Read | Non-repeatable Read | Phantom Read | Serialization Anomaly |
|---|---|---|---|---|
| **Read Uncommitted** | Possible | Possible | Possible | Possible |
| **Read Committed** (PG default) | Not possible | Possible | Possible | Possible |
| **Repeatable Read** | Not possible | Not possible | Not possible* | Possible |
| **Serializable** | Not possible | Not possible | Not possible | Not possible |

\* PostgreSQL's Repeatable Read implementation actually prevents phantom reads, unlike the SQL standard.

**When to use each:**
- **Read Committed**: Default for most web apps. Good enough for CRUD.
- **Repeatable Read**: When you need a consistent snapshot across multiple reads within a transaction (e.g., reporting, balance calculation).
- **Serializable**: Financial operations, inventory management, any situation where interleaved transactions could produce invalid state. PostgreSQL's Serializable Snapshot Isolation (SSI) is optimistic — it doesn't lock, it detects conflicts at commit time.

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
-- operations
COMMIT;
-- On conflict: "could not serialize access due to read/write dependencies among transactions"
-- → retry the entire transaction
```

### Keep Transactions SHORT

Transactions hold locks and resources. The longer a transaction runs, the more contention it creates.

**Absolutely forbidden inside a transaction:**
- User interaction (waiting for human input)
- Non-database I/O (HTTP calls, file reads)
- Long-running computations
- Sleeping / polling

Pattern: do all I/O and computation BEFORE `BEGIN`, then execute only the database operations:

```typescript
// GOOD
const userInput = await readUserInput();       // BEFORE transaction
const externalData = await fetchPrices();        // BEFORE transaction
const result = await db.transaction(async (tx) => {
  // ONLY database operations inside
  await tx.insert(orders).values({ ... });
  await tx.update(inventory).set({ ... });
  return result;
});
```

### Rollback on Any Error

Any error inside a transaction must trigger a rollback. Never commit on error. ORMs typically do this automatically.

```sql
BEGIN;
-- operation 1
-- operation 2 — fails
ROLLBACK; -- mandatory
-- NEVER: COMMIT after an error
```

### Savepoints (Nested Partial Rollback)

Savepoints allow partial rollback within a larger transaction:

```sql
BEGIN;
INSERT INTO users (...) VALUES (...);           -- succeeds, keep
SAVEPOINT sp_update_orders;
UPDATE orders SET status = 'shipped' WHERE ...; -- might fail
-- If it fails:
ROLLBACK TO sp_update_orders;
-- users insert is still active
COMMIT;
```

```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values({ ... });
  try {
    await tx.update(orders).set({ ... });
  } catch (err) {
    // Order update failed, but user insert succeeds
    logger.warn('Order update failed, user created anyway');
  }
});
```

Use sparingly. Savepoints that mask real errors are hiding bugs.

---

## Concurrency

When multiple transactions operate on the same data simultaneously, conflicts arise. Choose a strategy that balances consistency with throughput.

### Optimistic Locking

Assume conflicts are rare. Don't lock rows — instead, detect conflicts at write time and retry.

**Implementation**:

```sql
-- Schema: add a version column
ALTER TABLE orders ADD COLUMN version INTEGER DEFAULT 1;
```

```sql
-- Read
SELECT id, status, version FROM orders WHERE id = ?;
-- Write: version check
UPDATE orders SET status = 'shipped', version = version + 1
WHERE id = ? AND version = ?;  -- oldVersion

-- If rows_affected = 0 → someone else modified the row → conflict
```

```typescript
async function shipOrder(orderId: string) {
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const order = await db.select({ id: orders.id, version: orders.version })
      .from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order[0]) throw new Error('Not found');

    const result = await db.update(orders)
      .set({ status: 'shipped', version: order[0].version + 1 })
      .where(and(eq(orders.id, orderId), eq(orders.version, order[0].version)));

    if (result.rowCount && result.rowCount > 0) return; // success
    // Conflict — retry
    if (attempt === maxRetries - 1) throw new ConflictError('Order was modified concurrently');
  }
}
```

**Best for**: Read-heavy workloads, low contention on individual rows.

**Conflict resolution strategies**: retry with fresh data, merge changes, or surface the conflict to the user.

### Pessimistic Locking

Assume conflicts are common. Lock rows explicitly so no other transaction can modify them until yours commits.

```sql
BEGIN;
SELECT * FROM orders WHERE id = ? FOR UPDATE;  -- locks the row
-- Other transactions trying SELECT ... FOR UPDATE on the same row WAIT
UPDATE orders SET status = 'shipped' WHERE id = ?;
COMMIT; -- lock released
```

Variants:
- `FOR UPDATE`: Blocks other `FOR UPDATE` / `FOR NO KEY UPDATE` / `UPDATE` / `DELETE`. Strongest.
- `FOR NO KEY UPDATE`: Blocks other `FOR UPDATE` / `FOR NO KEY UPDATE` but not simple `FOR KEY SHARE`. Use when you're updating non-key columns.
- `FOR SHARE`: Shared lock. Blocks `FOR UPDATE` / `UPDATE` / `DELETE` but allows other `FOR SHARE`. Use for reads that must be consistent with a later write.
- `FOR KEY SHARE`: Weakest. Blocks only `DELETE` and key-column `UPDATE`. Use for FK checks.

**With timeout**:

```sql
SET lock_timeout = '2s';
SELECT * FROM orders WHERE id = ? FOR UPDATE;
-- If lock can't be acquired in 2s → error
```

**Best for**: High-contention resources, payment processing, ticket booking.

**Dangers**: Deadlocks (two transactions waiting on each other's locks). Mitigate by always locking rows in a consistent order.

### Conflict Resolution

When optimistic locking detects a conflict:

1. **Retry with exponential backoff**: Re-read the row, re-apply changes, re-attempt write.
2. **Merge changes**: If the conflicting change touched a different column, merge both updates.
3. **Notify the user**: "This record was modified by another user. Please review the latest version and retry." Provide a diff view.
4. **Last-write-wins**: Accept the latest write, discarding the first. Only if data loss is acceptable.

### Deadlock Avoidance

- Always access tables and rows in the same order across all transactions. If transaction A locks `orders` then `users`, and transaction B locks `users` then `orders`, you WILL get deadlocks.
- Keep transactions short (see Transactions section).
- Use `lock_timeout` to fail fast instead of hanging.
- PostgreSQL automatically detects deadlocks and aborts one transaction. Catch deadlock errors and retry.

---

## Operational Best Practices

### Backups
- **pg_dump** for logical backups (SQL dump). Scheduled.
- **pg_basebackup / WAL archiving** for continuous Point-in-Time Recovery (PITR).
- Test restores regularly. An untested backup is not a backup.

### Connection Management
- Use a connection pooler (PgBouncer, pg-pool) with transaction pooling mode.
- Max connections = `(CPU cores × 2) + effective_spindle_count`. For modern SSDs, 100–200 connections is typical. Never exceed `max_connections` in postgresql.conf (default 100).

### Query Monitoring
- Enable `pg_stat_statements` for identifying slow queries, high-frequency queries, and high-variance queries.
- Set `log_min_duration_statement` to log slow queries (e.g., queries taking > 500 ms).

### Security
- Never use database superuser for application connections. Create a limited role with minimum required permissions.
- Use SSL/TLS for all database connections in production.
- Rotate credentials regularly. Store them in a secrets manager, never in code or config files.
- Parameterize all queries. Never concatenate user input into SQL strings.
