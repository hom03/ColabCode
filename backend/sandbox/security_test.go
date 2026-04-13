package sandbox

import (
	"strings"
	"testing"
	"time"
)

// TestInfiniteLoopTimeout ensures that code that runs forever is killed by timeout.
func TestInfiniteLoopTimeout(t *testing.T) {
	code := "while True: pass"

	res := ExecuteCode("python", code, 3*time.Second)

	if res.Error == nil {
		t.Fatalf("Expected timeout error but execution succeeded")
	}
	if res.ExitCode == 0 {
		t.Fatalf("Expected non-zero exit code for infinite loop")
	}
}

// TestMemoryLimit ensures that code exceeding memory limit is terminated.
func TestMemoryLimit(t *testing.T) {
	// This tries to allocate ~200MB
	code := "a = 'A' * (1024*1024*200); print(len(a))"

	res := ExecuteCode("python", code, 5*time.Second)

	if res.Error == nil {
		t.Fatalf("Expected memory limit failure but execution succeeded")
	}
	if !strings.Contains(strings.ToLower(res.Stderr), "killed") {
		t.Logf("Warning: container may not have been OOM killed; stderr: %s", res.Stderr)
	}
}

// TestNonRootExecution ensures the container does not run as root
func TestNonRootExecution(t *testing.T) {
	code := "import os; print(os.geteuid())" // 0=root, >0=non-root

	res := ExecuteCode("python", code, 3*time.Second)

	if res.Error != nil {
		t.Fatalf("Execution failed: %v", res.Error)
	}
	if strings.TrimSpace(res.Stdout) == "0" {
		t.Fatalf("Container ran as root, expected non-root user")
	}
}

// TestNetworkIsolation ensures the container cannot access network
func TestNetworkIsolation(t *testing.T) {
	code := "import socket; socket.create_connection(('google.com', 80))"

	res := ExecuteCode("python", code, 5*time.Second)

	if res.Error == nil {
		t.Fatalf("Expected network failure but execution succeeded")
	}
	if !strings.Contains(strings.ToLower(res.Stderr), "error") &&
		!strings.Contains(strings.ToLower(res.Stderr), "timeout") {
		t.Logf("Warning: network test did not produce expected error, stderr: %s", res.Stderr)
	}
}
