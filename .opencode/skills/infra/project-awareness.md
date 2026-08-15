---
name: "@octs/project-awareness"
description: "Auto-detect project stack, architecture, conventions, and inventory before any task. Foundational skill for all other skills."
depends_on: []
tools: []
---

# @octs/project-awareness

## Objective

Before any code generation, modification, or analysis task, build and maintain a complete and accurate understanding of the project. This skill is **mandatory and must run first**—every other skill depends on its outputs.

This skill performs five duties:
1. Auto-detect the **project stack**.
2. Auto-detect the **architecture**.
3. Auto-detect **conventions**.
4. Build and maintain an **inventory of existing bricks**.
5. Create and maintain **project memory** (documentation and AI metadata).

## Dependencies

None. This is the root skill; all other skills depend on it.

## Universal Guardrails

- **Always analyze existing project context before generating code.** Never assume a library, framework, pattern, or convention is in use. Read the nearest configuration files, package manifests, and surrounding source code before taking any action.
- **Never declare work done without verifying compile/lint/tests/imports/coherence.** After any file change, run the project's existing quality pipeline (at minimum: lint and typecheck). When applicable, run unit and integration tests. Only conclude when all checks pass.

## Phase 1 — Stack Detection

Scan the project root and related directories for configuration files. Detect and record every identified technology. If a technology is **not present**, do **not** assume or recommend it unless explicitly asked.

### Frontend Framework
- **React**: `react` in `package.json`, `.jsx`/`.tsx` files, `react-dom`, `vite.config.*` with React plugin
- **Next.js**: `next` in `package.json`, `next.config.*`, `app/` or `pages/` directory with Next conventions
- **Vue**: `vue` in `package.json`, `.vue` files, `vite.config.*` with Vue plugin, `vue-router`, `pinia`
- **Angular**: `@angular/core` in `package.json`, `angular.json`, `.component.ts` files, NgModules or standalone components
- **Svelte**: `svelte` in `package.json`, `.svelte` files, `svelte.config.*`
- **Solid**: `solid-js` in `package.json`, `.jsx`/`.tsx` files with Solid primitives (`createSignal`, `createEffect`)
- **Remix**: `@remix-run/*` in `package.json`, `remix.config.*`, `app/` directory with Remix conventions
- **Astro**: `astro` in `package.json`, `astro.config.*`, `.astro` files
- **Vite** (standalone): `vite` in `package.json` without a meta-framework wrapper

### UI / Component Library
- **shadcn/ui**: `components/ui/` directory, `@/components/ui/*` imports, `components.json`
- **Tailwind CSS**: `tailwind.config.*`, `postcss.config.*` with Tailwind, `@tailwind` directives in CSS
- **MUI (Material UI)**: `@mui/material` in `package.json`
- **Chakra UI**: `@chakra-ui/react` in `package.json`
- **Mantine**: `@mantine/core` in `package.json`
- **Ant Design**: `antd` in `package.json`
- **Radix UI**: `@radix-ui/*` packages in `package.json`

### Backend Framework
- **Express**: `express` in `package.json`, `app.listen()`, `express()`
- **NestJS**: `@nestjs/core` in `package.json`, `nest-cli.json`, decorators (`@Controller`, `@Module`)
- **Fastify**: `fastify` in `package.json`, `fastify()`
- **Hono**: `hono` in `package.json`, `new Hono()`
- **Elysia**: `elysia` in `package.json` (Bun), `new Elysia()`
- **Spring Boot**: `pom.xml` with `spring-boot-starter-*`, `build.gradle` with Spring Boot plugin, `@SpringBootApplication`
- **Laravel**: `composer.json` with `laravel/framework`, `artisan` file, `app/` and `routes/` directories
- **Django**: `manage.py`, `settings.py`, `INSTALLED_APPS`, `urls.py`

