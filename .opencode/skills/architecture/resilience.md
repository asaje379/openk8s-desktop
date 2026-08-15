---
name: "@octs/resilience"
description: "Build systems that survive production failures"
depends_on: ["@octs/project-awareness"]
tools: ["API clients", "message brokers", "monitoring tools"]
---

## Objective

Build distributed systems and integration points with resilience patterns that gracefully withstand production failures — transient network blips, downstream saturation, resource exhaustion, and process termination — without cascading outages or data loss.

### Guardrail 1 — Always Consider the Existing Project
Before any code generation, ALWAYS: analyze existing architecture, identify project conventions, reuse existing components/hooks/helpers/services/utilities/types/DTOs/patterns, respect naming conventions/ESLint/Prettier/Git conventions/folder structure/dependencies. Never reinvent what exists. Always prefer coherence over novelty.

### Guardrail 2 — Mandatory Verification Before Declaring Done
Never say "Done"/"Finished" without verifying: code compiles, imports valid (no dead imports), TypeScript types valid, tests pass, lint passes, no errors, files coherent, components exist, paths correct, dependencies exist, changes compatible with architecture. If verification impossible: state Verified / Verifiable but not executed / Not verifiable in current context.

---

## Retry

Retries mask transient failures (network glitches, temporary unavailability, brief overload). They must be bounded and deliberate — infinite retries cause resource leaks and retry storms.

### Strategy Selection

| Failure Type | Retry? | Rationale |
|---|---|---|
| Network timeout / connection refused | Yes | Likely transient; downstream may recover |
| HTTP 429 (Rate Limit) | Yes | Respect `Retry-After` header; back off |
| HTTP 503 (Service Unavailable) | Yes | Downstream overload; back off aggressively |
| HTTP 5xx (server error) | Conditional | Idempotent operations only |
| HTTP 4xx (client error, except 429) | No | Retry won't fix a bad request |
| Unique constraint violation | No | Application-level conflict; don't retry blind |

### Configuration

- **Max attempts**: 3–5 is typical. Never unbounded.
- **Delay between retries**: Start at hundreds of milliseconds, grow per attempt.
- **Retry budget**: Limit total retry time across all attempts (e.g., 30 s total).
- **Distinguish retryable from non-retryable**: Map error codes explicitly; don't retry everything.
- **Instrument**: Track retry rate per operation. A sudden spike signals downstream degradation.

### Implementation Patterns

```typescript
// Explicit retry with classification
async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts: number; shouldRetry: (err: unknown) => boolean; delay: (attempt: number) => number }
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === opts.maxAttempts || !opts.shouldRetry(err)) throw err;
      await sleep(opts.delay(attempt));
    }
  }
  throw lastErr;
}
```

**Libraries**: `p-retry`, `async-retry`, `opossum` (built-in retry), `axios-retry` (HTTP-specific).

### Idempotent Writes Only

Retries are safe ONLY when the operation is idempotent. A retried `POST /orders` that creates a duplicate is worse than failing. Never retry non-idempotent writes without an idempotency key. See the Idempotence section below.

---

## Exponential Backoff with Jitter

Naive fixed-interval retries synchronize callers and cause thundering-herd retry storms when a downstream comes back online.

### Formula

```
wait = min(cap, base × 2^attempt) + random(0, jitter_max)
```

- **base**: Initial delay, typically 100–500 ms.
- **cap**: Maximum delay ceiling, typically 10–60 s.
- **jitter_max**: Random window width. `jitter_max = base * 2^(attempt-1)` is a common choice (full jitter).

### Jitter Strategies

1. **Full Jitter**: `random(0, base × 2^attempt)` — the gold standard. Spreads requests uniformly.
2. **Equal Jitter**: `(base × 2^attempt) ÷ 2 + random(0, (base × 2^attempt) ÷ 2)` — keeps a floor.
3. **Decorrelated Jitter**: `min(cap, random(base, previousWait × 3))` — stateful, avoids clustered spikes.

### Thundering Herd Prevention

