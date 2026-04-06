import { useState, useRef, useEffect } from 'react';

export default function ChatPanel({ rooms, activeRoom, setActiveRoom, myUser, sendMessage }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const room = activeRoom ? rooms.get(activeRoom) : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room?.messages?.length]);

  if (!room) return null;

  const handleSend = () => {
    if (!input.trim() || !activeRoom) return;
    sendMessage(activeRoom, input.trim());
    setInput('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Tab list for multiple rooms
  const roomList = [...rooms.entries()];

  return (
    <div
      className="animate-slide-up"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 320,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(8, 10, 24, 0.92)',
        border: '1px solid rgba(108, 99, 255, 0.3)',
        borderRadius: 16,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 40px rgba(108, 99, 255, 0.15), 0 0 0 1px rgba(255,255,255,0.04)',
        zIndex: 100,
        overflow: 'hidden',
        maxHeight: 460,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'rgba(108, 99, 255, 0.08)',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#43e97b',
          boxShadow: '0 0 8px #43e97b',
        }} />
        <span style={{
          fontFamily: 'Space Mono, monospace',
          fontSize: 11,
          color: '#e8eaf0',
          fontWeight: 700,
          letterSpacing: '0.05em',
          flex: 1,
        }}>
          {room.peerName}
        </span>
        <span style={{
          fontSize: 10,
          color: '#5a5f7a',
          fontFamily: 'Space Mono, monospace',
        }}>
          PROXIMITY CHAT
        </span>
      </div>

      {/* Tabs for multiple rooms */}
      {roomList.length > 1 && (
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          overflowX: 'auto',
        }}>
          {roomList.map(([roomId, r]) => (
            <button
              key={roomId}
              onClick={() => setActiveRoom(roomId)}
              style={{
                padding: '6px 14px',
                fontSize: 10,
                fontFamily: 'Space Mono, monospace',
                background: activeRoom === roomId ? 'rgba(108,99,255,0.2)' : 'transparent',
                color: activeRoom === roomId ? '#6c63ff' : '#5a5f7a',
                border: 'none',
                borderBottom: activeRoom === roomId ? '2px solid #6c63ff' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {r.peerName}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 160,
        maxHeight: 280,
      }}>
        {room.messages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#5a5f7a',
            fontSize: 11,
            fontFamily: 'Space Mono, monospace',
            padding: '20px 0',
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>✦</div>
            You're connected to <strong style={{ color: room.peerColor }}>{room.peerName}</strong>
            <br />Say hello!
          </div>
        ) : (
          room.messages.map((msg) => {
            const isMine = msg.senderId === myUser?.socketId;
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMine ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{
                  fontSize: 9,
                  color: '#5a5f7a',
                  marginBottom: 3,
                  fontFamily: 'Space Mono, monospace',
                }}>
                  {isMine ? 'you' : msg.senderName}
                </div>
                <div style={{
                  maxWidth: '80%',
                  padding: '8px 12px',
                  borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: isMine
                    ? `${msg.senderColor}22`
                    : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${isMine ? msg.senderColor + '44' : 'rgba(255,255,255,0.06)'}`,
                  color: '#e8eaf0',
                  fontSize: 12,
                  fontFamily: 'Space Mono, monospace',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}>
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        gap: 8,
        background: 'rgba(0,0,0,0.2)',
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message…"
          maxLength={500}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '8px 12px',
            color: '#e8eaf0',
            fontSize: 12,
            fontFamily: 'Space Mono, monospace',
            outline: 'none',
          }}
          onFocus={(e) => e.target.style.borderColor = 'rgba(108,99,255,0.5)'}
          onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: input.trim() ? '#6c63ff' : 'rgba(255,255,255,0.05)',
            border: 'none',
            color: input.trim() ? '#fff' : '#5a5f7a',
            cursor: input.trim() ? 'pointer' : 'default',
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
