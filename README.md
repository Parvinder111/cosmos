# 🌌 Cosmos — Proximity-Based Virtual Social Space

> Move close to someone → chat opens. Walk away → chat closes.

A real-time 2D virtual environment where users appear as avatars, move freely around a shared world, and automatically connect to chat when they enter each other's proximity radius — simulating natural, spatial conversations in a digital space.

---

## ✨ Features

### Core
- 🎮 **2D World** — Scrollable canvas rendered with PixiJS (WebGL), 2400×1600px
- 🧑‍🚀 **Avatars** — Colored circles with names, emoji customization
- 📡 **Real-Time Sync** — All user positions broadcast instantly via Socket.IO
- 🔴 **Proximity Detection** — 150px radius; enter → chat opens, leave → chat closes
- 💬 **Auto Chat** — Chat room created automatically on proximity, destroyed on exit

### Bonus
- 🏙️ **Named Zones** — 7 zones (Lounge, Meeting Room, Dev Corner, etc.) with shared group chat
- 🏠 **Multi-Room Chat** — Tabs for multiple simultaneous proximity conversations
- 🔔 **Toast Notifications** — Connect/disconnect alerts
- 🌐 **REST API** — `/api/health` and `/api/users` endpoints
- 🗄️ **MongoDB** — Optional session + message persistence

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + Vite | Component model, fast HMR |
| Rendering | PixiJS 7 (WebGL) | GPU-accelerated, handles many moving avatars at 60fps |
| Styling | Tailwind CSS | Utility-first, rapid UI |
| Real-Time | Socket.IO | Built-in reconnection, rooms, named events |
| Backend | Node.js + Express | Lightweight, non-blocking I/O |
| Database | MongoDB + Mongoose | Optional — sessions and message history |

> **Why PixiJS over DOM/CSS?** WebGL rendering doesn't trigger layout reflows. 20 moving avatars on plain DOM would cause jank. PixiJS stays smooth.

> **Why server-side proximity?** All distance checks run on the server so every client agrees on who is connected — no race conditions or fake positions.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- MongoDB (optional)

### 1. Clone

```bash
git clone https://github.com/Parvinder111/cosmos.git
cd cosmos
```

### 2. Install

```bash
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 3. Configure

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

`server/.env`
```
PORT=3001
CLIENT_URL=http://localhost:5173
MONGO_URI=           # optional
```

`client/.env`
```
VITE_SERVER_URL=http://localhost:3001
```

### 4. Run

```bash
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3001 |

### 5. Test Multiplayer

Open **two browser windows** side by side at `http://localhost:5173`.
Each tab = a separate user. Move them close with WASD to trigger chat.

---

## 🎮 Controls

| Key | Action |
|---|---|
| `W` / `↑` | Move up |
| `S` / `↓` | Move down |
| `A` / `←` | Move left |
| `D` / `→` | Move right |

---

## 📁 Project Structure

```
cosmos/
├── server/
│   ├── index.js          # Express + Socket.IO + proximity + zone logic
│   ├── package.json
│   └── .env.example
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CosmosCanvas.jsx   # PixiJS world renderer + zones
│   │   │   ├── ChatPanel.jsx      # Proximity 1-on-1 chat
│   │   │   ├── ZoneChat.jsx       # Zone group chat
│   │   │   ├── HUD.jsx            # Stats overlay
│   │   │   ├── JoinScreen.jsx     # Loading splash
│   │   │   └── ProximityToast.jsx # Alerts
│   │   ├── hooks/
│   │   │   ├── useSocket.js       # Socket.IO state + zone events
│   │   │   └── useMovement.js     # Keyboard input + RAF loop
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── vite.config.js
└── package.json
```

---

## 📡 Socket Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `user:move` | `{ x, y }` | Broadcast position |
| `chat:message` | `{ roomId, text }` | Send proximity message |
| `zone:message` | `{ zoneId, text }` | Send zone group message |
| `user:emoji` | `{ emoji }` | Update avatar emoji |

### Server → Client
| Event | Description |
|---|---|
| `user:init` | Your state + world config + zones |
| `proximity:connect` | Entered someone's radius |
| `proximity:disconnect` | Left someone's radius |
| `zone:entered` | You walked into a named zone |
| `zone:left` | You walked out of a zone |
| `zone:message` | New zone group message |

---

## 🔧 Proximity Algorithm

```
On every user:move event (server-side):

for each other user:
  distance = √( (x₁-x₂)² + (y₁-y₂)² )

  if distance < 150px AND not connected → open chat room
  if distance ≥ 150px AND connected    → close chat room

Room ID = [socketIdA, socketIdB].sort().join(':')
```

---

## 🌐 API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/health` | Server status, user count, uptime |
| `GET /api/users` | All online users with positions |
| `GET /api/zones` | Zones with current member counts |

---

## 🏙️ Named Zones

Walk into any zone to join its group chat:

☕ Lounge · 📋 Meeting Room · 💻 Dev Corner · 🎮 Chill Zone · 🎨 Design Studio · 📚 Library · 🌙 Rooftop

---

## 🚢 Deployment

**Backend → Render.com**
- Root Directory: `server/`
- Start Command: `node index.js`
- Env vars: `PORT`, `CLIENT_URL`, `MONGO_URI`

**Frontend → Vercel**
- Root Directory: `client/`
- Framework: Vite
- Env var: `VITE_SERVER_URL=https://your-render-url.onrender.com`

---

## 📝 License

MIT
