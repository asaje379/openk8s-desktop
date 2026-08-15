# Architecture

> Application desktop Kubernetes (alternative à Lens) — **openk8s-desktop**

## Stack

- **Desktop** : Wails v2.14 (backend Go embarqué dans le binaire)
- **Backend** : Go + client-go, SQLite (`modernc.org/sqlite`, pure Go, sans CGO)
- **Frontend** : React 19 + TypeScript + Vite, Tailwind CSS v4, shadcn/ui, TanStack Query, Zustand, react-router v8, CodeMirror 6, xterm.js, i18next

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                    Desktop Application                     │
│                         Wails                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 React + TypeScript                    │  │
│  │  Dashboard / Clusters / Nodes / Namespaces            │  │
│  │  Workloads / Pods / Services / Ingress                │  │
│  │  Logs / Terminal / Port-forward / Events / YAML       │  │
│  └──────────────────────────┬────────────────────────────┘  │
│                             │ bindings (req/resp)           │
│                             │ + runtime.EventsEmit (push)   │
│                             ▼                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                       Go Backend                      │  │
│  │  ClusterManager · k8s · logs · exec · portforward     │  │
│  │  storage (SQLite)                                     │  │
│  └──────────────────────────┬────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              ▼
                    Kubernetes API Server
```

## Deux flux de données

1. **Request/response (bindings Wails)** : méthodes Go exposées (`ListPods`, `GetDeployment`, …) → `frontend/wailsjs/go/main/App`. Les types Go (avec tags JSON) génèrent des types TS (`frontend/wailsjs/go/models.ts`).
2. **Streaming (push via `runtime.EventsEmit`)** : logs (`logs:data/error/end`), terminal (`exec:output/error/end`), port-forward (`portforward:ready/error/end`), watch (`watch:data/error/end`). Le frontend s'abonne via `EventsOn` (qui retourne une fonction de désinscription).

## Backend Go — packages

| Package | Responsabilité |
|---|---|
| `internal/cluster` | `ClusterManager` : cycle de vie des connexions (add/remove/test/switch/validate), import de kubeconfigs locaux, namespaces sauvegardés, cache des clients en mémoire (`sync.RWMutex`). **Seul créateur** de `kubernetes.Interface` et `*rest.Config`. |
| `internal/k8s` | Wrappers client-go : DTOs compacts (`types.go`) + fonctions de liste/détail/scale (namespaces, nodes, pods, workloads, services, ingress, events, deployment, configmaps, secrets) + **métriques** (`metrics.go`, via `k8s.io/metrics`). Timeout de 30s sur les requêtes ponctuelles via `withTimeout`. |
| `internal/logs` | `LogsManager` : streaming de logs (1 pod ou **multi-pods agrégés** pour les deployments, lignes préfixées `[pod] `). |
| `internal/exec` | `ExecManager` : sessions exec interactives SPDY (stdin/stdout/stderr, resize). |
| `internal/portforward` | `PortForwardManager` : port-forward SPDY (local→pod). |
| `internal/watch` | `WatchManager` : watch de ressources (list initiale + re-list débouncée sur chaque événement), émet `watch:data/error/end`. |
| `internal/storage` | `SQLiteStore` (implémente `ClusterStore` + `CredentialStore`) + `MemoryStore` (tests/fallback). |

### Pattern streaming (logs/exec/port-forward)

Chaque manager gère des sessions concurrentes (`map[id]context.CancelFunc`) :
1. le frontend appelle un binding `Start*` → renvoie un **id de session** ;
2. le backend lance une goroutine et **émet** des événements (`EventsEmit`) ;
3. le frontend contrôle via `Stop*`/`Write*`/`Resize*` (annulation par `context.WithCancel`).

Les flux (logs follow, exec, port-forward) n'ont **pas** de timeout global (contrairement aux requêtes ponctuelles).

## Frontend React

- **Feature-based** : `features/{clusters,nodes,namespaces,workloads,pods,services,ingress,configmaps,secrets,events,metrics}`.
- **État serveur** : TanStack Query (`hooks/use-k8s.ts`, query keys hiérarchiques `['k8s', clusterId, …]`).
- **État global minimal** : Zustand (`activeCluster`, `activeNamespace` persistés ; `searchOpen` pour la palette) .
- **Composants partagés** : `tables/data-table` (TanStack Table v8), `logs/log-viewer`, `terminal/terminal-view`, `yaml/yaml-viewer` (CodeMirror), `yaml/yaml-editor` (édition + apply), `portforward/port-forward`, `search/command-palette` (Ctrl+K), shadcn/ui.
- **Code-splitting** : routes lazy + `TerminalView`/`YamlViewer`/`YamlEditor` lazy (xterm/CodeMirror chargés à la demande).
- **Temps réel** : `WatchProvider` (monté dans `AppLayout`) démarre des watchs par cluster/namespace actif et alimente le cache TanStack Query (`setQueryData`) sur chaque `watch:data`.

## Gestion d'erreurs

- **Render crash** → `ErrorBoundary` (page d'erreur + retour accueil).
- **Erreurs de mutations (actions)** → toast global (`MutationCache.onError`).
- **Erreurs de queries (chargement)** → état inline (`ResourcePage`) avec message `Forbidden` friendly + retry.

## Multi-cluster & RBAC

- Chaque binding reçoit un `clusterID` explicite ; le `ClusterManager` résout le bon client (pas de mélange entre clusters).
- **RBAC restreint supporté** : l'utilisateur ajoute manuellement les namespaces accessibles (page Namespaces + sélecteur global dans la topbar) ; les listes cluster-scope interdites affichent proprement « Accès refusé ».