The thundering herd occurs when N clients all detect a failure simultaneously and all retry at the same instant, overwhelming the recovering service. Jitter spreads those retries across the jitter window so they arrive at different times.

```typescript
function exponentialBackoff(attempt: number, base = 200, cap = 30_000): number {
  const exponential = Math.min(cap, base * Math.pow(2, attempt));
  const jitterMax = attempt === 0 ? 0 : base * Math.pow(2, attempt - 1);
  const jitter = Math.random() * jitterMax;
  return exponential + jitter;
}
```

### Related Patterns

- Combine with **circuit breaker** (below): don't retry while the circuit is Open — fast-fail instead.
- Combine with **deadlines/context cancellation**: `ctx.withTimeout(30_000)` so total retry duration has a hard cap.

---

## Circuit Breaker

A circuit breaker prevents cascading failures by fast-failing when a downstream is known to be unhealthy. Repeated failures open the circuit; a cooldown period tests recovery.

### Three States

```
  ┌──────────┐    failures ≥ threshold    ┌──────────┐
  │  CLOSED  │ ──────────────────────────▶ │   OPEN   │
  │ (normal) │                             │  (fail)  │
  └──────────┘                             └──────────┘
       ▲                                        │
       │       successes ≥ threshold            │ timeout expires
       │                                        ▼
       │    ┌───────────┐    failures ≥ 1   ┌───────────┐
       └────│ HALF-OPEN │ ◀─────────────────│ (waiting) │
            │ (testing)  │                   └───────────┘
            └───────────┘
```

1. **Closed**: Normal operation. Every call passes through. Count consecutive failures.
2. **Open**: Immediate failure — no calls are made to the downstream. After a `timeout`, transition to Half-Open.
3. **Half-Open**: A limited number of trial calls are allowed. If they succeed (≥ `successThreshold`), transition to Closed. If any fail, immediately transition back to Open.

### Configuration Parameters

| Parameter | Recommended | Rationale |
|---|---|---|
| `failureThreshold` | 5 consecutive failures | Strike a balance: too low causes flapping; too high delays detection |
| `successThreshold` | 2–3 consecutive successes | Must demonstrate real recovery before full traffic resumes |
| `timeout` | 30–60 s | Long enough for recovery; short enough to avoid prolonged unavailability |
| `halfOpenMaxRequests` | 1–5 | Limit blast radius during probe |
| `slidingWindowSize` | ~100 requests (if using sliding window) | More nuanced than consecutive-failure counter |

### Implementation Considerations

- **Per-downstream circuit breakers**: One circuit per external dependency, NOT one global circuit. A failing payment service shouldn't break the email service.
- **Fallback integration**: When the circuit is Open, invoke a fallback (see Fallbacks section) or return a degraded response.
- **Metrics**: Expose circuit state as a gauge (0=Closed, 1=Half-Open, 2=Open). Alert on frequent state transitions.
- **Time-based vs. sliding-window**: Sliding-window failure counting is more robust for fluctuating traffic.

**Library**: `opossum` (Node.js) is the most mature. Its default `timeout: 10000`, `errorThresholdPercentage: 50` is reasonable but tune per downstream.

### Example (opossum)

```typescript
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(callPaymentApi, {
  timeout: 30_000,        // time in Open before Half-Open
  errorThresholdPercentage: 50,
  resetTimeout: 30_000,
  rollingCountTimeout: 10_000,
  rollingCountBuckets: 10,
});

breaker.fallback(() => ({ status: 'degraded', message: 'Payment temporarily unavailable' }));
breaker.on('open', () => metrics.increment('circuit_breaker.open', { service: 'payment' }));
```

---

## Dead Letter Queue (DLQ)

Messages that cannot be processed after exhausting all retries must be routed to a Dead Letter Queue for inspection and remediation. Never silently drop unprocessable messages.

### When to DLQ

- Message fails processing after max retries / max delivery attempts.
- Message payload is malformed (schema mismatch, unparseable body).
- Message exceeds processing time limit (poison pill).
- Downstream permanently unavailable after circuit breaker exhaustion.

