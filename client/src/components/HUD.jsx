import { useState } from 'react';

const EMOJIS = ['👾', '🚀', '⭐', '🔮', '🌙', '💫', '🎯', '🦊', '🐉', '🌊'];

export default function HUD({ myUser, users, rooms, connected, sendEmoji }) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const onlineCount = users.size + 1;
  const connectionCount = rooms.size;

  return (
    <>
      {/* Top-left: User info */}
      <div style={{
        position: 'fixed',
        top: 20,
        left: 20,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {/* Connection status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          background: 'rgba(8, 10, 24, 0.8)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: connected ? '#43e97b' : '#ff6b6b',
            boxShadow: connected ? '0 0 6px #43e97b' : '0 0 6px #ff6b6b',
          }} />
          <span style={{
            fontSize: 10,
            fontFamily: 'Space Mono, monospace',
            color: connected ? '#43e97b' : '#ff6b6b',
            letterSpacing: '0.08em',
          }}>
            {connected ? 'CONNECTED' : 'OFFLINE'}
          </span>
        </div>

        {/* My user card */}
        {myUser && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(8, 10, 24, 0.85)',
            border: `1px solid ${myUser.color}33`,
            borderRadius: 12,
            backdropFilter: 'blur(16px)',
            minWidth: 180,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: myUser.color,
                border: '2px solid rgba(255,255,255,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14,
                flexShrink: 0,
              }}>
                {myUser.emoji || '👤'}
              </div>
              <div>
                <div style={{
                  fontSize: 11,
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 700,
                  color: '#e8eaf0',
                }}>
                  {myUser.username}
                </div>
                <div style={{ fontSize: 9, color: '#5a5f7a', fontFamily: 'Space Mono, monospace' }}>
                  YOU
                </div>
              </div>
            </div>

            {/* Emoji picker trigger */}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{
                width: '100%',
                padding: '4px 8px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6,
                color: '#5a5f7a',
                fontSize: 10,
                fontFamily: 'Space Mono, monospace',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              Change avatar ▾
            </button>

            {showEmojiPicker && (
              <div style={{
                marginTop: 6,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 4,
              }}>
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => { sendEmoji(e); setShowEmojiPicker(false); }}
                    style={{
                      width: 28, height: 28,
                      background: myUser.emoji === e ? 'rgba(108,99,255,0.3)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${myUser.emoji === e ? '#6c63ff' : 'transparent'}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top-right: Stats */}
      <div style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        alignItems: 'flex-end',
      }}>
        <div style={{
          padding: '8px 14px',
          background: 'rgba(8, 10, 24, 0.85)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10,
          backdropFilter: 'blur(12px)',
          display: 'flex',
          gap: 20,
        }}>
          <Stat label="ONLINE" value={onlineCount} color="#6c63ff" />
          <Stat label="LINKED" value={connectionCount} color="#43e97b" />
        </div>

        {/* Active connections */}
        {rooms.size > 0 && (
          <div style={{
            padding: '8px 12px',
            background: 'rgba(8, 10, 24, 0.85)',
            border: '1px solid rgba(67, 233, 123, 0.2)',
            borderRadius: 10,
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}>
            {[...rooms.values()].map((r) => (
              <div key={r.peerId} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 10,
                fontFamily: 'Space Mono, monospace',
              }}>
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#43e97b',
                  boxShadow: '0 0 4px #43e97b',
                }} />
                <span style={{ color: r.peerColor || '#e8eaf0' }}>{r.peerName}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom center: Controls hint */}
      <div style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        padding: '8px 16px',
        background: 'rgba(8, 10, 24, 0.7)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 8,
        backdropFilter: 'blur(10px)',
        fontSize: 10,
        fontFamily: 'Space Mono, monospace',
        color: '#5a5f7a',
        letterSpacing: '0.05em',
        pointerEvents: 'none',
      }}>
        WASD / ARROW KEYS — move &nbsp;·&nbsp; get close to chat
      </div>

      {/* Bottom-left: Online users list */}
      {users.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 60,
          left: 20,
          zIndex: 50,
          padding: '10px 14px',
          background: 'rgba(8, 10, 24, 0.8)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 12,
          backdropFilter: 'blur(12px)',
          maxHeight: 200,
          overflowY: 'auto',
        }}>
          <div style={{
            fontSize: 9,
            fontFamily: 'Space Mono, monospace',
            color: '#5a5f7a',
            marginBottom: 8,
            letterSpacing: '0.08em',
          }}>
            OTHERS IN COSMOS
          </div>
          {[...users.values()].map((u) => (
            <div key={u.socketId} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: u.color,
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 10,
                fontFamily: 'Space Mono, monospace',
                color: '#8890aa',
              }}>
                {u.username}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Cosmos title */}
      <div style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        pointerEvents: 'none',
      }}>
        <div style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: 18,
          color: 'rgba(255,255,255,0.12)',
          letterSpacing: '0.3em',
          userSelect: 'none',
        }}>
          COSMOS
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: 18,
        fontFamily: 'Syne, sans-serif',
        fontWeight: 800,
        color,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 9,
        fontFamily: 'Space Mono, monospace',
        color: '#5a5f7a',
        letterSpacing: '0.08em',
      }}>
        {label}
      </div>
    </div>
  );
}
