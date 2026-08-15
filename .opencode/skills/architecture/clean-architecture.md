---
name: "@octs/clean-architecture"
description: "Design applications following Clean Architecture and SOLID principles"
depends_on: ["@octs/project-awareness"]
tools: []
---

# @octs/clean-architecture

## Objective

Design and evolve applications using Clean Architecture, Hexagonal Architecture (Ports & Adapters), and SOLID principles. Every architectural decision must keep the domain independent of frameworks, databases, UIs, and external agencies. The Dependency Rule governs all decisions: source code dependencies must point inward only. Inner layers never know about outer layers.

## Dependencies

- `@octs/project-awareness` (`skills/project-awareness.md`) — required for understanding existing project conventions, layer boundaries, dependency direction, framework choices, and DI container setup.

## Universal Guardrails

1. **Before any code generation**, always analyze existing project context — architecture, conventions, existing components, patterns, dependencies. Never reinvent what exists. Always prefer coherence over novelty.
2. **Never declare work as "done" or "finished"** without having verified: compilation, valid imports, TypeScript types, tests passing, lint passing, no errors, file consistency, component existence, correct paths, existing dependencies, architectural compatibility. If verification cannot be performed, explicitly state: Verified / Verifiable but not executed / Not verifiable in current context.

---

## SOLID Principles — In Depth

Every class, module, and package must be evaluated against all five SOLID principles. Applying them is not optional; it is the definition of professional software craftsmanship.

### SRP — Single Responsibility Principle

> A module should have one, and only one, reason to change.

- A "reason to change" is a single actor or stakeholder group. If the COO and the CFO both influence the same class, that class has two reasons to change and violates SRP.
- Separate code that changes for different actors. Do not conflate business rules, persistence, and presentation in a single class.
- In practice: a Use Case class handles exactly one business scenario. A Repository class handles exactly one aggregate. A Controller maps exactly one use case to an HTTP endpoint.
- Symptom of violation: changing the payroll calculation logic requires recompiling the HTML report generator.

### OCP — Open/Closed Principle

> A software artifact should be open for extension but closed for modification.

- New behavior is added by writing new code (new classes, new modules), not by modifying existing, tested, shipped code.
- Achieved through strategic use of abstractions (interfaces, abstract classes) and the Dependency Inversion Principle.
- In practice: when a new payment method is needed, add a `StripePaymentProcessor` implementing `PaymentProcessor`. Do not add an `else if` branch to an existing `processPayment()` method.
- Guard against over-engineering: only create extension points for axes of change that have actually materialized. Premature abstractions create complexity without value.

### LSP — Liskov Substitution Principle

> Subtypes must be substitutable for their base types without altering the correctness of the program.

- A client using a reference to a base class must be able to use objects of derived classes without knowing it and without behavioral surprises.
- Violations manifest as: `instanceof` checks, type-casting, methods that throw `NotImplementedException`, or derived classes that weaken preconditions or strengthen postconditions.
- In practice: every implementation of an interface must honor the contract fully. A `ReadOnlyRepository` that throws on `save()` violates LSP. Instead, split into `Reader<T>` and `Writer<T>` interfaces (see ISP).
- Test rule: every test written for a base type must pass identically for every derived type.

### ISP — Interface Segregation Principle

> No client should be forced to depend on methods it does not use.

- Fat interfaces cause unnecessary coupling. When a class depends on a 20-method interface but only uses 3, changes to any of the other 17 methods force recompilation and redeployment.
- In practice: split broad interfaces into role-specific ones. `UserRepository` becomes `UserReader`, `UserWriter`, `UserArchiver`. Clients depend only on the interfaces they need.
- This is the interface-level analogue of SRP. SRP says a module should have one reason to change. ISP says an interface should serve one client role.

### DIP — Dependency Inversion Principle

> Depend on abstractions, not on concretions.

