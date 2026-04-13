# ColabCode

Real-time collaborative IDE built with React, Go, gRPC, and CRDTs.

## Features
- Real-time code collaboration
- Python, Java, Node, C/C++ language options available
- Live chat
- Shared TODO board
- Code execution
- Cursor presence
- Advanced admin dashboard 

## Tech Stack
- Frontend: React
- Backend: Go + gRPC-Web
- Sync: CRDT (OR-Set)

## Run locally

### Backend
go run ./backend/server.go

### Frontend
cd frontend
npm install
npm run dev