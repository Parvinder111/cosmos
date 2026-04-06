import { useEffect, useState } from 'react';

export default function JoinScreen({ connected, myUser }) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  if (myUser && connected) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: '#05060f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Space Mono, monospace',
    }}>
      {/* Animated star field bg */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, rgba(108,99,255,0.08) 0%, transparent 70%)',
      }} />

      {/* Orbiting ring animation */}
      <div style={{ position: 'relative', marginBottom: 48 }}>
        <div style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          border: '2px solid rgba(108,99,255,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'spin 3s linear infinite',
          position: 'relative',
        }}>
          <style>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes spinReverse { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
            @keyframes pulse2 { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
          `}</style>
          <div style={{
            position: 'absolute',
            top: -5,
            left: '50%',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#6c63ff',
            boxShadow: '0 0 12px #6c63ff',
            transform: 'translateX(-50%)',
          }} />
        </div>
        <div style={{
          position: 'absolute',
          inset: -16,
          borderRadius: '50%',
          border: '1px solid rgba(108,99,255,0.15)',
          animation: 'spinReverse 5s linear infinite',
        }}>
          <div style={{
            position: 'absolute',
            bottom: -4,
            left: '50%',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#ff6b9d',
            boxShadow: '0 0 8px #ff6b9d',
            transform: 'translateX(-50%)',
          }} />
        </div>
        <div style={{
          position: 'absolute',
          inset: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 28,
          animation: 'pulse2 2s ease-in-out infinite',
        }}>
          🌌
        </div>
      </div>

      <div style={{
        fontFamily: 'Syne, sans-serif',
        fontWeight: 800,
        fontSize: 42,
        letterSpacing: '0.25em',
        color: '#e8eaf0',
        marginBottom: 8,
        textShadow: '0 0 40px rgba(108,99,255,0.5)',
      }}>
        COSMOS
      </div>

      <div style={{
        fontSize: 12,
        color: '#5a5f7a',
        letterSpacing: '0.15em',
        marginBottom: 32,
      }}>
        PROXIMITY SOCIAL SPACE
      </div>

      <div style={{
        fontSize: 11,
        color: '#6c63ff',
        letterSpacing: '0.1em',
      }}>
        {connected ? `ENTERING THE COSMOS${dots}` : `CONNECTING${dots}`}
      </div>
    </div>
  );
}
