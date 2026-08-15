---
name: "@octs/ddd"
description: "Apply Domain-Driven Design tactical and strategic patterns"
depends_on: ["@octs/project-awareness"]
tools: []
---

# @octs/ddd

## Objective

Apply Domain-Driven Design tactical and strategic patterns to model complex business domains faithfully in code. Align the software model with the mental model of domain experts through ubiquitous language, bounded contexts, and rigorous domain modeling with entities, value objects, aggregates, domain events, and repositories.

## Dependencies

- `@octs/project-awareness` (`skills/project-awareness.md`) — required for understanding existing domain model, bounded context boundaries, existing aggregates, ubiquitous language terms already in use, and team conventions.

## Universal Guardrails

1. **Before any code generation**, always analyze existing project context — architecture, conventions, existing components, patterns, dependencies. Never reinvent what exists. Always prefer coherence over novelty.
2. **Never declare work as "done" or "finished"** without having verified: compilation, valid imports, TypeScript types, tests passing, lint passing, no errors, file consistency, component existence, correct paths, existing dependencies, architectural compatibility. If verification cannot be performed, explicitly state: Verified / Verifiable but not executed / Not verifiable in current context.

---

## Ubiquitous Language

A shared, rigorous language between domain experts and developers. Every term used in conversation must appear in the code. Every term in the code must be understood by the business.

### Rules

- **No translation**: do not take a domain expert's term and "translate" it into a technical name. If the business says "Cargo Manifest," the class is `CargoManifest`, not `ShippingDocument`.
- **Glossary-first**: maintain a living glossary (in `docs/ubiquitous-language.md` or a wiki) defining every domain term. Every team member — business and technical — contributes and reviews.
- **Code reflects language**: class names, method names, module names, database column names, API field names, and event names all use ubiquitous language terms.
- **Symptom of failure**: developers use one name in code and another in conversation with domain experts. The discrepancy means the model is drifting.
- **Refinement is continuous**: as the team learns more about the domain, terms evolve. Rename accordingly. A renamed class that now matches the business term is progress, not churn.

---

## Strategic Design

### Subdomains

Every subdomain in the system falls into one of three categories:

- **Core Domain**: the differentiator. What makes the business unique and competitive. Receives the most investment, the best developers, the most thorough modeling. Outsourcing the Core Domain is outsourcing your competitive advantage.
- **Supporting Subdomain**: supports the core business but is not a differentiator. Custom-built because off-the-shelf solutions don't fit, but not where the business wins. Example: a custom inventory system for an e-commerce company whose core is recommendation algorithms.
- **Generic Subdomain**: a well-understood, commoditized capability. Buy it, adopt open source, or outsource it. Example: authentication, logging, file storage, email delivery. Do not build these from scratch.

### Context Mapping

Relationships between Bounded Contexts:

- **Partnership**: two teams cooperate closely, aligning their contexts through mutual adaptation. Integration interfaces evolve together. High communication overhead.
- **Customer/Supplier**: upstream (supplier) serves downstream (customer). Supplier's success depends on customer's success. The teams establish joint planning and clearly defined interfaces.
- **Conformist**: downstream conforms to the upstream's model without translation. Used when upstream has more power or when translation cost exceeds benefit. Downstream's model is constrained by upstream's design choices.
- **Anticorruption Layer (ACL)**: downstream builds a translation layer to protect its own model from the upstream's model. The ACL translates upstream concepts into downstream ubiquitous language. Essential when integrating with legacy systems, third-party APIs, or poorly modeled contexts. Never let external models leak into your domain.
- **Open Host Service (OHS)**: a context exposes a well-defined API (REST, gRPC, events) for any other context to consume. The API is stable, versioned, and documented.
- **Published Language (PL)**: a shared, well-documented data interchange format (JSON Schema, Protocol Buffers, Avro) used between contexts. Often paired with OHS.
- **Separate Ways**: two contexts do not integrate. The cost of integration exceeds the benefit. Each context duplicates necessary data and evolves independently. A deliberate, strategic decision, not neglect.

### Distillation of the Core Domain

- Identify the Core Domain and invest disproportionately in it. Everything else is secondary.
- Extract generic subdomains aggressively. Replace custom-built generic solutions with off-the-shelf alternatives.
- Use Domain Vision Statements to align the team on what the Core Domain is and is not.
- Cohesive mechanisms: encapsulate complex algorithms and computations into focused, testable components. Separate the "how" from the "what."
- Segregated Core: keep the Core Domain package free of supporting and generic code.

