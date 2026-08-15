---
name: "@octs/feature-planner"
description: "Plan features methodically before writing any code"
depends_on: ["@octs/project-awareness"]
tools: ["read", "glob", "grep"]
---

# @octs/feature-planner

## Objective

Ensure every feature is planned thoroughly before a single line of code is written. Planning prevents rework, reduces risk, and produces cleaner, more coherent implementations.

## Dependencies

- `@octs/project-awareness`: must be loaded first to understand the project structure, conventions, existing components, patterns, and dependencies.

## Universal Guardrails

1. **Analyze existing project context before any code generation.** Understand architecture, conventions, existing components, patterns, and dependencies. Never reinvent what already exists. Always prefer coherence over novelty. Use `read`, `glob`, and `grep` to explore the codebase before writing anything.

2. **Never declare work as "done" or "finished" without having verified:** compilation, valid imports, TypeScript types, tests passing, lint passing, no errors, file consistency, component existence, correct paths, existing dependencies, architectural compatibility. If verification cannot be performed, explicitly state: `Verified` / `Verifiable but not executed` / `Not verifiable in current context`.

## Mandatory Process

NEVER start coding immediately. The following phases must be completed in order before any code is written. Each phase must be explicitly acknowledged as complete before moving to the next.

### Phase 1 — Analyze the need

- Read and fully understand the feature request or specification.
- Reformulate the request in your own words to confirm understanding.
- Identify any ambiguities, missing details, or edge cases not covered by the request.
- Ask clarifying questions if the specification is incomplete or unclear.
- Define the scope boundary: what is included and what is explicitly excluded.

### Phase 2 — Identify constraints

Constraints shape which solutions are viable. List all relevant constraints:

- **Technical constraints** — language version, framework, libraries already in use, platform targets, API compatibility, database schema.
- **Business constraints** — deadlines, team capacity, stakeholder requirements, regulatory compliance.
- **Timeline constraints** — delivery date, dependencies on other teams or features, release cycle alignment.
- **Dependency constraints** — external services, internal modules, upstream/downstream impacts.
- **Risk constraints** — security surface, data privacy, performance SLAs, breaking changes.

### Phase 3 — Propose multiple approaches

Propose at least **two distinct approaches**. For each approach provide:

- **High-level description** — what is the core idea?
- **Strengths** — why would this approach be a good choice?
- **Weaknesses** — what are the risks, downsides, or unknowns?
- **Effort estimate** — relative sizing (small / medium / large) and reasoning.

At least one approach should be the "minimal viable" option (simplest thing that works). At least one should be the "robust" option (handles future needs). Additional approaches may include creative or unconventional solutions.

### Phase 4 — Compare tradeoffs

For each approach, evaluate across the following dimensions:

| Dimension | Weight | Approach A | Approach B | ... |
|-----------|--------|------------|------------|-----|
| Complexity | | | | |
| Performance | | | | |
| Maintainability | | | | |
| Delivery time | | | | |
| Risk | | | | |
| Extensibility | | | | |
| Coherence with codebase | | | | |

Weight dimensions according to project priorities. Score each approach and justify scores.

### Phase 5 — Propose a plan

- **Recommended approach** — which approach is selected and why.
- **Justification** — explain the reasoning, referencing the tradeoff analysis.
- **High-level breakdown** — ordered list of implementation steps at the milestone level.

### Phase 6 — Decompose into tasks

Break the plan into atomic, ordered tasks. Each task must include:

- **Task ID** — unique identifier for tracking.
- **Description** — what specifically needs to be done.
- **Dependencies** — which other task(s) must be completed first.
- **Expected output** — what artifact is produced (file, module, test suite, migration, etc.).
- **Acceptance criteria** — how to verify the task is correctly completed.
- **Estimated effort** — relative sizing (XS / S / M / L / XL).
- **Risk level** — Low / Medium / High, with reasoning if High.

## Constraint

**Never start coding before the plan is validated.** Wait for explicit confirmation that the plan is acceptable before writing any implementation code. If the plan reveals issues (cost too high, timeline too long, dependency unavailable), raise them immediately rather than proceeding.

## Output Format

At the end of the planning process, present a structured summary:

```markdown
## Feature Plan: <feature name>

### 1. Need Analysis
(reformulated understanding)

### 2. Constraints
(list)

### 3. Approaches Considered
| # | Name | Description | Strengths | Weaknesses | Effort |
|---|------|-------------|-----------|------------|--------|
| A | ...  | ...         | ...       | ...        | ...    |
| B | ...  | ...         | ...       | ...        | ...    |

### 4. Tradeoff Analysis
(comparative table with scores)

### 5. Recommended Plan
(selected approach + justification)

### 6. Task Breakdown
| ID | Description | Depends On | Output | Acceptance Criteria | Effort | Risk |
|----|-------------|------------|--------|---------------------|--------|------|
| 1  | ...         | -          | ...    | ...                 | ...    | ...  |
| 2  | ...         | 1          | ...    | ...                 | ...    | ...  |

Status: ⬜ Awaiting validation
```
