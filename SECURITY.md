# Security Policy

OpenK8s Desktop takes security seriously. It is a **local-first** Kubernetes client: by design, no cluster data ever leaves your machine, and credentials are treated as secrets.

## Reporting a vulnerability

**Do not** open a public GitHub issue for security vulnerabilities. Please report them privately:

- **GitHub private vulnerability reporting** (preferred): navigate to the repository's **Security** tab → **Report a vulnerability**.
- **Email:** `salemaffa@gmail.com`

When reporting, please include:

1. The affected version and platform.
2. A description of the vulnerability and its potential impact.
3. Reproduction steps (without credentials or sensitive cluster data).
4. If applicable, a minimal proof of concept.

You will receive an acknowledgment within **5 business days**, and we'll keep you informed of the fix and release timeline. We ask that you **do not disclose** the vulnerability publicly until a fix is released.

## Scope

This policy covers the OpenK8s Desktop application itself (the Wails/Go backend and the React frontend), the official installers, and the release pipeline.

Out of scope: vulnerabilities in the Kubernetes cluster you manage, third-party dependencies beyond their maintained release lines, and misuse of the app.

## Security principles

- **Local-first:** no external server, no uploads, no telemetry.
- **Least privilege:** the app only does what your kubeconfig identity authorizes, and respects cluster RBAC (never bypassing `Forbidden`).
- **No silent modifications:** destructive or mutating actions (scale, delete, YAML apply…) always require an explicit user action.
- **Credentials are secrets:** kubeconfigs are isolated behind the `CredentialStore` interface (`internal/storage`); tokens, private keys, and Secret values are **never** logged or displayed.

## Supported versions

| Version | Status |
|---|---|
| Latest `v*` release | Supported |
| Older releases | Best effort — please upgrade |

## Security updates

Security fixes are released as part of new versions on [GitHub Releases](https://github.com/asaje379/openk8s-desktop/releases). Always install the latest release — see the one-line installer in the [README](README.md#quick-start).