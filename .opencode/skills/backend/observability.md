---
name: "@octs/observability"
description: "Implement comprehensive backend observability with logs, traces, and metrics"
depends_on: ["@octs/project-awareness"]
tools: ["OpenTelemetry", "Winston", "Pino", "Prometheus", "Grafana"]
---

# @octs/observability

## Objective

Implement comprehensive backend observability covering the three pillars — structured logging, distributed tracing, and metrics — with correlation IDs tying them together. Every service must emit enough signal to answer "what happened?" "how long did it take?" "why did it fail?" and "what is the trend?" without logging into production servers.

## Dependencies

- `@octs/project-awareness` — analyze existing project architecture, conventions, and stack before generating any code.

---

## Universal Guardrails

### Guardrail 1 — Always Consider the Existing Project
Before any code generation, ALWAYS: analyze existing architecture, identify project conventions, reuse existing components/hooks/helpers/services/utilities/types/DTOs/patterns, respect naming conventions/ESLint/Prettier/Git conventions/folder structure/dependencies. Never reinvent what exists. Always prefer coherence over novelty.

### Guardrail 2 — Mandatory Verification Before Declaring Done
Never say "Done"/"Finished" without verifying: code compiles, imports valid (no dead imports), TypeScript types valid, tests pass, lint passes, no errors, files coherent, services/components exist, paths correct, dependencies exist, changes compatible with architecture. If verification impossible: state Verified / Verifiable but not executed / Not verifiable in current context.

---

## Structured Logs

### Format

All logs must be in **JSON format** for machine parsing. Human-readable logs are for development only and must not be used in production.

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Order created successfully",
  "correlationId": "abc-123-def-456",
  "service": "order-service",
  "context": {
    "userId": "user-789",
    "orderId": "order-456",
    "amount": 99.99,
    "duration": 42
  }
}
```

### Required Fields

| Field | Description |
|-------|-------------|
| `timestamp` | ISO 8601 UTC format with millisecond precision |
| `level` | One of: `debug`, `info`, `warn`, `error`, `fatal` |
| `message` | Human-readable description of the event. Be specific: "Order 456 created" not "Order created" |
| `correlationId` | The request's correlation identifier. Present on every log during a request |
| `service` | The name of the emitting service |
| `context` | Structured object with relevant business and technical data |

### PII Masking

- **Never log PII** (Personally Identifiable Information): email addresses, full names, phone numbers, SSN, passport numbers, credit card numbers, IP addresses (except for security auditing).
- Use a logging middleware that redacts or hashes PII fields before they reach the log output.
- Log IDs, not identities: `userId: "abc123"` not `email: "user@example.com"`.

### Log Levels

| Level | When to Use |
|-------|-------------|
| `debug` | Development only. Detailed diagnostic information. Disabled in production. |
| `info` | Business events: "Order created", "Payment processed", "User registered". Normal, expected operations. |
| `warn` | Degraded operation: retryable failure, approaching a threshold (memory > 80%), fallback triggered, deprecated endpoint called. |
| `error` | Something needs attention: failed operation, unhandled exception in a request, external service returned 500. Application continues but this specific operation failed. |
| `fatal` | Cannot continue: database connection lost, configuration invalid, process must exit. |

---

## Tracing

### OpenTelemetry

OpenTelemetry is the industry standard for distributed tracing. It provides SDKs and instrumentation for automatic (http, database, queues) and manual (custom business operations) span creation.

### Spans

A span represents a unit of work with a start time and duration. Spans form a tree:

```
HTTP POST /orders                   [span: 200ms]
  ├── Validate input                [span: 2ms]
  ├── DB: find user                 [span: 8ms]
  ├── Reserve inventory             [span: 45ms]
  │   ├── External: warehouse API   [span: 42ms]
  │   └── DB: update stock          [span: 3ms]
  └── DB: insert order              [span: 5ms]
