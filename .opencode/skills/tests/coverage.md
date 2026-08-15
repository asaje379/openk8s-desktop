---
name: "@octs/coverage"
description: "Achieve and maintain high test coverage on critical code paths"
depends_on: ["@octs/project-awareness"]
tools: ["Vitest", "Jest", "istanbul", "c8"]
---

# @octs/coverage

## Objective

Achieve and maintain meaningful test coverage that provides genuine confidence in code correctness. Coverage is a tool, not a goal — the objective is not to reach 100%, but to ensure that critical code paths are well-tested and that coverage metrics are used strategically to identify untested risk areas.

### Guardrail 1 — Always Consider the Existing Project
Before any code generation, ALWAYS: analyze existing architecture, identify project conventions, reuse existing components/hooks/helpers/services/utilities/types/DTOs/patterns, respect naming conventions/ESLint/Prettier/Git conventions/folder structure/dependencies. Never reinvent what exists. Always prefer coherence over novelty.

### Guardrail 2 — Mandatory Verification Before Declaring Done
Never say "Done"/"Finished" without verifying: code compiles, imports valid (no dead imports), TypeScript types valid, tests pass, lint passes, no errors, files coherent, components exist, paths correct, dependencies exist, changes compatible with architecture. If verification impossible: state Verified / Verifiable but not executed / Not verifiable in current context.

## Dependencies

- `@octs/project-awareness` — required to understand the existing test framework, coverage tooling already in use, CI pipeline, and module structure before configuring or interpreting coverage.

---

## Coverage Tooling

