# 🌌 Cosmos — Proximity Social Space

A real-time 2D virtual environment where users move around and chat based on physical proximity. When you get close to someone, a chat channel opens. When you move away, it closes.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎮 **2D World** | Scrollable canvas rendered with PixiJS — stars, nebulae, grid |
| 🧑‍🚀 **Avatars** | Colored circles with names, emoji customization |
| 🔴 **Real-Time Sync** | Positions sync instantly via Socket.IO WebSockets |
| 📡 **Proximity Detection** | 150px radius — enter → chat opens, leave → chat closes |
| 💬 **Proximity Chat** | Auto-connects chat room when users are near each other |
| 🏠 **Multi-Room** | Chat with multiple nearby users simultaneously via tabs |
| 🌐 **REST API** | Health check + online user listing endpoints |
| 🗄️ **MongoDB** | Optional persistence for sessions and messages |

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + **Vite** — component model + fast HMR
- **PixiJS 7** — WebGL-accelerated 2D canvas rendering
- **Tailwind CSS** — utility-first styling
- **Socket.IO Client** — real-time WebSocket communication

### Backend
- **Node.js** + **Express** — HTTP server + REST API
- **Socket.IO** — bidirectional real-time events
- **MongoDB** + **Mongoose** — optional session/message persistence

> **Why PixiJS over plain Canvas/CSS?** PixiJS uses WebGL for hardware-accelerated rendering, handles hundreds of moving sprites efficiently, and provides a clean scene graph for layering effects (glow, rings, trails). For a 2D world with many concurrent users, it's significantly more performant than DOM-based approaches.

> **Why Socket.IO over raw WebSockets?** Built-in reconnection, rooms, namespaces, and fallback transports. The room abstraction maps cleanly to proximity chat pairs.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- MongoDB (optional — app works without it)

### 1. Clone & Install

```bash
git clone https://github.com/your-username/cosmos.git
cd cosmos

# Install all dependencies at once
npm run install:all
```

### 2. Configure Environment

```bash
# Server
cp server/.env.example server/.env

# Client
cp client/.env.example client/.env
```

Edit `server/.env`:
```
PORT=3001
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://localhost:27017/cosmos   # optional
```

Edit `client/.env`:
```
VITE_SERVER_URL=http://localhost:3001
```

### 3. Run Development

```bash
# Start both server + client with one command
npm run dev
```

Or run them separately:
```bash
# Terminal 1 — server (port 3001)
cd server && npm run dev

# Terminal 2 — client (port 5173)
cd client && npm run dev
```

### 4. Open the App

Open **http://localhost:5173** in multiple browser tabs or windows to simulate multiple users.

---

## 🎮 Controls

| Key | Action |
|---|---|
| `W` / `↑` | Move up |
| `S` / `↓` | Move down |
| `A` / `←` | Move left |
| `D` / `→` | Move right |

Move close to another user to open a chat. Move away to close it.

---

## 🌐 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Server status, user count, room count, uptime |
| `/api/users` | GET | List of all currently online users |

---

## 📡 Socket.IO Events

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `user:move` | `{ x, y }` | Broadcast new position |
| `chat:message` | `{ roomId, text }` | Send message to proximity room |
| `user:emoji` | `{ emoji }` | Update avatar emoji |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `user:init` | `UserState + worldSize + proximityRadius` | Your initial state on join |
| `users:snapshot` | `UserState[]` | All currently online users |
| `user:joined` | `UserState` | New user entered the world |
| `user:moved` | `{ socketId, position }` | Another user moved |
| `user:left` | `{ socketId }` | User disconnected |
| `user:emoji` | `{ socketId, emoji }` | Someone changed their emoji |
| `proximity:connect` | `{ peerId, peerName, peerColor, roomId }` | Entered proximity range |
| `proximity:disconnect` | `{ peerId, roomId }` | Left proximity range |
| `chat:message` | `MessageObject` | New chat message in a room |

---

## 🗺️ Project Structure

```
cosmos/
├── server/
│   ├── index.js          # Express + Socket.IO server
│   ├── package.json
│   └── .env.example
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CosmosCanvas.jsx   # PixiJS world renderer
│   │   │   ├── ChatPanel.jsx      # Proximity chat UI
│   │   │   ├── HUD.jsx            # Heads-up display overlay
│   │   │   ├── JoinScreen.jsx     # Loading / splash screen
│   │   │   └── ProximityToast.jsx # Connect/disconnect notifications
│   │   ├── hooks/
│   │   │   ├── useSocket.js       # Socket.IO state management
│   │   │   └── useMovement.js     # Keyboard movement + RAF loop
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── package.json           # Root — monorepo scripts
└── README.md
```

---

## 🔧 System Design

### Proximity Detection Algorithm

The server runs O(n) proximity checks on every `user:move` event:

```
for each other user:
  distance = √((x₁-x₂)² + (y₁-y₂)²)
  if distance < PROXIMITY_RADIUS (150px):
    if not already connected → emit proximity:connect
  else:
    if connected → emit proximity:disconnect
```

Room IDs are deterministic: `[socketIdA, socketIdB].sort().join(':')` — guarantees both users reference the same room regardless of who moved.

### State Architecture

```
Server (in-memory)
├── users: Map<socketId, UserState>     ← positions, colors, names
└── rooms: Map<roomId, Set<socketId>>   ← active proximity pairs

Client (React state)
├── myUser          ← own socket ID, color, name, position
├── users: Map      ← other users' positions (updated via sockets)
├── rooms: Map      ← active chat rooms + message history
└── localPos: ref   ← smooth local position (not waiting for server echo)
```

### Latency Strategy

Local position is tracked in a `useRef` (not state) and updated at 60fps via `requestAnimationFrame`. Server updates are sent on each RAF tick but the canvas renders from the local ref immediately — so movement feels instant even with network latency.

---

## 🚢 Deployment

### Server (Railway / Render / Fly.io)
```bash
cd server
npm start
```
Set env vars: `PORT`, `CLIENT_URL`, `MONGO_URI`

### Client (Vercel / Netlify)
```bash
cd client
npm run build
# Deploy the dist/ folder
```
Set env var: `VITE_SERVER_URL=https://your-server.com`

### Docker (optional)
```dockerfile
# Server
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci
COPY server/ .
EXPOSE 3001
CMD ["node", "index.js"]
```

---

## 🔮 Bonus Features Implemented

- **Multi-room chat** — tabs appear when connected to multiple nearby users simultaneously
- **Emoji avatars** — click "Change avatar" to pick an emoji displayed on your circle
- **Camera follows player** — smooth viewport interpolation keeps you centered
- **Proximity ring** — your 150px detection radius is rendered as a subtle circle
- **Connection line** — a line draws between you and connected users
- **Online count** — real-time count of users in the world
- **Proximity toast** — notification when someone enters/leaves your range
- **MongoDB persistence** — sessions and messages saved when configured

---

## 📝 License

MIT
