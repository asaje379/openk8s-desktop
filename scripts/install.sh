#!/usr/bin/env bash
#
# Installer officiel OpenK8s Desktop — une seule instruction :
#
#   curl -fsSL https://raw.githubusercontent.com/asaje379/openk8s-desktop/main/scripts/install.sh | sh
#
# Détecte l'OS et l'architecture, télécharge la dernière release depuis GitHub
# et installe l'app. POSIX-sh compatible (fonctionne aussi via `sh`).
# Usage avancé : INSTALL_DIR=/opt ./scripts/install.sh [v0.2.0-beta.7]
set -eu

REPO="asaje379/openk8s-desktop"
API="https://api.github.com/repos/${REPO}/releases"
RELEASES_URL="https://github.com/${REPO}/releases"
TAG="${1:-latest}"

# --- OS & arch -----------------------------------------------------------
OS="unknown"
case "$(uname -s)" in
    Linux*) OS="linux" ;;
    Darwin*) OS="darwin" ;;
    MINGW* | MSYS* | CYGWIN*) OS="windows" ;;
esac

ARCH="unknown"
case "$(uname -m)" in
    x86_64 | amd64) ARCH="amd64" ;;
    aarch64 | arm64) ARCH="arm64" ;;
esac

if [ "$OS" = "unknown" ]; then
    echo "error: OS non supporté ($(uname -s)). Téléchargement manuel : ${RELEASES_URL}" >&2
    exit 1
fi

# --- Récupérer la release -------------------------------------------------
RELEASE_URL="${API}/latest"
if [ "$TAG" != "latest" ]; then
    RELEASE_URL="${API}/tags/${TAG}"
fi

echo "==> Récupération de la release (${TAG})…"
if ! JSON="$(curl -fsSL "$RELEASE_URL" 2>/dev/null)"; then
    echo "error: impossible de récupérer la release (${RELEASES_URL})" >&2
    exit 1
fi

VERSION="$(printf '%s' "$JSON" | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -n1)"

# URL des assets (chacune sur sa ligne) → positionnel ($@)
set -- $(printf '%s' "$JSON" | sed -n 's/.*"browser_download_url": *"\([^"]*\)".*/\1/p')

if [ -z "$VERSION" ] || [ "$#" -eq 0 ]; then
    echo "error: aucune release/artefact trouvé. Voir ${RELEASES_URL}" >&2
    exit 1
fi

echo "==> Release détectée : ${VERSION}"

pick() { # pick <motif> — 1er asset qui correspond au motif regex
    pattern="$1"
    shift
    for url in "$@"; do
        if printf '%s' "$url" | grep -Eq "$pattern"; then
            printf '%s' "$url"
            return 0
        fi
    done
    return 1
}

URL=""
case "$OS" in
    linux)
        URL="$(pick "${OS}-${ARCH}\.tar\.gz" "$@" || pick '\.deb$' "$@" || true)"
        ;;
    darwin)
        URL="$(pick 'macos.*\.zip$' "$@" || pick 'darwin.*\.zip$' "$@" || true)"
        ;;
    windows)
        URL="$(pick '\.exe$' "$@" || true)"
        ;;
esac

if [ -z "$URL" ]; then
    echo "error: aucun artefact pour ${OS}/${ARCH} (${VERSION}). Voir ${RELEASES_URL}" >&2
    exit 1
fi

echo "==> Téléchargement : $(basename "$URL")"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
curl -fSL --progress-bar "$URL" -o "$TMP_DIR/asset"

# --- Installation par plateforme -------------------------------------------
case "$OS" in
    linux)
        BIN_NAME="openk8s-desktop"
        case "$(basename "$URL")" in
            *.tar.gz)
                tar -xzf "$TMP_DIR/asset" -C "$TMP_DIR"
                BIN="$(find "$TMP_DIR" -type f -name "$BIN_NAME" | head -n1)"
                if [ -z "$BIN" ]; then
                    echo "error: binaire introuvable dans l'archive" >&2
                    exit 1
                fi
                cp "$BIN" "$TMP_DIR/$BIN_NAME"
                ;;
            *.deb)
                mkdir -p "$TMP_DIR/deb"
                if command -v dpkg-deb >/dev/null 2>&1; then
                    dpkg-deb -x "$TMP_DIR/asset" "$TMP_DIR/deb"
                elif command -v ar >/dev/null 2>&1; then
                    (cd "$TMP_DIR/deb" && ar -x "$TMP_DIR/asset")
                    tar -xzf "$TMP_DIR/deb"/data.tar.* -C "$TMP_DIR/deb"
                else
                    echo "error: impossible d'extraire le .deb (dpkg-deb ou ar requis)" >&2
                    exit 1
                fi
                cp "$TMP_DIR/deb/usr/local/bin/$BIN_NAME" "$TMP_DIR/$BIN_NAME"
                ;;
            *)
                echo "error: format Linux inattendu : $(basename "$URL")" >&2
                exit 1
                ;;
        esac

        INSTALL_DIR="${INSTALL_DIR:-}"
        if [ -z "$INSTALL_DIR" ]; then
            if [ -w "/usr/local/bin" ]; then
                INSTALL_DIR="/usr/local/bin"
            else
                INSTALL_DIR="$HOME/.local/bin"
            fi
        fi
        mkdir -p "$INSTALL_DIR"
        chmod +x "$TMP_DIR/$BIN_NAME"
        cp "$TMP_DIR/$BIN_NAME" "$INSTALL_DIR/$BIN_NAME"
        echo "==> Installé : ${INSTALL_DIR}/${BIN_NAME}"
        case ":$PATH:" in
            *":${INSTALL_DIR}:"*) ;;
            *) echo "    Astuce : ajoute ${INSTALL_DIR} à ton PATH." ;;
        esac
        ;;
    darwin)
        APP_DIR="/Applications"
        mkdir -p "$TMP_DIR/app"
        unzip -oq "$TMP_DIR/asset" -d "$TMP_DIR/app"
        APP="$(find "$TMP_DIR/app" -maxdepth 2 -name '*.app' | head -n1)"
        if [ -z "$APP" ]; then
            echo "error: .app introuvable dans l'archive" >&2
            exit 1
        fi
        cp -R "$APP" "$APP_DIR/"
        echo "==> Installé : ${APP_DIR}/$(basename "$APP")"
        ;;
    windows)
        INSTALLER="$PWD/$(basename "$URL")"
        cp "$TMP_DIR/asset" "$INSTALLER"
        echo "==> Installeur téléchargé : $INSTALLER"
        if command -v cygpath >/dev/null 2>&1 && command -v cmd >/dev/null 2>&1; then
            cmd //c start "" "$(cygpath -w "$INSTALLER")" || true
        else
            echo "    Lance-le manuellement pour terminer l'installation."
        fi
        ;;
esac

echo "==> Terminé. Plus d'infos : ${RELEASES_URL}"