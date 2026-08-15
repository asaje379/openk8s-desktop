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

## ADR-010 — Thème clair/sombre via stratégie `class` + variables CSS

- **Date** : 2026-08-15
- **Contexte** : offrir un mode clair commutable en plus du mode sombre par défaut.
- **Options** : stratégie Tailwind `media` (OS uniquement), stratégie `class` (bascule JS), CSS variables.
- **Décision** : stratégie `class` (`.dark` sur `<html>`), trois états `light`/`dark`/`system`, `ThemeProvider` (React Context), préférence persistée en `localStorage`, script inline anti-FOUC dans `index.html`.
- **Justification** : la stratégie `class` permet un toggle manuel (recommandé par `tailwind-design-system`) ; les tokens couleurs sont déjà définis en variables CSS (`:root`/`.dark`) mappées via `@theme inline`.
- **Conséquences** : toute nouvelle couleur doit être définie en variable CSS + variante `.dark` ; le thème initial suit l'OS puis le choix utilisateur.

## ADR-011 — Internationalisation en/fr via i18next

- **Date** : 2026-08-15
- **Contexte** : support de la traduction en/fr dans le frontend.
- **Options** : i18next + react-i18next, bibliothèque custom, react-intl.
- **Décision** : `i18next` + `react-i18next` + `i18next-browser-languagedetector`.
- **Justification** : standard de facto, riche en fonctionnalités (pluriels, interpolation, lazy loading), détection de langue (`navigator` + `localStorage`) adaptée au webview Wails.
- **Conséquences** : traductions centralisées dans `frontend/src/locales/{en,fr}.ts` (namespace `translation`) ; toute chaîne visible doit passer par `useTranslation()` ; la langue est persistée en `localStorage`.

## ADR-012 — Design system issu du dossier Google Stitch

