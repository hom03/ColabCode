package crdt

import (
	"encoding/json"
	"os"
)

func (s *ORSet) Snapshot() ([]byte, error) {
	return json.MarshalIndent(s, "", "  ")
}

func LoadSnapshot(data []byte) (*ORSet, error) {
	var set ORSet
	err := json.Unmarshal(data, &set)
	if err != nil {
		return nil, err
	}
	return &set, nil
}

func (s *ORSet) SaveToFile(filename string) error {
	data, err := s.Snapshot()
	if err != nil {
		return err
	}
	return os.WriteFile(filename, data, 0644)
}

func LoadFromFile(filename string) (*ORSet, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	return LoadSnapshot(data)
}