- High-level policy (business rules) must not depend on low-level details (database driver, HTTP framework, file system). Both should depend on abstractions.
- Abstractions are owned by the high-level policy, not by the low-level implementation. The `UseCase` defines the `Repository` interface; the database module implements it.
- In practice: `SaveOrderUseCase` takes an `OrderRepository` interface as a constructor parameter. At runtime, DI provides `PostgresOrderRepository`. The use case never imports `pg`, `mysql`, or `axios`.
- Concretions are volatile (changing frameworks, databases, UI libraries). Abstractions are stable.

---

## Clean Architecture Layers

```
Frameworks & Drivers  ──→  Interface Adapters  ──→  Use Cases  ──→  Entities
     (outermost)                                                  (innermost)
```

### Entities (Enterprise-Wide Business Rules)

- Encapsulate the most general, highest-level business rules. An entity can be an object with methods or a set of data structures and functions.
- These rules are the least likely to change when something external changes (page layout, database vendor, framework swap).
- Entities have zero dependencies on any other layer. No imports from `use-cases/`, `adapters/`, or `infrastructure/`.
- In practice: `Order`, `Customer`, `Product` classes with invariants like "an order must have at least one line item" and "total amount must be positive."
- Do not use framework annotations, ORM decorators, or serialization attributes on entities. Keep them pure.

### Use Cases (Application-Specific Business Rules)

- Implement application-specific business rules. A use case orchestrates the flow of data to and from entities and directs entities to use their enterprise-wide business rules.
- Each use case is a single class with a single public method (often `execute()` or `handle()`). One use case = one business scenario.
- Use cases depend on entities and on interfaces (ports) defined in this layer. They do NOT depend on web frameworks, databases, or UI.
- In practice: `PlaceOrderUseCase`, `CancelSubscriptionUseCase`, `CalculateInvoiceUseCase`.
- Use cases accept input DTOs and return output DTOs. They must never expose entities directly to outer layers.

### Interface Adapters (Controllers, Gateways, Presenters)

- Convert data between the format most convenient for use cases/entities and the format most convenient for external agencies (web, database, UI).
- Controllers: take HTTP request, extract input, invoke use case, return HTTP response. No business logic here.
- Presenters/ViewModels: format use case output for the specific UI. The use case returns a plain DTO; the presenter converts it to a ViewModel.
- Gateways/Repositories: implement persistence interfaces defined in the use case layer. The implementation lives here, the contract lives in use cases.
- In practice: `OrderController` (HTTP), `PostgresOrderRepository` (persistence), `OrderPresenter` (formatting), `RabbitMqEventPublisher` (messaging).

### Frameworks & Drivers (Web, DB, UI, Devices)

- The outermost layer. Contains concrete frameworks and tools: Express, Fastify, PostgreSQL driver, React, Angular, AWS SDK, Kafka client.
- Code in this layer should be as thin as possible — glue code only. Wire up the DI container here.
- This is the only layer that imports framework-specific packages. Entities and use cases must never import Express types, ORM decorators, or database drivers.
- In practice: `main.ts` / `server.ts` composes everything, `express-routes.ts` maps URLs to controllers, database connection factories.

### The Dependency Rule

> Source code dependencies can only point inward. Nothing in an inner circle can know anything at all about something in an outer circle.

- An entity cannot import a use case. A use case cannot import a controller. A controller cannot import a framework.
- Data crossing layer boundaries must be in a format convenient to the inner circle. Don't pass raw HTTP request objects into use cases.
- The dependency rule is enforced at compile time through module boundaries (packages, `index.ts` barrel files, `eslint-plugin-import` rules, dependency-cruiser).

---

## Hexagonal Architecture (Ports & Adapters)

The hexagonal architecture is an application of Clean Architecture focused on isolating the domain from all I/O.

### Ports

- Ports are interfaces/contracts that define how the domain interacts with the outside world.
- **Driving (primary) ports**: how the outside world *drives* the application. Example: `PlaceOrderUseCase` interface.
- **Driven (secondary) ports**: how the application *drives* the outside world. Example: `OrderRepository`, `PaymentGateway`, `NotificationService` interfaces.
- Ports are defined IN the domain/application layer, NOT in infrastructure. The domain owns its contracts.