### DLQ Design

| Concern | Implementation |
|---|---|
| **Routing** | After N retries, consumer sends to `{queue-name}_dlq`; broker may do this automatically (SQS, RabbitMQ dead-letter exchange) |
| **Original metadata** | Preserve original routing key, enqueue timestamp, retry count, error message, stack trace in message headers |
| **Inspection** | Tooling to browse, search, and inspect DLQ messages by timestamp, error type, or payload |
| **Manual retry** | "Replay" button: move a specific message back to the source queue for reprocessing |
| **Purge** | Bulk-delete after confirming messages are no longer needed |
| **TTL** | Set message TTL on the DLQ itself (e.g., 7–30 days) to prevent unbounded storage |
| **Alerting** | Alert when DLQ depth exceeds threshold or growth rate spikes — this indicates a systemic poison-pill or downstream outage |

### Implementation (RabbitMQ)

Declare a dead-letter exchange (DLE) and bind the DLQ. Set `x-dead-letter-exchange` on the source queue. After `x-delivery-limit` is reached, RabbitMQ routes to the DLE automatically.

### Implementation (AWS SQS)

Configure `maxReceiveCount` on the source queue (e.g., 3–5). SQS automatically moves messages to the configured dead-letter queue after that count. Set `MessageRetentionPeriod` on the DLQ (e.g., 14 days).

### Operations

- **Daily review of DLQ growth**: A growing DLQ means either a code bug producing poison pills or a systemic downstream outage.
- **Automated replay**: Expose an API `POST /admin/dlq/replay` that moves messages back to the source queue.
- **Schema validation in the handler itself**: Validate messages BEFORE processing to fail-fast on malformed payloads, saving retry budget.

---

## Graceful Shutdown

A service must drain in-flight work before terminating. Killing a process mid-request loses data, drops connections, and confuses clients.

### Shutdown Sequence

1. **Receive signal**: `SIGTERM` (polite) or `SIGINT` (Ctrl+C). Kubernetes sends `SIGTERM` before `SIGKILL`.
2. **Stop accepting new work**: Health check returns failing status (readiness probe fails), load balancer stops routing. Close HTTP server `server.close()`.
3. **Drain in-flight requests**: Track active request count. Wait for in-flight count to reach zero, with a timeout. After the timeout, force-close remaining requests.
4. **Stop consumers/workers**: Stop polling from queues. Complete the current message, don't pick up new ones.
5. **Close external connections**: Close DB connection pools, close Redis connections, close message broker channels.
6. **Flush logs and metrics**: Ensure buffered logs/metrics are sent before exit.
7. **Exit**: `process.exit(0)` on success, `process.exit(1)` on timeout.

### Timeout Budgeting

```
Kubernetes terminationGracePeriodSeconds > drain timeout + shutdown overhead
```

For example: drainTimeout = 25 s, shutdown overhead = 5 s → `terminationGracePeriodSeconds: 30`.

### Implementation

```typescript
let shuttingDown = false;
let activeRequests = 0;

const server = app.listen(3000);

app.use((req, res, next) => {
  if (shuttingDown) {
    res.setHeader('Connection', 'close');
    return res.status(503).json({ error: 'Server shutting down' });
  }
  activeRequests++;
  res.on('finish', () => activeRequests--);
  next();
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down gracefully...`);
  shuttingDown = true;

  server.close(); // Stop accepting new connections

  // Drain in-flight requests with a deadline
  const deadline = Date.now() + 25_000;
  while (activeRequests > 0) {
    if (Date.now() > deadline) { console.warn('Drain deadline exceeded, force-exiting'); break; }
    await sleep(100);
  }

  await db.pool.end();
  await redis.quit();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

---

## Idempotence

Idempotence ensures that multiple identical requests produce the same result and no additional side effects. This is a prerequisite for safe retries, at-least-once delivery, and exactly-once semantics.

### Idempotency Key Pattern

