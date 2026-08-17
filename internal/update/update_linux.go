//go:build linux

package update

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
)

func applyWindows(downloaded string) error {
	return errors.New("windows auto-update is not supported on linux")
}

// applyLinux swaps the running binary using a detached shell script, then
// exits. It runs on Linux where the running binary cannot be overwritten.
func applyLinux(downloaded string) error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	exe, err = filepath.EvalSymlinks(exe)
	if err != nil {
		return err
	}
	if err := requireWritable(filepath.Dir(exe)); err != nil {
		return fmt.Errorf("no write permission in %s: %w", filepath.Dir(exe), err)
	}

	tmpDir, err := os.MkdirTemp("", "openk8s-extract-*")
	if err != nil {
		return err
	}
	if err := extractTarGz(downloaded, tmpDir); err != nil {
		os.RemoveAll(tmpDir)
		return err
	}
	newBin, err := findBinary(tmpDir)
	if err != nil {
		os.RemoveAll(tmpDir)
		return err
	}

	script, err := os.CreateTemp("", "openk8s-swap-*.sh")
	if err != nil {
		os.RemoveAll(tmpDir)
		return err
	}
	scriptPath := script.Name()
	cleanup := func() {
		os.Remove(scriptPath)
		os.RemoveAll(tmpDir)
	}
	if _, err := script.WriteString(linuxSwapScript(exe, newBin, tmpDir, scriptPath)); err != nil {
		script.Close()
		cleanup()
		return err
	}
	if err := script.Chmod(0o700); err != nil {
		script.Close()
		cleanup()
		return err
	}
	if err := script.Close(); err != nil {
		cleanup()
		return err
	}

	cmd := exec.Command("sh", scriptPath)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	if err := cmd.Start(); err != nil {
		cleanup()
		return err
	}
	scheduleExit()
	return nil
}

// linuxSwapScript swaps the running binary, cleans up and relaunches. It runs
// in a detached process after this one has exited, so the running binary can
// be replaced.
func linuxSwapScript(exe, newBin, tmpDir, scriptPath string) string {
	return fmt.Sprintf(`#!/bin/sh
sleep 1
mv -f -- %q %q
mv -f -- %q %q
chmod +x -- %q
rm -rf -- %q
rm -f -- %q
exec %q
`, exe, exe+".old", newBin, exe, exe, tmpDir, scriptPath, exe)
}
