// Package update checks GitHub Releases for a newer version of the app and
// can download, verify and apply it in place.
package update

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"golang.org/x/mod/semver"
)

const (
	// defaultMinInterval is the minimum delay between two network checks.
	defaultMinInterval = 6 * time.Hour
	requestTimeout     = 15 * time.Second
	// releasesURL is the GitHub API endpoint listing releases (drafts excluded).
	releasesURL = "https://api.github.com/repos/asaje379/openk8s-desktop/releases?per_page=100"
)

// Info is the result of an update check.
type Info struct {
	CurrentVersion     string `json:"currentVersion"`
	LatestVersion      string `json:"latestVersion"`
	TagName            string `json:"tagName"`
	HTMLURL            string `json:"htmlUrl"`
	DownloadURL        string `json:"downloadUrl"`
	AutoUpdateURL      string `json:"autoUpdateUrl"`
	SHA256SUMSURL      string `json:"sha256SumsUrl"`
	SupportsAutoUpdate bool   `json:"supportsAutoUpdate"`
	HasUpdate          bool   `json:"hasUpdate"`
	PublishedAt        string `json:"publishedAt"`
}

// Progress is emitted during a download/apply operation.
type Progress struct {
	Phase   string `json:"phase"` // download | verify | done | error
	Percent int    `json:"percent"`
	Bytes   int64  `json:"bytes"`
	Total   int64  `json:"total"`
	Error   string `json:"error"`
}

// Checker fetches and caches the latest release info.
type Checker struct {
	mu          sync.Mutex
	dlMu        sync.Mutex
	client      *http.Client
	releasesURL string
	current     string
	goos        string
	minInterval time.Duration
	cached      *Info
	lastCheck   time.Time
	downloading bool
	// downloadedPath holds the verified artifact ready to be applied.
	downloadedPath string
}

// NewChecker creates a Checker for the running platform.
func NewChecker(current string, goos string) *Checker {
	return &Checker{
		client:      &http.Client{Timeout: requestTimeout},
		releasesURL: releasesURL,
		current:     current,
		goos:        goos,
		minInterval: defaultMinInterval,
	}
}

// Check returns the update info. It never fails: network or parse errors fall
// back to the last known result, or to an empty "no update" Info.
func (c *Checker) Check(ctx context.Context) *Info {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.cached != nil && time.Since(c.lastCheck) < c.minInterval {
		return c.cached
	}

	info, err := c.check(ctx)
	if err != nil {
		if c.cached != nil {
			return c.cached
		}
		return &Info{CurrentVersion: c.current}
	}
	c.cached = info
	c.lastCheck = time.Now()
	return info
}

// LastInfo returns the last successful check result, or nil if none yet.
func (c *Checker) LastInfo() *Info {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.cached
}

// check fetches the releases and selects the highest semver release.
func (c *Checker) check(ctx context.Context) (*Info, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.releasesURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "openk8s-desktop/"+c.current)

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github api: %s", resp.Status)
	}

	var releases []release
	if err := json.NewDecoder(resp.Body).Decode(&releases); err != nil {
		return nil, err
	}

	best := bestRelease(releases)
	if best == nil {
		return &Info{CurrentVersion: c.current}, nil
	}

	info := &Info{
		CurrentVersion: c.current,
		LatestVersion:  normalize(best.TagName),
		TagName:        best.TagName,
		HTMLURL:        best.HTMLURL,
		DownloadURL:    assetURL(best.Assets, downloadAsset(c.goos)),
		AutoUpdateURL:  assetURL(best.Assets, autoUpdateAsset(c.goos)),
		SHA256SUMSURL:  assetURL(best.Assets, hasName("SHA256SUMS")),
		PublishedAt:    best.PublishedAt,
		HasUpdate:      semver.Compare(canon(best.TagName), canon(c.current)) > 0,
	}
	info.SupportsAutoUpdate = c.goos != "darwin" && info.AutoUpdateURL != ""
	return info, nil
}

