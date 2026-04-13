package crdt

import "testing"

func TestAddContains(t *testing.T) {
	set := NewORSet()

	set.Add("apple")

	if !set.Contains("apple") {
		t.Fatal("expected apple to be present")
	}
}

func TestRemove(t *testing.T) {
	set := NewORSet()

	set.Add("banana")
	set.Remove("banana")

	if set.Contains("banana") {
		t.Fatal("expected banana to be removed")
	}
}

func TestConvergence(t *testing.T) {
	a := NewORSet()
	b := NewORSet()

	a.Add("x")
	b.Add("y")

	a.Merge(b)
	b.Merge(a)

	if !a.Contains("y") || !b.Contains("x") {
		t.Fatal("replicas did not converge")
	}
}

func TestObservedRemove(t *testing.T) {
	a := NewORSet()
	b := NewORSet()

	a.Add("z")
	b.Merge(a)
	b.Remove("z")
	a.Merge(b)

	if a.Contains("z") {
		t.Fatal("observed-remove failed")
	}
}

func TestSnapshot(t *testing.T) {
	original := NewORSet()
	original.Add("persist")

	data, err := original.Snapshot()
	if err != nil {
		t.Fatal(err)
	}

	restored, err := LoadSnapshot(data)
	if err != nil {
		t.Fatal(err)
	}

	if !restored.Contains("persist") {
		t.Fatal("snapshot restoration failure")
	}
}
