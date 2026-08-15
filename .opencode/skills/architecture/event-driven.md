---
name: "@octs/event-driven"
description: "Design robust event-driven architectures"
depends_on: ["@octs/project-awareness"]
tools: ["RabbitMQ", "Kafka", "message queues"]
---

# @octs/event-driven

## Objective

Design and implement event-driven architectures that are reliable, scalable, and observable. Choose the right messaging technology for the job, apply proven messaging patterns, and guarantee delivery semantics appropriate to the business requirements.

## Dependencies

- `@octs/project-awareness` (`skills/project-awareness.md`) — required for understanding existing message broker configuration, event schemas, consumer conventions, tracing setup, and infrastructure topology.

## Universal Guardrails

1. **Before any code generation**, always analyze existing project context — architecture, conventions, existing components, patterns, dependencies. Never reinvent what exists. Always prefer coherence over novelty.
2. **Never declare work as "done" or "finished"** without having verified: compilation, valid imports, TypeScript types, tests passing, lint passing, no errors, file consistency, component existence, correct paths, existing dependencies, architectural compatibility. If verification cannot be performed, explicitly state: Verified / Verifiable but not executed / Not verifiable in current context.

---

## Choosing a Message Broker

### Apache Kafka

**Use when throughput and persistence come first.**

- **Topics**: ordered, partitioned, immutable log. Messages are retained for a configurable retention period regardless of consumption. Consumers track their own offset.
- **Partitions**: the unit of parallelism and ordering. Messages with the same key go to the same partition (deterministic hashing). Ordering is guaranteed within a partition, not across partitions.
- **Consumer Groups**: consumers in the same group divide partitions among themselves. Each partition is consumed by exactly one consumer in the group. Scaling consumers beyond partition count leaves some consumers idle. Different consumer groups process the same topic independently (pub/sub within Kafka).
- **Log Compaction**: keeps the latest value per key. Older messages for the same key are eventually removed. Useful for maintaining current state snapshots in a topic (materialized views, CDC snapshots).
- **Strength**: extremely high throughput, horizontal scalability, persistence of all events, replay capability. Ideal for event sourcing, metrics, audit logs, CDC pipelines.
- **Weakness**: more operational complexity, no built-in routing (no exchanges/bindings like RabbitMQ), consumer group rebalancing can cause brief processing pauses, latency is higher than RabbitMQ for individual messages.

### RabbitMQ

**Use when reliability, flexible routing, and ease of use come first.**

- **Exchanges**: receive messages from producers and route them to queues based on routing rules. Types: direct (routing key match), topic (routing key pattern match), fanout (all bound queues), headers (header-based matching).
- **Queues**: store messages until consumed. Can be durable (survive broker restart), exclusive (single consumer, deleted on disconnect), auto-delete (deleted when last consumer disconnects).
- **Bindings**: connect exchanges to queues with routing keys. The routing topology is explicit and configurable.
- **Acknowledgments**: consumers explicitly ack messages after processing. The broker redelivers unacked messages on consumer disconnect. Manual ack mode is preferred for reliability; auto-ack risks message loss on consumer crash.
- **Strength**: mature, well-understood, flexible routing, excellent tooling and management UI, graceful handling of slow consumers, dead letter support built in, great community.
- **Weakness**: lower throughput than Kafka, messages are deleted on consumption (no log replay), more difficult to scale horizontally (quorum queues help but add latency), message ordering requires careful setup.

### Selection Heuristic

| Requirement | Recommendation |
|---|---|
| Message ordering by key | Kafka |
| Complex routing (topic patterns, headers) | RabbitMQ |
| Replay entire event history | Kafka |
| Simple work queues, task distribution | RabbitMQ |
| Sub-millisecond latency | RabbitMQ |
| Millions of messages per second | Kafka |
| Integration with big data ecosystem | Kafka |
| Operational simplicity, small team | RabbitMQ |

---

## Messaging Patterns

### Outbox Pattern

**Problem**: how to atomically persist business data AND publish a message? Writing to the database and publishing to the broker are two separate transactions. A crash between them causes inconsistency (data saved but event never published, or event published but data rolled back).

**Solution**: write events to an outbox table in the same database transaction as the business data. A separate process (outbox publisher) polls the outbox table, publishes events to the broker, and marks them as published.

**Implementation**:

```
// In the same transaction:
await db.transaction(async (tx) => {
  await tx.orders.insert(order);
  await tx.outbox.insert({
    id: uuid(),
    aggregateType: 'Order',
    aggregateId: order.id,
    eventType: 'OrderPlaced',
    payload: JSON.stringify(orderPlacedEvent),
    createdAt: new Date(),
  });
});

// Outbox publisher (separate process or scheduled task):
const events = await db.outbox.findMany({ where: { publishedAt: null }, take: 100 });
for (const event of events) {
  await broker.publish(event.eventType, event.payload, { messageId: event.id });
  await db.outbox.update({ where: { id: event.id }, data: { publishedAt: new Date() } });
}
```

