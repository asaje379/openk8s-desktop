# openk8s-desktop

App desktop **local-first** (alternative à Lens) pour administrer plusieurs clusters Kubernetes.

## Stack

- **Desktop** : Wails v2.14 (backend Go embarqué dans le binaire)
- **Backend** : Go + `client-go` v0.36, SQLite (`modernc.org/sqlite`)
- **Frontend** : React 19 + TypeScript + Vite, Tailwind v4, shadcn/ui, TanStack Query, Zustand, react-router v8, CodeMirror 6, xterm.js, i18next

## État

MVP **étapes 1 à 8** implémentées : connexion kubeconfig (collé + détection `~/.kube/config`/`$KUBECONFIG`), multi-cluster, exploration (nodes, namespaces manuels RBAC, workloads, pods, services, ingress, configmaps, secrets, events), expérience pod (détail, logs streaming, terminal, port-forward, events, YAML), détail deployment (scale + logs agrégés), **métriques CPU/mémoire** (Metrics Server, dégradation gracieuse), **ConfigMaps/Secrets** (liste, détail, édition YAML + apply/delete, valeurs Secrets masquées), **watch temps réel** (list + re-list débouncée, `WatchProvider` → cache Query), **recherche globale** (Ctrl+K).

**Reste pour finaliser le MVP** : polish UX (états vides/loading, erreurs, packaging). Voir `.prompts/master-prompt` §8 (polish) et §32 (critères).

## Commandes

```bash
wails dev                 # mode dev (hot reload)
wails build               # build (binaire dans build/bin/)
wails generate module     # régénérer les bindings TS après modif des méthodes bindées
go test ./...             # tests backend
cd frontend && pnpm build # typecheck + build frontend
```

## Points d'attention (pièges connus)

- **Ubuntu 24.04** : `"build:tags": "webkit2_41"` dans `wails.json` (pas de `webkit2gtk-4.0-dev`). `wails doctor` peut afficher un faux « libwebkit Not Found » — le build reste OK.
- **Go toolchain** : Wails 2.14 et client-go v0.36 exigent Go ≥ 1.25/1.26 ; le toolchain auto-télécharge la version requise.
- **pnpm/esbuild** : `pnpm-workspace.yaml` contient `onlyBuiltDependencies: [esbuild]`.
- **Wails 2.14 `EventsOn`** : retourne une **fonction de désinscription** (pas de `EventsOff` avec callback).
- **Slices Go** : toujours `make([]T, 0)` (jamais `nil` → JSON `[]`, pas `null`).
- **Timeout** : pas de `rest.Config.Timeout` global (casse les flux logs/exec/port-forward). Utiliser `k8s.withTimeout` (30s) uniquement pour les requêtes ponctuelles.

## Conventions

- **Go** : DTOs dédiés (jamais de types client-go bruts dans les bindings), DI, `context.Context`, tests `k8s.io/client-go/kubernetes/fake`. Packages `internal/{cluster,k8s,exec,logs,portforward,storage}`.
- **Frontend** : feature-based (`src/features/…`), TanStack Query (état serveur, hooks dans `hooks/use-k8s.ts`) + Zustand minimal (`activeCluster`, `activeNamespace`), shadcn/ui, i18n en/fr. Code-splitting (routes + composants lourds en `React.lazy`).
- **Streaming** : bindings `Start*` → id de session + événements `EventsEmit` (logs/terminal/port-forward).
- **Erreurs** : mutations → toast global ; queries → état inline (`ResourcePage`) ; crash → `ErrorBoundary`.
- **Vérifier avant de terminer** : `go test ./...`, `pnpm build`, `wails build`.

## Docs

`docs/architecture.md`, `docs/development.md`, `docs/decisions.md` (ADR), `docs/kubernetes.md`, `docs/security.md`, `docs/conventions.md`, `.prompts/master-prompt`.
