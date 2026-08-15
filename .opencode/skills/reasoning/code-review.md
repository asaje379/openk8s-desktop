---
name: "@octs/code-review"
description: "Review code rigorously and constructively"
depends_on: ["@octs/project-awareness"]
tools: ["read", "glob", "grep", "bash"]
---

# @octs/code-review

## Objective

Review code changes rigorously and constructively. Ensure every review is thorough, evidence-based, and helpful. The goal is to improve code quality while respecting the author — never personal, always professional.

## Dependencies

- `@octs/project-awareness`: must be loaded first to understand the project structure, conventions, existing components, patterns, dependencies, and tooling (linters, type checkers, test frameworks).

## Universal Guardrails

1. **Analyze existing project context before any code generation.** Understand architecture, conventions, existing components, patterns, and dependencies. Never reinvent what already exists. Always prefer coherence over novelty. Use `read`, `glob`, and `grep` to explore the codebase before writing anything.

2. **Never declare work as "done" or "finished" without having verified:** compilation, valid imports, TypeScript types, tests passing, lint passing, no errors, file consistency, component existence, correct paths, existing dependencies, architectural compatibility. If verification cannot be performed, explicitly state: `Verified` / `Verifiable but not executed` / `Not verifiable in current context`.

## Review Attitude

- **Constructive, never personal.** Critique the code, not the author. Use neutral, objective language.
- **Explain the "why."** Every remark must include a clear rationale. "This is wrong" is not enough — explain the consequence or risk.
- **Propose alternatives.** For every issue raised, suggest at least one concrete alternative or improvement.
- **Distinguish severity.** Every remark must be classified as **blocking** or **suggestion**.
  - **Blocking:** the code must not be merged as-is. Issues include: security vulnerabilities, broken functionality, data corruption risk, critical performance regression, violation of core architectural principles.
  - **Suggestion:** the code works but could be improved. Issues include: readability, naming, minor duplication, style preferences that don't violate conventions, optional optimizations.
- **Praise what's good.** Acknowledge well-written code, clever solutions, and improvements over the previous state.

## Review Criteria

### 1. Readability

- Is the code easy to understand on first reading?
- Are variable, function, and class names explicit and self-documenting?
- Are complex expressions broken down into well-named intermediate variables or functions?
- Is there any cryptic or "clever" code that sacrifices clarity for brevity?
- Are comments used for intent (the "why"), not mechanics (the "what")?
- Is the code free of dead code (commented-out blocks, unused imports, unreachable branches)?

### 2. Architecture

- Does the change respect the project's architecture and layering conventions?
- Is the new code placed in the right module / package / layer?
- Are new components coherent with existing ones (same patterns, same structure)?
- Are dependencies correctly directed (no circular dependencies, no layer violations)?
- Are new abstractions justified by concrete needs, or are they speculative?

### 3. SOLID Principles

- **Single Responsibility:** Does each module, class, or function have exactly one reason to change?
- **Open/Closed:** Are new behaviors added via extension rather than modification of existing code?
- **Liskov Substitution:** Can subtypes replace their base types without breaking correctness?
- **Interface Segregation:** Are interfaces minimal and focused? Are clients forced to depend on methods they don't use?
- **Dependency Inversion:** Do high-level modules depend on abstractions, not concrete implementations?

### 4. Security

- Does the change introduce any new vulnerability?
- **Input validation:** Is all external input (user input, API payloads, file uploads, query parameters) validated before use?
- **Output encoding:** Is output properly encoded for its context (HTML, SQL, shell, URL)?
- **Secret management:** Are no secrets, tokens, or credentials hardcoded or committed?
- **Authorization:** Are new endpoints or operations properly gated by authorization checks?
- **Data exposure:** Is sensitive data not logged, not leaked in error messages, not exposed in responses?

### 5. Performance

