package update

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func testServer(t *testing.T, body string, status int) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(status)
		_, _ = w.Write([]byte(body))
	}))
}

const releasesJSON = `[
  {
    "tag_name": "v0.2.0-beta.5",
    "html_url": "https://github.com/asaje379/openk8s-desktop/releases/tag/v0.2.0-beta.5",
    "published_at": "2026-01-01T00:00:00Z",
    "assets": [
      {"name": "openk8s-desktop-linux-amd64.tar.gz", "browser_download_url": "https://example.com/beta5.tar.gz"}
    ]
  },
  {
    "tag_name": "v0.2.0-beta.7",
    "html_url": "https://github.com/asaje379/openk8s-desktop/releases/tag/v0.2.0-beta.7",
    "published_at": "2026-01-02T00:00:00Z",
    "assets": [
      {"name": "openk8s-desktop-linux-amd64.tar.gz", "browser_download_url": "https://example.com/beta7.tar.gz"},
      {"name": "openk8s-desktop-macos.dmg", "browser_download_url": "https://example.com/beta7.dmg"},
      {"name": "openk8s-desktop-amd64-installer.exe", "browser_download_url": "https://example.com/beta7-installer.exe"},
      {"name": "openk8s-desktop.exe", "browser_download_url": "https://example.com/beta7.exe"}
    ]
  }
]`

func TestCheckFindsNewerBeta(t *testing.T) {
	srv := testServer(t, releasesJSON, http.StatusOK)
	defer srv.Close()

	c := NewChecker("0.2.0-beta.6", "linux")
	c.releasesURL = srv.URL

	info := c.Check(context.Background())
	if !info.HasUpdate {
		t.Fatalf("expected hasUpdate, got %+v", info)
	}
	if info.LatestVersion != "0.2.0-beta.7" {
		t.Fatalf("latestVersion = %q", info.LatestVersion)
	}
	if info.DownloadURL != "https://example.com/beta7.tar.gz" {
		t.Fatalf("downloadUrl = %q", info.DownloadURL)
	}
	if info.TagName != "v0.2.0-beta.7" {
		t.Fatalf("tagName = %q", info.TagName)
	}
}

func TestCheckAssetPerOS(t *testing.T) {
	srv := testServer(t, releasesJSON, http.StatusOK)
	defer srv.Close()

	cases := []struct {
		goos string
		want string
	}{
		{"windows", "https://example.com/beta7-installer.exe"},
		{"darwin", "https://example.com/beta7.dmg"},
		{"linux", "https://example.com/beta7.tar.gz"},
	}
	for _, tc := range cases {
		c := NewChecker("0.2.0-beta.6", tc.goos)
		c.releasesURL = srv.URL
		if got := c.Check(context.Background()).DownloadURL; got != tc.want {
			t.Errorf("goos %s: downloadUrl = %q, want %q", tc.goos, got, tc.want)
		}
	}
}

func TestCheckUpToDate(t *testing.T) {
	srv := testServer(t, releasesJSON, http.StatusOK)
	defer srv.Close()

	c := NewChecker("0.2.0-beta.8", "linux")
	c.releasesURL = srv.URL

	if info := c.Check(context.Background()); info.HasUpdate {
		t.Fatalf("expected no update, got %+v", info)
	}
}

func TestCheckServerErrorFallsBackToCache(t *testing.T) {
	var hits int
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits++
		if hits == 1 {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(releasesJSON))
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	c := NewChecker("0.2.0-beta.6", "linux")
	c.releasesURL = srv.URL
	c.minInterval = time.Hour

	if info := c.Check(context.Background()); !info.HasUpdate {
		t.Fatalf("first check should find update, got %+v", info)
	}
	// Force an interval reset so the error path is exercised with a cached value.
	c.lastCheck = time.Time{}
	if info := c.Check(context.Background()); !info.HasUpdate {
		t.Fatalf("second check should fall back to cache, got %+v", info)
	}
}

func TestCheckNoNetwork(t *testing.T) {
	c := NewChecker("0.2.0-beta.6", "linux")
	c.releasesURL = "http://127.0.0.1:1/releases"

	if info := c.Check(context.Background()); info.HasUpdate {
		t.Fatalf("expected no update on network error, got %+v", info)
	}
}

func TestCheckCachesWithinInterval(t *testing.T) {
	hits := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits++
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(releasesJSON))
	}))
	defer srv.Close()

	c := NewChecker("0.2.0-beta.6", "linux")
	c.releasesURL = srv.URL
	c.minInterval = time.Hour

	_ = c.Check(context.Background())
	_ = c.Check(context.Background())
	if hits != 1 {
		t.Fatalf("expected 1 request, got %d", hits)
	}
}

func checksum(b []byte) string {
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])
}

func TestStartDownloadVerify(t *testing.T) {
	payload := []byte("the new binary")
	const filename = "openk8s-desktop-0.2.0-beta.7-linux-amd64.tar.gz"
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/" + filename:
			_, _ = w.Write(payload)
		case "/SHA256SUMS":
			_, _ = w.Write([]byte(checksum(payload) + "  " + filename + "\n"))
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	c := NewChecker("0.2.0-beta.6", "linux")
	c.cached = &Info{
		CurrentVersion:     "0.2.0-beta.6",
		LatestVersion:      "0.2.0-beta.7",
		HasUpdate:          true,
		SupportsAutoUpdate: true,
		AutoUpdateURL:      srv.URL + "/" + filename,
		SHA256SUMSURL:      srv.URL + "/SHA256SUMS",
	}

	done := false
	err := c.StartDownload(context.Background(), func(p Progress) {
		if p.Phase == "done" {
			done = true
		}
	})
	if err != nil {
		t.Fatalf("StartDownload: %v", err)
	}
	if !done {
		t.Fatal("expected done phase")
	}
	got, err := os.ReadFile(c.downloadedPath)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != string(payload) {
		t.Fatalf("downloaded content mismatch: %q", got)
	}
}

