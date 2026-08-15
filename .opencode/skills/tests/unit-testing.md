---
name: "@octs/unit-testing"
description: "Write high-quality, fast, maintainable unit tests"
depends_on: ["@octs/project-awareness"]
tools: ["Vitest", "Jest", "fast-check"]
---

# @octs/unit-testing

## Objective

Write high-quality, fast, and maintainable unit tests that verify individual units of code (functions, classes, hooks, utilities) in complete isolation from external dependencies. Unit tests must be deterministic, run in milliseconds, and provide confidence that business logic is correct.

### Guardrail 1 — Always Consider the Existing Project
Before any code generation, ALWAYS: analyze existing architecture, identify project conventions, reuse existing components/hooks/helpers/services/utilities/types/DTOs/patterns, respect naming conventions/ESLint/Prettier/Git conventions/folder structure/dependencies. Never reinvent what exists. Always prefer coherence over novelty.

### Guardrail 2 — Mandatory Verification Before Declaring Done
Never say "Done"/"Finished" without verifying: code compiles, imports valid (no dead imports), TypeScript types valid, tests pass, lint passes, no errors, files coherent, components exist, paths correct, dependencies exist, changes compatible with architecture. If verification impossible: state Verified / Verifiable but not executed / Not verifiable in current context.

## Dependencies

- `@octs/project-awareness` — required to understand the existing project stack, test framework already in use, test file conventions, and module structure before writing any test.

---

## Testing Framework Selection

### Vitest (default for new projects)
- **Faster** than Jest: native ESM, Vite-based transform, HMR for tests
- Compatible with Jest API (`describe`, `it`, `expect`, `vi`)
- Built-in TypeScript support, no extra config
- Use when: new project, Vite-based, or team prefers speed
- Configuration: `vitest.config.ts`

### Jest (legacy / existing projects)
- Mature ecosystem, massive plugin library
- Use when: existing project already on Jest, CRA-based projects, or Jest-specific plugins are required
- Configuration: `jest.config.ts` or `jest.config.js`

### fast-check (property-based testing)
- Generate random inputs to verify invariants hold across all input space
- Use for: parsers, serializers, math functions, sorting algorithms, encoding/decoding, algebraic properties
- Complements example-based tests; does not replace them
- Features: automatic shrinking (finds minimal failing input), replay (seed-based reproduction)

---

## Test Structure: AAA Pattern

Every unit test must follow **Arrange → Act → Assert**:

```
it("should [behavior] when [condition]", () => {
  // Arrange: set up test data, mocks, preconditions
  const input = { name: "Alice", age: 30 };

  // Act: execute exactly one action / function call
  const result = validateUser(input);

  // Assert: verify one logical assertion (may have multiple expects)
  expect(result).toBe(true);
});
```

### Naming Convention
- Format: `should [expected behavior] when [specific condition]`
- Examples: `should return false when email is missing`, `should throw ValidationError when age is negative`, `should format date as ISO string when input is valid Date`
- Each test tests **ONE** thing. If a test has multiple unrelated assertions, split it.

---

## Mocking Strategy

### Core Rules
1. **Mock only external dependencies**: APIs, databases, filesystem, third-party services, network calls
2. **Never mock your own code**: mock at the boundary, not the internals
3. **Prefer stubs over mocks**: stubs provide canned answers; mocks assert on interactions (use mocks only when verifying that a side effect occurred)
4. **Use the framework's native mocking**: `vi.mock()` / `vi.fn()` in Vitest, `jest.mock()` / `jest.fn()` in Jest

### Mock Lifecycle

```
beforeEach(() => {
  vi.clearAllMocks();  // reset call counts between tests
});

afterEach(() => {
  vi.restoreAllMocks();  // restore original implementations
});
```

### Mocking Examples

```typescript
// Vitest: mock an entire module
vi.mock("@/services/api", () => ({
  fetchUser: vi.fn().mockResolvedValue({ id: 1, name: "Alice" }),
}));

// Vitest: spy on a specific method
const spy = vi.spyOn(Date, "now").mockReturnValue(1700000000000);

// Vitest: manual function mock
const mockCallback = vi.fn();
mockCallback.mockReturnValueOnce("first").mockReturnValueOnce("second");
```

### What NOT to Mock
- Pure utility functions you own
- DTOs, types, interfaces
- Framework internals (React hooks, Vue composables — use `renderHook` or `mount` instead)

---

## What to Test

### MUST Test (in priority order)
1. **Business logic** (MOST important): domain rules, calculations, transformations, pricing, validation rules, state transitions
2. **Validation functions**: input validation, schema validation, sanitization
3. **Utility functions**: formatters, parsers, serializers, math helpers, date helpers
4. **Custom hooks** (React): use `renderHook` from `@testing-library/react`, test state changes and side effects
5. **Error paths**: invalid input must throw correct errors, edge cases must be handled gracefully
6. **Boundary conditions**: `null`, `undefined`, empty string `""`, empty array `[]`, zero `0`, negative numbers, max values, very long strings

