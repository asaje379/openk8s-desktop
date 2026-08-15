# openk8s-desktop

Application desktop **local-first** (alternative à Lens) pour se connecter et administrer plusieurs clusters Kubernetes depuis une interface graphique moderne.

## État du projet (MVP en cours)

**Étapes 1 à 4 implémentées.** À faire ensuite : metrics CPU/mémoire (étape 5), ConfigMaps/Secrets + éditeur YAML (étape 6), Kubernetes Watch (étape 7), polish (étape 8).

### Fonctionnalités disponibles

- **Connexion** : import de kubeconfig (collé ou détection des kubeconfigs locaux `~/.kube/config` + `$KUBECONFIG`), multi-contexte, switch de contexte, test de connexion, multi-cluster (cluster actif persisté).
- **Exploration** : Nodes, Namespaces (gestion manuelle pour les clusters à RBAC restreint), Workloads (Deployments/StatefulSets/DaemonSets/Jobs/CronJobs), Pods, Services, Ingress — avec filtre de namespace global dans la topbar.
- **Détail Pod** : Overview, Containers, Logs (streaming), Terminal (xterm.js), Events, YAML, **Port-forward**.
- **Détail Deployment** : Overview (+ **scale**), Pods, **Logs agrégés** de tous les pods, Events, YAML.
- **UX** : thème clair/sombre (design system Stitch), i18n en/fr, tooltips, toasts, gestion d'erreurs (ErrorBoundary + toasts), code-splitting.

## Stack

| Couche | Techno |
|---|---|
| Desktop | Wails v2.14 (backend Go embarqué) |
| Backend | Go + `client-go`, SQLite (`modernc.org/sqlite`) |
| Frontend | React 19 + TypeScript + Vite, Tailwind CSS v4, shadcn/ui, TanStack Query, Zustand, react-router v8, CodeMirror 6, xterm.js |

Voir [`docs/architecture.md`](docs/architecture.md), [`docs/decisions.md`](docs/decisions.md) et le reste de [`docs/`](docs/).

## Prérequis

- Go ≥ 1.25 (Wails v2.14 l'exige) — le toolchain Go gère l'auto-download des versions requises
- Node.js ≥ 20 + pnpm
- Wails v2 (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)
- Linux : `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `pkg-config`, `build-essential`
- Docker + kind (tests d'intégration Kubernetes, optionnel)

> **Important (Ubuntu 24.04)** : pas de `libwebkit2gtk-4.0-dev`. Le projet utilise `webkit2gtk-4.1` via `"build:tags": "webkit2_41"` dans `wails.json` (déjà configuré). `wails doctor` peut afficher un faux négatif « libwebkit Not Found » — le build reste OK.

## Développement

```bash
wails dev                      # hot reload frontend + backend
wails generate module          # régénérer les bindings TS après modification des méthodes bindées
```

## Build & tests

```bash
wails build                    # binaire dans build/bin/openk8s-desktop
go test ./...                  # tests backend (fake clientset)
cd frontend && pnpm build      # build frontend (tsc + vite)
```

## Structure

```
main.go, app.go, wails.json     # point d'entrée Wails + surface de binding
internal/
  cluster/                       # ClusterManager, kubeconfig, contexts, kubeconfigs locaux
  k8s/                           # wrappers client-go (DTOs + list/get/scale)
  exec/                          # sessions exec/terminal (SPDY)
  logs/                          # streaming de logs (1 pod ou agrégé multi-pods)
  portforward/                   # port-forward (SPDY)
  storage/                       # SQLite + mémoire (ClusterStore/CredentialStore)
frontend/src/
  components/                    # ui, layout, tables, logs, terminal, yaml, portforward, …
  features/                      # clusters, nodes, namespaces, workloads, pods, services, ingress
  hooks/  stores/  lib/  locales/  routes/
docs/                            # architecture, décisions (ADR), conventions, guides
```

## Sécurité

Local-first, credentials traités comme des secrets (jamais loggés/affichés), RBAC respecté, kubeconfig stocké derrière une abstraction `CredentialStore` remplaçable par le keychain natif. Voir [`docs/security.md`](docs/security.md).
