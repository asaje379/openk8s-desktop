# Project Conventions

> Conventions de développement openk8s-desktop (Wails + Go + React).

## Général

- **Local-first** : aucune donnée Kubernetes ne quitte la machine.
- **Sécurité** : jamais de tokens/clés/credentials/valeurs de Secrets dans les logs ou l'UI par défaut.
- **Pas de sur-engineering** : interface uniquement si elle apporte une vraie valeur.
- **Vérification avant "done"** : compiler + tester + lint avant de déclarer une étape terminée.

## Backend Go

- Layout : `internal/{cluster,k8s,exec,storage,api}` ; `main.go` = composition root.
- Nommage : PascalCase exporté, camelCase privé, fichiers `snake_case.go`.
- Erreurs : explicites, typées, enveloppées (`fmt.Errorf("...: %w", err)`) ; message utilisateur vs détail technique séparés.
- DI par constructeur ; wiring manuel dans `main.go`.
- `context.Context` propagé sur toutes les opérations réseau (requêtes, watch, exec, logs).
- Accès Kubernetes : `ClusterManager` est le seul créateur de clients.
- SQLite via `database/sql` (pas d'ORM) ; migrations SQL versionnées.
- Formatage : `gofmt` ; lint : `go vet` (+ `staticcheck` si disponible).

## Frontend React / TypeScript

- Layout : feature-based (`src/features/<domaine>/…`) + `components/{ui,layout,tables,yaml,logs,terminal}`.
- État : TanStack Query pour l'état serveur (query keys factorisées) ; Zustand minimal (`activeClusterID`, `activeNamespace`, `currentContext`).
- Composants : shadcn/ui + CVA ; tokens Tailwind uniquement (pas de valeurs brutes).
- Un composant par fichier ; hooks custom `use*` ; types via `interface` pour les props ; pas de `any`.
- Formulaires : React Hook Form + Zod.
- Import : alias `@/` → `src/`.
- Tests : co-localisés (`*.test.tsx`) ; Vitest.

## Tests

- **Backend** : `go test ./...` ; mocks via `k8s.io/client-go/kubernetes/fake` pour les handlers sans cluster réel.
- **Intégration K8s** : cluster `kind` jetable (pas de données mockées en validation finale).
- **Frontend** : Vitest + Testing Library ; e2e Playwright sur les parcours critiques.
- Couverture ciblée sur les chemins critiques (kubeconfig parsing, cluster manager, watch, erreurs K8s).

## Git

- Pas encore de repo initialisé (à faire à l'étape 1).
- Commits : conventionnels (`feat:`, `fix:`, `chore:`, `docs:`).