1. **Client generates a UUID** (`Idempotency-Key` header) for each unique operation.
2. **Server stores `key → (status, response)`** for a finite window (e.g., 24 hours).
3. On first request: execute the operation, store result.
4. On repeated request with same key: return the stored result without re-executing.

### Critical for

- Payment APIs (avoid double-charge)
- Order creation (avoid duplicate orders)
- Provisioning (avoid creating duplicate resources)
- Any `POST` endpoint that creates a resource

### Implementation Considerations

- **Atomicity**: Use a unique constraint on the idempotency key column. The first INSERT wins; subsequent inserts with the same key get a constraint violation → return the existing result.
- **Expiry**: Don't store keys indefinitely. Use TTL indexes or periodic cleanup. 24 hours is typical.
- **Concurrent requests**: If two requests with the same key arrive simultaneously, one must block until the first completes (use `SELECT ... FOR UPDATE` or a distributed lock).
- **Response differentiation**: Distinguish "this request already succeeded" (HTTP 200 with stored body) from "this request is still processing" (HTTP 409 Conflict with `Retry-After`).

```sql
CREATE TABLE idempotency_keys (
  key          UUID PRIMARY KEY,
  response     JSONB NOT NULL,
  status_code  INTEGER NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_idempotency_ttl ON idempotency_keys (created_at)
  WHERE created_at < NOW() - INTERVAL '24 hours'; -- for cleanup
```

### Without Database Storage

For lighter needs, compute idempotency from request content: hash the payload + resource ID + timestamp. Requires strict client ordering and deduplication window.

---

## Timeouts

Every call to an external system — HTTP, database query, cache lookup, message broker — MUST have an explicit timeout. Defaulting to "no timeout" means one slow dependency can exhaust all resources forever.

### Where to Set Timeouts

| Boundary | Recommended Timeout | Rationale |
|---|---|---|
| HTTP outbound | 5–30 s | Match downstream SLO |
| Database query | 5–30 s | Longer for reports/analytics; short for OLTP |
| Redis / cache | 100–500 ms | Cache must be fast; fallback to DB if slow |
| Message broker publish | 2–5 s | Fast publishers avoid head-of-line blocking |
| Total request budget | p99 of latency SLO | Propagate deadline via context |

### Per-SLO Timeouts

Different operations have different latency budgets. Map timeouts to SLOs:
- **User-facing request**: total budget of 500–2000 ms (including all downstream calls).
- **Background job**: 30–60 s.
- **Reporting/analytics query**: 30–120 s.

### AbortController / AbortSignal Pattern

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch(url, { signal: controller.signal });
} catch (err) {
  if (err.name === 'AbortError') { /* handle timeout */ }
} finally {
  clearTimeout(timeoutId);
}
```

### Deadline Propagation

Propagate remaining budget through the call chain. If a request has a 2000 ms total budget and a DB query took 800 ms, the downstream HTTP call gets the remaining 1200 ms. Implement via context objects carrying a deadline.

### Never Infinite Wait

A call without a timeout blocks a connection/thread/memory indefinitely. Under load, all resources become blocked on slow downstreams → complete outage. Every `await` that crosses a network boundary must be wrapped in a timeout.

---

## Bulkhead

The bulkhead pattern isolates resources so that a failure in one area doesn't exhaust resources needed by another.

### Why Bulkheads

Without isolation, a slow payment service that ties up all HTTP connections will also prevent health checks, logging, and authentication — the entire service appears dead.

### Isolation Boundaries

| Resource | Isolation Strategy |
|---|---|
| **Connection pools** | Separate pools per downstream service. Pool A for service A (10 connections), Pool B for service B (5 connections). Service A saturation doesn't affect service B. |
| **Thread pools / event loop** | Separate worker pools per operation type. CPU-heavy image processing gets a dedicated pool; API handlers get a separate pool. |
| **Request handlers** | Rate-limit per endpoint or handler. `/search` can't consume more than 20 concurrent requests. |
| **Message consumers** | Separate consumer processes or threads per queue. DLQ processing doesn't slow main consumer. |

### Connection Pool Tuning

```typescript
// Separate pools per downstream
const paymentDbPool = new Pool({ max: 10, ... });
const analyticsDbPool = new Pool({ max: 5, ... });