### DO NOT Test
- **Framework internals**: React re-renders, Vue reactivity system, Angular DI — these are framework-tested
- **Third-party libraries**: `lodash`, `axios`, `moment`, `zod` — they have their own test suites. Mock them, don't test them.
- **Trivial code**: getters, setters, simple one-line pass-through functions
- **Implementation details**: test behavior (inputs → outputs), not internal state or private methods. If you refactor internals, tests should still pass.

---

## Edge Cases Checklist

For every function under test, consider:
- **Empty inputs**: `""`, `[]`, `{}`, no arguments
- **Null/undefined**: single param, nested prop, array element
- **Boundary values**: `Number.MIN_VALUE`, `Number.MAX_VALUE`, `Number.MIN_SAFE_INTEGER`, `Number.MAX_SAFE_INTEGER`, `0`, `-0`, `NaN`, `Infinity`, `-Infinity`
- **Concurrent modifications**: if the function manages state, test overlapping calls
- **Async errors**: promise rejections, timeout, network failure
- **Large inputs**: very long strings, deep objects, large arrays
- **Special characters**: Unicode, emoji, SQL/HTML injection strings, zero-width characters
- **Date/time**: leap years, DST transitions, timezone edge cases, year 2038

---

## Snapshots

### When to Use
- **Stable, small output**: error messages, serialized data, small configuration objects, formatted strings
- **Inline snapshots** (`toMatchInlineSnapshot()`) for small outputs — visible in test file, easier to review

### When NOT to Use
- Large API responses (dozens of keys)
- Complex nested objects whose shape changes frequently
- Anything where the snapshot diff won't clearly show what changed
- Component rendering output (use visual regression testing instead)

### Best Practices
- Review snapshot changes in PRs as carefully as code changes
- Update snapshots intentionally (not blindly with `--update`)
- If a snapshot is huge, the test is too broad — narrow the assertion
- Prefer explicit assertions over snapshots when possible

---

## Property-Based Testing with fast-check

### When to Use
- Roundtrip encode/decode: `decode(encode(x)) === x`
- Algebraic properties: commutativity (`a + b === b + a`), associativity, idempotence (`f(f(x)) === f(x)`)
- Parsers: `parse(serialize(x)) === x`
- Sorting: sorting twice gives same result, sorted output has non-decreasing elements
- Serialization: JSON.parse(JSON.stringify(x)) deep equals x (with caveats)

### Defining Properties

```typescript
import fc from "fast-check";

it("should roundtrip encode/decode for all valid inputs", () => {
  fc.assert(
    fc.property(fc.string(), fc.integer(), (name, age) => {
      const encoded = encodeUser({ name, age });
      const decoded = decodeUser(encoded);
      expect(decoded).toEqual({ name, age });
    })
  );
});
```

### Built-in Generators
- `fc.integer()`, `fc.float()`, `fc.double()`
- `fc.string()`, `fc.unicodeString()`, `fc.hexaString()`
- `fc.boolean()`, `fc.constant(value)`, `fc.constantFrom(a, b, c)`
- `fc.array(fc.integer())`, `fc.set(fc.string())`
- `fc.record({ name: fc.string(), age: fc.integer() })` — objects
- `fc.oneof(gen1, gen2)` — union types
- `fc.date()`, `fc.uuid()`, `fc.emailAddress()`

### Custom Generators
```typescript
const positiveInteger = fc.integer({ min: 1 });
const nonEmptyString = fc.string({ minLength: 1 });
const emailGen = fc.stringMatching(/^[a-z]+@[a-z]+\.[a-z]{2,}$/);
```

### Shrinking
fast-check automatically shrinks failing inputs to find the minimal reproduction. Given a complex failing input (e.g., `"Hello World! 12345"`), it shrinks to `"0"` or `""` — the simplest input that still fails.

---

## Coverage Targets

### Mandatory: 100%
- Authentication / authorization logic
- Security-related code (input validation, sanitization, rate limiting)
- Critical business logic (domain rules, calculations, pricing, billing, payments, tax)
- Financial calculations
- Data transformation pipelines

### Global Targets (guidelines, not absolutes)
- **Branches**: ≥ 80%
- **Functions**: ≥ 90%
- **Lines**: ≥ 85%

### Anti-Patterns
- Do NOT write tests solely to meet coverage metrics
- Never write a test without assertions (false confidence)
- A passing test that doesn't verify behavior is worse than no test
- Prefer fewer high-quality tests over many low-quality ones