### Adapters

- **Driving adapters**: concrete implementations of driving ports. Example: a REST controller that calls `PlaceOrderUseCase`, a CLI command, a message queue consumer.
- **Driven adapters**: concrete implementations of driven ports. Example: `PostgresOrderRepository` implementing `OrderRepository`, `StripePaymentGateway` implementing `PaymentGateway`.
- Adapters live in the infrastructure layer and depend on the domain ports they implement.

### Zero Framework Dependencies in the Domain

The domain (entities, value objects, domain services) must have zero imports from frameworks, databases, or external services. This is non-negotiable. Verify with:

```bash
# Check that domain layer has no framework imports
grep -r "from 'express'" domain/  # Must return empty
grep -r "from 'typeorm'" domain/  # Must return empty
grep -r "from 'pg'" domain/       # Must return empty
```

---

## Layer Separation

### Domain Layer

- Entities, value objects, domain services, domain events, repository interfaces, domain exceptions.
- Pure business logic. No I/O, no frameworks, no annotations, no ORM.
- Testable in complete isolation — unit tests with no mocks for external services.

### Application Layer

- Use cases (application services), input/output DTOs, application-level interfaces (ports), unit of work abstraction, application events.
- Orchestrates domain objects. Does not contain business rules; delegates to domain.
- Depends only on the domain layer.

### Infrastructure Layer

- Repository implementations, message queue adapters, external API clients, email senders, file storage adapters.
- Framework-specific configuration and glue code.
- Depends on application and domain layers (implements their interfaces).

### Presentation Layer

- HTTP controllers, middleware, request validation, response formatting, ViewModels.
- GUI components, state management (for frontend apps).
- Depends on application layer (invokes use cases, maps DTOs to ViewModels).

### Independence Properties

- **Framework independence**: the domain does not import or depend on any framework. Swapping Express for Fastify changes only the presentation layer.
- **Database independence**: the domain does not know about PostgreSQL, MongoDB, or any specific database. Swapping databases changes only infrastructure adapters.
- **UI independence**: the domain and use cases are unchanged whether the UI is a web SPA, mobile app, CLI, or API.
- **External agency independence**: the domain has no knowledge of payment gateways, email providers, or message brokers. These are swappable adapters.

---

## Dependency Injection

### Inversion of Control

The principle: objects do not create their dependencies; they declare what they need and receive it from outside. This is the mechanism that makes Clean Architecture and SOLID possible.

### Constructor Injection

The preferred form. Dependencies are passed through the constructor and stored as private fields. This makes dependencies explicit, immutable, and testable.

```
class PlaceOrderUseCase {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly eventBus: DomainEventBus,
  ) {}

  async execute(input: PlaceOrderInput): Promise<PlaceOrderOutput> {
    // ...
  }
}
```

- Never use service locators (`container.get()`) inside domain or application code.
- Never use ambient contexts, static holders, or global singletons for dependencies.

### DI Containers

- The DI container is wired in the outermost layer (composition root), typically in `main.ts` or `server.ts`.
- The container registers interfaces (ports) against concrete implementations (adapters). Example: `container.bind<OrderRepository>('OrderRepository').to(PostgresOrderRepository)`.
- The container resolves the object graph at startup. Domain and application code never reference the container.
- Container-agnostic code: prefer manual wiring or lightweight libraries (`tsyringe`, `inversify`, `awilix`) over framework-coupled containers.

### Decoupling for Testability

- Constructor injection makes unit testing trivial: pass mocks, stubs, or fakes in tests.
- Use cases can be tested with in-memory repository implementations — no database, no HTTP server, no Docker.
- Integration tests wire real adapters; unit tests wire mocks or in-memory doubles.
- Every port (interface) should have at least two implementations: the production adapter and a test double.
