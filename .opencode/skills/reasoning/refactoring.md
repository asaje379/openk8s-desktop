---
name: "@octs/refactoring"
description: "Improve code quality without changing external behavior"
depends_on: ["@octs/project-awareness"]
tools: ["read", "glob", "grep", "bash"]
---

# @octs/refactoring

## Objective

Improve the internal structure of code without altering its external behavior. Refactoring reduces technical debt, improves readability, and makes future changes safer and faster — all while preserving the existing contract.

## Dependencies

- `@octs/project-awareness`: must be loaded first to understand the project structure, conventions, existing components, patterns, and dependencies.

## Universal Guardrails

1. **Analyze existing project context before any code generation.** Understand architecture, conventions, existing components, patterns, and dependencies. Never reinvent what already exists. Always prefer coherence over novelty. Use `read`, `glob`, and `grep` to explore the codebase before writing anything.

2. **Never declare work as "done" or "finished" without having verified:** compilation, valid imports, TypeScript types, tests passing, lint passing, no errors, file consistency, component existence, correct paths, existing dependencies, architectural compatibility. If verification cannot be performed, explicitly state: `Verified` / `Verifiable but not executed` / `Not verifiable in current context`.

## Core Principles

Every refactoring decision must be grounded in these principles. When principles conflict, prefer the one listed first (SOLID > DRY > KISS > YAGNI > AHA).

### SOLID

- **Single Responsibility Principle (SRP):** A module, class, or function should have exactly one reason to change. If a component handles business logic, persistence, and validation, split it.
- **Open/Closed Principle (OCP):** Software entities should be open for extension but closed for modification. Add new behavior by extending, not by modifying existing working code.
- **Liskov Substitution Principle (LSP):** Subtypes must be substitutable for their base types without breaking correctness. If a subclass throws `NotImplementedException`, the hierarchy is wrong.
- **Interface Segregation Principle (ISP):** No client should be forced to depend on methods it does not use. Split fat interfaces into smaller, focused ones.
- **Dependency Inversion Principle (DIP):** High-level modules should not depend on low-level modules. Both should depend on abstractions. Abstractions should not depend on details; details should depend on abstractions.

### DRY — Don't Repeat Yourself

- Factor out duplication: identical code blocks, repeated logic patterns, duplicated knowledge.
- **Avoid accidental coupling.** Don't de-duplicate two pieces of code that happen to look similar today but serve different purposes and may evolve differently. Look for "same reason to change," not just "same shape."
- Prefer composition over inheritance for shared behavior.
- Create shared utilities, hooks, or base classes only when at least three concrete use cases exist.

### KISS — Keep It Simple, Stupid

- Simplicity first. The simplest solution that meets the requirements is the best one.
- Avoid over-engineering: no patterns for patterns' sake, no future-proofing for hypothetical needs.
- Favor plain functions over classes when state is not needed.
- Favor standard language features over clever tricks.
- If you need a diagram to explain it, it's probably too complex.

### YAGNI — You Ain't Gonna Need It

- Don't code what's not needed now.
- Don't add parameters, configuration options, or extension points "just in case."
- Don't build abstractions for a single concrete implementation.
- Don't optimize prematurely. Make it correct first, then fast if measurements prove it's necessary.
- Stripping away unnecessary code is itself a valuable refactoring.

### AHA — Avoid Hasty Abstractions

- Don't abstract too early. Wait for at least two or ideally three concrete examples before extracting an abstraction.
- A premature abstraction is worse than duplication because it locks in a potentially wrong design.
- When abstracting, prefer duplication over the wrong abstraction. It's easier to factor later than to un-factor.
- Let patterns emerge from concrete usage before formalizing them.

## Mandatory Process

### Step 1 — Identify code to improve

Scan the codebase for refactoring opportunities. Look for:

- **Duplication:** identical or near-identical code in multiple places.
- **Complexity:** long functions (>30 lines), deep nesting (>3 levels), high cyclomatic complexity.
- **Bad separation:** a component with too many responsibilities, mixed concerns (UI + business logic + data access).
- **Poor naming:** names that are misleading, vague (`data`, `info`, `handle`, `process`), or inconsistent.
- **Dead code:** unreachable code, unused imports, commented-out blocks, functions never called.
- **Tight coupling:** code that knows too much about another module's internals.
- **Feature envy:** a method that uses more features of another class than its own.
- **Primitive obsession:** using primitives (strings, numbers) instead of domain types.

