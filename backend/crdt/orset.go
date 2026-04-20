package crdt

import (
	"encoding/json"

	"github.com/google/uuid"
)

// Tag identifies an Add operation
type Tag struct {
	ID string
}

// ORSet is an Observed-Removed Set CRDT
type ORSet struct {
	Adds    map[string][]Tag
	Removes map[string][]Tag
}

func NewORSet() *ORSet {
	return &ORSet{
		Adds:    make(map[string][]Tag),
		Removes: make(map[string][]Tag),
	}
}

func (s *ORSet) Add(value string) {
	tag := Tag{ID: uuid.New().String()}
	s.Adds[value] = append(s.Adds[value], tag)
}

func (s *ORSet) Remove(value string) {
	// Remove means copying add-tags into the remove set
	s.Removes[value] = append(s.Removes[value], s.Adds[value]...)
}

func (s *ORSet) Contains(value string) bool {
	addTags := s.Adds[value]
	removeTags := s.Removes[value]

	removed := map[string]bool{}
	for _, t := range removeTags {
		removed[t.ID] = true
	}

	for _, t := range addTags {
		if !removed[t.ID] {
			return true
		}
	}
	return false
}

// Merge merges two OR-Sets
func (s *ORSet) Merge(other *ORSet) {
	// Merge adds
	for val, tags := range other.Adds {
		s.Adds[val] = appendUnique(s.Adds[val], tags)
	}
	// Merge removes
	for val, tags := range other.Removes {
		s.Removes[val] = appendUnique(s.Removes[val], tags)
	}
}

func appendUnique(a, b []Tag) []Tag {
	exists := map[string]bool{}
	for _, t := range a {
		exists[t.ID] = true
	}
	for _, t := range b {
		if !exists[t.ID] {
			a = append(a, t)
		}
	}
	return a
}

func (s *ORSet) Values() []string {
	values := []string{}
	for v := range s.Adds {
		if s.Contains(v) {
			values = append(values, v)
		}
	}
	return values
}

func (s *ORSet) ToJSON() ([]byte, error) {
	return json.Marshal(s)
}

func FromJson(data []byte) (*ORSet, error) {
	var s ORSet
	err := json.Unmarshal(data, &s)
	return &s, err
}
