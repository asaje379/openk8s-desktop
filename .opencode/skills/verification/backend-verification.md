---
name: "@octs/backend-verification"
description: "Validate backend changes are production-ready before declaring work complete"
depends_on: ["@octs/project-awareness"]
tools: ["Supertest", "Testcontainers", "Docker"]
---

# @octs/backend-verification

## Objective
Validate backend changes are production-ready before declaring work complete.

## Dependencies
Before any verification:
- Load project context via `@octs/project-awareness`
- Read docs/index.md, docs/conventions.md, docs/architecture.md if needed
- Identify backend stack and available tools

## Universal Guardrails

### Guardrail 1 — Always Consider the Existing Project
Before any code generation, ALWAYS:
- Analyze existing architecture
- Identify project conventions
- Reuse existing components, hooks, helpers, services, utilities, types, DTOs
- Reuse existing patterns
- Respect naming conventions, design system, ESLint/Biome/Prettier rules, Git conventions, folder structure, existing dependencies
Never reinvent something that already exists. Always prefer coherence over novelty.

### Guardrail 2 — Mandatory Verification Before Declaring Done
Never announce "Done", "Finished", or "Terminé" without verifying:
- Code compiles
- Imports are valid (no dead imports)
- TypeScript types are valid
- Available tests pass
- Lint passes
- No errors reported
- Generated files are coherent
- Referenced components/hooks/imports actually exist
- Paths are correct
- Dependencies exist
- Changes are compatible with the architecture
If a verification cannot be performed, explicitly state: Verified / Verifiable but not executed / Not verifiable in current context.
Never claim to have verified something that cannot be verified.

## Trigger Conditions
This skill activates after: creating/modifying REST/GraphQL APIs, business services, DB schema, workers, queues, auth, bug fixes, business logic changes.

Aucune tâche backend ne doit être considérée comme terminée sans validation.

## Fundamental Principle
Never announce "Terminé", "Fini", "Done", "Production ready" without running available validations. Always distinguish: Verified / Not verified / Impossible to verify in this context.

## Phase 1 — Understanding the Change
Identify: functionality, impacted domain, modified services, manipulated data, external dependencies, possible impacts.
Analyze: nominal case, error cases, edge cases, load behavior, failure behavior.

## Phase 2 — Architecture Verification
Verify: existing architecture, separation of concerns, project conventions, used patterns, SOLID principles.
- API Layer: lightweight controllers, input validation, data transformation, proper error handling.
- Business Layer: isolated business logic, no business logic in controllers, properly split services, explicit dependencies.
- Data Layer: isolated database access, coherent repositories, optimized queries, proper transactions.

## Phase 3 — API Validation
### REST
HTTP method correctness (GET, POST, PUT, PATCH, DELETE as appropriate), status codes, API versioning, pagination, filters, validation, response format, OpenAPI documentation.
### GraphQL
Coherent schema, correctly defined types, optimized resolvers, no N+1 queries, DataLoader if needed, correct pagination, depth and complexity limits, error handling.

## Phase 4 — Security Validation
- Authentication: JWT, refresh tokens, expiration, rotation, secure storage.
- Authorization: RBAC, ABAC, permissions, resource access, tenant isolation if applicable.
- Input Validation: user payload, URL params, query params, file uploads. Schema validation, sanitization, size limits.
- OWASP Top 10: SQL injection, NoSQL injection, XSS, CSRF, SSRF, information leakage, secrets exposure, broken access control.

## Phase 5 — Database Validation
- Schema: correct migrations, possible rollback, backward compatibility.
- Performance: N+1 queries, missing indexes, unnecessary scans, expensive queries.
- Data: constraints, relationships, integrity, transactions, concurrency.

## Phase 6 — Resilience Validation
For distributed systems:
- External APIs: timeout, retry, exponential backoff, circuit breaker.
- Messages/Queues: idempotence, retry, dead letter queue, error handling, ack/nack.
- Workers: graceful stop, error recovery, no duplication.

## Phase 7 — Tests
Run when available:
- Unit tests: business logic, complex rules, edge cases, expected errors. AAA pattern (Arrange, Act, Assert).
- Integration tests: API, database, cache, queues, external services. Use Testcontainers, Docker, isolated databases if available.
- E2E tests: complete user journeys, authentication, authorization, critical workflows.

## Phase 8 — Observability
- Logs: structured logs, correlation ID, error context, appropriate level.
- Monitoring: health check, readiness, liveness, important metrics.
- Errors: explicit business errors, masked technical errors, no sensitive stack traces in production.

## Phase 9 — Performance Verification
When relevant: response time, memory consumption, unnecessary calls, slow queries. Verify cache, pagination, result limits, compression.

## Phase 10 — Documentation Verification
After significant changes, update if needed: docs/index.md, docs/conventions.md, docs/architecture.md, docs/decisions.md, OpenAPI, GraphQL schema, README, technical docs.

## Mandatory Report
Before declaring done, produce:

```
## Validation Backend

### Changes Verified
-

### Architecture
-

### API
- REST :
- GraphQL :

### Security
-

### Database
-

### Tests Executed
- Unitaires :
- Intégration :
- E2E :

### Observability
-

### Problems Detected
-

### Conclusion
Validé / Non validé
```

## Final Rule
A backend task is complete only if:
1. Project context was loaded.
2. Existing architecture was respected.
3. Available validations were executed.
4. Tests pass.
5. Security impacts were analyzed.
6. Regression risks were verified.
7. Remaining limitations are explicitly documented.

The agent must act as a backend engineer responsible for a production system, not an automatic code generator.
