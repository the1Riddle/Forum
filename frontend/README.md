# fakebook — Social, Reimagined

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat&logo=go)](https://golang.org)
[![React Version](https://img.shields.io/badge/React-18+-61DAFB?style=flat&logo=react)](https://react.dev)
[![Docker](https://img.shields.io/badge/Docker-Compatible-2496ED?style=flat&logo=docker)](https://www.docker.com)

**fakebook** is a fully functional, lightweight, privacy-focused Facebook clone. Built from scratch with a strict minimalist dependency design: standard Go `net/http` package for the backend, SQLite for standard local database persistence, and TanStack Start (React) for the client. Real-time messaging and alerts are driven by a custom thread-safe WebSocket gateway.

---

## 🌟 Key Features

### 👤 Profile & Privacy
- **Secure Authentication**: Register and log in securely. Authentication sessions are managed using HTTP-Only cookies.
- **Privacy Toggles**: Set your profile to *Public* or *Private*.
- **Follower System**: Follow users to see their feeds. Private profiles require explicit approval of follow requests.

### 📝 Posts & Comments
- **Flexible Feed**: View posts from friends, groups, or explore public posts.
- **Privacy Controls**: Choose who can view your posts: *Public*, *Followers-Only*, or *Custom* (disclosed to a selected subset of followers).
- **Interactive Feed**: Like, save, and comment on posts. Supports image uploads for posts and comments.

### 👥 Groups & Events
- **Group Communities**: Create, join, and invite members to groups. Includes admin permissions and membership requests.
- **Event Management**: Create and schedule group events. Manage RSVP responses (*Going*, *Interested*, *Not Going*).

### 💬 Real-Time Chats & Alerts
- **Direct DMs**: Secure 1-on-1 private messaging with emojis compatibility.
- **Group Chats**: Dynamic chat threads matching group members.
- **WebSocket Gateway**: Instantly dispatches chat messages and interactive notification alerts (e.g., follow request, group invite, event created) in real-time.

---

## 🛠️ Tech Stack

- **Backend**: Golang (Standard `net/http` routing)
- **Real-Time Engine**: Gorilla WebSockets
- **Database**: SQLite 3 (Standard SQL library integration with a custom migration engine)
- **Frontend**: React, TanStack Start, TanStack Router, TanStack Query, TailwindCSS
- **Containerization**: Docker & Docker Compose

---

## 📁 Repository Structure

```
├── backend/
│   ├── pkg/
│   │   ├── db/
│   │   │   ├── sqlite/                 # SQLite connection manager and migration runner
│   │   │   └── migrations/sqlite/      # SQL migration scripts (000001 - 000009)
│   │   ├── handlers/                   # API routes and WebSocket gateway handlers
│   │   └── models/                     # Go struct models mapping database tables
│   ├── server.go                       # Backend router and server initialization
│   ├── Dockerfile                      # Multi-stage Go compilation Docker image
│   └── go.mod                          # Backend Go modules
├── src/
│   ├── components/                     # Shared UI components (feed, chat, layout)
│   ├── routes/                         # TanStack File-Based routing pages
│   ├── services/                       # API Client wrappers & WebSocket listener
│   └── stores/                         # Zustand authentication state store
├── Dockerfile                          # Frontend SSR node compilation Docker image
├── docker-compose.yml                  # Root service orchestration profile
└── README.md                           # Documentation
```

---

## 🚀 Running the Project

### Using Docker Compose (Recommended)

1. Ensure you have **Docker** and **Docker Compose** installed on your system.
2. Clone the repository and navigate to the project directory:
   ```bash
   git clone https://github.com/your-username/fakebook.git
   cd fakebook
   ```
3. Run the orchestration:
   ```bash
   docker compose up -d
   ```
4. Access the applications:
   - **Frontend Client**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:8080](http://localhost:8080)

---

## 👥 Demo Users

The database is pre-seeded with historical pioneers of computing for testing:

| User Email | Password | Role / Details |
| :--- | :--- | :--- |
| `ada@fakebook.app` | `demo` | First computer programmer |
| `charles@fakebook.app` | `demo` | Father of the computer |
| `alan@fakebook.app` | `demo` | Pioneer of theoretical AI (Private Account) |
| `grace@fakebook.app` | `demo` | Pioneer of compiler design |

---

## 💻 Local Development Setup

### Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Build and run the server:
   ```bash
   go run server.go
   ```
   The backend will start on `http://localhost:8080` and run all SQLite migrations.

### Frontend Setup
1. In the root directory, install npm packages:
   ```bash
   npm install
   ```
2. Launch the frontend development server:
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:3000` and proxy all `/api` and `/ws` calls to backend port `8080`.
