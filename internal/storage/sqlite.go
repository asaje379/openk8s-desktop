package storage

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"

	"openk8s-desktop/internal/cluster"
)

// SQLiteStore implements both cluster.ClusterStore and cluster.CredentialStore.
type SQLiteStore struct {
	db *sql.DB
}

// Open opens (and migrates) the SQLite database at path.
func Open(path string) (*SQLiteStore, error) {
	if dir := filepath.Dir(path); dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, fmt.Errorf("create data dir: %w", err)
		}
	}
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	db.SetMaxOpenConns(1)
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping sqlite: %w", err)
	}
	if err := migrate(db); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}
	return &SQLiteStore{db: db}, nil
}

func migrate(db *sql.DB) error {
	const schema = `
CREATE TABLE IF NOT EXISTS clusters (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    server          TEXT NOT NULL,
    current_context TEXT NOT NULL DEFAULT '',
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS kubeconfigs (
    cluster_id TEXT PRIMARY KEY,
    kubeconfig TEXT NOT NULL
);`
	_, err := db.Exec(schema)
	return err
}

// Close closes the underlying database.
func (s *SQLiteStore) Close() error {
	return s.db.Close()
}

func (s *SQLiteStore) ListClusters() ([]cluster.Cluster, error) {
	rows, err := s.db.Query(`SELECT id, name, server, current_context, created_at, updated_at FROM clusters ORDER BY created_at`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var clusters []cluster.Cluster
	for rows.Next() {
		var c cluster.Cluster
		var createdAt, updatedAt string
		if err := rows.Scan(&c.ID, &c.Name, &c.Server, &c.CurrentContext, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		c.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		c.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
		clusters = append(clusters, c)
	}
	return clusters, rows.Err()
}

func (s *SQLiteStore) GetCluster(id string) (cluster.Cluster, error) {
	var c cluster.Cluster
	var createdAt, updatedAt string
	err := s.db.QueryRow(`SELECT id, name, server, current_context, created_at, updated_at FROM clusters WHERE id = ?`, id).
		Scan(&c.ID, &c.Name, &c.Server, &c.CurrentContext, &createdAt, &updatedAt)
	if err != nil {
		return cluster.Cluster{}, err
	}
	c.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	c.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
	return c, nil
}

func (s *SQLiteStore) SaveCluster(c cluster.Cluster) error {
	_, err := s.db.Exec(`
		INSERT INTO clusters (id, name, server, current_context, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			name = excluded.name,
			server = excluded.server,
			current_context = excluded.current_context,
			updated_at = excluded.updated_at`,
		c.ID, c.Name, c.Server, c.CurrentContext,
		c.CreatedAt.Format(time.RFC3339), c.UpdatedAt.Format(time.RFC3339))
	return err
}

func (s *SQLiteStore) DeleteCluster(id string) error {
	_, err := s.db.Exec(`DELETE FROM clusters WHERE id = ?`, id)
	return err
}

func (s *SQLiteStore) SaveKubeconfig(id string, kubeconfig string) error {
	_, err := s.db.Exec(`
		INSERT INTO kubeconfigs (cluster_id, kubeconfig) VALUES (?, ?)
		ON CONFLICT(cluster_id) DO UPDATE SET kubeconfig = excluded.kubeconfig`,
		id, kubeconfig)
	return err
}

func (s *SQLiteStore) GetKubeconfig(id string) (string, error) {
	var kc string
	err := s.db.QueryRow(`SELECT kubeconfig FROM kubeconfigs WHERE cluster_id = ?`, id).Scan(&kc)
	if err != nil {
		return "", err
	}
	return kc, nil
}

func (s *SQLiteStore) DeleteKubeconfig(id string) error {
	_, err := s.db.Exec(`DELETE FROM kubeconfigs WHERE cluster_id = ?`, id)
	return err
}
