package main

import (
	"colabcode/backend/auth"
	"colabcode/backend/crdt"
	"colabcode/backend/sandbox"
	"colabcode/backend/storage"
	"colabcode/proto"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc"
)

type server struct {
	proto.UnimplementedCRDTServiceServer
	set     *crdt.ORSet
	clients map[proto.CRDTService_SyncServer]time.Time
	mu      sync.Mutex
	store   *storage.RedisStore
}

func newServer() *server {
	store := storage.NewRedisStore()

	s := &server{
		set:     crdt.NewORSet(),
		store:   store,
		clients: make(map[proto.CRDTService_SyncServer]time.Time),
	}

	data, err := store.Load("crdt_state")
	if err == nil {
		if loaded, err := crdt.FromJson(data); err == nil {
			s.set = loaded
			log.Println("CRDT state loaded from Redis")
		}
	}

	return s
}

func (s *server) Sync(req *proto.Empty, stream proto.CRDTService_SyncServer) error {
	s.mu.Lock()
	s.clients[stream] = time.Now()
	snapshot := s.set.Values()
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		delete(s.clients, stream)
		s.mu.Unlock()
	}()

	// Send current snapshot
	for _, value := range snapshot {
		select {
		case <-stream.Context().Done():
			log.Println("Client disconnected before snapshot complete")
			return nil
		default:
		}

		if err := stream.Send(&proto.Operation{
			Type:  "add",
			Value: value,
		}); err != nil {
			return nil
		}
	}

	// Wait until browser disconnects
	<-stream.Context().Done()
	log.Println("Client disconnected")
	return nil
}

func (s *server) SendOperation(ctx context.Context, op *proto.Operation) (*proto.Empty, error) {
	log.Printf("Unary op: %s %s", op.Type, op.Value)

	s.mu.Lock()

	// ---------------- EXECUTE ----------------
	if op.Type == "execute" {
		clients := make([]proto.CRDTService_SyncServer, 0, len(s.clients))
		for c := range s.clients {
			clients = append(clients, c)
		}
		s.mu.Unlock()

		parts := strings.SplitN(op.Value, "|", 2)
		if len(parts) == 2 {
			result := sandbox.ExecuteCode(parts[0], parts[1], 5*time.Second)

			for _, client := range clients {
				err := client.Send(&proto.Operation{
					Type:  "output",
					Value: fmt.Sprintf("%s|||%s", result.Stdout, result.Stderr),
				})

				if err != nil {
					log.Println("Removing dead client:", err)

					s.mu.Lock()
					delete(s.clients, client)
					s.mu.Unlock()
				}
			}
		}

		return &proto.Empty{}, nil
	}

	// ---------------- PRESENCE (join/leave) ----------------
	if op.Type == "add" {
		var payload struct {
			Kind string `json:"kind"`
		}
		json.Unmarshal([]byte(op.Value), &payload)

		if payload.Kind == "join" || payload.Kind == "leave" {
			// Broadcast only — never stored in ORSet or persisted to Redis
			clients := make([]proto.CRDTService_SyncServer, 0, len(s.clients))
			for c := range s.clients {
				clients = append(clients, c)
			}
			s.mu.Unlock()

			for _, client := range clients {
				if err := client.Send(op); err != nil {
					log.Println("Removing dead client:", err)
					s.mu.Lock()
					delete(s.clients, client)
					s.mu.Unlock()
				}
			}
			return &proto.Empty{}, nil
		}

		s.set.Add(op.Value)
	}

	// ---------------- CRDT ----------------
	if op.Type == "remove" {
		s.set.Remove(op.Value)
	}

	// Save latest state to Redis
	if data, err := s.set.ToJSON(); err == nil {
		if err := s.store.Save("crdt_state", data); err != nil {
			log.Println("Redis save failed:", err)
		}
	}

	clients := make([]proto.CRDTService_SyncServer, 0, len(s.clients))
	for c := range s.clients {
		clients = append(clients, c)
	}

	s.mu.Unlock()

	// Broadcast to all clients
	for _, client := range clients {
		if err := client.Send(op); err != nil {
			log.Println("Removing dead client:", err)

			s.mu.Lock()
			delete(s.clients, client)
			s.mu.Unlock()
		}
	}

	return &proto.Empty{}, nil
}

func executeHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Content-Type", "application/json")

	if r.Method == http.MethodOptions {
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Only POST allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Language string `json:"language"`
		Code     string `json:"code"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.Code == "" {
		http.Error(w, "Code cannot be empty", http.StatusBadRequest)
		return
	}

	valid := map[string]bool{
		"python": true,
		"node":   true,
		"java":   true,
		"c_cpp":  true,
	}

	if !valid[req.Language] {
		http.Error(w, "Unsupported language", http.StatusBadRequest)
		return
	}

	result := sandbox.ExecuteCode(req.Language, req.Code, 5*time.Second)
	json.NewEncoder(w).Encode(result)
}

func registerHandler(userStore *storage.UserStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Email    string `json:"email"`
			Username string `json:"username"`
			Password string `json:"password"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON", 400)
			return
		}

		if req.Email == "" || req.Username == "" || req.Password == "" {
			http.Error(w, "Missing fields", 400)
			return
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			http.Error(w, "Server error", 500)
			return
		}

		err = userStore.CreateUser(req.Email, req.Username, string(hash), "user")
		if err != nil {
			http.Error(w, err.Error(), 400)
			return
		}

		w.Write([]byte("registered"))
	}
}

func loginHandler(userStore *storage.UserStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON", 400)
			return
		}

		user, err := userStore.GetUserByEmail(req.Email)
		if err != nil || user == nil {
			http.Error(w, "Invalid credentials", 401)
			return
		}

		if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)) != nil {
			http.Error(w, "Invalid credentials", 401)
			return
		}

		token, err := auth.GenerateToken(
			user.ID,
			user.Email,
			user.Username,
			user.Role,
		)

		if err != nil {
			http.Error(w, "Token generation failed", 500)
			return
		}

		json.NewEncoder(w).Encode(map[string]string{
			"token": token,
		})
	}
}

func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")

		if header == "" {
			http.Error(w, "Missing token", 401)
			return
		}

		if !strings.HasPrefix(header, "Bearer ") {
			http.Error(w, "Invalid token format", 401)
			return
		}

		tokenStr := strings.TrimPrefix(header, "Bearer ")

		claims, err := auth.ValidateToken(tokenStr)
		if err != nil {
			http.Error(w, "Invalid token", 401)
			return
		}

		ctx := context.WithValue(r.Context(), "user", claims)
		next(w, r.WithContext(ctx))
	}
}

func adminOnly(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := r.Context().Value("user").(*auth.Claims)
		if !ok {
			http.Error(w, "Unauthorized", 401)
			return
		}

		if claims.Role != "admin" {
			http.Error(w, "Forbidden", 403)
			return
		}

		next(w, r)
	}
}

func adminHandler(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Admin access granted"))
}

func main() {
	godotenv.Load()

	srv := newServer()

	grpcServer := grpc.NewServer()
	proto.RegisterCRDTServiceServer(grpcServer, srv)

	userStore, err := storage.NewUserStore()
	if err != nil {
		log.Fatal("DB connection failed:", err)
	}

	wrapped := grpcweb.WrapServer(
		grpcServer,
		grpcweb.WithOriginFunc(func(origin string) bool {
			return true
		}),
	)

	mux := http.NewServeMux()
	mux.HandleFunc("/register", registerHandler(userStore))
	mux.HandleFunc("/login", loginHandler(userStore))
	mux.HandleFunc("/execute", authMiddleware(executeHandler))
	mux.HandleFunc("/admin", authMiddleware(adminOnly(adminHandler)))
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set(
			"Access-Control-Allow-Headers",
			"Content-Type, Authorization, x-grpc-web, x-user-agent",
		)
		w.Header().Set(
			"Access-Control-Expose-Headers",
			"grpc-status, grpc-message",
		)

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if wrapped.IsGrpcWebRequest(r) ||
			wrapped.IsGrpcWebSocketRequest(r) ||
			wrapped.IsAcceptableGrpcCorsRequest(r) {

			wrapped.ServeHTTP(w, r)
			return
		}

		mux.ServeHTTP(w, r)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("Server running on :" + port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}