- Use `FOR UPDATE SKIP LOCKED` to allow multiple outbox publishers to run concurrently without conflicts.
- Polling interval trades latency for simplicity. For lower latency, use database triggers + NOTIFY (PostgreSQL) or change data capture (Debezium).

### Saga

**Problem**: a business transaction spans multiple services. Each service performs a local transaction. How to maintain consistency across services without distributed transactions (2PC)?

**Orchestration**: a central coordinator (saga orchestrator) tells each participant what to do. The orchestrator handles the flow, including compensating actions on failure.

- **Pros**: explicit flow, easier to understand, centralized error handling, simpler to test.
- **Cons**: central point of coordination (single point of failure unless built redundantly), participants become more coupled to the orchestrator's API.

```
class OrderSagaOrchestrator {
  async execute(order: Order): Promise<void> {
    try {
      await this.inventory.reserve(order.items);          // Step 1
      await this.payment.authorize(order.payment);        // Step 2
      await this.inventory.confirm(order.items);           // Step 3
      await this.payment.capture(order.payment);           // Step 4
    } catch (error) {
      // Compensate in reverse order
      await this.payment.refund(order.payment);            // Undo step 2
      await this.inventory.release(order.items);           // Undo step 1
      throw error;
    }
  }
}
```

**Choreography**: each participant listens for events and reacts independently. No central coordinator.

- **Pros**: loose coupling, no central point of failure, naturally scalable.
- **Cons**: flow is implicit (harder to understand end-to-end), harder to test, risk of circular dependencies, debugging across multiple services requires distributed tracing.

```
// Inventory service listens for OrderPlaced and reserves
@EventHandler('OrderPlaced')
async handleOrderPlaced(event: OrderPlaced): Promise<void> {
  const reserved = await this.reserve(event.items);
  if (reserved) {
    await this.eventBus.publish(new InventoryReserved(event.orderId));
  } else {
    await this.eventBus.publish(new InventoryReservationFailed(event.orderId));
  }
}

// Payment service listens for InventoryReserved and charges
@EventHandler('InventoryReserved')
async handleInventoryReserved(event: InventoryReserved): Promise<void> {
  await this.payment.authorize(event.orderId);
  await this.eventBus.publish(new PaymentAuthorized(event.orderId));
}
```

**Compensating transactions**: every saga step MUST have a defined compensating action. If step N fails, steps 1 through N-1 are compensated in reverse order. Compensation means semantically undoing the step (refund a charge, release reserved inventory, cancel a shipment), NOT a database rollback.

### Event Sourcing

**Use when audit trail, temporal queries, or full state reconstruction is needed.**

- **Store events, not current state**: the event store is the source of truth. The current state is derived by replaying events.
- **Projections**: build current state by folding (reducing) events. `currentState = events.reduce(applyEvent, initialState)`.
- **Event store**: append-only, immutable log of all events. Each event has a sequence number, aggregate ID, event type, timestamp, and payload.
- **Snapshots**: for performance, periodically save a snapshot of the aggregate state at a given version. On load, replay events only from the snapshot forward, not from the beginning.
- **When to use**: regulatory compliance (audit trail mandatory), complex temporal queries (show me the state as of last Tuesday), collaborative editing (reconstruct sequences of changes), debugging (replay production events in development).
- **When NOT to use**: simple CRUD applications, when domain logic has few invariants, when eventual consistency of projections is unacceptable, when the operational complexity outweighs the benefits.

### CQRS (Command Query Responsibility Segregation)

**Use when read and write patterns differ significantly.**

- **Separate models**: command model (write side) enforces invariants and processes commands. Query model (read side) is optimized for specific query patterns and denormalized.
- **Command side**: uses aggregates, repositories, domain events. The command model is the "write-optimized" model.
- **Query side**: maintains one or more read models, typically populated by consuming domain events. A read model is a purpose-built projection for a specific query or view. Example: `OrderSummaryView`, `CustomerDashboardView`.
- **Synchronization**: the write side publishes domain events after persisting changes (via Outbox). The read side consumes events and updates its projections asynchronously. Read models are eventually consistent.
- **When to use**: read/write workloads differ significantly (high read volume, complex reads, but simple writes), different query patterns require different optimized representations, read models need to be in a different database technology (write in PostgreSQL, read in Elasticsearch).
- **When NOT to use**: simple CRUD with small data volumes, when eventual consistency of reads is unacceptable, when the maintenance cost of dual models exceeds the performance gains.

---

## Delivery Guarantees

### At-Least-Once Delivery

The default semantic for most message brokers. The broker guarantees a message will be delivered, but may deliver it more than once (network retries, consumer failures, rebalancing).

**Implication**: every consumer MUST be idempotent. Processing a message twice must produce the same outcome as processing it once.

### Consumer Idempotence

**Idempotency keys**: each message carries a unique key (UUID, business key). The consumer records each key it has successfully processed. Before processing, check if the key has been seen. If yes, acknowledge without processing.

```
async handle(event: OrderPlaced): Promise<void> {
  const alreadyProcessed = await this.idempotencyStore.exists(event.messageId);
  if (alreadyProcessed) {
    return; // Acknowledge without side effects
  }

  await this.processEvent(event);
  await this.idempotencyStore.markAsProcessed(event.messageId);
}
```