### Step 2 — Ensure tests exist

- **If tests exist:** Run them. Confirm they all pass before touching any code.
- **If tests are missing or insufficient:** Add characterization tests first. These tests capture the current behavior — not the desired behavior — and serve as a safety net.
- Characterization tests should cover: happy path, edge cases, error conditions, boundary values.
- **Never refactor without a safety net.** If tests cannot be added (e.g., untestable legacy code), explicitly acknowledge the risk and proceed with extreme caution, documenting every change.

### Step 3 — Apply refactoring incrementally

- **Work in small steps.** Each step should be a single, reversible transformation.
- **One refactoring at a time.** Don't rename variables while also extracting functions while also changing the control flow.
- **Suggested order:** rename → extract function → simplify conditionals → remove duplication → reorganize module structure.
- After each step, verify tests pass (see Step 4).
- Commit or checkpoint after each successful step if using version control.

### Step 4 — Verify tests pass after each step

- Run the full test suite (or at minimum the tests covering the refactored code).
- If a test fails, undo the last step and understand why before retrying.
- If characterization tests need to be updated because the behavior was intentionally changed, stop — that is not refactoring. Separate behavior changes from structural changes.

### Step 5 — Document architectural changes if necessary

- If the refactoring changed module boundaries, added new abstractions, or altered the public API surface, document these changes.
- Update any architecture decision records (ADRs) affected by the refactoring.
- If the change affects other teams or consumers, communicate the rationale and any migration notes.

## Common Refactoring Techniques

| Technique | When to Use | Example |
|-----------|-------------|---------|
| **Extract Function** | A code block can be grouped and named | Inline validation logic → `validateEmail(email)` |
| **Inline Function** | A function body is as clear as its name | `getPi()` → just use `Math.PI` |
| **Extract Variable** | A complex expression needs explanation | `a * b + c / d` → `const totalPrice = ...` |
| **Rename Variable/Function** | A name is misleading or vague | `d` → `daysSinceLastLogin` |
| **Introduce Parameter Object** | A function has too many parameters | `fn(a, b, c, d)` → `fn(params: AuthParams)` |
| **Replace Conditional with Polymorphism** | Type-based switch/if-else chains | `switch(type)` → strategy pattern |
| **Decompose Conditional** | Complex boolean conditions | `if (a && b && !c \|\| d)` → well-named intermediate booleans |
| **Replace Magic Number with Symbolic Constant** | Unexplained literal values | `86400` → `SECONDS_PER_DAY` |
| **Split Loop** | A loop does multiple unrelated things | One loop for filtering, one for mapping |
| **Replace Nested Conditional with Guard Clauses** | Deeply nested if/else | Early returns for edge cases |

## Constraint

**NEVER modify external behavior during refactoring.** The observable behavior, API contract, input/output signatures, and side effects must remain identical before and after the refactoring. If a behavior change is needed, it must be done in a separate, explicit step — before or after the refactoring, never interleaved.

To enforce this:
- Before starting, identify and document the external contract (public method signatures, API responses, event payloads, file formats).
- After refactoring, verify the contract is unchanged.
- If a test needs to change for any reason other than "the test was testing internal implementation details," the behavior has changed and the refactoring constraint is violated.

## Output Format

```markdown
## Refactoring Plan: <target>

### Current State
- Files affected: ...
- Issues identified: (duplication, complexity, bad separation, poor naming, dead code, tight coupling)
- Test coverage: (existing tests, gaps identified)

### Safety Net
- Existing tests: (count, status)
- Characterization tests added: (count, locations)
- Risk assessment: Low / Medium / High (justify if Medium or High)

### Refactoring Steps

| Step | Technique | Target | Description | Verification |
|------|-----------|--------|-------------|--------------|
| 1    | ...       | ...    | ...         | Tests pass ☐ |
| 2    | ...       | ...    | ...         | Tests pass ☐ |

### Architecture Changes (if any)
- (new abstractions, moved boundaries, updated ADRs)

### Final Verification
- Tests: ☐ passed / ☐ not run
- Lint: ☐ passed / ☐ not run
- Build: ☐ passed / ☐ not run
- Type check: ☐ passed / ☐ not run
- Contract preserved: ☐ confirmed / ☐ not checked

Status: ⬜ Not started / 🔄 In progress / ✅ Done
```
