package sandbox

import (
	"testing"
	"time"
)

func TestExecutePython(t *testing.T) {
	code := "print('hello python')"
	res := ExecuteCode("python", code, 5*time.Second)
	if res.Error != nil {
		t.Fatalf("Python execution failed: %v", res.Error)
	}
	if res.Stdout != "hello python\n" {
		t.Fatalf("Unexpected stdout: %s", res.Stdout)
	}
}

func TestExecuteNode(t *testing.T) {
	code := "console.log('hello node')"
	res := ExecuteCode("node", code, 5*time.Second)
	if res.Error != nil {
		t.Fatalf("Node execution failed: %v", res.Error)
	}
	if res.Stdout != "hello node\n" {
		t.Fatalf("Unexpected stdout: %s", res.Stdout)
	}
}

func TestExecuteJava(t *testing.T) {
	code := `public class Main {
	public static void main(String[] args) {
		System.out.println("hello java");
	}
}`
	res := ExecuteCode("java", code, 10*time.Second)
	if res.Error != nil {
		t.Fatalf("Java execution failed: %v", res.Error)
	}
	if res.Stdout != "hello java\n" {
		t.Fatalf("Unexpected stdout: %s", res.Stdout)
	}
}

func TestExecuteCpp(t *testing.T) {
	code := `#include <iostream>
int main() {
	std::cout << "hello cpp" << std::endl;
	return 0;
}`
	res := ExecuteCode("c_cpp", code, 10*time.Second)
	if res.Error != nil {
		t.Fatalf("C++ execution failed: %v", res.Error)
	}
	if res.Stdout != "hello cpp\n" {
		t.Fatalf("Unexpected stdout: %s", res.Stdout)
	}
}