### Database
- **PostgreSQL**: `pg` in `package.json`, connection strings with `postgres://`, `docker-compose.*` with `postgres`
- **MySQL**: `mysql2` in `package.json`, connection strings with `mysql://`, `docker-compose.*` with `mysql`
- **MongoDB**: `mongoose` or `mongodb` in `package.json`, connection strings with `mongodb://`
- **Redis**: `ioredis` or `redis` in `package.json`, connection strings with `redis://`
- **SQLite**: `better-sqlite3` in `package.json`, `*.sqlite` files, connection strings with `sqlite:`
- **CockroachDB**: `cockroachdb` references, connection strings with `cockroach://`

### ORM / Database Toolkit
- **Prisma**: `@prisma/client` in `package.json`, `prisma/schema.prisma`, `PrismaClient`
- **Drizzle ORM**: `drizzle-orm` in `package.json`, `drizzle.config.*`, `drizzle/schema.ts`
- **TypeORM**: `typeorm` in `package.json`, `ormconfig.*`, `DataSource`, `@Entity()`
- **Sequelize**: `sequelize` in `package.json`, `Sequelize` constructor, model definitions with `sequelize.define`
- **MikroORM**: `@mikro-orm/core` in `package.json`, `mikro-orm.config.*`

### Quality / Linting / Formatting
- **ESLint**: `eslint.config.*` or `.eslintrc.*`, `eslint` in `package.json`
- **Biome**: `biome.json`, `@biomejs/biome` in `package.json`
- **Prettier**: `.prettierrc.*`, `prettier` in `package.json`

### Testing
- **Vitest**: `vitest` in `package.json`, `vitest.config.*`
- **Jest**: `jest` in `package.json`, `jest.config.*`
- **Playwright**: `@playwright/test` in `package.json`, `playwright.config.*`
- **Cypress**: `cypress` in `package.json`, `cypress.config.*`

