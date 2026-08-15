# Architecture

> Application desktop Kubernetes (alternative à Lens) — **openk8s-desktop**

## Stack

- **Desktop** : Wails v2 (backend Go embarqué dans le binaire)
- **Backend** : Go + client-go (`k8s.io/client-go`), SQLite (`modernc.org/sqlite`)
- **Frontend** : React + TypeScript + Vite, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, react-router, CodeMirror 6 (éditeur YAML), xterm.js (terminal)
- **Local-first** : aucune donnée Kubernetes ne quitte la machine de l'utilisateur. Pas de serveur HTTP externe.

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                    Desktop Application                     │
│                         Wails                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 React + TypeScript                    │  │
│  │  Dashboard / Clusters / Namespaces / Workloads        │  │
│  │  Pods / Services / Ingress / ConfigMaps / Secrets     │  │
│  │  Logs / Terminal / Events / Metrics                   │  │
│  └──────────────────────────┬────────────────────────────┘  │
│                             │ bindings (req/resp)           │
│                             │ + runtime.EventsEmit (push)   │
│                             ▼                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                       Go Backend                      │  │
│  │  ClusterManager · KubeconfigManager · Kubernetes      │  │
│  │  ResourceManager · LogsManager · ExecManager          │  │
│  │  MetricsManager · EventsManager · WatchManager        │  │
│  │  Storage (SQLite) · CredentialStore                   │  │
│  └──────────────────────────┬────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              ▼
                    Kubernetes API Server
```

## Structure du projet

```
openk8s-desktop/
├── main.go                  # point d'entrée Wails + composition root (DI manuelle)
├── app.go                   # struct App = surface de binding Wails (méthodes fines)
├── wails.json               # configuration Wails
├── go.mod / go.sum
├── internal/
│   ├── cluster/             # cluster.go, manager.go, kubeconfig.go, context.go
│   ├── k8s/                 # client.go, discovery.go, resources.go, watch.go,
│   │                        # pods.go, workloads.go, services.go, ingress.go,
│   │                        # metrics.go, events.go, logs.go
│   ├── exec/                # session.go (exec interactif + resize)
│   ├── storage/             # sqlite.go, credential_store.go
│   └── api/                 # dto.go, events.go (noms d'événements)
├── frontend/
│   ├── src/
│   │   ├── app/             # router, layout
│   │   ├── components/
│   │   │   ├── ui/          # shadcn/ui
│   │   │   ├── layout/      # sidebar, topbar
│   │   │   ├── tables/      # DataTable (TanStack Table)
│   │   │   ├── yaml/        # CodeMirror viewer/editor
│   │   │   ├── logs/        # viewer streaming
│   │   │   └── terminal/    # xterm.js
│   │   ├── features/        # clusters, namespaces, workloads, pods, services,
│   │   │                    # ingress, configmaps, secrets, events, metrics
│   │   ├── stores/          # Zustand (léger)
│   │   ├── hooks/           # useWailsEvent, wrappers TanStack Query
│   │   ├── lib/             # bindings générés, event bus
│   │   ├── types/           # types générés depuis les DTO Go
│   │   └── routes/
├── docs/
└── tests/
```

## Backend Go — responsabilités

| Module | Responsabilité |
|---|---|
| `internal/cluster` | `ClusterManager` : liste/ajout/suppression des connexions, test de connexion, gestion des contexts, création et mise en cache des `*kubernetes.Clientset`. Seul point de création des clients (garantit l'isolation multi-cluster). |
| `internal/k8s` | Wrappers client-go : accès typé (pods, workloads, services, ingress), accès générique via `dynamic.Interface` + `discovery` (GVR/Kind/Namespaced), métriques (`metrics.k8s.io`), événements, logs. |
| `internal/k8s/watch.go` | `WatchManager` : traduit `watch.Interface` → `runtime.EventsEmit("k8s:changed", …)` avec gestion `resourceVersion`, timeout, reconnexion backoff. |
| `internal/exec` | Sessions exec interactives (stdin/stdout/stderr, resize, fermeture propre). |
| `internal/storage` | Interface `Store` (clusters, préférences) + interface `CredentialStore` (kubeconfig) → implémentation SQLite aujourd'hui, keychain natif plus tard. |
| `internal/api` | DTOs Go (JSON) + noms d'événements. Source de vérité pour les types TS générés par `wails generate module`. |

### Principes Go

- Go idiomatique, **pas de sur-engineering** : interfaces uniquement quand elles apportent une vraie valeur (ex. `ClusterManager`, `CredentialStore`).
- Dependency injection par constructeur, wiring manuel dans `main.go` (composition root).
- `context.Context` + cancellation partout (requêtes, watch, exec, logs).
- Erreurs explicites et typées ; redaction des secrets dans les logs.
- Multi-cluster : chaque méthode bindée reçoit un `clusterID` explicite ; clients stockés sous `sync.RWMutex` dans `ClusterManager`.

## Frontend React — responsabilités

- **TanStack Query** = source de vérité des données serveur (requêtes → bindings Wails). Jamais de duplication dans un store global.
- **Zustand (léger)** : uniquement `activeClusterID`, `activeNamespace`, `currentContext`.
- **DataTable** (TanStack Table) : listes triables/filtrables (namespace, status, node, recherche).
- **Watch** : les événements `k8s:changed` alimentent `queryClient.setQueryData` / `invalidateQueries`.
- **Terminal** : xterm.js relié à la session exec Go via un événement duplex dédié.
- **Logs** : composant streaming (follow, timestamps, recherche, download) branché sur `EventsEmit`.

## Flux de données

Deux canaux distincts :

1. **Request/response** (bindings Wails) : `App.GetNamespaces(clusterID)`, `App.GetPods(clusterID, ns)`, … → `wailsjs/go/main/App`.
2. **Streaming push** (`runtime.EventsEmit` + `EventsOn`) : Watch (`k8s:changed`), logs, terminal. Le binaire long n'est pas adapté aux bindings classiques.

```
Kubernetes Watch → WatchManager (Go) → EventsEmit("k8s:changed")
    → React EventsOn → TanStack Query setQueryData → UI
```

## Stockage & sécurité

- **SQLite** (`modernc.org/sqlite`, pure Go, sans CGO) : clusters, contexte sélectionné, préférences, favoris.
- **CredentialStore** : interface isolée pour le kubeconfig, remplaçable par le keychain/credential store natif (ADR-008).
- Ne jamais logger ni afficher : tokens, certificats privés, client keys, credentials, valeurs de Secrets.
- Secrets : valeurs masquées par défaut ; `Reveal value` explicite avec avertissement.
- RBAC du cluster respecté ; erreurs `Forbidden` transformées en message compréhensible.
