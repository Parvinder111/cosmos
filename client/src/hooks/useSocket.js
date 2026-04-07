import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [myUser, setMyUser] = useState(null);
  const [users, setUsers] = useState(new Map());
  const [rooms, setRooms] = useState(new Map());
  const [activeRoom, setActiveRoom] = useState(null);

  // Zone state
  const [zones, setZones] = useState([]);                     // all zone definitions
  const [myZones, setMyZones] = useState(new Map());          // zoneId → { zone, members[], messages[] }
  const [activeZone, setActiveZone] = useState(null);         // currently open zone chat

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('user:init', (user) => {
      setMyUser(user);
      if (user.zones) setZones(user.zones);
    });

    socket.on('users:snapshot', (existingUsers) => {
      setUsers(prev => {
        const next = new Map(prev);
        existingUsers.forEach(u => next.set(u.socketId, u));
        return next;
      });
    });

    socket.on('user:joined', (user) => {
      setUsers(prev => new Map(prev).set(user.socketId, user));
    });

    socket.on('user:moved', ({ socketId, position }) => {
      setUsers(prev => {
        const next = new Map(prev);
        const u = next.get(socketId);
        if (u) next.set(socketId, { ...u, position });
        return next;
      });
    });

    socket.on('user:left', ({ socketId }) => {
      setUsers(prev => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    });

    socket.on('user:emoji', ({ socketId, emoji }) => {
      setUsers(prev => {
        const next = new Map(prev);
        const u = next.get(socketId);
        if (u) next.set(socketId, { ...u, emoji });
        return next;
      });
    });

    // ── Proximity ──────────────────────────────────────────────────────────
    socket.on('proximity:connect', ({ peerId, peerName, peerColor, roomId }) => {
      setRooms(prev => {
        const next = new Map(prev);
        if (!next.has(roomId)) next.set(roomId, { peerId, peerName, peerColor, messages: [] });
        return next;
      });
      setActiveRoom(roomId);
    });

    socket.on('proximity:disconnect', ({ peerId, roomId }) => {
      setRooms(prev => {
        const next = new Map(prev);
        next.delete(roomId);
        return next;
      });
      setActiveRoom(cur => cur === roomId ? null : cur);
    });

    socket.on('chat:message', (msg) => {
      setRooms(prev => {
        const next = new Map(prev);
        const room = next.get(msg.roomId);
        if (room) next.set(msg.roomId, { ...room, messages: [...room.messages, msg].slice(-100) });
        return next;
      });
    });

    // ── Zones ──────────────────────────────────────────────────────────────
    socket.on('zone:entered', ({ zone, members }) => {
      setMyZones(prev => {
        const next = new Map(prev);
        const existing = next.get(zone.id);
        next.set(zone.id, { zone, members, messages: existing?.messages || [] });
        return next;
      });
      setActiveZone(zone.id);
    });

    socket.on('zone:left', ({ zoneId }) => {
      setMyZones(prev => {
        const next = new Map(prev);
        next.delete(zoneId);
        return next;
      });
      setActiveZone(cur => cur === zoneId ? null : cur);
    });

    socket.on('zone:member:joined', ({ zoneId, user, members }) => {
      setMyZones(prev => {
        const next = new Map(prev);
        const z = next.get(zoneId);
        if (z) next.set(zoneId, { ...z, members });
        return next;
      });
    });

    socket.on('zone:member:left', ({ zoneId, socketId, members }) => {
      setMyZones(prev => {
        const next = new Map(prev);
        const z = next.get(zoneId);
        if (z) next.set(zoneId, { ...z, members });
        return next;
      });
    });

    socket.on('zone:message', (msg) => {
      setMyZones(prev => {
        const next = new Map(prev);
        const z = next.get(msg.zoneId);
        if (z) next.set(msg.zoneId, { ...z, messages: [...z.messages, msg].slice(-100) });
        return next;
      });
    });

    return () => socket.disconnect();
  }, []);

  const sendMove = useCallback((x, y) => {
    socketRef.current?.emit('user:move', { x, y });
  }, []);

  const sendMessage = useCallback((roomId, text) => {
    socketRef.current?.emit('chat:message', { roomId, text });
  }, []);

  const sendZoneMessage = useCallback((zoneId, text) => {
    socketRef.current?.emit('zone:message', { zoneId, text });
  }, []);

  const sendEmoji = useCallback((emoji) => {
    socketRef.current?.emit('user:emoji', { emoji });
  }, []);

  return {
    socket: socketRef.current,
    connected, myUser, users,
    rooms, activeRoom, setActiveRoom,
    zones, myZones, activeZone, setActiveZone,
    sendMove, sendMessage, sendZoneMessage, sendEmoji,
  };
}
