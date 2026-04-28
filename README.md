# ColabCode

A real-time collaborative code editor with live execution, chat, shared todos, and cursor presence. Built as a final year project.

**Live:** [www.colabcode-fyp.dev](https://www.colabcode-fyp.dev)

---

## Features

- Real-time collaborative editing with live cursor presence
- Code execution in isolated Docker sandboxes (Python, Node.js, Java, C/C++)
- Real-time chat synced across all connected users
- Shared TODO board
- Typing indicators
- JWT authentication with role-based access (user / admin)
- Admin dashboard with E2EE key management and user controls
- CRDT-based conflict-free sync over gRPC-Web streaming
- CRDT state persisted to Redis across server restarts

---

## Architecture

```
Browser (Vercel)
  └── React + Vite frontend
        ├── REST (HTTP)      → /login, /register, /execute
        └── gRPC-Web stream  → CRDT sync (code, cursors, chat, todos, output)

DigitalOcean Droplet
  └── Nginx (HTTPS reverse proxy)
        └── Go backend (server.go :8080)
              ├── gRPC server (CRDT service)
              │     ├── Sync()           — streams ops to all connected clients
              │     └── SendOperation()  — receives ops, broadcasts, saves to Redis
              ├── HTTP REST handlers
              │     ├── POST /login
              │     ├── POST /register
              │     ├── POST /execute    (JWT required)
              │     └── GET  /health
              ├── Sandbox (Docker per language)
              │     ├── Python
              │     ├── Node.js
              │     ├── Java
              │     └── C/C++
              ├── CRDT (ORSet)
              └── Storage
                    ├── PostgreSQL  — user accounts
                    └── Redis       — CRDT state persistence
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6 |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Backend | Go |
| Real-time sync | gRPC-Web (protobuf streaming) |
| CRDT | Custom Observed-Remove Set (ORSet) |
| Auth | JWT (HS256, `golang-jwt`), bcrypt password hashing |
| Database | PostgreSQL |
| Cache / state persistence | Redis |
| Code execution | Docker (isolated containers, seccomp profile) |
| Reverse proxy | Nginx |
| TLS | Let's Encrypt / Certbot |
| Process management | systemd |
| Frontend hosting | Vercel |
| Backend hosting | DigitalOcean Droplet (Ubuntu 24.04) |

---

## Project Structure

```
colabcode/
├── backend/
│   ├── auth/
│   │   └── jwt.go                  # JWT generation and validation
│   ├── crdt/
│   │   ├── orset.go                # Observed-Remove Set CRDT implementation
│   │   ├── snapshot.go             # Snapshot save/load (file and Redis)
│   │   └── orset_test.go
│   ├── sandbox/
│   │   ├── sandbox.go              # Docker-based code execution
│   │   ├── security/
│   │   │   └── seccomp.json        # Seccomp profile for containers
│   │   └── images/                 # Dockerfiles per language
│   │       ├── python/Dockerfile
│   │       ├── node/Dockerfile
│   │       ├── java/Dockerfile
│   │       └── c_cpp/Dockerfile
│   ├── storage/
│   │   ├── redis.go                # Redis store (CRDT state)
│   │   └── users.go                # PostgreSQL user store
│   └── tools/
│       └── client.go               # CLI gRPC test client
├── proto/
│   ├── crdt.proto                  # Protobuf service definition
│   ├── crdt.pb.go                  # Generated Go types
│   └── crdt_grpc.pb.go             # Generated Go gRPC service
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── api.js              # Base fetch wrapper with auth headers
│   │   │   ├── auth.js             # JWT storage and client-side decoding
│   │   │   └── crdtClient.js       # gRPC-Web CRDT stream client
│   │   ├── components/
│   │   │   ├── Editor.jsx          # Monaco editor with remote cursor decorations
│   │   │   ├── TopBar.jsx          # Navigation and user info
│   │   │   ├── ActiveUsers.jsx     # Live presence via localStorage polling
│   │   │   ├── ChatPanel.jsx       # Real-time chat via CRDT
│   │   │   ├── TodoPanel.jsx       # Shared todo list via CRDT
│   │   │   ├── LanguageSelector.jsx
│   │   │   ├── OutputPanel.jsx
│   │   │   └── RunButton.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── EditorPage.jsx      # Main collaborative editor
│   │   │   └── AdminPage.jsx       # Admin dashboard (admin role only)
│   │   └── proto/                  # Generated JS/TS gRPC-Web bindings
│   │       ├── crdt_pb.js
│   │       ├── crdt_pb.d.ts
│   │       └── CrdtServiceClientPb.ts
│   ├── vercel.json                 # SPA rewrite rules + cache headers
│   └── vite.config.js
├── server.go                       # Main backend entry point
├── go.mod
├── .env                            # Environment variables (see below)
└── .gitignore
```

---

## CRDT — How it Works

The backend maintains a single shared **ORSet** (Observed-Remove Set). All real-time operations — code changes, cursor positions, chat messages, todos — are serialised as JSON and stored as values in this set.

The protobuf service defines two RPCs:

```proto
syntax = "proto3";
package crdt;
option go_package = "colabcode/proto";

message Operation {
  string type = 1;
  string value = 2;
}

message Empty {}

service CRDTService {
  rpc SendOperation(Operation) returns (Empty);     // client → server (unary)
  rpc Sync(Empty) returns (stream Operation);       // server → client (streaming)
}
```

When a client connects via `Sync`, the server replays the full current snapshot then holds the stream open. When any client calls `SendOperation`, the server adds the operation to the ORSet, persists it to Redis, and broadcasts it to all connected streams.

Each operation carries a `kind` field inside its JSON value:

| Kind | Purpose |
|---|---|
| `code` | Full code state + last editor username |
| `cursor` | Cursor position and colour for a user |
| `typing` | Typing indicator (ephemeral) |
| `chat` | Chat message |
| `todo` | Add a todo item |
| `todoRemove` | Remove a todo item |
| `execute` | Trigger sandboxed code execution |
| `output` | Code execution result broadcast to all clients |

---

## Authentication

Users register with email, username, and password. Passwords are hashed with **bcrypt** (cost factor 10) before storage — plain text passwords are never saved.

On login the server issues a signed **JWT** (HS256) containing:

```json
{
  "userId": 3,
  "email": "user@example.com",
  "username": "Hughadmin",
  "role": "admin",
  "exp": 1777419462
}
```

The JWT is stored in `localStorage` and decoded client-side by `auth.js` using base64url decoding. The `role` field controls access to the Admin page. Tokens expire after 24 hours.

Admin users must be created directly in the database — there is intentionally no way to self-assign the admin role through registration:

```sql
UPDATE users SET role = 'admin' WHERE username = 'your_username';
```

---

## Code Execution Sandbox

Each language runs in its own Docker container with strict resource limits:

```
--memory     50m
--cpus       0.5
--pids-limit 64
--network    none   (Linux only)
```

Containers are removed immediately after execution (`--rm`). A seccomp profile at `backend/sandbox/security/seccomp.json` restricts available syscalls. Execution times out after 5 seconds.

---

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=8080
JWT_SECRET=your_secret_here
DATABASE_URL=postgres://user:password@localhost:5432/colabcode
```

---

## Droplet Setup (First Time)

### 1. SSH in and install dependencies

```bash
ssh root@your.droplet.ip

apt update && apt upgrade -y
apt install -y git golang-go postgresql redis-server nginx certbot python3-certbot-nginx docker.io

systemctl enable --now postgresql redis-server docker nginx
```

### 2. PostgreSQL

```bash
sudo -u postgres psql <<EOF
CREATE DATABASE colabcode;
CREATE USER colabcode WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE colabcode TO colabcode;
EOF

psql $DATABASE_URL -c "
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  username    TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'user',
  created_at  TIMESTAMP DEFAULT NOW()
);"
```

### 3. Build Docker sandbox images

```bash
cd ~/ColabCode

docker build -t sandbox/python:latest ./backend/sandbox/images/python
docker build -t sandbox/node:latest   ./backend/sandbox/images/node
docker build -t sandbox/java:latest   ./backend/sandbox/images/java
docker build -t sandbox/c_cpp:latest  ./backend/sandbox/images/c_cpp

# Verify
docker images | grep sandbox
```

### 4. Build the backend

```bash
cd ~/ColabCode
go build -o colabcode-backend ./backend
```

### 5. systemd service

Create `/etc/systemd/system/colabcode.service`:

```ini
[Unit]
Description=ColabCode Backend
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/ColabCode
EnvironmentFile=/root/ColabCode/.env
ExecStart=/root/ColabCode/colabcode-backend
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable colabcode
systemctl start colabcode

# Check status
systemctl status colabcode

# View live logs
journalctl -u colabcode -f
```

### 6. Nginx

Create `/etc/nginx/sites-available/colabcode`:

```nginx
server {
    listen 80;
    server_name api.colabcode-fyp.dev;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.colabcode-fyp.dev;

    ssl_certificate     /etc/letsencrypt/live/api.colabcode-fyp.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.colabcode-fyp.dev/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;

        add_header Access-Control-Allow-Origin  * always;
        add_header Access-Control-Allow-Methods "POST, GET, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, x-grpc-web, x-user-agent" always;
        add_header Access-Control-Expose-Headers "grpc-status, grpc-message" always;

        if ($request_method = OPTIONS) {
            return 204;
        }
    }
}
```

```bash
ln -s /etc/nginx/sites-available/colabcode /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Issue TLS certificate
certbot --nginx -d api.colabcode-fyp.dev
```

---

## Redeploying After Code Changes

```bash
ssh root@your.droplet.ip
cd ~/ColabCode
git pull
go build -o colabcode-backend ./backend
systemctl restart colabcode
```

The frontend auto-deploys from the `main` branch via Vercel's GitHub integration.

---

## Running Locally

### Prerequisites

- Go 1.21+
- Node.js 18+
- Docker
- PostgreSQL
- Redis

### Backend

```bash
go mod download
go run server.go
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Frontend Deployment (Vercel)

The `frontend/vercel.json` handles SPA routing and cache control:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/index.html",
      "headers": [{ "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }]
    },
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

`index.html` is never cached so users always get the latest build. Hashed asset files are cached permanently since their filenames change on every Vite build.

---

## CLI Test Client

A terminal gRPC client is included for testing operations directly against the backend without the frontend:

```bash
go run backend/tools/client.go
# Enter operation (add/remove value): add hello world
```

---

## Known Limitations / TODO

- CRDT state is global — all users share one session. No concept of separate rooms or projects yet.
- The ORSet grows indefinitely. Old operations are never pruned. A compaction strategy (keeping only the latest `code` operation) would reduce memory and replay time for new clients joining.
- Code execution triggered via gRPC (`execute` operation) bypasses JWT auth. The REST `/execute` endpoint is protected but the gRPC path is not.
- Active user presence is tracked via `localStorage` polling rather than the server, so presence is per browser tab rather than per authenticated session.
- The Admin page E2EE key management (keys, fingerprints, rotation) is currently client-side only using `localStorage`. No keys are stored or enforced server-side.

---

## License

MIT