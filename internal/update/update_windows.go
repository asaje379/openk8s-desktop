//go:build windows

package update

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

func applyLinux(downloaded string) error {
	return errors.New("linux auto-update is not supported on windows")
}

// applyWindows swaps the running binary. Windows allows renaming a running exe
// but not overwriting it, so the new binary is placed, then spawned detached
// before exiting.
func applyWindows(downloaded string) error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	dir := filepath.Dir(exe)
	if err := requireWritable(dir); err != nil {
		return fmt.Errorf("no write permission in %s (reinstall as user scope or run as admin): %w", dir, err)
	}

	newFile := filepath.Join(dir, "openk8s-desktop.exe.new")
	if err := copyFile(downloaded, newFile); err != nil {
		return err
	}
	old := exe + ".old"
	if err := os.Rename(exe, old); err != nil {
		os.Remove(newFile)
		return err
	}
	if err := os.Rename(newFile, exe); err != nil {
		os.Rename(old, exe)
		os.Remove(newFile)
		return err
	}

	// Windows allows renaming a running exe but not overwriting it: the new
	// binary is in place, spawn it detached and exit.
	cmd := exec.Command("cmd", "/c", fmt.Sprintf("start \"\" \"%s\"", exe))
	if err := cmd.Start(); err != nil {
		os.Remove(exe)
		os.Rename(old, exe)
		return err
	}
	scheduleExit()
	return nil
}
