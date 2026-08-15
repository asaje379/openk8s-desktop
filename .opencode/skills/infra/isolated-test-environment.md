---
name: "@octs/isolated-test-environment"
description: "Spin up an isolated, disposable test environment with Docker Compose, run the full validation pipeline, collect results, and destroy everything."
depends_on: ["@octs/project-awareness"]
tools: ["Docker", "docker-compose"]
---

# @octs/isolated-test-environment

## Objective

Create a fully isolated, reproducible, and disposable sandbox environment for running the complete validation pipeline (lint, typecheck, build, unit tests, integration tests, E2E tests). The environment must be created from scratch, used, and then completely destroyed with no traces left behind.

## Dependencies

- `@octs/project-awareness` — load project context to understand the stack, CI/CD config, and testing tools before building the sandbox.

## Trigger Conditions

This skill runs:
- When the user requests a full validation run ("test everything", "run all checks", "validate the PR").
- Before merging or releasing, to ensure the code passes in a clean environment.
- When the user explicitly asks to run tests in an isolated environment.
- When a CI/CD pipeline is unavailable or needs local reproduction.

## Universal Guardrails

- **Always analyze existing project context before generating code.** Before creating any Docker or Compose configuration, read the project's existing `docker-compose.*`, `Dockerfile`, and CI/CD workflows. Align with what the project already uses.
- **Never declare work done without verifying compile/lint/tests/imports/coherence.** The entire purpose of this skill is to run the full pipeline. The final report must include pass/fail for every step.

---

## Sandbox Lifecycle

### Overview

```
[Create] → [Init] → [Execute Validations] → [Collect Results] → [Destroy]
```

Each phase must complete successfully before the next begins. If any phase fails, record the failure, then proceed to [Destroy] for mandatory cleanup.

---

## Phase 1 — Create

Provision the isolated environment.

### Requirements

| Requirement | Specification |
|---|---|
| **Container runtime** | Docker (Docker Compose v2) |
| **Network** | Isolated bridge network, no external access unless required by tests |
| **Volumes** | Temporary named volumes, removed on cleanup. **Never** mount host volumes that contain source code (use COPY or bind-mount with `:ro` if needed). |
| **Database** | Fresh container, no persisted data |
| **Database name** | `app_test_<timestamp>` (format: `app_test_20260101_120000`) **or** `test_<branch_name>` (sanitized: lowercase, `[^a-z0-9_]` → `_`). **Never** use `development`, `staging`, or `production` database names. |

### Docker Compose Template

Generate a `docker-compose.test.yml` (or augment an existing one) with these constraints:

```yaml
version: "3.9"
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.test  # or reuse the dev Dockerfile
    depends_on:
      db:
        condition: service_healthy
      mailpit:
        condition: service_started
    environment:
      - NODE_ENV=test
      - DATABASE_URL=postgresql://test:test@db:5432/${TEST_DB_NAME}
      - REDIS_URL=redis://redis:6379/0
    networks:
      - test-network

  db:
    image: <detect from project: postgres, mysql, etc.>
    environment:
      POSTGRES_DB: ${TEST_DB_NAME}
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test -d ${TEST_DB_NAME}"]
      interval: 2s
      retries: 10
    networks:
      - test-network

  mailpit:  # or Mailhog
    image: axllent/mailpit:latest
    ports: ["1025", "8025"]
    networks:
      - test-network

  minio:  # if the project uses S3-compatible storage
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    networks:
      - test-network

  redis:  # if the project uses Redis
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 2s
      retries: 10
    networks:
      - test-network

  stripe-mock:  # if the project uses Stripe
    image: stripe/stripe-mock:latest
    networks:
      - test-network

networks:
  test-network:
    driver: bridge
```

### External Dependency Isolation

| External Dependency | Isolation Strategy |
|---|---|
| **Email** | Mailpit (preferred) or Mailhog. All emails captured, never sent. |
| **Payment (Stripe)** | `stripe/stripe-mock` Docker image. |
| **Storage (S3)** | MinIO (S3-compatible, local). |
| **Cache (Redis)** | Fresh Redis container, no persistence. |
| **Search (Elasticsearch)** | Fresh Elasticsearch container, no persistence. |
| **Message Queue (RabbitMQ, Kafka)** | Fresh container, ephemeral queues/topics. |
| **Third-party APIs** | Mock server (WireMock, MockServer) or recorded fixtures. **Never call real external APIs in tests.** |

---

## Phase 2 — Init

Initialize the environment so it is ready for validation.

### Steps

1. **Install dependencies**
   ```
   docker compose -f docker-compose.test.yml run --rm app <package-manager> install
   ```
   Use the package manager detected by `@octs/project-awareness` (`npm install`, `pnpm install`, `yarn install`, `bun install`).

2. **Run database migrations**
   ```
   docker compose -f docker-compose.test.yml run --rm app <migration-command>
   ```
   Use the migration command detected from the project (e.g., `npx prisma migrate deploy`, `npx drizzle-kit push`, `npm run migrate`).

3. **Create database schema** (if separate from migrations; e.g., `prisma db push` for prototyping).

4. **Load test data**
   - **Factories**: If the project uses factories (e.g., `@faker-js/faker`, `factory_bot`, `Fishery`), generate seed data.
   - **Fixtures**: If the project uses fixture files (JSON, YAML, SQL dumps), load them in the appropriate order respecting foreign keys.
   - **Seeders**: Run any project-defined seed scripts (`npx prisma db seed`, `npm run seed`).
   - **Faker/Mock Data**: Generate realistic but non-sensitive test data with deterministic seeds so tests are reproducible.

