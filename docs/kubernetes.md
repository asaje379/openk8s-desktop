# Kubernetes

> Fonctionnement de la gestion kubeconfig / RBAC / namespaces dans l'app.

## Kubeconfigs

L'app accepte n'importe quel kubeconfig valide (aucune hypothèse sur le fournisseur cloud — EKS/AKS/GKE sont supportés via leurs mécanismes d'authentification kubeconfig standard).

Flux d'ajout :
1. **Coller** un kubeconfig → **Valider** (parse + liste des contextes) → **Tester la connexion** (`ServerVersion`) → **Enregistrer**.
2. **Détection locale** : au démarrage, l'app liste `~/.kube/config` et `$KUBECONFIG` (chemins séparés par `:`), et propose d'importer les contextes non déjà enregistrés (dédup par serveur+contexte).

Un kubeconfig peut contenir **plusieurs contextes** ; l'utilisateur choisit/sélectionne le contexte actif par cluster (switch de contexte).

## Stockage

- Métadonnées de cluster (id, nom, serveur, contexte, dates) en **SQLite**.
- Le **kubeconfig brut** est stocké derrière l'interface `CredentialStore` (implémentation SQLite pour le MVP) — prévue pour être remplacée par le keychain/credential store natif sans toucher au reste.

## RBAC restreint

Certains clusters n'autorisent que l'accès **namespace-scopé** (ex. un développeur avec des droits limités). Les listes cluster-scope (`nodes`, `namespaces`, listes « all namespaces ») renvoient alors `403 Forbidden`.

L'app gère ce cas :
- **Namespaces manuels** : l'utilisateur ajoute les namespaces auxquels il a accès (page Namespaces ou bouton « + » du sélecteur global dans la topbar) ; ils sont persistés **par cluster**.
- Le sélecteur de namespace (topbar) propose « All namespaces » + les namespaces sauvegardés/découverts ; **défaut = premier namespace sauvegardé**.
- Les erreurs `Forbidden` sont affichées **inline** (« Accès refusé — votre identité n'a pas la permission… ») et non en toast.

## Connexion aux clusters (test)

Le test de connexion utilise `Discovery().ServerVersion()` et renvoie `{connected, server, version, message}`. L'échec est un état (pas une erreur fatale) : on peut enregistrer un cluster même s'il est momentanément injoignable.

## Ressources supportées

- **Cluster-scope** : Nodes.
- **Namespace-scope** : Pods, Deployments, StatefulSets, DaemonSets, Jobs, CronJobs, Services, Ingress, Events.
- **À venir** : ConfigMaps, Secrets (étape 6), metrics (étape 5), Watch (étape 7), CRD (préparé via l'abstraction GVR).
