---
name: "@octs/bug-investigator"
description: "Identify and fix bugs methodically using a scientific approach"
depends_on: ["@octs/project-awareness"]
tools: ["read", "glob", "grep", "bash"]
---

# @octs/bug-investigator

## Objective

Diagnose and fix bugs systematically using hypothesis-driven investigation. The goal is to find the root cause — not just patch the symptom — and ensure the bug never returns.

## Dependencies

- `@octs/project-awareness`: must be loaded first to understand the project structure, logging infrastructure, test framework, and debugging tools available.

## Universal Guardrails

1. **Analyze existing project context before any code generation.** Understand architecture, conventions, existing components, patterns, and dependencies. Never reinvent what already exists. Always prefer coherence over novelty. Use `read`, `glob`, and `grep` to explore the codebase before writing anything.

2. **Never declare work as "done" or "finished" without having verified:** compilation, valid imports, TypeScript types, tests passing, lint passing, no errors, file consistency, component existence, correct paths, existing dependencies, architectural compatibility. If verification cannot be performed, explicitly state: `Verified` / `Verifiable but not executed` / `Not verifiable in current context`.

## Mandatory Process

### Phase 1 — Reproduce the bug

- Gather the exact steps to trigger the bug from the report or reporter.
- Reproduce the bug in a controlled environment (local, staging, or test).
- Document the precise reproduction steps: input data, sequence of actions, environment state, timing conditions.
- Confirm the bug is reproducible and not intermittent. If intermittent, document the reproduction rate (e.g., 3 out of 10 attempts).
- Identify the expected behavior versus the observed behavior.

### Phase 2 — Collect diagnostic evidence

Gather all available signals before forming hypotheses:

- **Application logs** — error messages, stack traces, warning logs near the failure.
- **Server/Infrastructure logs** — reverse proxy, database, message queue, orchestrator.
- **Traces** — distributed tracing spans if available (OpenTelemetry, Jaeger, etc.).
- **Metrics** — CPU spikes, memory graphs, request latency, error rate changes at the time of failure.
- **State** — database records, cache contents, file system state at the time of failure.
- **Context** — recent deployments, configuration changes, traffic pattern changes, external service incidents.
- **Code paths** — trace the code execution path leading to the failure using `read`, `grep`, and `glob`.

### Phase 3 — Propose hypotheses

Formulate multiple potential root causes, each as a falsifiable statement:

- Each hypothesis must be specific: "The bug is caused by X because Y."
- Rank hypotheses by probability based on the evidence collected.
- For each hypothesis, describe what test would prove it wrong (falsification test).
- Consider categories: logic errors, race conditions, state corruption, misconfiguration, data issues, dependency failures, edge cases, regressions.

### Phase 4 — Eliminate hypotheses

Test each hypothesis systematically, starting from the most probable:

- **Design a targeted test** for each hypothesis (log statement, debugger breakpoint, unit test, isolated reproduction).
- **Run the test.** If the hypothesis is falsified, move to the next one.
- **Narrow the search space.** As hypotheses are eliminated, the root cause area becomes clearer.
- **Avoid confirmation bias.** Actively try to disprove each hypothesis, not prove it.
- Document which hypotheses were eliminated and why.

### Phase 5 — Identify the root cause

- Identify the **fundamental cause**, not a proximate symptom.
- Apply the "Five Whys" technique: ask why repeatedly until you reach the underlying issue.
- The root cause must explain all observed symptoms coherently.
- Classify the root cause: logic error, missing validation, race condition, resource exhaustion, misconfiguration, data corruption, dependency failure, specification ambiguity.

### Phase 6 — Implement the fix

- Design the **simplest, safest correction** that addresses the root cause.
- Prefer minimal changes: a single-line fix is better than a refactor.
- Consider side effects: what else depends on the code being changed?
- If the fix touches a critical path, consider adding a feature flag for controlled rollout.
- Write the fix following existing code conventions and patterns.

### Phase 7 — Add a regression test

- Write a test that specifically reproduces the bug and fails before the fix.
- The test must pass after the fix is applied.
- Ensure the test is deterministic (no flaky tests).
- Place the test in the appropriate test suite following project conventions.
- If the bug involved an edge case, add tests for neighboring edge cases as well.

### Phase 8 — Verify no regression

Run the full verification suite:

- **Tests** — entire test suite passes, including the new regression test.
- **Lint** — no new linting errors.
- **Build** — project compiles / builds successfully.
- **Type check** — no type errors introduced.
- **Coherence** — fix aligns with existing patterns, no duplicated logic, no dead code left behind.

## Bug Investigation Report Format

```markdown
## Bug Investigation: <bug title or ID>

### Reproduction
- Steps: ...
- Reproduction rate: ...
- Expected: ...
- Observed: ...

### Evidence Collected
- Logs: ...
- Metrics: ...
- State: ...
- Context: ...

### Hypotheses
| # | Hypothesis | Probability | Falsification Test | Result |
|---|------------|-------------|-------------------|--------|
| 1 | ...        | High        | ...               | Eliminated / Confirmed |
| 2 | ...        | Medium      | ...               | Eliminated / Confirmed |

### Root Cause
- Description: ...
- Category: ...
- Five Whys: ...
  1. Why? ...
  2. Why? ...
  3. Why? ...
  4. Why? ...
  5. Why? ...

### Fix
- Description: ...
- Files changed: ...
- Rationale: ...

### Regression Test
- Test file: ...
- Test name: ...
- What it covers: ...

### Verification
- Tests: ☐ passed / ☐ not run
- Lint: ☐ passed / ☐ not run
- Build: ☐ passed / ☐ not run
- Type check: ☐ passed / ☐ not run
```

## Constraint

Never skip the root cause phase. A fix without understanding the root cause is a guess. Never apply a workaround and call it a fix unless the root cause is documented and acknowledged as technically infeasible to address now, with a follow-up task created.