```

### Standard Span Attributes

Every span must include these attributes where applicable:

| Attribute | Value |
|-----------|-------|
| `http.method` | `GET`, `POST`, etc. |
| `http.url` | Request URL (without query parameters if they contain PII) |
| `http.status_code` | Numeric HTTP status code |
| `http.route` | Route pattern, e.g., `/users/:id` |
| `db.system` | `postgresql`, `mysql`, `mongodb`, `redis` |
| `db.statement` | The SQL/query string (without parameter values if they contain PII) |
| `db.operation` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| `messaging.system` | `kafka`, `rabbitmq`, `sqs` |
| `messaging.destination` | Queue or topic name |

### W3C Trace Context Propagation

- Use the W3C Trace Context standard headers: `traceparent` and `tracestate`.
- These headers propagate the trace ID across all services in a distributed system.
- All HTTP clients and message producers must propagate these headers automatically.
- All incoming request handlers must extract the trace context and use it as the parent for local spans.

### Span Events

Add events to spans to mark significant moments:

```typescript
span.addEvent('retry.started', { attempt: 3, previousError: 'timeout' });
span.addEvent('cache.hit', { key: 'user:123' });
span.addEvent('circuit-breaker.opened');
```

Span events are time-stamped annotations within a span's timeline.

### Sampling

- **Head-based sampling:** the sampling decision is made at the start of the trace and propagated. Use for high-throughput services where you can't trace 100% of requests.
- **Tail-based sampling:** the decision is made after the trace is complete, based on whether it contains an error or exceeds a latency threshold. Use for error-focused tracing.
- Production: sample 100% of errors and slow requests (latency > p95), sample 10% of all other requests. Adjust ratios based on volume and cost.

---

## Metrics

### Counter

A value that only increases (or resets to zero on restart). Counts cumulative events:

```typescript
// Request count, error count, bytes processed
counter.increment('http.requests.total', { method: 'GET', status: '200' });
```

- Use for: request count, error count, items processed, bytes transferred.
- Naming convention: `<namespace>_<metric>_<unit>_total` (e.g., `http_requests_total`).

### Gauge

A value that goes up and down. Represents a point-in-time measurement:

```typescript
// Active connections, queue depth, memory usage
gauge.set('app.active_connections', 42);
gauge.set('app.memory_usage_mb', 512);
```

- Use for: active connections, queue depth, memory usage, CPU usage, thread pool size.

### Histogram

Records the distribution of values. Measures duration, size, and similar:

```typescript
// Request duration, payload size
histogram.observe('http.request_duration_seconds', 0.245, { method: 'POST', route: '/orders' });
```

- Use for: request duration, payload size, processing time.
- Histograms compute: count, sum, min, max, and configurable percentiles (p50, p90, p95, p99).

### Business Metrics

Go beyond infrastructure metrics. Track business outcomes:

- Orders created, revenue, registrations, payments, subscription upgrades.
- Conversion rate (registrations / visitors), churn rate, feature adoption rate.
- These metrics connect technical performance to business impact.

### RED Method (Per Service)

Every service must expose the RED metrics:

- **Rate:** number of requests per second (counter).
- **Errors:** number of failed requests per second (counter).
- **Duration:** distribution of request latency (histogram).

These three metrics give a complete picture of service health from the consumer's perspective.

### USE Method (Per Resource)

Every resource (database, queue, cache, CPU) must expose:

- **Utilization:** percentage of resource capacity in use (gauge).
- **Saturation:** amount of work queued/waiting (gauge).
- **Errors:** count of resource errors (counter).

These three metrics give a complete picture of resource health from the provider's perspective.

---

## Correlation ID

### Generation and Reception

- If the incoming request has an `X-Correlation-ID` header, use that value.
- If not, generate a new UUID v4 and set it before any processing begins.
- The correlation ID must be generated or received at the **earliest possible point** — the first middleware, the edge gateway, the load balancer.

### Propagation

Every outgoing call (HTTP, gRPC, message queue, database) must include the correlation ID:

```typescript
// HTTP
headers['X-Correlation-ID'] = correlationId;