- **Date** : 2026-08-15
- **Contexte** : remplacer le thème monochrome initial par un design plus coloré et élégant, basé sur la proposition générée par Google Stitch (`stitch_openk8s_desktop/`).
- **Décision** : adopter la palette Stitch (fond navy `#0b1326`, Kubernetes blue `#326ce5`/`#b2c5ff`, émeraude `#4edea3`, ambre `#ffb95f`, rose `#ffb4ab`) mappée sur les tokens shadcn (Tailwind v4 CSS variables) en modes clair/sombre ; typo **Inter** (UI) + **JetBrains Mono** (code/données techniques) auto-hébergées via `@fontsource` ; badges pill semi-transparents (`bg-<color>/15 text-<color> border-<color>/30`) ; sidebar avec indicateur actif bleu (barre gauche + fond translucide).
- **Justification** : cohérence avec la proposition Stitch (validée par l'utilisateur), palette « Corporate/Modern » adaptée au monitoring longue durée, conformité `tailwind-design-system` (tokens en variables CSS, variantes dark, contraste WCAG).
- **Conséquences** : nouvelles variables `--success`/`--warning` (+ `success-foreground`/`warning-foreground`) ; police `font-sans` par défaut, `font-mono` pour les données techniques ; toute nouvelle couleur doit passer par un token.

## ADR-013 — Streaming via `runtime.EventsEmit` (logs, exec, port-forward)

- **Date** : 2026-08-15
- **Contexte** : logs en temps réel, terminal interactif et port-forward nécessitent un flux bidirectionnel continu, non adapté aux bindings requête/réponse.
- **Décision** : les bindings `Start*` renvoient un **id de session** ; le backend émet des événements (`logs:data/error/end`, `exec:output/error/end`, `portforward:ready/error/end`) ; le frontend contrôle via `Stop*`/`Write*`/`Resize*`. Chaque manager gère `map[id]context.CancelFunc`.
- **Justification** : modèle natif Wails pour le push ; cancellation propre via `context.WithCancel`.
- **Conséquences** : les flux n'ont **pas** de timeout global (`rest.Config.Timeout` retiré) ; `EventsOn` (Wails 2.14) retourne une fonction de désinscription.

## ADR-014 — Logs agrégés d'un Deployment (multi-pods)

- **Date** : 2026-08-15
- **Contexte** : voir les logs de tous les pods d'un deployment en un seul flux (comme `kubectl logs deployment/foo`).
- **Décision** : `LogsManager.StartMulti` (un stream par pod, lignes préfixées `[pod] `, un seul `logs:end` quand tous sont terminés) + binding `StartDeploymentLogStream` qui résout les pods via le sélecteur du deployment.
- **Conséquences** : page de détail Deployment (Overview/Pods/Logs/Events/YAML) ; le `LogViewer` accepte `pod` **ou** `deployment`.

## ADR-015 — Code-splitting (lazy loading)

- **Date** : 2026-08-15
- **Contexte** : le bundle initial approchait 1.44 MB (xterm + CodeMirror).
- **Décision** : routes lazy (`React.lazy` + `Suspense`) + `TerminalView`/`YamlViewer` lazy au niveau des onglets.
- **Conséquences** : bundle principal ~579 KB ; xterm (~332 KB) et CodeMirror (~422 KB) chargés à l'ouverture de l'onglet correspondant.

## ADR-016 — Gestion manuelle des namespaces (RBAC restreint)

- **Date** : 2026-08-15
- **Contexte** : certains clusters n'autorisent que l'accès namespace-scopé (listes cluster-scope interdites : `nodes`, `namespaces`, listes « all namespaces »).
- **Décision** : namespaces **sauvegardés par cluster** (SQLite) ajoutés manuellement (comme dans Lens) ; sélecteur de namespace global dans la topbar ; défaut = premier namespace sauvegardé ; erreurs `Forbidden` affichées inline (« Accès refusé ») et non en toast.
- **Conséquences** : `ClusterManager` expose `ListSavedNamespaces`/`AddNamespace`/`RemoveNamespace` ; les requêtes de liste ont `retry: false` côté frontend.

## ADR-017 — Métriques via le clientset typé `k8s.io/metrics`

- **Date** : 2026-08-15
- **Contexte** : afficher CPU/mémoire (cluster, nodes, pods) via l'API `metrics.k8s.io` (Metrics Server), avec dégradation gracieuse si le serveur est absent.
- **Options** : clientset typé `k8s.io/metrics` (`metricsv1beta1`) ; client `dynamic.Interface` sur `metrics.k8s.io/v1beta1` ; parsing manuel des `unstructured`.
- **Décision** : clientset typé `k8s.io/metrics` (dépendance alignée sur client-go v0.36.3), construit à partir d'un `*rest.Config` dédié via `ClusterManager.RESTConfig(id)`.
- **Justification** : typage fort (pas de parsing `unstructured`/`Quantity` manuel), API idiomatique client-go, tests via le fake `metricsfake.NewSimpleClientset`.
- **Conséquences** : nouvelle dépendance `k8s.io/metrics` ; les totaux (Allocatable) viennent de `node.Status.Allocatable` via le clientset core ; erreur « could not find the requested resource » traitée côté frontend comme « Metrics unavailable » (pas d'erreur fatale) ; DTOs avec valeurs affichables + valeurs numériques (millicores/octets) pour les barres de progression. **Dégradation RBAC** : si `nodemetrics.metrics.k8s.io` est interdit au scope cluster, `GetClusterMetrics` retombe sur l'agrégation des `pods.metrics.k8s.io` des namespaces sauvegardés (used seul, `totalsAvailable=false`).

## ADR-018 — ConfigMaps/Secrets : édition YAML + apply (upsert)

- **Date** : 2026-08-15
- **Contexte** : étapes 6 — lister/détailler ConfigMaps et Secrets, éditer via YAML, appliquer et supprimer.
- **Décision** : clientset typé (pas de dynamic client) ; `Get*YAML` renvoie l'objet sérialisé (sans `ManagedFields`), l'éditeur CodeMirror (`yaml-editor`) le modifie, `Apply*` décode le YAML, force `namespace`/`name` depuis l'URL, puis **upsert** (Update si présent avec `ResourceVersion`, sinon Create). Suppression via `Delete*` + `window.confirm`. Les valeurs de Secret restent masquées côté frontend (révélation explicite via `window.confirm`).
- **Justification** : cohérent avec les wrappers typés existants ; pas de dépendance au dynamic client pour l'instant (CRD = étape ultérieure) ; la sécurité des Secrets est imposée côté frontend par défaut.
- **Conséquences** : l'édition YAML d'un Secret manipule des valeurs base64 (comme `kubectl`) ; pas de diff/validation préalable (la validation est l'erreur de décodage YAML) ; pas de `stringData` lors de l'édition (seule la section `data` est générée).

## ADR-019 — Watch Kubernetes : list + re-list débouncée

- **Date** : 2026-08-15
- **Contexte** : étape 7 — mettre à jour l'UI en temps réel (watch) sans boucle de requêtes excessive.
- **Options** : informers/sharedIndexInformer ; deltas appliqués côté frontend ; re-list complète débouncée.
- **Décision** : `WatchManager` (`internal/watch`) qui, pour une ressource (pods, nodes, namespaces, workloads, services, ingress, configmaps, secrets, events…), émet un **snapshot complet** (réutilise les `List*` du package `k8s`) à l'ouverture, ouvre un `Watch`, et **re-liste** (débouncé 300 ms, backoff exponentiel ≤ 30 s) à chaque changement. Le frontend (`WatchProvider`) alimente le cache TanStack Query via `setQueryData`.
- **Justification** : réutilise les DTOs et `List*` existants (pas de conversion par delta), robuste face aux erreurs/timeouts (re-list + re-watch auto), pas de « boucle de requêtes » (débounce), code générique via un registre `resource → list/watch`.
- **Conséquences** : les watchs sont démarrés/arrêtés par `WatchProvider` selon le cluster/namespace actif ; les erreurs de watch sont silencieuses (l'état reste fourni par les queries) ; resync auto après fermeture du watch (timeout API 5 min).

## ADR-020 — Recherche globale (Ctrl+K) + page Events

- **Date** : 2026-08-15
- **Contexte** : étape 8 (polish) — recherche globale par nom (§23) et page Events (§14, dernier placeholder restant).
- **Décision** : binding `SearchResources` (recherche sous-chaîne insensible à la casse sur les ressources accessibles, en réutilisant les `List*` existants, les ressources interdites sont ignorées) + palette de commandes frontend (raccourci `Ctrl/Cmd+K`, état `searchOpen` en Zustand, query débouncée par TanStack Query avec `staleTime: 0`). Page Events = `DataTable` réutilisée, alimentée par `useEvents` + watch `events`.
- **Justification** : recherche réutilisant les DTOs existants (pas de nouveau parcours d'API), palette légère sans dépendance externe, page Events réutilise le pattern `ResourcePage`/`DataTable`.
- **Conséquences** : `SearchResources` fait ~10 `List` à chaque frappe (acceptable car activé uniquement palette ouverte, ≥ 2 caractères) ; navigation des résultats vers les pages détail existantes (services/ingress/nodes → liste).

## ADR-021 — Versioning bêta + installers multi-OS

- **Date** : 2026-08-15
- **Contexte** : MVP terminé → passage en bêta (`0.2.0-beta.1`) ; préparation des installers Linux/macOS/Windows.
- **Décision** : version unique déclarée en deux points synchronisés (`const version` dans `app.go` + `info.productVersion` dans `wails.json`) ; packaging automatisé via **GitHub Actions** (workflow `release` sur tag `v*`) sur les runners natifs de chaque OS — Linux `.deb`/`.tar.gz` (assemblage `dpkg-deb` via `scripts/package-linux.sh`), Windows `.exe` NSIS (`-nsis`, makensis), macOS `.app` distribué en `.zip` (`ditto`, le `.dmg` échoue sur le runner CI par manque d'espace disque).
- **Justification** : Wails v2.14 ne package pas Linux nativement et ne cross-compile pas vers macOS ; les runners CI natifs sont la façon standard de produire les trois installers.
- **Conséquences** : la release est déclenchée par un tag `v*` ; `CHANGELOG.md` maintenu ; l'AppImage (nécessite `linuxdeploy`/`appimagetool`) est reporté.
