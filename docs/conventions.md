# Project Conventions

> Conventions de développement openk8s-desktop (Wails + Go + React).

## Général

- **Local-first** : aucune donnée Kubernetes ne quitte la machine.
- **Sécurité** : jamais de tokens/clés/credentials/valeurs de Secrets dans les logs ou l'UI par défaut.
- **Pas de sur-engineering** : interface uniquement si elle apporte une vraie valeur.
- **Vérification avant "done"** : compiler (`go build`/`pnpm build`) + tester (`go test`) + `wails build` avant de déclarer une étape terminée.

## Backend Go

- Layout : `internal/{cluster,k8s,exec,logs,portforward,storage}` ; `app.go` = surface de binding ; `main.go` = composition root.
- Nommage : PascalCase exporté, camelCase privé, fichiers `snake_case.go`.
- Erreurs : explicites, enveloppées (`fmt.Errorf("...: %w", err)`) ; distinguer message utilisateur vs détail technique.
- DI par constructeur ; wiring manuel dans `NewApp()`.
- `context.Context` propagé partout. **Timeout 30s** pour les requêtes ponctuelles (`k8s.withTimeout`) ; **pas de timeout** pour les flux (logs/exec/port-forward, cancellation manuelle).
- Accès Kubernetes : `ClusterManager` est le **seul créateur** de `kubernetes.Interface` et `*rest.Config` (isolation multi-cluster).
- **DTOs dédiés** (pas de types client-go bruts) dans les bindings ; slices toujours initialisées (`make(..., 0)`, jamais `nil` → JSON `[]`).
- Streaming : managers avec `map[id]context.CancelFunc` + émission d'événements via un `Emitter` injecté.
- SQLite via `database/sql` (pas d'ORM) ; schéma `CREATE TABLE IF NOT EXISTS`.
- Formatage `gofmt` ; lint `go vet` ; tests avec `k8s.io/client-go/kubernetes/fake`.

## Frontend React / TypeScript

- Layout : feature-based (`src/features/<domaine>/…`) + `components/{ui,layout,tables,logs,terminal,yaml,portforward}`.
- État : TanStack Query pour l'état serveur (query keys hiérarchiques `['k8s', clusterId, …]`) ; Zustand minimal (cluster actif + namespace, persisté) ; jamais de duplication de l'état serveur dans un store.
- Composants : shadcn/ui + CVA ; tokens Tailwind uniquement (pas de couleurs brutes, sauf marque/logo).
- Un composant par fichier ; hooks custom `use*` ; props via `interface` ; pas de `any` (sauf frontière Wails events).
- Formulaires : React Hook Form + Zod (quand nécessaire).
- Import : alias `@/` → `src/`.
- **Streaming** : `EventsOn(event, cb)` retourne une fonction de désinscription (utiliser ça, pas `EventsOff` avec callback) ; bien nettoyer dans le `useEffect`.
- **Erreurs** : mutations → toast (global) ; queries → état inline (`ResourcePage`) ; crash → `ErrorBoundary`.
- **Code-splitting** : routes + composants lourds (xterm/CodeMirror) en `React.lazy` + `Suspense`.

## Thème & i18n

- Thème : stratégie `class` (`.dark` sur `<html>`), états `light`/`dark`/`system` via `useTheme()` ; couleurs via variables CSS (`:root`/`.dark`) + `@theme inline` ; toute couleur a sa variante `.dark`.
- i18n : `i18next` + `react-i18next` ; traductions dans `src/locales/{en,fr}.ts` (namespace `translation`, typées via `Translation`).

## Tests

- **Backend** : `go test ./...` ; fake clientset pour les handlers sans cluster réel.
- **Intégration K8s** : cluster `kind` jetable (pas de données mockées en validation finale).
- **Frontend** : `pnpm build` (tsc + vite) comme vérification ; tests unitaires/Playwright à ajouter.
- Couverture ciblée sur les chemins critiques (kubeconfig parsing, cluster manager, listes, erreurs).

## Git

- Commits conventionnels (`feat:`, `fix:`, `chore:`, `docs:`) ; identité en override ponctuel (`git -c user.name=… -c user.email=… commit`).