// Never share pools across services with different SLOs
```

### Thread/Worker Pool Isolation

In Node.js, offload CPU-bound tasks to worker threads so the event loop stays responsive:

```typescript
import { Worker } from 'worker_threads';

const imageWorkerPool = new FixedThreadPool(4);    // bounded
const pdfWorkerPool = new FixedThreadPool(2);      // bounded
```

### Monitoring

- Track pool utilization per downstream: `active_connections / max_connections`.
- Alert at 80% utilization — saturation is imminent.
- Identify the noisy-neighbor component and isolate it.

---

## Fallbacks

When a dependency fails and retries + circuit breaker are exhausted, provide a degraded but functional fallback. The user should get something useful, not an error.

### Fallback Strategies

| Scenario | Fallback |
|---|---|
| Database down, read operation | Serve stale data from cache (with `stale-while-revalidate` flag) |
| Recommendation/ML service slow | Return default or trending recommendations |
| Payment gateway timeout | Queue order for async processing, respond "order received, processing" |
| Search index unavailable | Return empty results with message "Search temporarily unavailable" |
| Third-party enrichment API down | Return core data without enrichment |
| Feature flag service down | Default to `false` or last-known config |
| Image resizing service down | Serve original image (client-side resize) |

### Implementation

```typescript
async function getProductRecommendations(userId: string): Promise<Product[]> {
  try {
    return await withCircuitBreaker(mlService.getRecommendations(userId));
  } catch (err) {
    logger.warn({ err, userId }, 'Recommendation service failure, using fallback');
    metrics.increment('recommendation.fallback');
    return await db.getTrendingProducts({ limit: 10 }); // fallback
  }
}
```

### Rules for Fallbacks

1. **Always log when a fallback is used**. Fallback usage is a signal of degradation. Monitor the fallback rate.
2. **Fallbacks should be simpler and more reliable** than the primary path. If the fallback itself fails, the system is in serious trouble.
3. **Never silently fail**: If the fallback also fails, return an explicit error. Don't return empty/null success silently.
4. **Cache fallback results**: If the primary is a read, cache its last successful response and use it as fallback on failure.
5. **Stale cache as fallback**: Cache data with TTL + grace period. On cache miss + DB down, extend the stale entry's lifetime temporarily.

### Graceful Degradation vs. Full Failure

Define which features are tier-1 (must work) vs. tier-2 (can degrade):
- **Tier-1**: Authentication, core checkout flow — minimal fallback, alert aggressively.
- **Tier-2**: Recommendations, social features, search suggestions — fallback is acceptable.

---

## Integration: Composing Resilience Patterns

Real production systems compose multiple patterns to create defense-in-depth:

```
Incoming Request
    │
    ▼
┌─────────────────┐
│ Idempotency Key │  ← Deduplicate retried requests
│ Check           │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Circuit Breaker │  ← Fast-fail if downstream is known unhealthy
└────────┬────────┘
         ▼
┌─────────────────┐
│ Retry with      │  ← Handle transient failures
│ Exponential     │
│ Backoff + Jitter│
└────────┬────────┘
         ▼
┌─────────────────┐
│ Timeout         │  ← Bound total execution time
└────────┬────────┘
         ▼
┌─────────────────┐
│ Fallback        │  ← Degrade gracefully if all else fails
└────────┬────────┘
         ▼
      Response
```

Every external call should go through this pipeline. When wiring up a new downstream integration, start from the outermost layer (idempotency) and work inward to the fallback.

### Observability

Resilience patterns without observability are invisible. For each pattern, emit:

| Pattern | Metrics |
|---|---|
| Retry | Count, success-after-retry rate, max attempts per operation |
| Circuit Breaker | State gauge (0/1/2), transition events |
| DLQ | Depth, growth rate, age of oldest message |
| Timeout | Count, duration histogram |
| Fallback | Count, fallback success/failure rate |
| Graceful Shutdown | Drain duration histogram, force-kill count |
