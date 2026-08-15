# openk8s-desktop

Application desktop **local-first** (alternative à Lens) pour se connecter et administrer plusieurs clusters Kubernetes depuis une interface graphique moderne, rapide et sécurisée.

> **Statut : bêta (`v0.2.0-beta.1`)** — le MVP (étapes 1 à 8) est complet et fonctionnel. Prochaine étape : packaging/installers par système (Linux, macOS, Windows).

## Fonctionnalités

### Connexion & multi-cluster
- Import de kubeconfig : **collé** ou détection des kubeconfigs locaux (`~/.kube/config`, `$KUBECONFIG`).
- Multi-contexte, sélection/switch de contexte, test de connexion, multi-cluster (cluster actif persisté).
- Compatible EKS / AKS / GKE / clusters locaux (kind, minikube) — aucun prérequis cloud spécifique, tout passe par kubeconfig.

### Exploration
- **Nodes**, **Namespaces** (gestion manuelle pour les clusters à RBAC restreint), **Workloads** (Deployments, StatefulSets, DaemonSets, Jobs, CronJobs), **Pods**, **Services**, **Ingress**, **ConfigMaps**, **Secrets**, **Events**.
- Filtre de namespace global dans la topbar ; recherche/tri dans les tables.

### Expérience Pod
- Détail (overview, containers, labels), **logs streaming** (suivi temps réel, timestamps, recherche, copie, téléchargement), **terminal interactif** (xterm.js), **events**, **YAML**, **port-forward**.

### Workloads & Config
- Détail Deployment (overview, **scale**, pods, **logs agrégés** multi-pods, events, YAML).
- **ConfigMaps/Secrets** : liste, détail, **édition YAML + apply/delete** ; valeurs de Secrets **masquées par défaut** (révélation explicite).

### Métriques
- **CPU / mémoire** : cluster (`used / allocatable`), nodes, pods — via `metrics.k8s.io` (Metrics Server), avec **dégradation gracieuse** (message clair si Metrics Server absent, fallback namespace-scope si les métriques de nœuds sont interdites).

### Temps réel
- **Kubernetes Watch** : mise à jour automatique de l'interface (list + re-list débouncée), reconnexion/resync gérés.

### UX
- **Recherche globale** (Ctrl+K), thème clair/sombre (design system « Stitch »), i18n **en/fr**, gestion d'erreurs (ErrorBoundary + toasts + états inline), code-splitting.

## Stack

| Couche | Techno |
|---|---|
| Desktop | Wails v2.14 (backend Go embarqué dans le binaire) |
| Backend | Go + `client-go`, SQLite (`modernc.org/sqlite`) |
| Frontend | React 19 + TypeScript + Vite, Tailwind CSS v4, shadcn/ui, TanStack Query, Zustand, react-router v8, CodeMirror 6, xterm.js, i18next |

Voir [`docs/architecture.md`](docs/architecture.md), [`docs/decisions.md`](docs/decisions.md) (ADR) et le reste de [`docs/`](docs/).

## Installation

### Télécharger les installers (recommandé)

Les binaires et installers officiels seront publiés sur la [page Releases GitHub](https://github.com/asaje379/openk8s-desktop/releases) :

- **Linux** : `.deb`, `.tar.gz` (AppImage à venir).
- **macOS** : `.app` (universel Intel + Apple Silicon, distribué en `.zip`).
- **Windows** : installeur NSIS `.exe`.

### Build depuis les sources

Prérequis :

- Go ≥ 1.25 (le toolchain Go gère l'auto-download des versions requises)
- Node.js ≥ 20 + pnpm
- Wails v2 (`go install github.com/wailsapp/wails/v2/cmd/wails@v2.14.0`)
- Linux : `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `pkg-config`, `build-essential`

> **Important (Ubuntu 24.04)** : pas de `libwebkit2gtk-4.0-dev`. Le projet utilise `webkit2gtk-4.1` via `"build:tags": "webkit2_41"` dans `wails.json` (déjà configuré). `wails doctor` peut afficher un faux négatif « libwebkit Not Found » — le build reste OK.

```bash
git clone https://github.com/asaje379/openk8s-desktop.git
cd openk8s-desktop
pnpm --dir frontend install
wails build
```

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

## Release & installers

Voir [`docs/development.md`](docs/development.md#release--installers) et `.github/workflows/release.yml`. En résumé :

- **Windows** (depuis Linux/Windows) : `wails build -platform windows/amd64 -nsis` (nécessite `makensis`).
- **macOS** (sur macOS uniquement) : `wails build -platform darwin/universal` puis `zip` du `.app` (`ditto -c -k …`).
- **Linux** (sur Linux) : `wails build -platform linux/amd64` puis `scripts/package-linux.sh` (produit `.tar.gz` + `.deb`).

La release est automatisée par **GitHub Actions** (workflow `release` sur tag `v*`), qui construit et publie les artefacts sur les trois OS.

## Structure

```
main.go, app.go, wails.json     # point d'entrée Wails + surface de binding
internal/
  cluster/                       # ClusterManager, kubeconfig, contexts, kubeconfigs locaux
  k8s/                           # wrappers client-go (DTOs + list/get/scale/apply + metrics + search)
  exec/                          # sessions exec/terminal (SPDY)
  logs/                          # streaming de logs (1 pod ou agrégé multi-pods)
  portforward/                   # port-forward (SPDY)
  watch/                         # watch Kubernetes (list + re-list débouncée)
  storage/                       # SQLite + mémoire (ClusterStore/CredentialStore)
frontend/src/
  components/                    # ui, layout, tables, logs, terminal, yaml, search, watch, portforward, …
  features/                      # clusters, nodes, namespaces, workloads, pods, services, ingress, configmaps, secrets, events, metrics
  hooks/  stores/  lib/  locales/  routes/
scripts/                         # packaging (linux)
docs/                            # architecture, décisions (ADR), conventions, guides
```

## Sécurité

Local-first, credentials traités comme des secrets (jamais loggés/affichés), RBAC respecté, kubeconfig stocké derrière une abstraction `CredentialStore` remplaçable par le keychain natif. Voir [`docs/security.md`](docs/security.md).

## Licence

Voir [`LICENSE`](LICENSE) (à ajouter).