### Vitest (built-in coverage via c8 or istanbul)
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",  // "v8" (c8) or "istanbul"
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      thresholds: {
        branches: 80,
        functions: 90,
        lines: 85,
        statements: 85,
      },
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/**/__tests__/**",
        "src/types/**",
        "src/generated/**",
      ],
    },
  },
});
```

**c8 (V8)**: Faster, uses V8's built-in coverage, no source maps needed. Preferred for Node.js and Vitest.  
**istanbul**: More mature, supports source maps, wider tooling ecosystem. Use when c8 has edge cases with your code.

### Jest (built-in istanbul)
```json
{
  "jest": {
    "collectCoverage": true,
    "coverageDirectory": "coverage",
    "coverageReporters": ["text", "html", "lcov", "json-summary"],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 90,
        "lines": 85
      }
    },
    "collectCoverageFrom": [
      "src/**/*.{ts,tsx}",
      "!src/**/*.test.{ts,tsx}",
      "!src/**/*.spec.{ts,tsx}",
      "!src/types/**",
      "!src/generated/**"
    ]
  }
}
```

---

## Coverage Targets

### Global Guidelines (not absolutes)
| Metric | Target | Notes |
|--------|--------|-------|
| **Branches** | ≥ 80% | Both sides of every if/else, switch case, ternary, logical operator |
| **Functions** | ≥ 90% | Every function declaration and expression |
| **Lines** | ≥ 85% | Every executable line of code |
| **Statements** | ≥ 85% | Every statement (similar to lines, counts semicolons) |

### Mandatory: 100% Coverage Required

These code paths **must** have 100% coverage. No exceptions.

#### Authentication
- Login (success, invalid credentials, locked account, expired password)
- Registration (valid, duplicate email, weak password, missing fields)
- Password reset (request, token validation, expiry, completion)
- Token management (generation, validation, refresh, revocation, expiry)
- Multi-factor authentication (setup, verification, backup codes, recovery)
- Session management (creation, validation, expiry, logout)

#### Security
- Authorization: role-based access control (RBAC), permission checks, policy enforcement
- Input validation: all user inputs sanitized, all edge cases handled
- Rate limiting: per-endpoint, per-user, global — verify headers and 429 responses
- CSRF protection: token generation, validation, rejection
- Data sanitization: XSS prevention, SQL injection prevention, path traversal prevention（non-SQL）
- Encryption: data encrypted at rest, decryption works, key rotation

#### Critical Business Logic
- Domain rules: invariants that must always hold
- Financial calculations: pricing, discounts, tax, currency conversion, rounding rules
- Billing: invoice generation, payment calculations, proration, credits
- Subscription state machines: trial → active → past_due → canceled → expired
- Workflow engines: state transitions, validation of transitions, side effects

#### Calculations
- Formulas: mathematical correctness across the full input range
- Conversions: unit conversion, timezone conversion, currency conversion
- Rounding: consistent rounding rules, banker's rounding, floor/ceil behavior
- Aggregations: sums, averages, percentiles — verify for zero items, one item, many items

#### Payment Processing
- Checkout flow: amount calculation, line items, discounts, shipping, tax
- Payment processing: authorize, capture, void, refund (partial and full)
- Webhooks: signature verification, event parsing, idempotency, retry on failure
- Subscription management: create, update, cancel, reactivate, trial periods
- Invoice: generation, PDF rendering, line item accuracy

---

## Coverage Types Explained

### Line Coverage
Percentage of executable lines executed during tests. Most basic metric. A line that is never hit during tests is uncovered.

```typescript
function greet(name: string): string {     // covered
  if (!name) {                             // covered
    return "Hello, stranger";              // UNCOVERED if no test passes empty name
  }
  return `Hello, ${name}`;                 // covered
}
```

### Branch Coverage (MOST valuable)
Both sides (true and false) of every branch point: if/else, switch/case, ternary (`? :`), logical operators (`&&`, `||`, `??`), optional chaining (`?.`).

```typescript
function canAccess(user: User): boolean {
  return user.role === "admin" || user.role === "moderator";
  //     ^-- branch 1             ^-- branch 2 (short-circuit)
}
```
Two branches — need tests for admin=true, admin=false+moderator=true, admin=false+moderator=false.

### Function Coverage
Percentage of functions called during tests. Catches functions that are never invoked — possibly dead code.

### Statement Coverage
Similar to line coverage but counts statements (semicolons). A single line with multiple statements counts each.

---

## What NOT to Obsess Over

### Acceptable Gaps in Coverage
- **Framework glue code**: routes that just wire controllers, providers that just register services
- **Trivial getters/setters**: `getName() { return this.name; }`
- **Configuration files**: `.config.ts`, constants, enums with no logic
- **Generated code**: OpenAPI clients, GraphQL types, Protobuf stubs
- **Type definitions**: `.d.ts` files, interfaces without logic
- **Visual/styling code**: CSS-in-JS, Tailwind class composition — covered by visual E2E tests
- **Logging statements**: `console.log`, `logger.info` — not safety-critical

### 100% Total Coverage is NOT the Goal
- Diminishing returns after ~85-90%
- The last 10% often requires artificially complex test setups
- Focus energy on branch coverage of critical paths, not line coverage of trivial code
- A 95% covered codebase with meaningful tests > a 100% covered codebase with `expect(true).toBe(true)`

---

## CI Integration

### Threshold Enforcement
CI must fail the build if coverage drops below thresholds:
```json
{
  "scripts": {
    "test:coverage": "vitest run --coverage",
    "test:ci": "vitest run --coverage && coverage-check"
  }
}
```

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        branches: 80,
        functions: 90,
        lines: 85,
      },
      // Watermarks for visual distinction
      watermarks: {
        branches: [70, 80],
        functions: [80, 90],
        lines: [75, 85],
      },
    },
  },
});
```

### Reports
- **Text** (terminal): quick summary in CI logs
- **HTML** (artifact): rich, interactive report uploaded as CI artifact
- **LCOV** (`lcov.info`): for integration with coverage tools (Coveralls, Codecov, SonarQube)
- **JSON summary** (`coverage-summary.json`): for programmatic processing

### PR Comments
Integrate with coverage services to post coverage changes on PRs:
```
Coverage report:
  Lines: 87.3% (+1.2%)
  Branches: 81.5% (-0.3%)
  Functions: 92.1% (no change)
```

