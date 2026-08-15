package main

import (
	"context"
	"runtime/debug"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// GetVersion returns the application build information.
func (a *App) GetVersion() map[string]string {
	info := map[string]string{
		"name":    "openk8s-desktop",
		"version": "0.1.0",
	}
	if build, ok := debug.ReadBuildInfo(); ok {
		info["go"] = build.GoVersion
	}
	return info
}

// Health reports the backend health status.
func (a *App) Health() string {
	return "ok"
}