---

## Tactical Patterns

### Entities

An entity is an object defined by its **identity**, not its attributes. Identity persists through the entire lifecycle.

- **Identity**: an immutable, unique identifier (UUID, business key). Equality is based on ID, never on properties. Two `Customer` objects with the same ID are the same customer, regardless of name or address differences.
- **Lifecycle**: entities are created, pass through various states, and may be archived or deleted. Model the lifecycle explicitly with state machines when warranted.
- **Invariants**: enforce consistency rules within entity methods. `PlaceOrder.addLineItem()` validates that the order is not already shipped. Invariants must always hold — a corrupt entity in memory is a corrupt entity in the database.
- **ID-based equality**: `equals(other)` compares only the ID. Never compare all properties for equality on entities.
- **Counter-example**: an entity is NOT a database row with a generated ID and getters/setters. It is a behavioral object that enforces domain rules.

```
class Order {
  private readonly id: OrderId;
  private status: OrderStatus;
  private readonly lineItems: LineItem[] = [];

  addLineItem(productId: ProductId, quantity: number, price: Money): void {
    if (this.status !== OrderStatus.DRAFT) {
      throw new DomainError('Cannot modify a non-draft order');
    }
    this.lineItems.push(new LineItem(productId, quantity, price));
  }

  equals(other: Order): boolean {
    return this.id.equals(other.id);
  }
}
```

### Value Objects

A value object is defined by its **attributes**, not its identity. It has no conceptual identity.

- **Immutability**: once created, a value object never changes. To "change" it, replace it entirely. `fullName = fullName.withMiddleName('A.')` returns a new instance.
- **Value-based equality**: two value objects are equal if all their attributes are equal. `equals(other)` compares all fields.
- **Self-validation**: a value object must never be instantiated in an invalid state. Constructors throw on invalid input. `new EmailAddress('not-an-email')` throws `DomainError`.
- **Replaceability**: don't modify a value object. Assign a new one. `customer.changeAddress(new Address(...))` assigns a new `Address`, it does not mutate the old one.
- **Side-effect-free behavior**: methods that produce derived values (`fullName()`, `formattedAmount()`) are pure functions — no mutations, no I/O.

Common value objects: `Money`, `EmailAddress`, `DateRange`, `Address`, `Quantity`, `PhoneNumber`, `Percentage`, `PostalCode`. Model these once and reuse them across all bounded contexts.

### Aggregates

An aggregate is a cluster of domain objects treated as a single unit for data changes.

- **Aggregate Root**: the single entry point. All references from outside the aggregate go to the root only. The root enforces invariants across the entire cluster.
- **Transactional consistency boundary**: changes within one aggregate are kept consistent. One aggregate = one transaction. Changes across aggregates are eventually consistent (via domain events).
- **Reference by identity**: aggregates reference other aggregates by ID (value object), never by object reference. `Order` holds `customerId: CustomerId`, not `customer: Customer`. This prevents loading unnecessary aggregates and avoids large object graphs.
- **Small aggregates**: prefer small aggregates. A large aggregate with many nested entities is a concurrency bottleneck and a performance problem. When in doubt, split.
- **Design rule of thumb**: if two objects must always be consistent with each other in the same transaction, they belong in the same aggregate. If eventual consistency is acceptable, they are separate aggregates.

```
// Order is the aggregate root
class Order {
  private readonly id: OrderId;
  private readonly customerId: CustomerId;  // reference by ID
  private readonly lineItems: LineItem[];   // part of the aggregate
  private readonly payments: Payment[];     // part of the aggregate

  addPayment(amount: Money): void {
    // Root enforces invariant: payments must not exceed order total
    const totalPaid = this.payments.reduce((sum, p) => sum.add(p.amount), Money.zero());
    if (totalPaid.add(amount).greaterThan(this.totalAmount())) {
      throw new DomainError('Payment would exceed order total');
    }
    this.payments.push(new Payment(PaymentId.generate(), amount));
  }
}
```

### Repositories

A repository provides the illusion of an in-memory collection of aggregates.

