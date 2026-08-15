# Instruction de reprise — Étape 5 (Metrics)

À coller tel quel dans une nouvelle session opencode, ou à lire avant de continuer.

---

## Contexte

Tu travailles sur **openk8s-desktop**, une app desktop (alternative à Lens) : **Wails v2.14 + Go + client-go** (backend) / **React 19 + TypeScript + Tailwind v4 + shadcn/ui** (frontend).

Les **étapes 1 à 4** du MVP sont déjà implémentées et commitées (connexion kubeconfig, exploration des ressources, expérience pod avec logs/terminal/port-forward, détail deployment avec scale + logs agrégés).

**Avant de coder**, lis ces fichiers :
1. `docs/architecture.md` — architecture (packages Go, pattern streaming via `EventsEmit`, gestion d'erreurs).
2. `docs/development.md` — commandes + **pièges connus** (webkit2_41, go toolchain, pnpm/esbuild, `EventsOn` retourne une fonction de désinscription, slices Go `make([]T,0)`, pas de `rest.Config.Timeout` global).
3. `docs/decisions.md` — ADR.
4. `.prompts/master-prompt` — §13 (exigences metrics) et §21-22 (structure Go/React).

## Tâche : implémenter l'étape 5 — Metrics CPU/mémoire

Exigences (master-prompt §13) :
- Afficher **CPU** et **mémoire** :
  - **Cluster** : Used / Allocatable.
  - **Nodes** : table (Node, CPU, Memory, Status).
  - **Pods** : (Pod, CPU, Memory).
- Utiliser l'API **`metrics.k8s.io`** (Metrics Server) via client-go.
- **Dégradation gracieuse** : si Metrics Server est absent, afficher clairement « Metrics unavailable — Metrics Server is not available in this cluster » (PAS une erreur fatale).

### Backend (Go)

1. Ajouter l'accès aux métriques. Options : le package `k8s.io/metrics` (clientset `metricsv1beta1.MetricsV1beta1Client`) **ou** le `dynamic.Interface` sur `metrics.k8s.io/v1beta1`. Créer un `*rest.Config` dédié (réutiliser `k8s.RESTConfig` via `ClusterManager.RESTConfig(id)`).
2. **DTOs** dans `internal/k8s/types.go` (JSON camelCase) :
   - `NodeMetrics` (name, cpuUsed, memoryUsed, cpuTotal, memoryTotal) — les totaux viennent de `node.Status.Allocatable`.
   - `PodMetrics` (name, namespace, cpu, memory).
   - `ClusterMetrics` (cpuUsed, cpuTotal, memoryUsed, memoryTotal) — agrégation des nodes.
3. **Fonctions** dans `internal/k8s/metrics.go` : `ListNodeMetrics`, `ListPodMetrics(ns)`, `ClusterMetrics`. Respecter les conventions : `withTimeout(ctx)` (30s) pour ces requêtes ponctuelles, slices `make([]T,0)`.
4. **Bindings** dans `app.go` (ex. `ListNodeMetrics`, `ListPodMetrics`, `GetClusterMetrics`) puis `wails generate module`.

### Frontend (React)

5. Hooks dans `frontend/src/hooks/use-k8s.ts` (query keys `['k8s', clusterId, 'node-metrics']`, etc., `retry: false`).
6. UI : alimenter la page **Dashboard** (cartes CPU/mémoire) et/ou un onglet « Metrics » dans le détail d'un pod ; table nodes. Réutiliser `ResourcePage` + `DataTable`.
7. **Détection Metrics Server absent** : une erreur type `the server could not find the requested resource` (404 sur metrics.k8s.io) → état inline « Metrics unavailable », pas de toast d'erreur.
8. i18n en/fr (`src/locales/{en,fr}.ts`).

### Conventions à respecter

- **Go** : DTOs dédiés (jamais de types client-go bruts dans les bindings), DI, `context.Context`, tests avec `k8s.io/client-go/kubernetes/fake`.
- **Frontend** : hooks dans `use-k8s.ts`, feature-based, TanStack Query (pas de gros store), shadcn/ui, i18n.
- **Vérifier** avant de déclarer terminé : `go test ./...`, `cd frontend && pnpm build`, `wails build`.

### À la fin de l'étape

Fournir le résumé habituel :
```
Implemented / Files changed / Tests / Known limitations / Next step
```

> Rappel sécurité : ne jamais logguer/afficher de credentials ; aucune donnée ne quitte la machine.