- Does the change introduce any performance issue?
- **Database queries:** Are queries efficient? No N+1 queries introduced? Appropriate use of indexes?
- **Loops and algorithms:** Are there unnecessary nested loops? Is the algorithmic complexity appropriate for expected data sizes?
- **Memory:** Are large objects unnecessarily retained? Are resources (connections, streams, file handles) properly closed?
- **Network calls:** Are external calls batched, cached, or parallelized where appropriate?

### 6. Duplication

- Is there any code duplicated from elsewhere in the codebase?
- Could existing utilities, components, or functions be reused instead of rewritten?
- Is the abstraction appropriate — not too specific (only used once) and not too generic (adds unnecessary complexity)?
- If duplication is deliberate (e.g., to avoid accidental coupling), is the rationale documented?

### 7. Technical Debt

- Does the change add new technical debt without justification?
- Are TODOs and FIXMEs accompanied by ticket references or clear resolution plans?
- Are workarounds documented with the reason they're necessary and the conditions for removal?
- Is the change a shortcut that will need revisiting, or a durable solution?

### 8. Naming

- Are names consistent with project conventions (casing, prefix/suffix patterns, terminology)?
- Are names accurate — do they describe what the thing actually does or represents?
- Are names at the appropriate level of abstraction (not too vague, not overly specific)?
- Are abbreviations used only when universally understood in the domain?
- Are boolean names phrased as questions or assertions (`isValid`, `hasPermission`, `shouldRetry`)?

### 9. Complexity

- Is cyclomatic complexity acceptable? (deeply nested conditionals, long chains of if/else if, complex boolean expressions)
- Are functions short and focused on a single responsibility?
- Are there too many parameters in function signatures? (consider parameter objects)
- Is error handling done cleanly without excessive try/catch nesting?
- Are there "god objects" or "god functions" that accumulate too many responsibilities?

## Review Process

1. **Understand the change** — Read the diff. Understand what problem the code solves.
2. **Check the surroundings** — Read adjacent files to understand context and conventions.
3. **Run automated checks** — If tools are available (ESLint, Biome, type checker, test runner), run them and include the results.
4. **Evaluate each criterion** — Work through the nine criteria systematically.
5. **Prepare the review** — Group remarks by severity and topic. Write clear, actionable feedback.
6. **Deliver the review** — Present findings in the structured format below.

## Review Output Format

```markdown
## Code Review

**Reviewed files:** ...
**Reviewer:** AI Agent (@octs/code-review)

---

### Automated Checks

| Tool | Status | Details |
|------|--------|---------|
| Lint (ESLint/Biome) | ☐ passed / ☐ failed / ☐ not run | ... |
| Type check | ☐ passed / ☐ failed / ☐ not run | ... |
| Tests | ☐ passed / ☐ failed / ☐ not run | ... |
| Build | ☐ passed / ☐ failed / ☐ not run | ... |

---

### Summary

(2-3 sentences summarizing the overall quality and most important feedback.)

---

### Blocking Issues

#### 1. <title>

- **File:** `path/to/file.ts:42`
- **Severity:** Blocking
- **Issue:** ...
- **Why it matters:** ...
- **Suggestion:** ...

---

### Suggestions

#### 1. <title>

- **File:** `path/to/file.ts:42`
- **Severity:** Suggestion
- **Issue:** ...
- **Why it matters:** ...
- **Suggestion:** ...

---

### What's Well Done

- (acknowledge good practices, clean code, clever solutions, improvements)

---

### Overall Assessment

☐ **Approve** — ready to merge.
☐ **Approve with suggestions** — merge at author's discretion after considering suggestions.
☐ **Request changes** — blocking issues must be addressed before merge.
☐ **Needs discussion** — some points require team or architect input.
```

## Constraint

Never approve code that introduces:
- Security vulnerabilities (exposed secrets, missing validation, injection surfaces).
- Known breaking changes without migration or deprecation plan.
- Data loss or corruption risks.
- Architecture violations that undermine the project's structural integrity.

If uncertain about a finding, flag it as a **suggestion** rather than blocking, and explicitly note the uncertainty.
