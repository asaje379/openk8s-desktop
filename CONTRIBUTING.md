# Contributing to OpenK8s Desktop

First off, thanks for taking the time to contribute! 🎉

OpenK8s Desktop is an open, community-driven project. Contributions of all kinds are welcome — bug reports, feature requests, documentation, tests, and code.

Please make sure to also read our [Code of Conduct](CODE_OF_CONDUCT.md) — participation in this project means you agree to uphold it.

---

## Getting started

1. **Fork** the repository and clone your fork.
2. Set up the development environment (see below).
3. Create a branch for your work: `git checkout -b fix/my-fix`.
4. Make your changes, following the conventions.
5. Run the checks (see [Verification](#verification)).
6. Commit with a clear message, push, and open a **Pull Request**.

### Development environment

Prerequisites: Go ≥ 1.25, Node.js ≥ 20 with pnpm, Wails v2 (`go install github.com/wailsapp/wails/v2/cmd/wails@v2.14.0`).

```bash
wails dev                      # hot-reload development (frontend + backend)
cd frontend && pnpm build      # typecheck + build the frontend
go test ./...                  # backend unit tests (fake clientset)
wails build                    # full production build (binary in build/bin/)
wails generate module          # regenerate TS bindings after changing bound methods
```

> **Ubuntu 24.04:** the project forces `"build:tags": "webkit2_41"` in `wails.json`. `wails doctor` may show a false "libwebkit Not Found" — the build works anyway.

---

## Reporting issues

Before opening an issue:

- Search [existing issues](https://github.com/asaje379/openk8s-desktop/issues) to avoid duplicates.
- Use a clear, descriptive title.
- Include the **app version**, your **OS and architecture**, and the **cluster type** (EKS, AKS, kind, …).
- Provide **reproduction steps**, expected vs actual behavior, and relevant logs.
- **Never** paste credentials or kubeconfig secrets into an issue.

**Security vulnerabilities** must not be reported publicly — use the process described in [SECURITY.md](SECURITY.md).

---

## Conventions

### Git & commits

- Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`, and scope when relevant (e.g. `fix(ci):`, `feat(pods):`).
- Keep each commit focused on a single change.
- Write PR titles in the same style.

### Backend (Go)

- **DTOs** dedicated to the bindings — never expose raw `client-go` types.
- Dependency injection and `context.Context` throughout.
- Tests use `k8s.io/client-go/kubernetes/fake`.
- Always `make([]T, 0)` for slices (JSON must be `[]`, never `null`).
- **No global `rest.Config.Timeout`** — it breaks log/exec/port-forward streams. Use `k8s.withTimeout` (30s) for one-off requests only.
- Wails v2 `EventsOn` returns an **unsubscribe function** (no `EventsOff` with callback).

### Frontend (React + TypeScript)

- Feature-based structure in `frontend/src/features/…`.
- Server state with **TanStack Query** (hooks in `hooks/use-k8s.ts`); minimal **Zustand** for app-level state.
- UI with **shadcn/ui** components; Tailwind CSS v4 design tokens from `src/style.css`.
- i18n **en/fr** via `frontend/src/locales/` — add translations for every new string.
- Lazy-load routes and heavy components (`React.lazy` + `Suspense`).
- Use the `cn()` helper for class merging; prefer design tokens over arbitrary values.

### Tests & verification

- Backend: `go test ./...` (fake clientset, no real cluster required).
- Frontend: `cd frontend && pnpm build` (TypeScript + Vite).
- Full build: `wails build`.
- If a change is not verifiable in your environment, say so explicitly in the PR.

---

## Pull requests

1. Keep PRs **small and focused** — one concern per PR.
2. Reference the issue(s) you address: `Closes #123`.
3. Explain **what** and **why**, not just how.
4. Run the verification commands above before requesting review.
5. Be responsive to review feedback.

---

## Documentation

- The repo keeps a documentation site under [`docs/`](docs/).
- The marketing landing page lives in [`website/`](website/index.html).
- Update relevant docs when you change behavior, and add a `CHANGELOG.md` entry for user-facing changes.

---

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).