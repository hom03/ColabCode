package main

import (
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
			log.Println("CRDT State loaded from Redis")
		}
	}
	return s
}

func (s *server) Sync(req *proto.Empty, stream proto.CRDTService_SyncServer) error {
	s.mu.Lock()
	s.clients[stream] = time.Now()
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			s.mu.Lock()
			if _, ok := s.clients[stream]; !ok {
				s.mu.Unlock()
				return
			}
			s.clients[stream] = time.Now()
			s.mu.Unlock()
		}
	}()
	snapshot := s.set.Values()
	s.mu.Unlock()

	// Send snapshot
	for _, value := range snapshot {
		if err := stream.Send(&proto.Operation{
			Type:  "add",
			Value: value,
		}); err != nil {
			log.Println("Failed to send snapshot:", err)
			return err
		}
	}

	defer func() {
		s.mu.Lock()
		delete(s.clients, stream)
		s.mu.Unlock()
	}()

	// keep connection open forever
	select {}
}

func (s *server) SendOperation(ctx context.Context, op *proto.Operation) (*proto.Empty, error) {
	log.Printf("Unary op: %s %s", op.Type, op.Value)

	s.mu.Lock()

	// EXECUTE
	if op.Type == "execute" {
		parts := strings.SplitN(op.Value, "|", 2)
		if len(parts) == 2 {
			result := sandbox.ExecuteCode(parts[0], parts[1], 5*time.Second)

			for client := range s.clients {
				client.Send(&proto.Operation{
					Type:  "output",
					Value: fmt.Sprintf("%s|||%s", result.Stdout, result.Stderr),
				})
			}
		}

		s.mu.Unlock()
		return &proto.Empty{}, nil
	}

	// CRDT
	if op.Type == "add" {
		s.set.Add(op.Value)
	}
	if op.Type == "remove" {
		s.set.Remove(op.Value)
	}

	//Save to redis after operation
	if data, err := s.set.ToJSON(); err == nil {
		s.store.Save("crdt_state", data)
	}

	clients := make([]proto.CRDTService_SyncServer, 0, len(s.clients))
	for c := range s.clients {
		clients = append(clients, c)
	}
	s.mu.Unlock()

	for _, c := range clients {
		c.Send(op)
	}

	return &proto.Empty{}, nil
}

func (s *server) startHeartbeatMonitor() {
	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			s.mu.Lock()
			for client, lastSeen := range s.clients {
				if time.Since(lastSeen) > 20*time.Second {
					log.Println("Removing inactive client")
					delete(s.clients, client)
				}
			}
			s.mu.Unlock()
		}
	}()
}

func executeHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
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
	log.Printf("HTTP execute request: %s (%d chars)", req.Language, len(req.Code))
	result := sandbox.ExecuteCode(req.Language, req.Code, 5*time.Second)

	json.NewEncoder(w).Encode(result)
}

func main() {
	godotenv.Load()
	srv := newServer()
	srv.startHeartbeatMonitor()

	grpcServer := grpc.NewServer()
	proto.RegisterCRDTServiceServer(grpcServer, srv)

	// Wrap gRPC for browser (gRPC-Web)
	wrapped := grpcweb.WrapServer(
		grpcServer,
		grpcweb.WithOriginFunc(func(origin string) bool {
			return true
		}),
	)

	mux := http.NewServeMux()
	mux.HandleFunc("/execute", executeHandler)
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// ---- CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, x-grpc-web, x-user-agent")
		w.Header().Set("Access-Control-Expose-Headers", "grpc-status, grpc-message")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// ---- gRPC-Web routing
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
		port = "8080" // local fallback
	}

	log.Println("gRPC-Web + HTTP server running on " + port)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}