// StartDownload downloads and verifies the update artifact, emitting progress.
// On success the artifact is kept in a temp file for a later Apply().
func (c *Checker) StartDownload(ctx context.Context, emit func(Progress)) error {
	c.dlMu.Lock()
	if c.downloading {
		c.dlMu.Unlock()
		return errors.New("a download is already in progress")
	}
	c.downloading = true
	c.dlMu.Unlock()
	defer func() {
		c.dlMu.Lock()
		c.downloading = false
		c.dlMu.Unlock()
	}()

	info := c.LastInfo()
	if info == nil || !info.HasUpdate {
		return errors.New("no update available")
	}
	if !info.SupportsAutoUpdate || info.AutoUpdateURL == "" {
		return errors.New("auto-update is not supported on this platform")
	}

	tmp, err := os.CreateTemp("", "openk8s-update-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, info.AutoUpdateURL, nil)
	if err != nil {
		tmp.Close()
		os.Remove(tmpName)
		return err
	}
	req.Header.Set("User-Agent", "openk8s-desktop/"+c.current)
	resp, err := c.client.Do(req)
	if err != nil {
		tmp.Close()
		os.Remove(tmpName)
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		tmp.Close()
		os.Remove(tmpName)
		return fmt.Errorf("download: %s", resp.Status)
	}

	total := resp.ContentLength
	h := sha256.New()
	buf := make([]byte, 64*1024)
	var written int64
	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			written += int64(n)
			h.Write(buf[:n])
			if _, werr := tmp.Write(buf[:n]); werr != nil {
				tmp.Close()
				os.Remove(tmpName)
				return werr
			}
			pct := 0
			if total > 0 {
				pct = int(written * 100 / total)
			}
			emit(Progress{Phase: "download", Percent: pct, Bytes: written, Total: total})
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			tmp.Close()
			os.Remove(tmpName)
			return readErr
		}
	}
	if err := tmp.Sync(); err != nil {
		tmp.Close()
		os.Remove(tmpName)
		return err
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmpName)
		return err
	}

	emit(Progress{Phase: "verify"})

	expected, err := c.fetchSHA256(ctx, info.SHA256SUMSURL, path.Base(info.AutoUpdateURL))
	if err != nil {
		os.Remove(tmpName)
		return err
	}
	got := hex.EncodeToString(h.Sum(nil))
	if !strings.EqualFold(got, expected) {
		os.Remove(tmpName)
		return fmt.Errorf("checksum mismatch: got %s, want %s", got, expected)
	}

	c.dlMu.Lock()
	c.downloadedPath = tmpName
	c.dlMu.Unlock()

	emit(Progress{Phase: "done", Percent: 100, Bytes: written, Total: written})
	return nil
}

// Apply replaces the running binary and relaunches the app. The current
// process is expected to exit shortly after.
func (c *Checker) Apply() error {
	c.dlMu.Lock()
	defer c.dlMu.Unlock()
	if c.downloadedPath == "" {
		return errors.New("no downloaded update to apply")
	}
	artifact := c.downloadedPath
	c.downloadedPath = ""

	switch c.goos {
	case "linux":
		return applyLinux(artifact)
	case "windows":
		return applyWindows(artifact)
	default:
		return errors.New("auto-update is not supported on this platform")
	}
}

// fetchSHA256 downloads the SHA256SUMS asset and returns the expected hash
// for filename.
func (c *Checker) fetchSHA256(ctx context.Context, url string, filename string) (string, error) {
	if url == "" {
		return "", errors.New("SHA256SUMS asset not found in the release")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "openk8s-desktop/"+c.current)
	resp, err := c.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("sha256sums: %s", resp.Status)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", err
	}
	for _, line := range strings.Split(string(body), "\n") {
		fields := strings.Fields(line)
		if len(fields) >= 2 && fields[1] == filename {
			return fields[0], nil
		}
	}
	return "", fmt.Errorf("SHA256SUMS: no entry for %s", filename)
}

// scheduleExit terminates the current process shortly after, letting the
// detached swap/relaunch process take over.
func scheduleExit() {
	go func() {
		time.Sleep(500 * time.Millisecond)
		os.Exit(0)
	}()
}

