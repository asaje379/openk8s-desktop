---
name: "@octs/rest-api"
description: "Design and implement robust, standards-compliant REST APIs"
depends_on: ["@octs/project-awareness"]
tools: ["REST clients", "OpenAPI/Swagger", "Supertest"]
---

# @octs/rest-api

## Objective

Design and implement REST APIs that are standards-compliant, predictable, well-documented, and production-ready. Every endpoint must follow established HTTP semantics, return proper status codes, and be fully documented with an OpenAPI specification.

## Dependencies

- `@octs/project-awareness` — analyze existing project architecture, conventions, and stack before generating any code.

---

## Universal Guardrails

1. **Context-first development.** Before any code generation, ALWAYS analyze existing project context: architecture, stack, conventions, existing components/services/helpers, patterns, dependencies. Never reinvent what exists. Always prefer coherence and reuse over novelty.

2. **Verify before declaring done.** NEVER declare work "done" or "finished" without verifying: compilation, valid imports (no dead imports), TypeScript types, tests passing, lint passing, no errors, file coherence, service existence, correct paths, dependency existence, architectural compatibility. If verification is impossible in the current context, EXPLICITLY state: `Verified` / `Verifiable but not executed` / `Not verifiable in current context`.

---

## REST Principles

### Resource-Oriented Design

- Use **nouns**, not verbs, in URL paths. Resources represent entities, not actions.
- URL structure: `/resource`, `/resource/{id}`, `/resource/{id}/sub-resource`.
- Sub-resources express relationships: `/users/{userId}/orders`, not `/orders?userId=X`.
- Collections are plural: `/users`, `/products`, `/orders`.
- Avoid deeply nested resources (max 2 levels deep). Use top-level endpoints for deeper relationships.

### HTTP Methods

| Method | Semantics | Idempotent | Safe |
|--------|-----------|------------|------|
| `GET` | Retrieve a resource or collection | Yes | Yes |
| `POST` | Create a new resource | No | No |
| `PUT` | Full replacement of a resource | Yes | No |
| `PATCH` | Partial update of a resource | No (not guaranteed) | No |
| `DELETE` | Remove a resource | Yes | No |
| `HEAD` | Retrieve metadata without body (same headers as GET) | Yes | Yes |
| `OPTIONS` | Discover allowed methods and CORS capabilities | Yes | Yes |

- `GET` must never change server state. No side effects.
- `POST` creates a resource and returns `201 Created` with a `Location` header.
- `PUT` requires the full resource representation. Missing fields are treated as removal.
- `PATCH` accepts partial representation. Only specified fields are updated.
- `DELETE` returns `204 No Content` on success (or `200` with the deleted resource body if preferred).
- Never use `GET` for state-changing operations (prevents CSRF, accidental triggers).

---

## Status Codes

### Success (2xx)

| Code | Usage |
|------|-------|
| `200 OK` | Request succeeded. Include response body. Default for GET, PUT, PATCH. |
| `201 Created` | Resource created. MUST include `Location` header with the new resource URL. |
| `204 No Content` | Success with no response body. Default for DELETE, sometimes POST. |

### Client Errors (4xx)

| Code | Usage |
|------|-------|
| `400 Bad Request` | Malformed request (invalid JSON syntax, missing required headers). |
| `401 Unauthorized` | Missing or invalid authentication credentials. Include `WWW-Authenticate` header. |
| `403 Forbidden` | Valid credentials but insufficient permissions to access the resource. |
| `404 Not Found` | Resource does not exist. Never reveal whether the resource or the parent is missing. |
| `409 Conflict` | Resource state conflict (duplicate, optimistic lock version mismatch). |
| `422 Unprocessable Entity` | Semantic validation failure. Prefer this over `400` for validation errors. |
| `429 Too Many Requests` | Rate limit exceeded. MUST include `Retry-After` header (seconds or HTTP-date). |

### Server Errors (5xx)

| Code | Usage |
|------|-------|
| `500 Internal Server Error` | Unexpected error. Log full details server-side. Client receives only generic message. |
| `502 Bad Gateway` | Upstream service failure. |
| `503 Service Unavailable` | Temporary overload or maintenance. Include `Retry-After` header. |
| `504 Gateway Timeout` | Upstream service timeout. |