Alternative approaches:
- **Database uniqueness**: the processing step inserts a row with the message ID as a primary key. Duplicate insertion fails harmlessly (INSERT ON CONFLICT DO NOTHING).
- **Idempotent operations**: design operations such that repeated execution is safe by nature. `SET balance = 100` is idempotent; `SET balance = balance + 100` is not.

### Ordering

- Kafka: messages with the same key go to the same partition. Ordering is preserved within a partition. Use the aggregate ID as the message key for per-aggregate ordering.
- RabbitMQ: ordering is preserved within a single queue when there's a single consumer. With competing consumers, use the consistent hash exchange to route related messages to the same queue.
- Only enforce ordering when it matters. Over-ordering creates unnecessary bottlenecks.

---

## Dead Letter Queue (DLQ)

A DLQ is a queue (or topic) where messages go after they cannot be processed successfully.

### Configuration

- **RabbitMQ**: declare a dead letter exchange and bind it to the main queue. After max retries or on rejection with `requeue=false`, messages are routed to the DLQ.
- **Kafka**: implement a separate "dead letter" topic. The consumer publishes failed messages to it after exhausting local retries.

### Operations

- **Inspection**: DLQ messages must be inspectable — view payload, headers, failure timestamp, and error message. Build a DLQ browser UI or at minimum, provide CLI tools to dump DLQ contents.
- **Manual retry**: provide a mechanism to move messages from the DLQ back to the main queue for reprocessing (with user confirmation, not automated).
- **Alerts**: monitor DLQ depth. A growing DLQ indicates a systemic problem. Alert when DLQ count exceeds a threshold or when the rate of increase exceeds normal.

```
// DLQ health check
if (dlqDepth > dlqThreshold) {
  alerting.send({ severity: 'critical', message: `DLQ depth ${dlqDepth} exceeds threshold ${dlqThreshold}` });
}
```

---

## Event Schema Evolution

Events are contracts between services. Changes to event schemas must be carefully managed to prevent breaking consumers.

### Schema Registry

- Use a schema registry (Confluent Schema Registry for Kafka, or a custom solution for RabbitMQ) to store and validate schemas.
- Every event published and consumed is validated against its registered schema.
- The registry enforces compatibility rules automatically.

### Compatibility Types

- **Backward compatibility**: a consumer using the new schema can read messages written with the old schema. New fields must have defaults. Never remove existing fields. Achieved by adding optional fields only.
- **Forward compatibility**: a consumer using the old schema can read messages written with the new schema. Old consumers ignore unknown fields. Achieved by adding fields with defaults and never removing fields.
- **Full compatibility**: both backward and forward compatible. This is the gold standard.

### Schema Formats

- **Avro**: compact binary format, schemas stored in the registry, schema ID embedded in each message. Excellent for Kafka. Supports schema evolution natively.
- **JSON Schema**: human-readable, widely supported, easier to debug. Add a `version` field and a `$schema` URI. Use JSON Schema's `additionalProperties: false` to catch unknown field errors early.
- **Protocol Buffers**: compact, strongly typed, excellent for gRPC + Kafka in the same ecosystem. Requires code generation.

### Evolution Rules

1. **Never remove a field** — mark it deprecated instead. Removal breaks consumers that expect it.
2. **Never change a field's type** — `string` to `int` is a breaking change. Add a new field with the new type.
3. **Add new fields with defaults** — ensures backward compatibility.
4. **Never reuse a field number** (Protobuf) or **change a field's semantic meaning** — if `amount` changes from "cents" to "dollars", create a new `amountDollars` field.
5. **Version your events** — include a `schemaVersion` or `eventVersion` field in every event payload.

---

## Observability

### Distributed Tracing

- **Correlation IDs**: every event MUST carry a `correlationId` (a UUID generated at the entry point of a request) and a `causationId` (the ID of the event that directly caused this event).
- Propagate these IDs through every service in the chain. Every log line, every metric, every event includes the correlation ID.
- **Trace context**: if using OpenTelemetry, propagate the trace context (trace ID, span ID) through event headers (AMQP headers for RabbitMQ, record headers for Kafka).

```
const correlationId = event.headers.correlationId || uuid();
const causationId = event.messageId;
```

### Metrics to Monitor

- **Producer metrics**: publish rate, publish latency, publish error rate, outbox table backlog.
- **Broker metrics**: under-replicated partitions (Kafka), queue depth (RabbitMQ), consumer lag, broker CPU/memory/disk.
- **Consumer metrics**: processing rate, processing latency, error rate, DLQ rate, consumer group lag (number of unprocessed messages).
- **Business metrics**: events per business flow (e.g., "Orders placed per minute"), saga completion rate, saga failure rate, saga duration percentiles.

### Health Checks

- Can the service connect to the broker?
- Is the consumer group/queue subscribing successfully?
- Are there messages accumulating beyond the SLA threshold?
- Is the DLQ depth within acceptable limits?
