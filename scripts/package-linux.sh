#!/usr/bin/env bash
set -euo pipefail

# Build and package the Linux release (.tar.gz + .deb).
# Usage: ./scripts/package-linux.sh [version]   (default: 0.2.0-beta.4)
# Keep the version in sync with app.go and wails.json info.productVersion.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="${1:-0.2.0-beta.4}"
APP="openk8s-desktop"

echo "==> Building ${APP} ${VERSION} (linux/amd64)"
wails build -platform linux/amd64 -clean -trimpath

BIN="build/bin/${APP}"
if [ ! -f "$BIN" ]; then
    echo "error: build failed (${BIN} not found)" >&2
    exit 1
fi

OUT="build/release"
rm -rf "$OUT"
mkdir -p "$OUT"

echo "==> Packaging tarball"
TARBALL_DIR="${OUT}/${APP}-${VERSION}"
mkdir -p "$TARBALL_DIR"
cp "$BIN" "$TARBALL_DIR/${APP}"
cp scripts/linux/openk8s-desktop.desktop "$TARBALL_DIR/"
tar -C "$OUT" -czf "${OUT}/${APP}-${VERSION}-linux-amd64.tar.gz" "${APP}-${VERSION}"
rm -rf "$TARBALL_DIR"

if command -v dpkg-deb >/dev/null 2>&1; then
    echo "==> Packaging .deb"
    DEB_ROOT="${OUT}/deb"
    PREFIX="${DEB_ROOT}/usr/local"
    mkdir -p "${PREFIX}/bin" "${PREFIX}/share/applications" "${DEB_ROOT}/DEBIAN"
    cp "$BIN" "${PREFIX}/bin/${APP}"
    cp scripts/linux/openk8s-desktop.desktop "${PREFIX}/share/applications/"

    cat > "${DEB_ROOT}/DEBIAN/control" <<EOF
Package: ${APP}
Version: ${VERSION}
Section: utils
Priority: optional
Architecture: amd64
Installed-Size: $(du -sk "$BIN" | cut -f1)
Maintainer: asaje379 <salemaffa@gmail.com>
Homepage: https://github.com/asaje379/openk8s-desktop
Description: Desktop Kubernetes admin (Lens alternative)
 Local-first desktop application to connect and administer multiple
 Kubernetes clusters.
EOF

    dpkg-deb --build "$DEB_ROOT" "${OUT}/${APP}_${VERSION}_amd64.deb"
    rm -rf "$DEB_ROOT"
else
    echo "warning: dpkg-deb not found, skipping .deb" >&2
fi

echo "==> Artifacts:"
ls -1 "$OUT"