### Reproducibility Guarantee

Every init step must be reproducible from scratch:
- Install dependencies from lockfile only (never from unresoled semver ranges).
- Run all migrations from the current migration directory, no partial state.
- Generate test data from seed scripts, not from a pre-built dump.

---

## Phase 3 — Execute Validations

Run the full pipeline in order. Each step must pass before proceeding (unless explicitly configured to run all and collect failures).

### Validation Pipeline

| Step | Command (project-dependent) | Must Pass? |
|---|---|---|
| **Lint** | `npm run lint`, `npx eslint .`, `npx biome check` | Yes |
| **Typecheck** | `npx tsc --noEmit`, `npm run typecheck` | Yes |
| **Build** | `npm run build`, `npx next build`, `npx vite build` | Yes |
| **Unit Tests** | `npm run test`, `npx vitest run`, `npx jest` | Yes |
| **Integration Tests** | `npm run test:integration`, `npx vitest run --config vitest.integration.config.*` | Yes |
| **E2E Tests** | `npx playwright test`, `npx cypress run` | Yes |

### Step Execution Rules

1. Use the **exact commands found in the project's `package.json` scripts**, CI/CD config, or `Makefile`. Do not invent commands.
2. Run all commands **inside the container**: `docker compose -f docker-compose.test.yml run --rm app <command>`.
3. Capture **stdout, stderr, and exit code** for each step.
4. If a step fails, record the failure and continue with the remaining steps, then report all failures together. (Optionally, fail-fast if the project's CI/CD does.)
5. If `@octs/project-awareness` detected a CI/CD pipeline, **align validation commands with CI/CD** to prevent "works on my machine" divergence.

---

## Phase 4 — Collect Results

Gather all outputs into a structured report.

### Data to Collect

- **Environment info**: OS, Docker version, image digests, database name, branch/timestamp.
- **Init summary**: Dependencies installed (count), migrations applied (count), seeds loaded (count).
- **Validation results**: For each step — command executed, exit code, duration, pass/fail, truncated error output (first 50 lines per failure).
- **Test summary**: Total tests, passed, failed, skipped. Coverage percentage if available.
- **Logs**: If any step failed, capture relevant container logs (`docker compose logs <service>`).

---

## Phase 5 — Destroy

**Mandatory.** This must run even if previous phases failed. Use a trap/cleanup mechanism.

### Destroy Steps

1. **Stop and remove all containers**
   ```
   docker compose -f docker-compose.test.yml down --volumes --remove-orphans --rmi local
   ```
2. **Remove the test network**
   ```
   docker network rm <test-network-name> 2>/dev/null || true
   ```
3. **Remove the test database** (if the database container uses a persistent volume, drop via SQL or remove the volume).
4. **Prune dangling volumes and images created during the test**
   ```
   docker volume prune -f --filter "label=com.docker.compose.project=<project>"
   ```
5. **Verify cleanup**: Confirm that no test containers, volumes, or networks remain.
   ```
   docker ps -a --filter "name=<project>-test-" --format '{{.Names}}' | wc -l
   ```
   Must equal `0`.

---

## CI/CD Alignment

Before building the sandbox, check the project's CI/CD configuration:

1. Read `.github/workflows/*.yml`, `.gitlab-ci.yml`, `Jenkinsfile`, or equivalent.
2. Extract: Docker image used, Node/Bun/Python version, services, environment variables, test commands.
3. Match the sandbox to CI/CD as closely as possible:
   - Same base image or a compatible equivalent.
   - Same language runtime version.
   - Same service versions (PostgreSQL, Redis, etc.).
   - Same test commands and order.
4. If CI/CD is not present, use the project's `package.json` engines field, `.nvmrc`, `.node-version`, or lockfile to determine runtime versions.

---

## Mandatory Report Template

After completing the lifecycle, produce a report using this exact structure:

```markdown
# Isolated Test Environment Report

## Environment Created
- **Timestamp**: <ISO timestamp>
- **Branch**: <branch name>
- **Database**: <database name>
- **Docker images**: <list of images and digests>
- **Network**: <network name>

## Initialization
- **Dependencies installed**: <count> packages in <duration>
- **Migrations**: <count> migrations applied in <duration>
- **Seed data**: <count> records seeded in <duration>

## Validations Executed

| Step | Command | Exit Code | Duration | Status |
|---|---|---|---|---|
| Lint | `<cmd>` | 0 | 3.2s | ✅ |
| Typecheck | `<cmd>` | 0 | 12.1s | ✅ |
| Build | `<cmd>` | 0 | 45.3s | ✅ |
| Unit Tests | `<cmd>` | 0 | 18.7s | ✅ (145 passed, 0 failed) |
| Integration Tests | `<cmd>` | 0 | 34.2s | ✅ (67 passed, 0 failed) |
| E2E Tests | `<cmd>` | 1 | 120.5s | ❌ (12 passed, 2 failed) |

## Results
- **Total tests**: 224
- **Passed**: 222
- **Failed**: 2
- **Skipped**: 5
- **Coverage**: 87.3%

## Cleanup
- **Containers removed**: 6
- **Volumes removed**: 3
- **Networks removed**: 1
- **Verification**: 0 remaining test resources

## Conclusion

**Status**: ❌ Not Validated

**Summary**: 2 E2E tests failed. See above for details.

**Failed steps**:
- E2E Tests: 2 failures in `checkout.spec.ts:45` and `payment.spec.ts:120`
```