// RabbitMQ / Kafka
message.properties.headers['correlation-id'] = correlationId;
```

- All services in the chain propagate the correlation ID they received.
- The correlation ID enables tracing a single user request across 5, 10, or 50 services.

### Inclusion in Logs and Spans

- Every log entry during a request's lifetime must include the correlation ID.
- Set the correlation ID as a span attribute on every top-level span.
- This allows jumping from a log entry → trace → all other logs with the same correlation ID — the holy grail of distributed debugging.

---

## Health Checks

### Endpoints

| Endpoint | Purpose | Kubernetes Probe |
|----------|---------|------------------|
| `GET /health` | Liveness — is the process running? | `livenessProbe` |
| `GET /health/ready` | Readiness — can the process handle requests? | `readinessProbe` |
| `GET /health/startup` | Startup — has the process finished initializing? | `startupProbe` |

### Liveness (`/health`)

- Responds `200 OK` as long as the process is alive.
- No external dependency checks. Even if the database is down, liveness should return 200.
- Lightweight — must not be expensive or slow.

### Readiness (`/health/ready`)

- Responds `200 OK` when the service can handle requests.
- Checks external dependencies: database connection healthy, message broker reachable, cache available.
- Responds `503 Service Unavailable` when dependencies are not ready.
- Kubernetes uses this to decide whether to route traffic to this pod.

### Startup (`/health/startup`)

- Responds `200 OK` when initial setup is complete (database migrations, cache warming, connection pool initialization).
- Used when startup takes longer than the liveness/readiness probe intervals.
- Kubernetes disables liveness/readiness checks until startup returns 200.

### Health Check Implementation

- Keep health checks fast (under 5 seconds for all combined).
- Cache the health check result for a short TTL (1-5 seconds) to avoid overwhelming dependencies with health check traffic.
- Include version and uptime in the response body for operational visibility.

---

## Dashboards

### Essential Dashboards

Every service must have these dashboards in Grafana (or equivalent):

**RED Dashboard (Service Health):**
- Request rate (ops/s), error rate (errors/s), error ratio (% of requests that fail).
- Request duration percentiles: p50, p90, p95, p99.
- These metrics grouped by endpoint/route.

**Resource Dashboard:**
- CPU usage (%), memory usage (MB/GB), disk I/O, network I/O.
- Open file descriptors, thread/goroutine count, event loop lag (Node.js).
- These metrics grouped by host/pod.

**Business KPI Dashboard:**
- Key business events: orders, registrations, payments.
- Conversion rates, user growth, revenue.
- These metrics aggregated by time period (hourly, daily).

**Error Tracking Dashboard:**
- Top N errors (most frequent). New errors (first occurrence in the selected time window). Error rate trend over time.
- Errors grouped by endpoint, error type, user segment.

### SLI and SLO

- **SLI (Service Level Indicator):** the measured metric. Example: "p99 latency < 250ms for GET /api/orders".
- **SLO (Service Level Objective):** the target value. Example: "99.9% of requests meet the SLI over a 30-day rolling window".
- **Error budget:** the allowed amount of failure (100% - SLO). If the error budget is consumed, prioritize reliability over new features.
- Display error budget burn rate and remaining budget on the main dashboard.

---

## General Best Practices

- Logs, traces, and metrics should all carry the same correlation ID. This is what makes them three pillars of a single observability system, not three separate systems.
- Favor structured logging over printf-style. JSON logs can be indexed, searched, and aggregated. Unstructured text cannot.
- Instrument at the framework level (middleware) for HTTP, database, and queue spans. Only add manual instrumentation for business-specific operations.
- Alert on symptoms (high error rate, high latency), not causes (high CPU, low memory). Symptom-based alerting reduces noise and false positives.
- Observability is not logging. Observability is the ability to ask arbitrary questions about your system without shipping new code. Invest in good instrumentation once; answer many questions forever.
