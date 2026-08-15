# Sécurité

Principes de sécurité du projet (local-first, multi-cluster, credentials Kubernetes).

## Principes non négociables

1. **Local-first** : aucune donnée Kubernetes ne quitte la machine de l'utilisateur sans action explicite (pas de serveur externe, pas d'upload).
2. **Ne jamais logger/afficher** : tokens, certificats privés, client keys, credentials, valeurs de Secrets.
3. **Respecter RBAC** : ne jamais contourner les permissions du cluster ; gérer proprement les erreurs `Forbidden`.
4. **Moindre privilège** : l'app fait uniquement ce que l'identité Kubernetes de l'utilisateur autorise.
5. **Pas de modification silencieuse** : toute action destructive ou mutante (scale, delete, apply YAML…) nécessite une action explicite.

## Stockage des credentials

- Le kubeconfig (qui contient les secrets) est isolé derrière l'interface `CredentialStore` (`internal/storage`).
- MVP : stocké en SQLite local. **Limitation connue** : en clair pour l'instant.
- Évolution prévue : keychain/credential store natif (Keychain macOS, Credential Manager Windows, Secret Service Linux) en remplaçant l'implémentation, sans toucher au reste.

## Secrets Kubernetes (à venir, étape 6)

- Valeurs **masquées par défaut** (`•••`), avec un mécanisme explicite « Reveal value » + avertissement.
- Jamais de valeurs de Secrets dans les logs.

## Frontend

- Erreurs `Forbidden` → message friendly (« Accès refusé ») sans exposer de détails sensibles ; les détails techniques restent disponibles pour le debugging (ex. dans le viewer d'erreur).
- Le kubeconfig collé n'est jamais affiché dans l'UI (seuls les contextes/serveurs le sont).

## À faire (étape 6 et au-delà)

- Chiffrement/stockage sécurisé des kubeconfigs (keychain natif).
- Éditeur YAML : validation + diff avant `apply`, avertissement explicite avant modification.
- Audit des logs (jamais de PII/credentials).