- **Scope**: one repository per aggregate root. No repositories for value objects or non-root entities. If you need a repository for a non-root entity, it should be its own aggregate.
- **Domain interface, infrastructure implementation**: the repository interface lives in the domain layer. The concrete implementation (PostgreSQL, MongoDB, in-memory) lives in the infrastructure layer.
- **Collection-like semantics**: `save(aggregate)`, `findById(id)`, `delete(aggregate)`, `findByCriteria(criteria)`. No SQL leakage into the interface. `findByOrderStatusAndDateRange` is fine; `findByRawSql` is not.
- **Transaction management**: repositories do not manage transactions. The application layer (use case) manages transactions, often through a Unit of Work pattern.
- **never return partial aggregates**: `findById` returns a fully hydrated aggregate or nothing. No "projections" from repositories — use dedicated read models (CQRS) for queries.

```typescript
// Domain layer — interface
interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
  findByCustomerId(customerId: CustomerId): Promise<Order[]>;
  nextOrderId(): OrderId;
}
```

### Domain Services

A domain service encapsulates domain logic that does not naturally belong to any single entity or value object.

- **Stateless**: a domain service has no state of its own. It operates on entities and value objects passed to it.
- **When to use**: the operation involves multiple aggregates, or the operation is a significant business process that deserves its own name, or placing the logic on any single entity would violate SRP.
- **Not an application service**: a domain service contains domain logic and domain rules. An application service (use case) orchestrates the flow. Domain services are called by application services.
- **Example**: `PricingService.calculateDiscount(order, customer, promotions)` — the logic spans multiple concepts (pricing rules, customer tier, active promotions) and doesn't fit cleanly into `Order` or `Customer`.

```typescript
class TransferService {
  transfer(from: Account, to: Account, amount: Money): void {
    from.debit(amount);
    to.credit(amount);
  }
}
```

### Domain Events

A domain event captures a fact that happened in the domain. It is something that business experts care about.

- **Naming**: past tense, verb describing what happened. `OrderPlaced`, `PaymentReceived`, `ShipmentDelayed`, `CustomerRegistered`. Never `OrderEvent` or `OrderData`.
- **Immutability**: events are immutable. Once published, they are facts and cannot be changed.
- **Payload**: include the relevant data for consumers — aggregate ID, timestamp, key values. Keep it focused. Don't include the entire aggregate.
- **Internal vs. Integration events**: domain events start inside a bounded context. Integration events are published across context boundaries. An internal `OrderPlaced` may trigger an integration `OrderPlacedIntegrationEvent` with a different schema for external consumers.
- **Handling**: event handlers are stateless and idempotent. They should be side-effect-free where possible, or use the Outbox Pattern for at-least-once delivery.

```typescript
class OrderPlaced implements DomainEvent {
  readonly occurredAt: Date = new Date();
  readonly eventType = 'OrderPlaced';

  constructor(
    readonly orderId: OrderId,
    readonly customerId: CustomerId,
    readonly totalAmount: Money,
    readonly lineItemCount: number,
  ) {}
}
```

---

## Bounded Contexts

A bounded context is an explicit boundary within which a domain model applies. Inside the boundary, all terms have a specific, unambiguous meaning.

### Delimitation

- A bounded context can be a microservice, a module in a modular monolith, or a well-defined package. The boundary is conceptual, not just physical.
- Each bounded context has its own ubiquitous language, its own domain model, and its own persistence.
- The same real-world concept has different models in different contexts. `Customer` in the Billing context has payment methods and billing addresses. `Customer` in the Support context has ticket history and satisfaction scores. Different contexts, different models — this is NOT duplication, this is precision.

### Integration Between Contexts

- Always use an Anticorruption Layer when integrating with a context you don't control (legacy, third-party, external team with different priorities).
- Prefer asynchronous integration (domain events, message queues) over synchronous (REST, gRPC) for inter-context communication. It reduces temporal coupling and increases resilience.
- When using synchronous integration, define explicit contracts (API specifications, SLA agreements) between the contexts.
- Never share a database between bounded contexts. Each context owns its data. Cross-context queries go through APIs or read models projections.

---

## Implementation Checklist

Before implementing a new aggregate or domain concept:

1. Identify the bounded context it belongs to.
2. Define terms in the ubiquitous language glossary.
3. Model as entity (has identity) or value object (no identity).
4. Determine aggregate boundaries — what must be transactionally consistent.
5. Define the repository interface in the domain layer.
6. Implement invariants in the aggregate root.
7. Identify domain events that the aggregate emits.
8. Implement the repository in the infrastructure layer.
9. Write unit tests for domain logic (no infrastructure).
10. Write integration tests for repository implementations.
