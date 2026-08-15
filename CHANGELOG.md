# Changelog

Toutes les modifications notables du projet sont documentées ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et du [Semantic Versioning](https://semver.org/).

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
