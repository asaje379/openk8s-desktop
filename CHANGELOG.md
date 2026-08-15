# Changelog

Toutes les modifications notables du projet sont documentées ici.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et du [Semantic Versioning](https://semver.org/).

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
