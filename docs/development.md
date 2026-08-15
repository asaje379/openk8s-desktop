# Développement

Workflow de développement et points d'attention techniques.

## Prérequis

- Go ≥ 1.25, Node.js ≥ 20, pnpm, Wails v2.14
- Linux : `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `pkg-config`, `build-essential`
- Docker + kind (tests d'intégration, optionnel)

## Commandes

```bash
wails dev                 # mode dev (hot reload)
wails build               # build de prod (binaire dans build/bin/)
wails generate module     # régénérer frontend/wailsjs/go/* après modif des méthodes bindées
go test ./...             # tests backend
cd frontend && pnpm build # typecheck + build frontend
```

## Points d'attention (pièges connus)

1. **Ubuntu 24.04 / webkit2gtk-4.1** : le projet force `"build:tags": "webkit2_41"` dans `wails.json`. `wails doctor` peut afficher un faux « libwebkit Not Found » — ignorer, le build fonctionne.
2. **Go toolchain** : Wails 2.14 et client-go v0.36 exigent Go récent (1.25/1.26). Le toolchain Go auto-télécharge la version requise (déclaré dans `go.mod`).
3. **pnpm + esbuild** : pnpm bloque les scripts de build par défaut. `pnpm-workspace.yaml` contient `onlyBuiltDependencies: [esbuild]` (approuvé via `pnpm approve-builds --all`).
4. **Wails 2.14 `EventsOn`** : retourne une **fonction de désinscription** (pas de `EventsOff` avec callback).
5. **Slices Go** : toujours `make([]T, 0)` (jamais `nil`) pour que le JSON soit `[]` et non `null`.
6. **Timeout** : pas de `rest.Config.Timeout` global (casse les flux). Utiliser `k8s.withTimeout` pour les requêtes ponctuelles uniquement.

## Ajouter une méthode bindée (backend → frontend)

1. Ajouter la méthode sur `App` (dans `app.go`).
2. `wails generate module` → régénère `frontend/wailsjs/go/main/App.{js,d.ts}` + `models.ts`.
3. Ré-exporter la fonction et/ou le type dans `frontend/src/lib/wails.ts`.

## Ajouter une ressource Kubernetes

1. DTO dans `internal/k8s/types.go`.
2. Fonction de liste/détail dans `internal/k8s/*.go` (avec `withTimeout`).
3. Binding dans `app.go`.
4. Hook dans `frontend/src/hooks/use-k8s.ts` + page dans `frontend/src/features/…` + route dans `routes/index.tsx`.

## Conventions

Voir [conventions.md](./conventions.md). Résumé : Go idiomatique (DI, `context.Context`, DTOs dédiés), React feature-based (TanStack Query + Zustand, shadcn/ui, lazy loading), thème/i18n via tokens.
