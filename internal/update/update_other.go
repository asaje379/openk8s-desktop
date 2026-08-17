//go:build !linux && !windows

package update

import "errors"

func applyLinux(downloaded string) error {
	return errors.New("linux auto-update is not supported on this platform")
}

func applyWindows(downloaded string) error {
	return errors.New("windows auto-update is not supported on this platform")
}