func TestStartDownloadChecksumMismatch(t *testing.T) {
	const filename = "openk8s-desktop-0.2.0-beta.7-linux-amd64.tar.gz"
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/" + filename:
			_, _ = w.Write([]byte("bad payload"))
		case "/SHA256SUMS":
			_, _ = w.Write([]byte(checksum([]byte("expected")) + "  " + filename + "\n"))
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	c := NewChecker("0.2.0-beta.6", "linux")
	c.cached = &Info{
		HasUpdate:          true,
		SupportsAutoUpdate: true,
		AutoUpdateURL:      srv.URL + "/" + filename,
		SHA256SUMSURL:      srv.URL + "/SHA256SUMS",
	}

	if err := c.StartDownload(context.Background(), func(Progress) {}); err == nil {
		t.Fatal("expected checksum mismatch error")
	} else if !strings.Contains(err.Error(), "checksum mismatch") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestStartDownloadNoSHA(t *testing.T) {
	c := NewChecker("0.2.0-beta.6", "linux")
	c.cached = &Info{
		HasUpdate:          true,
		SupportsAutoUpdate: true,
		AutoUpdateURL:      "http://example.com/bin.tar.gz",
		SHA256SUMSURL:      "",
	}
	if err := c.StartDownload(context.Background(), func(Progress) {}); err == nil {
		t.Fatal("expected error when SHA256SUMS is missing")
	}
}

func TestStartDownloadUnsupported(t *testing.T) {
	c := NewChecker("0.2.0-beta.6", "darwin")
	c.cached = &Info{HasUpdate: true, SupportsAutoUpdate: false, AutoUpdateURL: ""}
	if err := c.StartDownload(context.Background(), func(Progress) {}); err == nil {
		t.Fatal("expected unsupported error")
	}
}

func TestStartDownloadNoUpdate(t *testing.T) {
	c := NewChecker("0.2.0-beta.6", "linux")
	c.cached = &Info{HasUpdate: false}
	if err := c.StartDownload(context.Background(), func(Progress) {}); err == nil {
		t.Fatal("expected no-update error")
	}
}

func TestApplyUnsupportedPlatform(t *testing.T) {
	c := NewChecker("0.2.0-beta.6", "darwin")
	if err := c.Apply(); err == nil {
		t.Fatal("expected unsupported error")
	}
}

func TestApplyNoDownload(t *testing.T) {
	c := NewChecker("0.2.0-beta.6", "linux")
	if err := c.Apply(); err == nil {
		t.Fatal("expected no-download error")
	}
}

func TestExtractTarGzAndFindBinary(t *testing.T) {
	dir := t.TempDir()
	tarPath := filepath.Join(dir, "pkg.tar.gz")

	file, err := os.Create(tarPath)
	if err != nil {
		t.Fatal(err)
	}
	gz := gzip.NewWriter(file)
	tw := tar.NewWriter(gz)
	content := []byte("#!/bin/fake\n")
	hdr := &tar.Header{
		Name: "openk8s-desktop-0.2.0-beta.7/openk8s-desktop",
		Mode: 0o755,
		Size: int64(len(content)),
	}
	if err := tw.WriteHeader(hdr); err != nil {
		t.Fatal(err)
	}
	if _, err := tw.Write(content); err != nil {
		t.Fatal(err)
	}
	if err := tw.Close(); err != nil {
		t.Fatal(err)
	}
	if err := gz.Close(); err != nil {
		t.Fatal(err)
	}
	if err := file.Close(); err != nil {
		t.Fatal(err)
	}

	dest := filepath.Join(dir, "extract")
	if err := extractTarGz(tarPath, dest); err != nil {
		t.Fatal(err)
	}
	bin, err := findBinary(dest)
	if err != nil {
		t.Fatal(err)
	}
	if filepath.Base(bin) != "openk8s-desktop" {
		t.Fatalf("unexpected binary path: %s", bin)
	}
}

func TestLinuxSwapScriptContent(t *testing.T) {
	script := linuxSwapScript("/usr/bin/openk8s-desktop", "/tmp/extract/openk8s-desktop", "/tmp/extract", "/tmp/swap.sh")
	for _, want := range []string{
		"mv -f -- \"/usr/bin/openk8s-desktop\" \"/usr/bin/openk8s-desktop.old\"",
		"mv -f -- \"/tmp/extract/openk8s-desktop\" \"/usr/bin/openk8s-desktop\"",
		"exec \"/usr/bin/openk8s-desktop\"",
	} {
		if !strings.Contains(script, want) {
			t.Fatalf("script missing %q:\n%s", want, script)
		}
	}
}

func TestRequireWritable(t *testing.T) {
	if err := requireWritable(t.TempDir()); err != nil {
		t.Fatalf("requireWritable: %v", err)
	}
}