---

## OpenAPI / Swagger

### Specification

- Use **OpenAPI 3.x** (latest stable: 3.1.x).
- Top-level structure: `openapi`, `info`, `servers`, `paths`, `components/schemas`.
- Every endpoint documented with: `parameters`, `requestBody`, `responses` (all possible status codes).
- Schema definitions (`components/schemas`) for **all** DTOs with `example` values.
- Security schemes defined under `components/securitySchemes`.

### Documentation Generation

- **Single source of truth**: either generate code from the spec or generate the spec from code. Never manually maintain both.
- Use `swagger-ui` or `scalar` for interactive API documentation.
- Expose spec at a known endpoint: `GET /api/docs` or `GET /api/openapi.json`.
- Include descriptions on every field, parameter, and operation. Descriptions appear in generated docs.

### OpenAPI Best Practices

- Use `$ref` to reuse schemas. Avoid duplication.
- Define common error response schemas (`ProblemDetails`, `ValidationError`) once and reference everywhere.
- Tag endpoints by resource/domain for logical grouping in the UI.
- Use `operationId` on each endpoint for code generation compatibility.

---

## Versioning

### Strategies

1. **URL path versioning** (preferred): `/v1/resource`, `/v2/resource`. Simplest, most visible, easy to route.
2. **Header versioning**: `Accept: application/vnd.api+v1+json`. Cleaner URLs, more flexible content negotiation.
3. **Query parameter versioning**: `?version=1`. Avoid this. Pollutes query parameters and is not RESTful.

### Deprecation

- Add `Deprecation: true` and `Sunset` headers to deprecated endpoints. The `Sunset` header contains the date (RFC 7231 HTTP-date format) when the version will be removed.
- Document deprecation in the OpenAPI spec: `deprecated: true` on operations.
- Provide a migration window (typically 3-6 months) before removing old versions.
- Log warnings when deprecated endpoints are called, including caller metadata if available.

---

## DTOs (Data Transfer Objects)

### Principles

- **Input DTOs** for request bodies and query parameters. Define validation rules here.
- **Output DTOs** for response bodies. Define serialization rules here.
- **NEVER expose database entities directly** to the client. This leaks internal schema, breaks encapsulation, and opens attack vectors.
- Transform data between layers: `controller ↔ DTO`, `service ↔ domain entity`.

### Definition

- Use validation decorators/annotations on input DTOs: `required`, `min`/`max`, `minLength`/`maxLength`, `pattern`, `enum`, `email`, `url`.
- Use serialization decorators/annotations on output DTOs: `exclude`, `expose`, `groups`, `transform`.
- Use `class-transformer` and `class-validator` in TypeScript/NestJS.
- Use Zod, Joi, or Yup in plain Node.js/Express applications.

### Naming

- Suffix input DTOs with `Request` or `Input`: `CreateUserRequest`, `UpdateUserInput`.
- Suffix output DTOs with `Response` or `Output`: `UserResponse`, `UserListOutput`.
- Keep DTOs in dedicated files under `src/dto/` or `src/modules/<name>/dto/`.

---

## Validation

### Input Validation

- Validate **all input at the API boundary** (controller/middleware layer). Never bypass validation.
- Schema validation using the framework's validation library.
- Return validation errors as an array: `[{ "field": "email", "message": "Must be a valid email address" }, ...]`.
- Sanitize strings: trim whitespace, escape HTML if stored/returned.
- Validate types strictly: a string `"123"` is not a number `123`.

### Business Logic Validation

- Validation that requires database lookups (uniqueness, referential integrity) belongs in the **service layer**, not in DTO validation.
- Use the Problem Details format (RFC 9457) for all error responses, including validation failures.

---

## Pagination

### Cursor-Based Pagination (preferred)

- Use for large or infinite datasets (feeds, activity logs, search results).
- The cursor is an **opaque**, base64-encoded string. Clients treat it as a black box.
- No skipping. Cursor points to a specific position in the ordered dataset.
- Requires stable, deterministic ordering (e.g., by `id` + secondary sort).
- Parameters: `cursor` (the cursor token), `limit` (page size, default 20, max 100).
- Response includes: `{ data: [...], pagination: { nextCursor, hasMore } }`.

