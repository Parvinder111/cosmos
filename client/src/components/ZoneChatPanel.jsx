import { useState, useRef, useEffect } from 'react';

export default function ZoneChatPanel({ myZones, activeZone, setActiveZone, myUser, sendZoneMessage }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const zoneData = activeZone ? myZones.get(activeZone) : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [zoneData?.messages?.length]);

  if (!zoneData) return null;

  const { zone, members, messages } = zoneData;

  const handleSend = () => {
    if (!input.trim() || !activeZone) return;
    sendZoneMessage(activeZone, input.trim());
    setInput('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const zoneColor = zone.color;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        width: 300,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(8,10,24,0.93)',
        border: `1px solid ${zoneColor}44`,
        borderRadius: 16,
        backdropFilter: 'blur(20px)',
        boxShadow: `0 8px 40px ${zoneColor}18`,
        zIndex: 100,
        overflow: 'hidden',
        maxHeight: 440,
        animation: 'slideUp 0.3s ease',
      }}
    >
      {/* Zone header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: `${zoneColor}12`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: zoneColor, boxShadow: `0 0 6px ${zoneColor}`,
          }} />
          <span style={{
            fontSize: 11, fontFamily: 'Syne, sans-serif', fontWeight: 700,
            color: '#e8eaf0', flex: 1, letterSpacing: '0.03em',
          }}>
            {zone.name}
          </span>
          <span style={{ fontSize: 9, color: '#5a5f7a', fontFamily: 'Space Mono, monospace' }}>
            ZONE CHAT
          </span>
        </div>

        {/* Zone description */}
        <div style={{ fontSize: 9, color: '#5a5f7a', fontFamily: 'Space Mono, monospace', marginBottom: 6 }}>
          {zone.description}
        </div>

        {/* Member avatars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 9, color: '#5a5f7a', fontFamily: 'Space Mono, monospace', marginRight: 4 }}>
            {members.length} here:
          </span>
          {members.slice(0, 8).map(m => (
            <div
              key={m.socketId}
              title={m.username}
              style={{
                width: 18, height: 18, borderRadius: '50%',
                background: m.color,
                border: `1.5px solid ${m.socketId === myUser?.socketId ? '#fff' : 'rgba(255,255,255,0.2)'}`,
                fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700,
              }}
            >
              {m.username[0]}
            </div>
          ))}
          {members.length > 8 && (
            <span style={{ fontSize: 9, color: '#5a5f7a', fontFamily: 'Space Mono, monospace' }}>
              +{members.length - 8}
            </span>
          )}
        </div>
      </div>

      {/* Tab switcher if in multiple zones */}
      {myZones.size > 1 && (
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
          {[...myZones.entries()].map(([zid, zd]) => (
            <button
              key={zid}
              onClick={() => setActiveZone(zid)}
              style={{
                padding: '5px 12px',
                fontSize: 10, fontFamily: 'Space Mono, monospace',
                background: activeZone === zid ? `${zd.zone.color}20` : 'transparent',
                color: activeZone === zid ? zd.zone.color : '#5a5f7a',
                border: 'none',
                borderBottom: activeZone === zid ? `2px solid ${zd.zone.color}` : '2px solid transparent',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}
            >
              {zd.zone.name.split(' ').slice(1).join(' ')}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '10px 13px',
        display: 'flex', flexDirection: 'column', gap: 7,
        minHeight: 140, maxHeight: 250,
      }}>
        {messages.length === 0 ? (
          <div style={{
            textAlign: 'center', color: '#5a5f7a', fontSize: 11,
            fontFamily: 'Space Mono, monospace', padding: '16px 0',
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{zone.name.split(' ')[0]}</div>
            You're in <span style={{ color: zoneColor }}>{zone.name}</span>
            <br />Say something to everyone here!
          </div>
        ) : (
          messages.map(msg => {
            const isMine = msg.senderId === myUser?.socketId;
            return (
              <div key={msg.id} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: isMine ? 'flex-end' : 'flex-start',
              }}>
                <div style={{ fontSize: 9, color: '#5a5f7a', marginBottom: 2, fontFamily: 'Space Mono, monospace' }}>
                  {isMine ? 'you' : msg.senderName}
                </div>
                <div style={{
                  maxWidth: '82%', padding: '6px 11px',
                  borderRadius: isMine ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                  background: isMine ? `${msg.senderColor}20` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isMine ? msg.senderColor + '40' : 'rgba(255,255,255,0.06)'}`,
                  color: '#e8eaf0', fontSize: 11, fontFamily: 'Space Mono, monospace',
                  lineHeight: 1.5, wordBreak: 'break-word',
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
        padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', gap: 7, background: 'rgba(0,0,0,0.2)',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={`Message ${zone.name}…`}
          maxLength={500}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7,
            padding: '7px 11px', color: '#e8eaf0', fontSize: 11,
            fontFamily: 'Space Mono, monospace', outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = zoneColor + '66'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          style={{
            width: 34, height: 34, borderRadius: 7,
            background: input.trim() ? zoneColor : 'rgba(255,255,255,0.05)',
            border: 'none', color: input.trim() ? '#fff' : '#5a5f7a',
            cursor: input.trim() ? 'pointer' : 'default',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s', flexShrink: 0,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
