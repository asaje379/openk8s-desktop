# Project Index — openk8s-desktop

> Application desktop (alternative à Lens) pour se connecter et administrer plusieurs clusters Kubernetes.

## Stack

- **Desktop** : Wails v2 (backend Go embarqué)
- **Backend** : Go + client-go, SQLite (`modernc.org/sqlite`)
- **Frontend** : React + TypeScript + Vite, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, react-router, CodeMirror 6, xterm.js

## Architecture

- Wails desktop : backend Go embarqué dans le binaire, frontend React.
- Deux flux : **bindings** (requête/réponse) et **EventsEmit** (watch, logs, terminal).
- Multi-cluster : chaque appel bindé reçoit un `clusterID` ; clients mis en cache dans `ClusterManager`.
- Local-first, secrets jamais loggés/affichés, RBAC respecté.

Voir [architecture.md](./architecture.md) et [decisions.md](./decisions.md).

## Prérequis

- Go (>= 1.22, recommandé 1.23+)
- Node.js + pnpm
- Wails v2
- Linux : `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`
- Docker + kind (tests d'intégration Kubernetes)

## Commandes clés

- `wails dev` — développement (frontend + backend + hot reload)
- `wails build` — build de production
- `go test ./...` — tests backend
- `pnpm test` — tests frontend (Vitest)
- `pnpm lint` / `pnpm typecheck` — qualité frontend
- `kind create cluster` — cluster de test

## Structure

```
main.go, app.go, wails.json
internal/            # Go : cluster, k8s, exec, storage, api
frontend/src/        # React : app, components, features, stores, hooks, lib, types, routes
docs/                # documentation + ADR
tests/               # tests e2e / intégration
```

## Conventions essentielles

- Go idiomatique, interfaces seulement si utiles, DI par constructeur, `context.Context` partout.
- Frontend : feature-based, TanStack Query pour l'état serveur, Zustand minimal.
- Voir [conventions.md](./conventions.md).