func requireWritable(dir string) error {
	f, err := os.CreateTemp(dir, ".openk8s-write-*")
	if err != nil {
		return err
	}
	name := f.Name()
	f.Close()
	os.Remove(name)
	return nil
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		out.Close()
		os.Remove(dst)
		return err
	}
	if err := out.Sync(); err != nil {
		out.Close()
		os.Remove(dst)
		return err
	}
	return out.Close()
}

// extractTarGz extracts a .tar.gz archive into dst, guarding against entries
// escaping the destination.
func extractTarGz(tarGzPath string, dst string) error {
	f, err := os.Open(tarGzPath)
	if err != nil {
		return err
	}
	defer f.Close()
	gz, err := gzip.NewReader(f)
	if err != nil {
		return err
	}
	defer gz.Close()
	tr := tar.NewReader(gz)
	base := filepath.Clean(dst)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		target := filepath.Join(base, filepath.Clean(hdr.Name))
		if target != base && !strings.HasPrefix(target, base+string(os.PathSeparator)) {
			return fmt.Errorf("tar entry escapes destination: %s", hdr.Name)
		}
		switch hdr.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0o755); err != nil {
				return err
			}
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
				return err
			}
			out, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, os.FileMode(hdr.Mode))
			if err != nil {
				return err
			}
			if _, err := io.Copy(out, tr); err != nil {
				out.Close()
				return err
			}
			if err := out.Close(); err != nil {
				return err
			}
		}
	}
	return nil
}

// findBinary locates the app binary in an extracted archive tree.
func findBinary(dir string) (string, error) {
	var found string
	_ = filepath.Walk(dir, func(p string, info os.FileInfo, err error) error {
		if err != nil || found != "" {
			return nil
		}
		if info.Mode().IsRegular() && filepath.Base(p) == "openk8s-desktop" {
			found = p
		}
		return nil
	})
	if found == "" {
		return "", errors.New("binary not found in the downloaded archive")
	}
	return found, nil
}

type release struct {
	TagName     string  `json:"tag_name"`
	HTMLURL     string  `json:"html_url"`
	PublishedAt string  `json:"published_at"`
	Assets      []asset `json:"assets"`
}

type asset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

// bestRelease returns the release with the highest valid semver tag.
func bestRelease(releases []release) *release {
	var best *release
	for i := range releases {
		tag := canon(releases[i].TagName)
		if tag == "" {
			continue
		}
		if best == nil || semver.Compare(tag, canon(best.TagName)) > 0 {
			best = &releases[i]
		}
	}
	return best
}

// assetURL returns the browser_download_url of the first matching asset.
func assetURL(assets []asset, pred func(string) bool) string {
	for _, a := range assets {
		if a.BrowserDownloadURL == "" {
			continue
		}
		if pred(a.Name) {
			return a.BrowserDownloadURL
		}
	}
	return ""
}

// downloadAsset selects the human-facing artifact for goos (used as the
// default download link): installer on Windows, dmg on macOS, tarball on Linux.
func downloadAsset(goos string) func(string) bool {
	switch goos {
	case "windows":
		return func(n string) bool { return strings.Contains(n, ".exe") && strings.Contains(n, "installer") }
	case "darwin":
		return func(n string) bool { return strings.Contains(n, ".dmg") }
	default:
		return func(n string) bool { return strings.Contains(n, ".tar.gz") }
	}
}

// autoUpdateAsset selects the artifact used for in-place replacement: the raw
// exe on Windows, the tarball on Linux. Unsupported on macOS.
func autoUpdateAsset(goos string) func(string) bool {
	switch goos {
	case "windows":
		return func(n string) bool { return strings.HasSuffix(n, ".exe") && !strings.Contains(n, "installer") }
	case "linux":
		return func(n string) bool { return strings.Contains(n, ".tar.gz") }
	default:
		return func(string) bool { return false }
	}
}

func hasName(name string) func(string) bool {
	return func(n string) bool { return n == name }
}

// normalize strips a leading "v" from a tag for display purposes.
func normalize(tag string) string {
	return strings.TrimPrefix(strings.TrimSpace(tag), "v")
}

// canon returns the canonical semver form (v-prefixed) of a tag, or "" if
// the tag is not valid semver. golang.org/x/mod/semver requires the "v".
func canon(tag string) string {
	return semver.Canonical("v" + normalize(tag))
}