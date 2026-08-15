---
name: "@octs/architecture-review"
description: "Audit project or feature architecture systematically"
depends_on: ["@octs/project-awareness"]
tools: ["read", "glob", "grep"]
---

# @octs/architecture-review

## Objective

Conduct a comprehensive, systematic audit of a project or feature's architecture. Identify structural weaknesses, accumulated debt, and opportunities for improvement. Deliver an actionable report prioritized by severity and impact.

## Dependencies

- `@octs/project-awareness`: must be loaded first to understand the project structure, conventions, existing components, patterns, and dependencies.

## Universal Guardrails

1. **Analyze existing project context before any code generation.** Understand architecture, conventions, existing components, patterns, and dependencies. Never reinvent what already exists. Always prefer coherence over novelty. Use `read`, `glob`, and `grep` to explore the codebase before writing anything.

2. **Never declare work as "done" or "finished" without having verified:** compilation, valid imports, TypeScript types, tests passing, lint passing, no errors, file consistency, component existence, correct paths, existing dependencies, architectural compatibility. If verification cannot be performed, explicitly state: `Verified` / `Verifiable but not executed` / `Not verifiable in current context`.

## Scope Definition

Before beginning the audit, clarify the scope:

- **Full project audit** — review the entire codebase.
- **Feature/module audit** — review a specific feature, module, or bounded context.
- **Cross-cutting audit** — review a specific concern across the project (e.g., error handling, logging, auth).

## Audit Criteria

Evaluate each criterion on a severity scale: **Critical** / **High** / **Medium** / **Low** / **None**.

### 1. Coherence

- Are the same architectural patterns used consistently throughout the project?
- Are naming conventions uniform across modules?
- Are file organization structures consistent?
- Is there a single source of truth for shared concepts (types, utilities, configurations)?
- Are exceptions to patterns documented and justified, or are they accidental?
- Do new modules follow the same structure as existing ones?

### 2. Technical Debt

- Where is technical debt concentrated? (specific files, modules, or layers)
- How severe is the debt in each area? (hacky workarounds, missing tests, deprecated APIs, outdated dependencies)
- Is there documented debt (TODOs, FIXMEs, issue tracker) or hidden debt?
- How much debt is "strategic" (deliberate, with a plan) versus "accidental" (accumulated over time)?
- What is the estimated cost of not addressing each debt item?

### 3. Duplication

- **Code duplication** — identical or near-identical blocks of code across files.
- **Logic duplication** — the same business rule implemented in multiple places, possibly differently.
- **Responsibility duplication** — multiple components doing the same job, competing ownership.
- **Configuration duplication** — same values repeated across config files, environment variables, or constants.
- **Knowledge duplication** — the same implicit knowledge embedded in multiple places (e.g., "user IDs are always strings").

### 4. Performance

- **Bottlenecks** — identified or potential choke points (N+1 queries, synchronous blocking, large payloads).
- **Database queries** — missing indexes, inefficient joins, no pagination, no caching.
- **Memory consumption** — large object retention, memory leaks, unbounded caches, excessive allocations.
- **Network** — excessive or unnecessary API calls, missing batching, large payloads without compression.
- **Startup time** — slow initialization, synchronous heavy operations at boot.
- **Algorithmic efficiency** — inappropriate data structures or algorithms for the problem size.

### 5. Security

- **Data exposure** — sensitive data in logs, error messages, client-side code, or API responses.
- **Input validation** — missing or insufficient validation at trust boundaries.
- **Authentication/Authorization** — missing auth checks, overly permissive defaults, hardcoded credentials.
- **Secret management** — secrets in source code, config files, or environment variables without proper vaulting.
- **Dependency security** — outdated dependencies with known CVEs, unvetted third-party code.
- **Injection vectors** — SQL, NoSQL, command, template injection surfaces.
- **CSRF/XSS** — missing protections in web contexts.

### 6. Scalability

