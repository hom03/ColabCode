package sandbox

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"runtime"
	"time"
)

// ExecutionResult holds output from a container
type ExecutionResult struct {
	Stdout   string
	Stderr   string
	ExitCode int
	Error    error
}

// ExecuteCode spins up a Docker container to run code in a specific language.
// language examples: "python", "node", "java", "c_cpp"
// code: the source code to run
// timeout: maximum execution duration
func ExecuteCode(language, code string, timeout time.Duration) ExecutionResult {
	var dockerImage string
	var cmdArgs []string

	switch language {
	case "python":
		dockerImage = "sandbox/python:latest"
		cmdArgs = []string{"python", "-c", code}

	case "node":
		dockerImage = "sandbox/node:latest"
		cmdArgs = []string{"node", "-e", code}

	case "java":
		dockerImage = "sandbox/java:latest"
		cmdArgs = []string{"sh", "-c",
			fmt.Sprintf("echo '%s' > /tmp/Main.java && javac /tmp/Main.java && java -cp /tmp Main", code)}

	case "c_cpp":
		dockerImage = "sandbox/cpp:latest"
		cmdArgs = []string{"sh", "-c",
			fmt.Sprintf("echo '%s' > /tmp/main.cpp && g++ /tmp/main.cpp -o /tmp/main && /tmp/main", code)}

	default:
		return ExecutionResult{Error: fmt.Errorf("unsupported language: %s", language)}
	}

	// Build the docker run command with resource limits
	args := []string{
		"run", "--rm",
		"--name", fmt.Sprintf("colabcode_exec_%d", time.Now().UnixNano()),
		"--memory", "50m",
		"--cpus", "0.5",
		"--pids-limit", "64",
	}

	// only apply full sandbox on linux
	if runtime.GOOS == "linux" {
		args = append(args,
			"--network", "none",
		)
	}
	args = append(args, dockerImage)
	args = append(args, cmdArgs...)

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, "docker", args...)
	var outBuf, errBuf bytes.Buffer
	cmd.Stdout = &outBuf
	cmd.Stderr = &errBuf

	err := cmd.Run()
	exitCode := 0
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			exitCode = exitError.ExitCode()
		}
	}

	return ExecutionResult{
		Stdout:   outBuf.String(),
		Stderr:   errBuf.String(),
		ExitCode: exitCode,
		Error:    err,
	}
}
