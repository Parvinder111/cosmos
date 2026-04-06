import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// ─── MongoDB Connection (optional – gracefully skips if not configured) ───────
const MONGO_URI = process.env.MONGO_URI || '';
if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch((err) => console.warn('⚠️  MongoDB skipped:', err.message));
}

// ─── Mongoose Schemas ─────────────────────────────────────────────────────────
const sessionSchema = new mongoose.Schema({
  userId: String,
  username: String,
  color: String,
  connectedAt: { type: Date, default: Date.now },
  disconnectedAt: Date,
  peakConnections: { type: Number, default: 0 },
});

const messageSchema = new mongoose.Schema({
  roomId: String,
  senderId: String,
  senderName: String,
  text: String,
  timestamp: { type: Date, default: Date.now },
});

const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);
const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

// ─── In-Memory State ──────────────────────────────────────────────────────────
const users = new Map(); // socketId → UserState
const rooms = new Map(); // roomId → Set<socketId>

const PROXIMITY_RADIUS = 150; // pixels
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1600;

const AVATAR_COLORS = [
  '#FF6B6B', '#FFE66D', '#4ECDC4', '#95E1D3', '#F38181',
  '#FCE38A', '#EAFFD0', '#95E1D3', '#AA96DA', '#FFFFD2',
  '#FC5185', '#3FC1C9', '#F5A623', '#7ED321', '#BD10E0',
];

const AVATAR_NAMES = [
  'Nebula', 'Quasar', 'Pulsar', 'Vega', 'Lyra',
  'Orion', 'Cygnus', 'Andromeda', 'Cassidy', 'Phoenix',
  'Rigel', 'Altair', 'Deneb', 'Antares', 'Proxima',
  'Sirius', 'Arcturus', 'Canopus', 'Capella', 'Pollux',
];

function getRandomName() {
  return AVATAR_NAMES[Math.floor(Math.random() * AVATAR_NAMES.length)] +
    Math.floor(Math.random() * 99 + 1);
}

function getRandomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function getDistance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function getRoomId(idA, idB) {
  return [idA, idB].sort().join(':');
}

// ─── Proximity Update Logic ───────────────────────────────────────────────────
function updateProximity(movedSocketId) {
  const movedUser = users.get(movedSocketId);
  if (!movedUser) return;

  for (const [otherId, otherUser] of users) {
    if (otherId === movedSocketId) continue;

    const dist = getDistance(movedUser.position, otherUser.position);
    const inProximity = dist < PROXIMITY_RADIUS;
    const roomId = getRoomId(movedSocketId, otherId);

    const alreadyConnected = rooms.has(roomId);

    if (inProximity && !alreadyConnected) {
      // Connect
      rooms.set(roomId, new Set([movedSocketId, otherId]));

      io.to(movedSocketId).emit('proximity:connect', {
        peerId: otherId,
        peerName: otherUser.username,
        peerColor: otherUser.color,
        roomId,
      });
      io.to(otherId).emit('proximity:connect', {
        peerId: movedSocketId,
        peerName: movedUser.username,
        peerColor: movedUser.color,
        roomId,
      });

      console.log(`🔗 ${movedUser.username} ↔ ${otherUser.username} connected`);
    } else if (!inProximity && alreadyConnected) {
      // Disconnect
      rooms.delete(roomId);

      io.to(movedSocketId).emit('proximity:disconnect', { peerId: otherId, roomId });
      io.to(otherId).emit('proximity:disconnect', { peerId: movedSocketId, roomId });

      console.log(`🔌 ${movedUser.username} ↔ ${otherUser.username} disconnected`);
    }
  }
}

// ─── Socket.IO Handlers ───────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`⚡ Socket connected: ${socket.id}`);

  const userId = uuidv4();
  const username = getRandomName();
  const color = getRandomColor();

  const userState = {
    userId,
    socketId: socket.id,
    username,
    color,
    position: {
      x: Math.random() * (WORLD_WIDTH - 200) + 100,
      y: Math.random() * (WORLD_HEIGHT - 200) + 100,
    },
    emoji: '👤',
  };

  users.set(socket.id, userState);

  // Save session to MongoDB if connected
  if (MONGO_URI && mongoose.connection.readyState === 1) {
    new Session({ userId, username, color }).save().catch(() => {});
  }

  // Send this user their own state
  socket.emit('user:init', {
    ...userState,
    worldSize: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
    proximityRadius: PROXIMITY_RADIUS,
  });

  // Send existing users to newcomer
  const existingUsers = [];
  for (const [sid, u] of users) {
    if (sid !== socket.id) existingUsers.push(u);
  }
  socket.emit('users:snapshot', existingUsers);

  // Broadcast new user to everyone else
  socket.broadcast.emit('user:joined', userState);

  // ── Movement ────────────────────────────────────────────────────────────────
  socket.on('user:move', ({ x, y }) => {
    const user = users.get(socket.id);
    if (!user) return;

    // Clamp to world bounds
    user.position.x = Math.max(20, Math.min(WORLD_WIDTH - 20, x));
    user.position.y = Math.max(20, Math.min(WORLD_HEIGHT - 20, y));

    socket.broadcast.emit('user:moved', {
      socketId: socket.id,
      position: user.position,
    });

    updateProximity(socket.id);
  });

  // ── Chat Messages ────────────────────────────────────────────────────────────
  socket.on('chat:message', ({ roomId, text }) => {
    const user = users.get(socket.id);
    if (!user || !text?.trim()) return;

    const room = rooms.get(roomId);
    if (!room || !room.has(socket.id)) return; // Security check

    const msg = {
      id: uuidv4(),
      roomId,
      senderId: socket.id,
      senderName: user.username,
      senderColor: user.color,
      text: text.trim().slice(0, 500),
      timestamp: Date.now(),
    };

    // Broadcast to both users in room
    for (const sid of room) {
      io.to(sid).emit('chat:message', msg);
    }

    // Persist to MongoDB
    if (MONGO_URI && mongoose.connection.readyState === 1) {
      new Message({
        roomId,
        senderId: socket.id,
        senderName: user.username,
        text: msg.text,
      }).save().catch(() => {});
    }
  });

  // ── Emoji / Reaction ──────────────────────────────────────────────────────
  socket.on('user:emoji', ({ emoji }) => {
    const user = users.get(socket.id);
    if (!user) return;
    user.emoji = emoji;
    io.emit('user:emoji', { socketId: socket.id, emoji });
  });

  // ── Disconnect ───────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (!user) return;

    console.log(`❌ ${user.username} disconnected`);

    // Clean up all rooms this user was in
    for (const [roomId, members] of rooms) {
      if (members.has(socket.id)) {
        const otherSid = [...members].find((s) => s !== socket.id);
        rooms.delete(roomId);
        if (otherSid) {
          io.to(otherSid).emit('proximity:disconnect', {
            peerId: socket.id,
            roomId,
          });
        }
      }
    }

    users.delete(socket.id);
    io.emit('user:left', { socketId: socket.id });

    // Update MongoDB session
    if (MONGO_URI && mongoose.connection.readyState === 1) {
      Session.findOneAndUpdate(
        { userId: user.userId },
        { disconnectedAt: new Date() }
      ).catch(() => {});
    }
  });
});

// ─── REST API ─────────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => {
  res.json({
    status: 'ok',
    users: users.size,
    rooms: rooms.size,
    uptime: process.uptime(),
  });
});

app.get('/api/users', (_, res) => {
  res.json([...users.values()].map((u) => ({
    userId: u.userId,
    username: u.username,
    color: u.color,
    position: u.position,
  })));
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Cosmos server running on http://localhost:${PORT}`);
});
