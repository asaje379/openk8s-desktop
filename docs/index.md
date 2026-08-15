# Project Index — openk8s-desktop

> Application desktop (alternative à Lens) pour se connecter et administrer plusieurs clusters Kubernetes. **Local-first**.

## Stack

- **Desktop** : Wails v2.14 (backend Go embarqué dans le binaire)
- **Backend** : Go + client-go (`k8s.io/client-go` v0.36), SQLite (`modernc.org/sqlite`)
- **Frontend** : React 19 + TypeScript + Vite, Tailwind CSS v4, shadcn/ui, TanStack Query, Zustand, react-router v8, CodeMirror 6, xterm.js, i18next

## Architecture (résumé)

- **Deux flux de données** : *bindings Wails* (requête/réponse) et *`runtime.EventsEmit`* (streaming : logs, terminal, port-forward).
- **Backend** : `ClusterManager` (seul créateur de clients) + packages `k8s`, `exec`, `logs`, `portforward`, `storage`.
- **Frontend** : feature-based, TanStack Query (état serveur) + Zustand (état global minimal : cluster actif + namespace), tables TanStack Table v8.

Détail : [architecture.md](./architecture.md), [decisions.md](./decisions.md).

## État

Étapes 1–4 du MVP implémentées (connexion, exploration, expérience pod, détail deployment + scale + logs agrégés + port-forward). Prochaine étape : **5 — Metrics** (CPU/mémoire via `metrics.k8s.io`).

## Quickstart

```bash
wails dev
```

Prérequis et détails : voir [development.md](./development.md).

## Commandes

- `wails dev` — développement
- `wails build` — build (binaire dans `build/bin/`)
- `wails generate module` — régénérer les bindings TS
- `go test ./...` — tests backend
- `cd frontend && pnpm build` — build frontend

## Structure

```
main.go, app.go, wails.json
internal/            # Go : cluster, k8s, exec, logs, portforward, storage
frontend/src/        # React : components, features, hooks, stores, lib, locales, routes
docs/                # architecture, ADR, conventions, guides (kubernetes, security, development)
```

## Guides

- [architecture.md](./architecture.md) — architecture détaillée
- [kubernetes.md](./kubernetes.md) — gestion kubeconfig/RBAC/namespaces
- [security.md](./security.md) — principes de sécurité
- [development.md](./development.md) — workflow de développement
- [conventions.md](./conventions.md) — conventions de code
- [decisions.md](./decisions.md) — ADR
- [glossary.md](./glossary.md) — glossaire
