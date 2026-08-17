# Développement

Workflow de développement et points d'attention techniques.

## Prérequis

- Go ≥ 1.25, Node.js ≥ 20, pnpm, Wails v2.14
- Linux : `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `pkg-config`, `build-essential`
- Docker + kind (tests d'intégration, optionnel)

## Commandes

```bash
wails dev                 # mode dev (hot reload)
wails build               # build de prod (binaire dans build/bin/)
wails generate module     # régénérer frontend/wailsjs/go/* après modif des méthodes bindées
go test ./...             # tests backend
cd frontend && pnpm build # typecheck + build frontend
./scripts/package-linux.sh # build + packaging Linux (.tar.gz + .deb)
```

## Release & installers

La version est définie à **deux endroits** à synchroniser lors d'une release :

1. `app.go` → `const version = "x.y.z[-prerelease]"` (affiché dans l'app via `GetVersion`).
2. `wails.json` → `info.productVersion` (métadonnées des installers Windows/macOS).

### Build par plateforme

| Cible | Commande | Notes |
|---|---|---|
| Linux | `wails build -platform linux/amd64` | puis `scripts/package-linux.sh` (`.tar.gz` + `.deb`) |
| Windows | `wails build -platform windows/amd64 -nsis` | nécessite `makensis` (NSIS) ; cross-compile depuis Linux OK |
| macOS | `wails build -platform darwin/universal` | **sur macOS uniquement** (pas de cross-compile) ; produit un `.app` (universel), distribuer en `.dmg` + `.zip` (`ditto -c -k --sequesterRsrc --keepParent build/bin/*.app build/bin/openk8s-desktop-macos.zip`) |

**Wails v2.14 ne package pas Linux nativement** (AppImage/deb/rpm sont natifs de Wails v3). Le `.deb` est assemblé par `scripts/package-linux.sh` via `dpkg-deb`.

### Release automatisée (GitHub Actions)

Le workflow `.github/workflows/release.yml` déclenche un build sur les 3 OS lors du push d'un tag `v*`, crée les artefacts (Linux `.deb`/`.tar.gz`, macOS `.dmg`, Windows `.exe` NSIS) et publie la release.

```bash
git tag v0.2.0-beta.1 && git push origin v0.2.0-beta.1
```

### Étapes d'une release beta

1. Mettre à jour `version` (app.go) + `info.productVersion` (wails.json) + `CHANGELOG.md`.
2. `go test ./... && (cd frontend && pnpm build) && wails build`.
3. Commit, puis tag `v0.2.0-beta.1`, push → le workflow construit et publie les installers.

## Points d'attention (pièges connus)

1. **Ubuntu 24.04 / webkit2gtk-4.1** : le projet force `"build:tags": "webkit2_41"` dans `wails.json`. `wails doctor` peut afficher un faux « libwebkit Not Found » — ignorer, le build fonctionne.
2. **Go toolchain** : Wails 2.14 et client-go v0.36 exigent Go récent (1.25/1.26). Le toolchain Go auto-télécharge la version requise (déclaré dans `go.mod`).
3. **pnpm + esbuild** : pnpm bloque les scripts de build par défaut. `pnpm-workspace.yaml` contient `onlyBuiltDependencies: [esbuild]` (approuvé via `pnpm approve-builds --all`).
4. **Wails 2.14 `EventsOn`** : retourne une **fonction de désinscription** (pas de `EventsOff` avec callback).
5. **Slices Go** : toujours `make([]T, 0)` (jamais `nil`) pour que le JSON soit `[]` et non `null`.
6. **Timeout** : pas de `rest.Config.Timeout` global (casse les flux). Utiliser `k8s.withTimeout` pour les requêtes ponctuelles uniquement.
7. **DMG sur CI** : `hdiutil create -srcfolder … -format UDZO` OOM sur les runners macOS GitHub Actions (volume tamponné en RAM). Construire le `.dmg` **en étapes** : `hdiutil create -size <SIZE>m` (pré-allocation), `attach`, copie du `.app`, `detach`, puis `hdiutil convert -format UDZO` (streaming). Voir le job `macos` de `release.yml`.
8. **NSIS sur Windows CI** : `choco install nsis` n'ajoute **pas** `makensis` au `PATH` des steps suivants → `wails build -nsis` échoue silencieusement (« Cannot create installer: makensis not found ») sans faire échouer le job. Ajouter explicitement `C:\Program Files (x86)\NSIS` au `GITHUB_PATH` après l'install (job `windows` de `release.yml`). L'icône de l'installer/l'app est `build/windows/icon.ico` (référencée par `project.nsi` via `MUI_ICON`).

## Ajouter une méthode bindée (backend → frontend)

1. Ajouter la méthode sur `App` (dans `app.go`).
2. `wails generate module` → régénère `frontend/wailsjs/go/main/App.{js,d.ts}` + `models.ts`.
3. Ré-exporter la fonction et/ou le type dans `frontend/src/lib/wails.ts`.

## Ajouter une ressource Kubernetes

1. DTO dans `internal/k8s/types.go`.
2. Fonction de liste/détail dans `internal/k8s/*.go` (avec `withTimeout`).
3. Binding dans `app.go`.
4. Hook dans `frontend/src/hooks/use-k8s.ts` + page dans `frontend/src/features/…` + route dans `routes/index.tsx`.

## Conventions

Voir [conventions.md](./conventions.md). Résumé : Go idiomatique (DI, `context.Context`, DTOs dédiés), React feature-based (TanStack Query + Zustand, shadcn/ui, lazy loading), thème/i18n via tokens.
