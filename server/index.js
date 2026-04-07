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

const MONGO_URI = process.env.MONGO_URI || '';
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch((err) => console.warn('⚠️  MongoDB skipped:', err.message));
}

const sessionSchema = new mongoose.Schema({
  userId: String, username: String, color: String,
  connectedAt: { type: Date, default: Date.now }, disconnectedAt: Date,
});
const messageSchema = new mongoose.Schema({
  roomId: String, senderId: String, senderName: String,
  text: String, timestamp: { type: Date, default: Date.now },
});
const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);
const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

// ─── In-Memory State ──────────────────────────────────────────────────────────
const users = new Map();
const rooms = new Map();
const zoneMembers = new Map(); // zoneId → Set<socketId>
const userZones = new Map();   // socketId → Set<zoneId>

const PROXIMITY_RADIUS = 150;
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1600;

// ─── Zone Definitions ─────────────────────────────────────────────────────────
export const ZONES = [
  { id: 'zone_lounge',   name: '☕ Lounge',        x: 100,  y: 100,  w: 380, h: 280, color: '#4ECDC4', description: 'Chill and hang out' },
  { id: 'zone_meeting',  name: '📋 Meeting Room',  x: 600,  y: 80,   w: 420, h: 300, color: '#6c63ff', description: 'Discuss and collaborate' },
  { id: 'zone_dev',      name: '💻 Dev Corner',    x: 1150, y: 100,  w: 360, h: 260, color: '#43e97b', description: 'Code and build stuff' },
  { id: 'zone_design',   name: '🎨 Design Studio', x: 1600, y: 80,   w: 380, h: 280, color: '#FF6B6B', description: 'Create and inspire' },
  { id: 'zone_focus',    name: '🔇 Focus Zone',    x: 100,  y: 500,  w: 300, h: 240, color: '#FFE66D', description: 'Deep work, no distractions' },
  { id: 'zone_events',   name: '🎉 Event Stage',   x: 520,  y: 480,  w: 500, h: 320, color: '#F093FB', description: 'Announcements and events' },
  { id: 'zone_random',   name: '🎲 Random',        x: 1130, y: 460,  w: 340, h: 260, color: '#FFA500', description: 'Anything goes here' },
  { id: 'zone_rooftop',  name: '🌅 Rooftop',       x: 1580, y: 460,  w: 420, h: 300, color: '#00D2FF', description: 'Scenic views and good vibes' },
  { id: 'zone_library',  name: '📚 Library',       x: 100,  y: 860,  w: 360, h: 260, color: '#95E1D3', description: 'Research and reading' },
  { id: 'zone_gym',      name: '💪 Gym',           x: 580,  y: 880,  w: 300, h: 240, color: '#FC5185', description: 'Hustle hard' },
];

const AVATAR_COLORS = [
  '#FF6B6B','#FFE66D','#4ECDC4','#95E1D3','#F38181',
  '#FCE38A','#EAFFD0','#AA96DA','#FFFFD2','#FC5185',
  '#3FC1C9','#F5A623','#7ED321','#BD10E0','#00D2FF',
];
const AVATAR_NAMES = [
  'Nebula','Quasar','Pulsar','Vega','Lyra','Orion','Cygnus',
  'Andromeda','Cassidy','Phoenix','Rigel','Altair','Deneb',
  'Antares','Proxima','Sirius','Arcturus','Canopus','Capella','Pollux',
];

function getRandomName() {
  return AVATAR_NAMES[Math.floor(Math.random() * AVATAR_NAMES.length)] + Math.floor(Math.random() * 99 + 1);
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

// ─── Zone Detection ───────────────────────────────────────────────────────────
function getZonesForPosition(x, y) {
  return ZONES.filter(z => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h);
}

function updateZones(socketId) {
  const user = users.get(socketId);
  if (!user) return;

  const currentZones = getZonesForPosition(user.position.x, user.position.y);
  const currentZoneIds = new Set(currentZones.map(z => z.id));
  const prevZoneIds = userZones.get(socketId) || new Set();

  // Zones entered
  for (const zone of currentZones) {
    if (!prevZoneIds.has(zone.id)) {
      // Add to zone
      if (!zoneMembers.has(zone.id)) zoneMembers.set(zone.id, new Set());
      zoneMembers.get(zone.id).add(socketId);

      // Notify everyone in zone
      const members = [...zoneMembers.get(zone.id)];
      const memberDetails = members.map(sid => {
        const u = users.get(sid);
        return u ? { socketId: sid, username: u.username, color: u.color } : null;
      }).filter(Boolean);

      // Tell the user they entered
      io.to(socketId).emit('zone:entered', {
        zone,
        members: memberDetails,
      });

      // Tell existing zone members someone joined
      for (const sid of zoneMembers.get(zone.id)) {
        if (sid !== socketId) {
          io.to(sid).emit('zone:member:joined', {
            zoneId: zone.id,
            user: { socketId, username: user.username, color: user.color },
            members: memberDetails,
          });
        }
      }

      console.log(`🏠 ${user.username} entered ${zone.name}`);
    }
  }

  // Zones left
  for (const zoneId of prevZoneIds) {
    if (!currentZoneIds.has(zoneId)) {
      const zone = ZONES.find(z => z.id === zoneId);
      if (!zone) continue;

      zoneMembers.get(zoneId)?.delete(socketId);

      const members = [...(zoneMembers.get(zoneId) || [])];
      const memberDetails = members.map(sid => {
        const u = users.get(sid);
        return u ? { socketId: sid, username: u.username, color: u.color } : null;
      }).filter(Boolean);

      // Tell the user they left
      io.to(socketId).emit('zone:left', { zoneId });

      // Tell remaining members
      for (const sid of zoneMembers.get(zoneId) || []) {
        io.to(sid).emit('zone:member:left', {
          zoneId,
          socketId,
          members: memberDetails,
        });
      }

      console.log(`🚪 ${user.username} left ${zone.name}`);
    }
  }

  userZones.set(socketId, currentZoneIds);
}

// ─── Proximity Update ─────────────────────────────────────────────────────────
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
      rooms.set(roomId, new Set([movedSocketId, otherId]));
      io.to(movedSocketId).emit('proximity:connect', {
        peerId: otherId, peerName: otherUser.username, peerColor: otherUser.color, roomId,
      });
      io.to(otherId).emit('proximity:connect', {
        peerId: movedSocketId, peerName: movedUser.username, peerColor: movedUser.color, roomId,
      });
    } else if (!inProximity && alreadyConnected) {
      rooms.delete(roomId);
      io.to(movedSocketId).emit('proximity:disconnect', { peerId: otherId, roomId });
      io.to(otherId).emit('proximity:disconnect', { peerId: movedSocketId, roomId });
    }
  }
}

