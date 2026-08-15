package cluster_test

import (
	"testing"

	"openk8s-desktop/internal/cluster"
)

const testKubeconfig = `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://prod.example.com:6443
  name: prod
- cluster:
    server: https://staging.example.com:6443
  name: staging
contexts:
- context:
    cluster: prod
    user: admin
    namespace: prod-ns
  name: prod-context
- context:
    cluster: staging
    user: admin
  name: staging-context
current-context: prod-context
users:
- name: admin
  user:
    token: secret-token
`

const testKubeconfigNoCurrent = `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://prod.example.com:6443
  name: prod
contexts:
- context:
    cluster: prod
    user: admin
  name: prod-context
users:
- name: admin
  user:
    token: secret-token
`

func TestParseKubeconfig_Valid(t *testing.T) {
	cfg, err := cluster.ParseKubeconfig(testKubeconfig)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(cfg.Contexts) != 2 {
		t.Fatalf("expected 2 contexts, got %d", len(cfg.Contexts))
	}
	if cfg.CurrentContext != "prod-context" {
		t.Fatalf("expected current-context prod-context, got %q", cfg.CurrentContext)
	}
}

func TestParseKubeconfig_Empty(t *testing.T) {
	if _, err := cluster.ParseKubeconfig(""); err == nil {
		t.Fatal("expected error for empty kubeconfig")
	}
}

func TestParseKubeconfig_Invalid(t *testing.T) {
	if _, err := cluster.ParseKubeconfig("not: valid: yaml: ["); err == nil {
		t.Fatal("expected error for invalid kubeconfig")
	}
}

func TestParseKubeconfig_NoContext(t *testing.T) {
	kc := `apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://prod.example.com:6443
  name: prod
users:
- name: admin
  user:
    token: secret-token
`
	if _, err := cluster.ParseKubeconfig(kc); err == nil {
		t.Fatal("expected error for kubeconfig without context")
	}
}

func TestContextsFromConfig_Sorted(t *testing.T) {
	cfg, err := cluster.ParseKubeconfig(testKubeconfig)
	if err != nil {
		t.Fatal(err)
	}
	contexts := cluster.ContextsFromConfig(cfg)
	if len(contexts) != 2 {
		t.Fatalf("expected 2 contexts, got %d", len(contexts))
	}
	if contexts[0].Name != "prod-context" || contexts[1].Name != "staging-context" {
		t.Fatalf("expected sorted contexts [prod-context staging-context], got %v", contexts)
	}
	if contexts[0].Namespace != "prod-ns" {
		t.Fatalf("expected namespace prod-ns, got %q", contexts[0].Namespace)
	}
}

func TestServerForContext(t *testing.T) {
	cfg, err := cluster.ParseKubeconfig(testKubeconfig)
	if err != nil {
		t.Fatal(err)
	}
	server, err := cluster.ServerForContext(cfg, "staging-context")
	if err != nil {
		t.Fatal(err)
	}
	if server != "https://staging.example.com:6443" {
		t.Fatalf("unexpected server %q", server)
	}
}

func TestServerForContext_NotFound(t *testing.T) {
	cfg, _ := cluster.ParseKubeconfig(testKubeconfig)
	if _, err := cluster.ServerForContext(cfg, "missing-context"); err == nil {
		t.Fatal("expected error for unknown context")
	}
}
