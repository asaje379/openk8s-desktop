# Changelog

Toutes les modifications notables du projet sont documentées ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et du [Semantic Versioning](https://semver.org/).

## [0.2.0-beta.6] — 2026-08-17

### Correctifs
- **Installer NSIS (Windows)** : les versions semver pré-release (`0.2.0-beta.5`) cassaient le build NSIS (`Error: invalid VIFileVersion format, should be X.X.X.X`). Le job Windows patche `project.nsi` avec une version numérique dérivée du tag (`v0.2.0-beta.5` → `0.2.0.5`) avant `wails build -nsis`.

## [0.2.0-beta.5] — 2026-08-17

### Correctifs
- **Icône Linux (lancer d'applications)** : l'entrée `.desktop` n'avait pas de clé `Icon=` et le `.deb`/`.tar.gz` n'installaient aucune icône → icône générique au menu. Ajout d'`Icon=openk8s-desktop`, icône `scripts/linux/openk8s-desktop.png` (256px) installée dans `share/icons/hicolor/256x256/apps/`.

## [0.2.0-beta.4] — 2026-08-17

### Correctifs
- **Icône Windows** : `build/windows/icon.ico` régénéré depuis le logo OpenK8s (7 tailles). L'app, l'installer et le désinstalleur NSIS affichaient l'icône par défaut de Wails.
- **Installer NSIS sur Windows** : `wails build -nsis` échouait silencieusement en CI (`makensis not found` — `choco install nsis` n'ajoute pas NSIS au PATH des steps suivants). Ajout du dossier NSIS au `GITHUB_PATH` dans `release.yml` ; la release publie désormais `openk8s-desktop-amd64-installer.exe`.
- **Landing page** : la carte Windows pointe sur l'installer NSIS (repli sur l'exe brut via l'API GitHub).

## [0.2.0-beta.3] — 2026-08-17

### Ajouts
- **Dashboard** : refonte avec statistiques en temps réel des ressources (pods, deployments, statefulsets, daemonsets, services, ingress, nœuds, namespaces), cartes cliquables vers les pages correspondantes ; compteur namespaces avec fallback sur le total stocké en base quand le listing cluster est interdit (RBAC). La version de l'app est désormais affichée subtilement dans le footer de la sidebar.
- **Édition des ressources** : Pods (édition YAML + apply/delete), Deployments/StatefulSets/DaemonSets (édition YAML + apply/delete + restart via patch `restartedAt`), actions restart/delete sur la liste Workloads.
- **Recherche globale corrigée** : recherche dans **tous les namespaces** avec fallback RBAC sur le namespace scopé, préfixe minimal réduit à 1 caractère.
- **Landing page** : boutons de téléchargement directs résolus via l'API GitHub (`.deb` pour Linux, `.zip`/`.dmg` pour macOS, `.exe` pour Windows).
- **Packaging macOS** : build d'un `.dmg` en étapes dans la CI (contourne l'OOM de `hdiutil create -srcfolder` sur les runners GitHub), en complément du `.zip`.

### Technique
- Backend : `internal/k8s/mutations.go` (apply/delete/restart génériques par kind) + tests, DTOs, méthodes bindées `app.go`.
- Workflow `release.yml` : job macos en deux artefacts (`.dmg` + `.zip`), YAML validé.

## [0.2.0-beta.2] — 2026-08-15

### Ajouts
- **Landing page** : site vitrine (`website/`) avec section download en une commande, animations reveal, capture réelle de l'app en héros, déploiement automatique sur **GitHub Pages** (job `pages` du workflow `release`).
- **Installeur une commande** : `scripts/install.sh` POSIX détectant OS/arch et installant la dernière release GitHub.
- **Branding** : logo thémé dans l'app (sidebar, écran sans-cluster), icône applicative mise à jour.
- **Docs & projet** : README utilisateur en anglais, LICENSE (MIT), CONTRIBUTING, CODE_OF_CONDUCT, SECURITY.

### Correctifs
- **Mobile (landing)** : scroll horizontal supprimé (glow du hero clippé), aperçu de l'app masqué sur mobile.

### Technique
- Screenshots de l'app générés via Playwright (runtime Wails simulé) pour la landing.

## [0.2.0-beta.1] — 2026-08-15

MVP terminé — première version bêta.

### Ajouts
- **Connexion & multi-cluster** : import kubeconfig (collé ou détection locale), multi-contexte, switch de contexte, test de connexion, cluster actif persisté.
- **Exploration** : Nodes, Namespaces (gestion manuelle RBAC), Workloads (Deployments, StatefulSets, DaemonSets, Jobs, CronJobs), Pods, Services, Ingress, ConfigMaps, Secrets, Events.
- **Expérience Pod** : détail, logs streaming, terminal (xterm.js), events, YAML, port-forward.
- **Détail Deployment** : scale, logs agrégés multi-pods, events, YAML.
- **ConfigMaps/Secrets** : liste/détail, édition YAML + apply/delete, valeurs de Secrets masquées avec révélation explicite.
- **Métriques** : CPU/mémoire cluster/nodes/pods (Metrics Server), dégradation gracieuse + fallback namespace-scope.
- **Temps réel** : Kubernetes Watch (WatchProvider → cache TanStack Query).
- **Recherche globale** (Ctrl+K) + page Events.
- **UX** : design system « Stitch » (clair/sombre), i18n en/fr, code-splitting.

### Technique
- Backend Go + client-go, streaming via `EventsEmit`, stockage SQLite (`modernc.org/sqlite`), tests avec `fake` clientset.
- Packaging : release automatisée via GitHub Actions (Linux `.deb`/`.tar.gz`, macOS `.dmg`, Windows `.exe` NSIS).