### Badge
Display coverage percentage in README via shields.io + coverage service:
```
[![Coverage](https://img.shields.io/codecov/c/github/org/repo)](https://codecov.io/gh/org/repo)
```

---

## Per-Module Coverage Tracking

### Identify Low-Coverage Modules
Run coverage with detailed per-file report:
```bash
npx vitest run --coverage --reporter=verbose
```

### Prioritization Matrix
| Coverage | Risk | Action |
|----------|------|--------|
| < 60% | High | **Top priority** — write tests immediately |
| < 60% | Low | Skip — may be config, constants, generated code |
| 60-80% | High | Important — add tests for uncovered branches |
| 60-80% | Low | Low priority — add when convenient |
| 80-100% | High | Maintain — ensure coverage doesn't regress |
| 80-100% | Low | Monitor — already sufficient |

### Risk Assessment
- **High risk**: authentication, authorization, payments, billing, data integrity, PII handling, core domain logic
- **Medium risk**: API endpoints, data transformations, caching, search
- **Low risk**: configuration, constants, logging, generated code, utility wrappers around third-party libraries

---

## Quality Over Quantity

### Anti-Patterns to Avoid

#### No Assertions (false confidence)
```typescript
// BAD — test always passes, provides false confidence
it("should process payment", () => {
  processPayment({ amount: 100 });
  // no assertion!
});

// GOOD
it("should return success when payment is valid", async () => {
  const result = await processPayment({ amount: 100 });
  expect(result.status).toBe("succeeded");
  expect(result.transactionId).toBeDefined();
});
```

#### Test That Never Fails (useless test)
```typescript
// BAD — this will never fail
it("should work", () => {
  expect(true).toBe(true);
});

// BAD — catches all errors, test always passes
it("should not throw", () => {
  expect(() => someFunction()).not.toThrow();
  // But what if it threw the WRONG error? What if it returned the wrong value?
});
```

#### Testing Implementation Details
```typescript
// BAD — tests internal state, breaks on refactor
it("should set isLoading to true", () => {
  const store = useStore();
  act(() => store.fetchUsers());
  expect(store.isLoading).toBe(true);  // internal state
});

// GOOD — tests behavior
it("should show spinner while loading users", () => {
  render(<UserList />);
  fireEvent.click(screen.getByText("Load"));
  expect(screen.getByRole("progressbar")).toBeInTheDocument();
});
```

### Mutation Testing
If available, use mutation testing to verify test quality. Stryker-mutator modifies source code and checks if tests catch the mutations. A mutation that doesn't fail any test reveals a gap in test quality.

```bash
npx stryker run
```

Mutations include: changing `>` to `>=`, removing a line, swapping `&&` for `||`, changing a constant. If tests still pass after these mutations, the tests are not thorough enough.

---

## Strategies for Improving Coverage

### 1. Start with Critical Paths
Identify the most important code paths (auth, payments, core business logic) and achieve 100% coverage there first. Don't waste time on low-risk, low-traffic code.

### 2. Add Tests When Fixing Bugs (Regression Tests)
Every bug fix must include a test that reproduces the bug and fails before the fix. This prevents regression, improves coverage, and ensures the fix is correct.

```typescript
// Before fix:
it("should handle empty cart checkout (regression test for #1234)", () => {
  expect(() => checkout({ items: [] })).toThrow("Cart is empty");
});
```

### 3. Add Tests Before Refactoring (Characterization Tests)
Before refactoring legacy code with no tests, write characterization tests that capture current behavior. These tests define what the code currently does — even if imperfect — so you can verify refactoring doesn't change behavior.

### 4. Prioritize Complex Logic Over Simple CRUD
A function with 20 branches is more important to cover than a controller that delegates everything to a service. Focus on cyclomatic complexity — the higher the complexity, the more value from coverage.

### 5. Remove Uncovered Dead Code
If code cannot be reached by any test and isn't critical infrastructure, consider removing it. Dead code is a maintenance burden and security risk.