### Build System / Package Manager / Monorepo
- **Turborepo**: `turbo.json`, `turbo` in `package.json`
- **Nx**: `nx.json`, `nx` in `package.json`
- **pnpm**: `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- **npm**: `package-lock.json` (and no `pnpm-lock.yaml` or `yarn.lock`)
- **yarn**: `yarn.lock`, `.yarn/`
- **bun**: `bun.lockb`, `bunfig.toml`

### CI/CD
- **GitHub Actions**: `.github/workflows/*.yml`
- **GitLab CI**: `.gitlab-ci.yml`
- **Jenkins**: `Jenkinsfile`
- **Azure DevOps**: `azure-pipelines.yml` or `.azure/pipelines/`

### Output of Phase 1
Produce a structured stack summary:

```
## Detected Stack
- Frontend: <framework> (<version if detectable>)
- UI: <library>
- Backend: <framework>
- Database: <database>
- ORM: <orm>
- Quality: <linter>, <formatter>
- Tests: <framework>
- Build: <package manager>, <monorepo tool if any>
- CI/CD: <platform>
```

## Phase 2 — Architecture Detection

Analyze the top-level directory tree, module boundaries, and import graph to classify the architecture.

### Architecture Patterns

- **Feature Based**: Modules grouped by business feature/domain (e.g., `src/features/users/`, `src/features/orders/`). Each feature contains its own components, hooks, services, etc.
- **Layer Based**: Modules grouped by technical role (e.g., `src/components/`, `src/services/`, `src/hooks/`, `src/utils/`). Cross-cutting separation by layer.
- **Clean Architecture**: Distinct layers with dependency inversion (`entities/`, `usecases/`, `adapters/`, `frameworks/`). Domain logic isolated from infrastructure.
- **Hexagonal (Ports & Adapters)**: Domain core with port interfaces, adapters for external systems (DB, HTTP, queues).
- **DDD (Domain-Driven Design)**: Rich domain model with aggregates, entities, value objects, repositories, domain events, bounded contexts.
- **Monolith**: Single deployable unit, all code in one package/app.
- **Modular Monolith**: Single deployable but with strong module boundaries, explicit public APIs per module.
- **Microservices**: Multiple independently deployable services, each with its own codebase or in a monorepo with clear service boundaries.
- **Event Driven**: Services communicate via events/messages (Kafka, RabbitMQ, SQS, EventEmitter). Asynchronous, eventual consistency.

### Architecture Detection Rules

1. Check for a monorepo root (`pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `lerna.json`). If present, identify each package/app boundary.
2. For each application, examine the `src/` directory structure:
   - If `src/features/` or `src/modules/` with domain-named folders → Feature Based or Modular Monolith
   - If `src/components/`, `src/hooks/`, `src/services/`, `src/utils/` at top level → Layer Based
   - If `src/domain/`, `src/application/`, `src/infrastructure/`, `src/presentation/` → Clean Architecture
   - If `src/domain/` with port/adapters directories → Hexagonal
3. Check for microservice indicators: multiple `Dockerfile`s, separate `package.json` per service, service discovery, API gateway.
4. Check for event-driven indicators: message broker clients, event handlers, event sourcing.

### Output of Phase 2
Produce an architecture summary:

```
## Detected Architecture
- Pattern: <pattern>
- Monorepo: <yes/no> (<tool>)
- Module Boundaries: <description>
- Dependency Direction: <description>
```

## Phase 3 — Conventions Detection

Extract all discoverable conventions from the codebase. **Never invent conventions that are not present.**

### Folder Structure
Map the full folder tree to 3 levels deep. Identify where each artifact type lives:
- Components: `<path>`
- Hooks: `<path>`
- Services: `<path>`
- Utilities: `<path>`
- Types: `<path>`
- Constants: `<path>`
- Tests: `<path>` (co-located, `__tests__/`, or `*.test.*`/`*.spec.*`)
- Styles: `<path>`
- Assets: `<path>`
- API routes: `<path>`
- Middlewares: `<path>`
- DTOs/Schemas: `<path>`
- Validators: `<path>`
- Repositories: `<path>`
- Adapters: `<path>`

### Naming Conventions
- Files: `kebab-case`, `camelCase`, `PascalCase`, or `snake_case`?
- Components: named export or default export? `.tsx` or `.jsx`?
- Hooks: `use*` prefix? separate file per hook?
- Types/interfaces: `I` prefix? `T` prefix? `type` or `interface`?
- Enums: `enum` keyword or const union?
- Constants: `UPPER_SNAKE_CASE`?
- Test files: `*.test.*` or `*.spec.*`? co-located or in `__tests__/`?

### TypeScript Rules
- Strict mode? (`strict: true` in `tsconfig.json`)
- Path aliases? (`@/`, `~/`, etc.)
- No `any` policy? (`@typescript-eslint/no-explicit-any`)
- Return type required? (`@typescript-eslint/explicit-function-return-type`)
- Consistent type imports? (`import type { ... }`)

### Imports
- Path aliases in use (`@/`, `~/`, `$lib/`, etc.)
- Import order (external → internal → relative, or other convention)
- Barrel exports (`index.ts` re-exporting modules)

### Component Organization
- One component per file?
- Co-located styles and tests?
- Storybook stories present? Where?
- PropTypes or TypeScript types?

### Test Strategy
- Unit tests: where, how named, what framework
- Integration tests: where, how named, what framework
- E2E tests: where, how named, what framework
- Coverage thresholds: from config files

### Git Conventions
- Branch naming: `feature/`, `fix/`, `chore/`, etc.
- Commit message format: `conventional commits`?
- PR template: `.github/PULL_REQUEST_TEMPLATE.md`

### Formatting
- Indentation: spaces or tabs? width?
- Quotes: single or double?
- Semicolons: required or omitted?
- Trailing commas?
- Line ending: LF or CRLF?

### Error Handling
- Pattern: try/catch, Result type, Either monad, error boundaries (React)?
- HTTP errors: centralized handler? exception filter?
- Logging: which library? structured?

### Logging
- Library: `winston`, `pino`, `bunyan`, `console`
- Format: JSON? pretty-print per environment?
- Levels: which levels used and when?

### Output of Phase 3
Produce a conventions document. This becomes `docs/conventions.md`. Keep it factual—only what is actually observed in the codebase.

## Phase 4 — Inventory of Existing Bricks

Build a comprehensive catalog of every reusable artifact. This inventory **must be consulted before creating anything new**. If an equivalent brick exists, **always prefer reuse** over duplication.

### Inventory Categories

- **Components**: Every React/Vue/Svelte/etc. component. Record name, file path, props/inputs, exported or default, purpose.
- **Hooks**: Every custom hook. Record name, file path, parameters, return type, purpose.
- **Helpers / Utilities**: Pure functions used across the codebase.
- **Services**: Business logic services, API clients, data access services.
- **Providers / Contexts**: React Context providers, Vue provide/inject, Angular services with `@Injectable({providedIn: 'root'})`.
- **Middlewares**: Express/Fastify/Hono/etc. middleware functions.
- **DTOs / Schemas**: Data Transfer Objects, Zod/Yup/Valibot/class-validator schemas.
- **Validators**: Validation functions/rules.
- **Repositories**: Data access objects, Prisma/Drizzle/TypeORM repository classes.
- **Adapters**: External API wrappers, SDK wrappers, port implementations.
- **Types / Interfaces**: Shared TypeScript types and interfaces.
- **Constants**: Shared constant values, enums, configuration.
- **Icons**: Icon components or icon sets used.
- **Layouts**: Page layout components.
- **Templates**: Reusable page or section templates.

### Inventory Rules

1. Recursively scan all source directories, excluding `node_modules/`, `dist/`, `build/`, `.next/`, `.nuxt/`, `coverage/`.
2. For each artifact, record: `name`, `type`, `file_path`, `exports`, `dependencies`.
3. Store in `.project-ai/inventory.json` with the following shape:

```json
{
  "version": "1.0",
  "lastUpdated": "<ISO timestamp>",
  "categories": {
    "components": [
      {
        "name": "Button",
        "path": "src/components/ui/Button.tsx",
        "exports": ["default"],
        "props": ["variant", "size", "disabled", "children"],
        "description": "Primary button component with variant and size support"
      }
    ],
    "hooks": [ ... ],
    "helpers": [ ... ],
    "services": [ ... ],
    "providers": [ ... ],
    "middlewares": [ ... ],
    "dtos": [ ... ],
    "validators": [ ... ],
    "repositories": [ ... ],
    "adapters": [ ... ],
    "types": [ ... ],
    "constants": [ ... ],
    "icons": [ ... ],
    "layouts": [ ... ],
    "templates": [ ... ]
  }
}
```

### Before Creating Anything New

1. Check `inventory.json` for an equivalent brick.
2. Check by grepping for similar names or patterns in the source tree.
3. If a suitable brick exists: **reuse it**. If it needs a small extension, extend it.
4. If no suitable brick exists: create it following detected conventions, then register it in the inventory.

## Phase 5 — Project Memory Maintenance

Create and maintain a structured project memory under two locations.

### `docs/` — Human-Readable Documentation

Create these files if they do not exist. Keep each under 300 lines.

| File | Content | Max Lines |
|---|---|---|
| `docs/index.md` | Project overview, stack summary, architecture summary, quickstart, key commands, folder map | 300 |
| `docs/conventions.md` | All detected conventions from Phase 3 | 300 |
| `docs/architecture.md` | Detailed architecture description, module boundaries, data flow, dependency graph | 300 |
| `docs/decisions.md` | Architecture Decision Records (ADR). Date, decision, context, consequences, status. | 300 |
| `docs/glossary.md` | Domain-specific terms, acronyms, project jargon | 300 |

### `.project-ai/` — Machine-Readable Metadata

Create these files if they do not exist:

| File | Content |
|---|---|
| `.project-ai/project.json` | Structured project metadata: name, stack, architecture, conventions digest |
| `.project-ai/inventory.json` | Brick inventory from Phase 4 |
| `.project-ai/skills.lock.json` | Which skills have been executed, when, and their status |

### `project.json` Shape

```json
{
  "name": "<project name>",
  "stack": {
    "frontend": { "framework": "...", "version": "...", "ui": "..." },
    "backend": { "framework": "...", "version": "..." },
    "database": { "type": "...", "orm": "..." },
    "quality": { "linter": "...", "formatter": "..." },
    "tests": { "unit": "...", "e2e": "..." },
    "build": { "packageManager": "...", "monorepo": "..." },
    "cicd": "..."
  },
  "architecture": {
    "pattern": "...",
    "monorepo": false
  },
  "lastAnalysis": "<ISO timestamp>"
}
```

## Phase 6 — Five-Step Analysis Pipeline

Before executing any task, run this pipeline:

### Step 1: Understand the Request
Parse what is being asked. Identify: scope, affected layers, required technologies, must-haves vs nice-to-haves.

### Step 2: Load Project Context
Read `docs/index.md`, `docs/architecture.md`, `docs/conventions.md`, `.project-ai/project.json`, `.project-ai/inventory.json`. If any is missing or stale, regenerate from the codebase.

### Step 3: Analyze Impacts
- Which files/modules will be touched?
- Which bricks from the inventory can be reused?
- Are there cross-cutting concerns (auth, logging, error handling, caching)?
- Does the change affect the architecture? If so, flag it.

### Step 4: Detect Duplications and Inconsistencies
- Before creating any new code, verify that an equivalent does not already exist.
- Scan for inconsistent patterns across the codebase (e.g., two different HTTP clients, mixed error handling styles).
- **Signal duplications and inconsistencies with proposals** for resolution. **Do not auto-fix** without explicit approval.
- Flag violations of detected conventions.

### Step 5: Execute with Guardrails
- Follow detected conventions exactly.
- Reuse existing bricks.
- Write tests matching the project's test strategy.
- After implementation, run the project's quality pipeline (lint, typecheck, build, tests).

## Phase 7 — Duplication and Inconsistency Detection

Continuously monitor for:

| Signal | Action |
|---|---|
| Two components with the same purpose but different implementations | Flag and propose a unified component |
| Two HTTP clients or data-fetching strategies | Flag and propose consolidation |
| Mixed error handling (some try/catch, some `.catch()`, some Result types) | Flag and propose standardization |
| Mixed import styles (some `@/`, some `../`) | Flag and propose alignment |
| Duplicate utility functions | Flag and propose extraction to shared util |
| Unused dependencies in `package.json` | Flag for removal |
| Inconsistent naming (e.g., `getUser` vs `fetchUser` vs `loadUser`) | Flag and propose a standard |
| Dead code | Flag for removal |
| Missing tests in critical paths | Flag and propose coverage |
| Diverging CSS/ styling approaches | Flag and propose consolidation |

## Prohibitions

This skill **must never**:
- **Invent conventions** that are not present in the codebase.
- **Replace the architecture** with a different pattern.
- **Impose a different framework** or library than what the project uses.
- **Duplicate existing components**, hooks, utilities, or services. Always check the inventory first.
- **Ignore project conventions** in favor of personal or default preferences.
- **Create documentation files** without being asked, except for the `docs/` and `.project-ai/` files listed in Phase 5 (which are required for the skill to function).

## On First Run

If `docs/index.md` or `.project-ai/project.json` do not exist, execute Phases 1 through 5 in order and produce all required files. This constitutes the **project onboarding** and must complete before any other task can proceed.