// ─── Socket.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`⚡ Socket connected: ${socket.id}`);

  const userId = uuidv4();
  const username = getRandomName();
  const color = getRandomColor();

  const userState = {
    userId, socketId: socket.id, username, color,
    position: {
      x: Math.random() * (WORLD_WIDTH - 200) + 100,
      y: Math.random() * (WORLD_HEIGHT - 200) + 100,
    },
    emoji: '👤',
    currentZones: [],
  };

  users.set(socket.id, userState);
  userZones.set(socket.id, new Set());

  if (MONGO_URI && mongoose.connection.readyState === 1) {
    new Session({ userId, username, color }).save().catch(() => {});
  }

  socket.emit('user:init', {
    ...userState,
    worldSize: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
    proximityRadius: PROXIMITY_RADIUS,
    zones: ZONES,
  });

  const existingUsers = [];
  for (const [sid, u] of users) {
    if (sid !== socket.id) existingUsers.push(u);
  }
  socket.emit('users:snapshot', existingUsers);
  socket.broadcast.emit('user:joined', userState);

  // ── Movement ─────────────────────────────────────────────────────────────
  socket.on('user:move', ({ x, y }) => {
    const user = users.get(socket.id);
    if (!user) return;
    user.position.x = Math.max(20, Math.min(WORLD_WIDTH - 20, x));
    user.position.y = Math.max(20, Math.min(WORLD_HEIGHT - 20, y));
    socket.broadcast.emit('user:moved', { socketId: socket.id, position: user.position });
    updateProximity(socket.id);
    updateZones(socket.id);
  });

  // ── Proximity Chat ────────────────────────────────────────────────────────
  socket.on('chat:message', ({ roomId, text }) => {
    const user = users.get(socket.id);
    if (!user || !text?.trim()) return;
    const room = rooms.get(roomId);
    if (!room || !room.has(socket.id)) return;

    const msg = {
      id: uuidv4(), roomId, senderId: socket.id,
      senderName: user.username, senderColor: user.color,
      text: text.trim().slice(0, 500), timestamp: Date.now(),
    };
    for (const sid of room) io.to(sid).emit('chat:message', msg);
  });

  // ── Zone Chat ─────────────────────────────────────────────────────────────
  socket.on('zone:message', ({ zoneId, text }) => {
    const user = users.get(socket.id);
    if (!user || !text?.trim()) return;

    const members = zoneMembers.get(zoneId);
    if (!members || !members.has(socket.id)) return;

    const msg = {
      id: uuidv4(), zoneId, senderId: socket.id,
      senderName: user.username, senderColor: user.color,
      text: text.trim().slice(0, 500), timestamp: Date.now(),
      type: 'zone',
    };

    for (const sid of members) io.to(sid).emit('zone:message', msg);
  });

  // ── Emoji ─────────────────────────────────────────────────────────────────
  socket.on('user:emoji', ({ emoji }) => {
    const user = users.get(socket.id);
    if (!user) return;
    user.emoji = emoji;
    io.emit('user:emoji', { socketId: socket.id, emoji });
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (!user) return;
    console.log(`❌ ${user.username} disconnected`);

    for (const [roomId, members] of rooms) {
      if (members.has(socket.id)) {
        const otherSid = [...members].find(s => s !== socket.id);
        rooms.delete(roomId);
        if (otherSid) io.to(otherSid).emit('proximity:disconnect', { peerId: socket.id, roomId });
      }
    }

    // Clean up zones
    for (const zoneId of userZones.get(socket.id) || []) {
      zoneMembers.get(zoneId)?.delete(socket.id);
      const remaining = [...(zoneMembers.get(zoneId) || [])];
      const memberDetails = remaining.map(sid => {
        const u = users.get(sid);
        return u ? { socketId: sid, username: u.username, color: u.color } : null;
      }).filter(Boolean);
      for (const sid of remaining) {
        io.to(sid).emit('zone:member:left', { zoneId, socketId: socket.id, members: memberDetails });
      }
    }

    users.delete(socket.id);
    userZones.delete(socket.id);
    io.emit('user:left', { socketId: socket.id });
  });
});

// ─── REST API ─────────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', users: users.size, rooms: rooms.size, uptime: process.uptime() }));
app.get('/api/users', (_, res) => res.json([...users.values()].map(u => ({ userId: u.userId, username: u.username, color: u.color, position: u.position }))));
app.get('/api/zones', (_, res) => res.json(ZONES.map(z => ({ ...z, memberCount: zoneMembers.get(z.id)?.size || 0 }))));

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`🚀 Cosmos server running on http://localhost:${PORT}`));
