import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [myUser, setMyUser] = useState(null);
  const [users, setUsers] = useState(new Map()); // socketId → user
  const [rooms, setRooms] = useState(new Map()); // roomId → { peerId, peerName, peerColor, messages[] }
  const [activeRoom, setActiveRoom] = useState(null);

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // My init
    socket.on('user:init', (user) => {
      setMyUser(user);
    });

    // Snapshot of existing users
    socket.on('users:snapshot', (existingUsers) => {
      setUsers((prev) => {
        const next = new Map(prev);
        existingUsers.forEach((u) => next.set(u.socketId, u));
        return next;
      });
    });

    // Someone joined
    socket.on('user:joined', (user) => {
      setUsers((prev) => new Map(prev).set(user.socketId, user));
    });

    // Someone moved
    socket.on('user:moved', ({ socketId, position }) => {
      setUsers((prev) => {
        const next = new Map(prev);
        const u = next.get(socketId);
        if (u) next.set(socketId, { ...u, position });
        return next;
      });
    });

    // Someone left
    socket.on('user:left', ({ socketId }) => {
      setUsers((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    });

    // Emoji update
    socket.on('user:emoji', ({ socketId, emoji }) => {
      setUsers((prev) => {
        const next = new Map(prev);
        const u = next.get(socketId);
        if (u) next.set(socketId, { ...u, emoji });
        return next;
      });
    });

    // Proximity connected
    socket.on('proximity:connect', ({ peerId, peerName, peerColor, roomId }) => {
      setRooms((prev) => {
        const next = new Map(prev);
        if (!next.has(roomId)) {
          next.set(roomId, { peerId, peerName, peerColor, messages: [] });
        }
        return next;
      });
      setActiveRoom(roomId);
    });

    // Proximity disconnected
    socket.on('proximity:disconnect', ({ peerId, roomId }) => {
      setRooms((prev) => {
        const next = new Map(prev);
        next.delete(roomId);
        return next;
      });
      setActiveRoom((cur) => (cur === roomId ? null : cur));
    });

    // Chat message
    socket.on('chat:message', (msg) => {
      setRooms((prev) => {
        const next = new Map(prev);
        const room = next.get(msg.roomId);
        if (room) {
          next.set(msg.roomId, {
            ...room,
            messages: [...room.messages, msg].slice(-100),
          });
        }
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

  const sendEmoji = useCallback((emoji) => {
    socketRef.current?.emit('user:emoji', { emoji });
  }, []);

  return {
    socket: socketRef.current,
    connected,
    myUser,
    users,
    rooms,
    activeRoom,
    setActiveRoom,
    sendMove,
    sendMessage,
    sendEmoji,
  };
}
