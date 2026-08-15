# OpenK8s Desktop

**A fast, local-first Kubernetes desktop client.** OpenK8s Desktop is a free, open-source alternative to Lens for managing multiple Kubernetes clusters from a modern desktop app — with native performance and a tiny resource footprint.

![Version](https://img.shields.io/badge/version-0.2.0--beta.2-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-lightgrey)

> **Status: Beta (`v0.2.0-beta.2`)** — the MVP is complete and functional. Installers are published on [GitHub Releases](https://github.com/asaje379/openk8s-desktop/releases).

---

## Quick start

Install the latest release in **one command** — the installer detects your OS and architecture, then downloads and sets up the app for you:

```bash
curl -fsSL https://raw.githubusercontent.com/asaje379/openk8s-desktop/main/scripts/install.sh | sh
```

Or grab your platform's installer directly from [GitHub Releases](https://github.com/asaje379/openk8s-desktop/releases):

| Platform | Format |
|---|---|
| **Linux** | `.deb`, `.tar.gz` |
| **macOS** | Universal `.zip` (Intel + Apple Silicon) |
| **Windows** | NSIS `.exe` |

> All binaries are built automatically from the source code via GitHub Actions on every release tag. Review the code or report issues on the [repository](https://github.com/asaje379/openk8s-desktop).

---

## Features

### Connect & manage multiple clusters
- Import a kubeconfig by **pasting it**, or let the app **detect local configs** (`~/.kube/config`, `$KUBECONFIG`).
- Multi-context support with instant context switching and a persisted active cluster.
- Works with **EKS, AKS, GKE, kind, minikube** — and any cluster reachable through a kubeconfig. No cloud-specific setup required.

### Explore your cluster
- Browse **Nodes**, **Namespaces**, **Workloads** (Deployments, StatefulSets, DaemonSets, Jobs, CronJobs), **Pods**, **Services**, **Ingress**, **ConfigMaps**, **Secrets**, and **Events**.
- Filter by namespace globally from the top bar; search and sort in every table.

### The complete pod experience
- Pod details: overview, containers, labels, and YAML.
- **Streaming logs** with timestamps, search, copy, and download.
- **Interactive terminal** for any pod.
- **Port-forwarding** with a click.

### Workloads & configuration
- Deployment details with **scaling**, aggregated multi-pod logs, events, and YAML.
- **ConfigMaps & Secrets**: edit YAML and apply/delete directly. Secret values stay **masked by default** — reveal them explicitly.

### Metrics at a glance
- **CPU & memory** usage for your cluster, nodes, and pods (via the Metrics Server), with graceful degradation when the Metrics Server isn't installed.

### Real-time by design
- The UI **updates live** as your cluster changes, with automatic reconnection and resync.

### Privacy-first
- **Local-first**: your kubeconfigs and credentials never leave your machine.
- **No accounts, no telemetry** phoning home. Open source, auditable, yours.

### UX built for speed
- Global **command palette** (`Ctrl+K`), light & dark themes, and English/French localization.

---

## Getting started

1. **Install** the app (see [Quick start](#quick-start)).
2. **Add a cluster**: paste a kubeconfig or let the app find your local one.
3. **Switch contexts** from the sidebar and start exploring nodes, workloads, and pods.

That's it. Your clusters are only ever read through the permissions your kubeconfig grants.

---

## Documentation

- [Architecture](docs/architecture.md)
- [Development guide](docs/development.md) — build, release & installers
- [Architecture decisions (ADR)](docs/decisions.md)
- [Security model](docs/security.md)
- [Conventions](docs/conventions.md)
- [Kubernetes notes](docs/kubernetes.md)

---

## Building from source

Prerequisites: Go ≥ 1.25, Node.js ≥ 20 with pnpm, and Wails v2 (`go install github.com/wailsapp/wails/v2/cmd/wails@v2.14.0`).

```bash
git clone https://github.com/asaje379/openk8s-desktop.git
cd openk8s-desktop
pnpm --dir frontend install
wails build
```

> **Ubuntu 24.04 note:** the project uses `webkit2gtk-4.1` (`"build:tags": "webkit2_41"` in `wails.json`). `wails doctor` may show a false "libwebkit Not Found" — the build still works.

See [docs/development.md](docs/development.md) for the full development workflow.

---

## Contributing

OpenK8s Desktop is an open community project. Issues, bug reports, and pull requests are welcome.

- Read the [Contributing guide](CONTRIBUTING.md)
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md)
- Report security vulnerabilities in [SECURITY.md](SECURITY.md)

---

## License

OpenK8s Desktop is released under the [MIT License](LICENSE).