### Offset-Based Pagination

- Simpler. Use for smaller, bounded datasets.
- Parameters: `page` (page number, 1-indexed) and `limit`/`size` (items per page).
- Response includes: `{ data: [...], pagination: { page, size, totalItems, totalPages } }`.

### Pagination Metadata

Always include pagination metadata in the response, distinct from the data array. Never mix pagination info into the data itself.

---

## Filtering and Sorting

### Filtering

- Query parameters on `GET` endpoints: `GET /resource?status=active&category=tech`.
- Use the field name as the filter key. Multiple values via comma: `?status=active,pending`.
- Range filters: `?createdAt:gte=2024-01-01&createdAt:lte=2024-12-31`.
- Advanced filters: `?filter[status]=active&filter[createdAt][gte]=2024-01-01`.

### Sorting

- Parameter: `sort`. Format: `GET /resource?sort=-createdAt` (descending by `-` prefix) or `GET /resource?sort=name:asc&sort=createdAt:desc`.
- Allow multiple sort fields in priority order.
- **Whitelist allowed filter and sort fields**. Never expose database column names directly to clients. Map API field names to internal columns in the service layer.

---

## Problem Details (RFC 9457)

### Standard Error Format

```json
{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Error",
  "status": 422,
  "detail": "The request body contains invalid fields.",
  "instance": "/api/v1/users",
  "errors": [
    { "field": "email", "message": "Must be a valid email address" },
    { "field": "age", "message": "Must be a positive integer" }
  ]
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | URI identifying the error type. Should resolve to human-readable documentation. |
| `title` | Yes | Short, human-readable summary of the problem. |
| `status` | Yes | HTTP status code. |
| `detail` | No | Human-readable explanation specific to this occurrence. |
| `instance` | No | URI identifying the specific occurrence (the request path is appropriate). |
| `errors` | No | Array of field-level errors for validation failures. |

- Every error response across the entire API uses this format. Consistency is critical.
- Never include stack traces, SQL queries, or internal paths in error responses to clients.

---

## Idempotence

### Idempotency-Key Pattern

- Clients include an `Idempotency-Key` header (UUID v4) on `POST` and `PATCH` requests.
- The server stores the `(key, response)` pair for 24 hours.
- If the same key is received again within the window, the server returns the **cached response** without re-executing the operation.
- After 24 hours, the key expires, and a new request with the same key executes normally.

### Implementation

- Use a database table or Redis with TTL for idempotency storage.
- Check the key **before** the operation. Store the response **after** the operation succeeds.
- Return `409 Conflict` if the same key is received but the previous request is still in progress.
- Critical for payment, order creation, and any financial operations.

---

## PUT vs PATCH Semantics

### PUT

- Replaces the **entire** resource. Missing fields in the request body are treated as `null` or removed.
- Client must send the **complete** representation.
- Idempotent: calling `PUT` multiple times with the same body produces the same result.
- Return `200 OK` with the updated resource, or `204 No Content`.

### PATCH

- Applies a **partial** update. Only the fields present in the request body are changed.
- Not guaranteed to be idempotent (e.g., append operations, increment operations).
- Use JSON Patch (RFC 6902) format for complex partial updates, or JSON Merge Patch (RFC 7396) for simple partial updates.
- Return `200 OK` with the updated resource.

---

## General Best Practices

- Use consistent response envelope: `{ data: ... }` for single resources, `{ data: [...], pagination: {...} }` for collections. Never vary the structure.
- Use proper `Content-Type` headers: `application/json` for JSON APIs. Reject requests with incorrect content types (return `415 Unsupported Media Type`).
- Sanitize and validate file uploads: type whitelist, size limit, content inspection, store outside the web root.
- Enable compression: `gzip`, `brotli`, or `deflate` for response payloads.
- Return `Cache-Control` headers appropriately: `private` for authenticated data, `public` with `max-age` for public resources, `no-store` for sensitive data.
- Log every request with: HTTP method, URL, status code, duration, correlation ID, client IP, user agent. Mask PII in logs.
