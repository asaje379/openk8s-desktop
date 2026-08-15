# Architecture Decisions

> Enregistre les décisions d'architecture clés : date, contexte, options, justification, conséquences.

## ADR-001 — Wails comme framework desktop

- **Date** : 2026-08-15
- **Contexte** : Construire une app desktop (alternative à Lens) pour administrer Kubernetes, sans serveur web externe.
- **Options** : Wails (Go), Electron (Node), Tauri (Rust), backend Node séparé.
- **Décision** : Wails v2 avec backend Go embarqué.
- **Justification** : Go est le langage naturel de `client-go` ; Wails permet un backend Go embarqué dans le binaire (local-first) et un frontend React standard. Electron et Rust sont explicitement exclus par le master-prompt ; un backend Node serait redondant avec le frontend.
- **Conséquences** : binaire unique auto-contenu ; `libwebkit2gtk-4.1` + `libgtk-3` requis sous Linux ; API bindings/events Wails à respecter.

## ADR-002 — client-go pour l'accès Kubernetes

- **Date** : 2026-08-15
- **Contexte** : Interagir avec l'API Kubernetes (ressources, watch, exec, logs, metrics).
- **Décision** : `k8s.io/client-go` (clientset typé + dynamic client + discovery + metrics client).
- **Justification** : bibliothèque officielle, idiomatique Go, gestion native de la watch/SPDY/WebSocket.
- **Conséquences** : aligner la version de client-go sur une version Go récente (>= 1.22) ; maintenir les dépendances `k8s.io/api` / `apimachinery` cohérentes.

## ADR-003 — SQLite via modernc.org/sqlite

- **Date** : 2026-08-15
- **Contexte** : Stockage local (clusters, préférences, références kubeconfig).
- **Options** : `modernc.org/sqlite` (pure Go), `mattn/go-sqlite3` (CGO).
- **Décision** : `modernc.org/sqlite`.
- **Justification** : pure Go, sans CGO → cross-compilation et packaging Wails simplifiés, pas de dépendance gcc/cgo au build de prod.
- **Conséquences** : utiliser `database/sql` directement (pas d'ORM) ; migrations SQL versionnées.

## ADR-004 — CodeMirror 6 pour l'éditeur YAML

- **Date** : 2026-08-15
- **Contexte** : Vue/édition YAML des ressources Kubernetes.
- **Options** : Monaco Editor, CodeMirror 6 (`@codemirror/lang-yaml`).
- **Décision** : CodeMirror 6.
- **Justification** : bien plus léger que Monaco, maintenu activement, mode YAML natif avec lint/highlighting, suffisant pour l'édition de manifests.
- **Conséquences** : bundle frontend réduit ; pas de workers Monaco à configurer.

## ADR-005 — react-router

- **Date** : 2026-08-15
- **Contexte** : Navigation entre les pages (Clusters, Namespaces, Workloads, Pods, etc.).
- **Options** : react-router, TanStack Router.
- **Décision** : react-router (react-router-dom v7).
- **Justification** : standard de facto, stable, simple à intégrer avec Wails + Vite.
- **Conséquences** : routes déclarées dans `src/routes` ; navigation SPA sans rechargement complet.

## ADR-006 — TanStack Query + Zustand léger

- **Date** : 2026-08-15
- **Contexte** : Gestion de l'état des données Kubernetes côté frontend.
- **Décision** : TanStack Query pour tout l'état serveur ; Zustand uniquement pour l'état global minimal (`activeClusterID`, `activeNamespace`, `currentContext`).
- **Justification** : évite de dupliquer les données serveur dans un gros store ; le Watch alimente le cache Query.
- **Conséquences** : query keys factorisées (key factories) ; pas de « mega-store » Zustand.

## ADR-007 — kind pour les tests d'intégration Kubernetes

- **Date** : 2026-08-15
- **Contexte** : Valider les étapes 2–7 sur un vrai cluster, sans données mockées.
- **Options** : kind, minikube, k3d, cluster distant.
- **Décision** : kind (Kubernetes in Docker).
- **Justification** : léger, rapide, reproductible, déjà prévu dans l'environnement Docker local.
- **Conséquences** : dépendance à Docker ; scripts de provisionnement kind + kubeconfig de test dédié.

## ADR-008 — CredentialStore abstrait (SQLite → keychain natif)

- **Date** : 2026-08-15
- **Contexte** : Le kubeconfig contient des secrets (tokens, clés privées).
- **Décision** : interface `CredentialStore` isolée ; implémentation SQLite pour le MVP, remplaçable par le keychain/credential store natif (Keychain macOS, Credential Manager Windows, Secret Service Linux).
- **Justification** : isole la partie sensible pour pouvoir la remplacer sans toucher au reste.
- **Conséquences** : ne jamais logger/afficher les credentials ; chiffrement/stockage à renforcer à terme.

## ADR-009 — Pas de serveur HTTP : bindings Wails + EventsEmit

- **Date** : 2026-08-15
- **Contexte** : Le master-prompt interdit un backend web externe.
- **Décision** : requêtes via les bindings Wails ; flux (watch, logs, terminal) via `runtime.EventsEmit` / `EventsOn`.
- **Justification** : modèle natif Wails ; les skills `rest-api`/`graphql` sont donc non applicables.
- **Conséquences** : tous les appels frontend passent par `wailsjs/go/…` ; pas de CORS/auth HTTP ; le streaming binaire passe par les événements.
