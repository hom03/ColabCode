package storage

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
)

type User struct {
	ID       int
	Email    string
	Password string
	Role     string
}

type UserStore struct {
	db *sql.DB
}

func NewUserStore() (*UserStore, error) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL not set")
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		return nil, err
	}
	return &UserStore{db: db}, nil
}

func (s *UserStore) CreateUser(email, password, role string) error {
	_, err := s.db.Exec(
		"INSERT INTO users (email, password, role) VALUES ($1, $2, $3)",
		email, password, role,
	)
	if err != nil {
		return fmt.Errorf("create user failed: %w", err)
	}
	return nil
}

func (s *UserStore) GetUserByEmail(email string) (*User, error) {
	row := s.db.QueryRow(
		"SELECT id, email, password, role FROM users WHERE email=$1",
		email,
	)

	var u User
	err := row.Scan(&u.ID, &u.Email, &u.Password, &u.Role)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &u, err
}
