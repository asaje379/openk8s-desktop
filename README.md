# openk8s-desktop

Application desktop (alternative à Lens) pour se connecter et administrer plusieurs clusters Kubernetes depuis une interface graphique moderne et **local-first**.

## Présentation

- Ajout de clusters via kubeconfig (collé ou importé), gestion des contexts, multi-cluster.
- Exploration : namespaces, workloads, pods, services, ingress, configmaps, secrets, events.
- Expérience pod : logs (streaming), terminal interactif, métriques CPU/mémoire, YAML.
- Mises à jour temps réel via Kubernetes Watch (pas de polling permanent).

## Architecture

| Couche | Techno |
|---|---|
| Desktop | Wails v2 (backend Go embarqué dans le binaire) |
| Backend | Go + `client-go`, SQLite (`modernc.org/sqlite`) |
| Frontend | React + TypeScript + Vite, Tailwind CSS v4, shadcn/ui, TanStack Query, Zustand, react-router, CodeMirror 6, xterm.js |

Deux flux de données :
1. **Bindings Wails** (requête/réponse) pour les opérations classiques.
2. **`runtime.EventsEmit`** (push) pour le streaming (Watch, logs, terminal).

Voir [`docs/architecture.md`](docs/architecture.md) et [`docs/decisions.md`](docs/decisions.md) pour le détail (ADR).

## Prérequis

- Go ≥ 1.25 (Wails v2.14 l'exige)
- Node.js ≥ 20 + pnpm
- Wails v2 (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)
- Linux : `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `pkg-config`, `build-essential`
- Docker + kind (tests d'intégration Kubernetes, optionnel)

> **Important (Linux / Ubuntu 24.04)** : Ubuntu 24.04 ne fournit plus `libwebkit2gtk-4.0-dev`. Le projet est configuré pour `webkit2gtk-4.1` via le tag de build `webkit2_41` (déjà renseigné dans `wails.json`).

## Installation

```bash
# Backend (dépendances Go)
go mod download

# Frontend
cd frontend
pnpm install
```

## Développement

```bash
# Lancer l'app en mode dev (hot reload frontend + backend)
wails dev

# Générer les bindings TypeScript après modification des méthodes bindées
wails generate module
```

## Build

```bash
wails build
# binaire produit dans build/bin/openk8s-desktop
```

## Tests

```bash
# Backend
go test ./...

# Frontend
cd frontend && pnpm build
```

> Les tests unitaires/Playwright seront ajoutés à l'étape 2 (backend) et au fil des étapes.

## Structure du projet

```
main.go, app.go, wails.json     # point d'entrée Wails, surface de binding
internal/
  cluster/                       # ClusterManager, kubeconfig, contexts
  k8s/                           # wrappers client-go (resources, watch, metrics, events, logs)
  exec/                          # sessions exec/terminal
  storage/                       # SQLite + CredentialStore (keychain plus tard)
  api/                           # DTOs + noms d'événements
frontend/src/
  app/  components/  features/   # React : layout, ui, features métier
  stores/  hooks/  lib/  types/  routes/
docs/                            # architecture, conventions, décisions (ADR)
```

## Gestion des kubeconfigs

- Import par collage ou chargement d'un fichier kubeconfig.
- Plusieurs contexts par kubeconfig, switch de contexte, test de connexion.
- Connexion à **EKS / AKS / GKE** via les mécanismes d'authentification kubeconfig standard (pas d'intégration cloud spécifique dans le MVP).
- Les credentials sont traités comme des secrets (jamais loggés/affichés) et isolés derrière une interface `CredentialStore` remplaçable par le keychain natif.

## Limitations connues

- MVP en cours : la connexion/exploration Kubernetes (Étape 2) n'est pas encore implémentée ; l'UI actuelle est un squelette fonctionnel (layout + routing + bindings de base).
- L'édition YAML, le terminal, les métriques et le Watch arrivent aux étapes suivantes.
- Le lancement graphique nécessite un serveur d'affichage (X11/Wayland) ; le build `wails build` est la vérification CI en environnement headless.