- Will the current architecture support projected growth (users, data volume, traffic)?
- **Fragility points** — what breaks first under load?
- **Horizontal scaling** — is the application designed for horizontal scaling, or does it assume a single instance?
- **State management** — is state handled in a way that supports scaling (stateless services, shared-nothing)?
- **Database scalability** — can the data model handle 10x or 100x volume?
- **Coupling** — are there tight couplings that prevent independent scaling of components?

### 7. Maintainability

- **Ease of modification** — can a developer unfamiliar with the code make a change safely?
- **Testing** — is the test suite adequate (coverage, reliability, speed)? Are tests easy to write for new code?
- **Deployment** — is the deployment process simple, repeatable, and automatable?
- **Onboarding** — can a new developer understand the architecture within a reasonable time?
- **Documentation** — is architecture documented? Is documentation accurate and up to date?
- **Dependency management** — is the dependency graph clean and minimal, or bloated and tangled?

## Process

1. **Define scope** — clarify with the requester what will be audited.
2. **Explore the codebase** — use `read`, `glob`, and `grep` to traverse the project structure, key files, and patterns.
3. **Evaluate each criterion** — work through the seven criteria systematically.
4. **Gather evidence** — cite specific files, line numbers, and patterns for each finding.
5. **Prioritize findings** — rank by severity and impact.
6. **Produce the report** — deliver the structured report below.

## Deliverable: Architecture Audit Report

```markdown
## Architecture Audit Report

**Project/Scope:** ...
**Date:** ...
**Auditor:** AI Agent (@octs/architecture-review)

---

### Executive Summary

(2-3 sentences summarizing the overall health of the architecture and the most critical finding.)

---

### Strengths

- (what is working well? what patterns are effective?)
- ...

---

### Findings by Severity

#### Critical
| # | Finding | Location | Impact | Recommendation | 
|---|---------|----------|--------|----------------|
| 1 | ...     | ...      | ...    | ...            |

#### High
| # | Finding | Location | Impact | Recommendation |
|---|---------|----------|--------|----------------|
| ... | ...   | ...      | ...    | ...            |

#### Medium
| # | Finding | Location | Impact | Recommendation |
|---|---------|----------|--------|----------------|
| ... | ...   | ...      | ...    | ...            |

#### Low
| # | Finding | Location | Impact | Recommendation |
|---|---------|----------|--------|----------------|
| ... | ...   | ...      | ...    | ...            |

---

### Detailed Assessment by Criterion

#### Coherence
- Score: Critical / High / Medium / Low / None
- Findings: ...
- Recommendations: ...

#### Technical Debt
- Score: Critical / High / Medium / Low / None
- Findings: ...
- Recommendations: ...

#### Duplication
- Score: Critical / High / Medium / Low / None
- Findings: ...
- Recommendations: ...

#### Performance
- Score: Critical / High / Medium / Low / None
- Findings: ...
- Recommendations: ...

#### Security
- Score: Critical / High / Medium / Low / None
- Findings: ...
- Recommendations: ...

#### Scalability
- Score: Critical / High / Medium / Low / None
- Findings: ...
- Recommendations: ...

#### Maintainability
- Score: Critical / High / Medium / Low / None
- Findings: ...
- Recommendations: ...

---

### Quick Wins

(High-impact, low-effort improvements that can be done immediately.)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | ...    | Low    | High   |

---

### Medium / Long-Term Action Plan

| Priority | Action | Timeline | Dependencies | Effort | Impact |
|----------|--------|----------|--------------|--------|--------|
| 1        | ...    | Q1       | ...          | M      | High   |
| 2        | ...    | Q2       | ...          | L      | Medium |

---

### Appendix: Evidence References

(List of files and line numbers referenced in findings, with brief annotations.)
```

## Constraint

Every finding must be evidence-backed. Never make claims about architecture quality without citing specific files, patterns, or observations. Avoid subjective language — use concrete criteria for evaluations.

## Output

A single, self-contained architecture audit report in the format above. The report should stand alone and be actionable by a team without additional context.
