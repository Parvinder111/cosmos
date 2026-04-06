import { useEffect, useState } from 'react';

export default function ProximityToast({ rooms, prevRoomsSize }) {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const currentSize = rooms.size;

    if (currentSize > (prevRoomsSize.current || 0)) {
      // Someone entered proximity
      const latest = [...rooms.values()].at(-1);
      if (latest) {
        setToast({ type: 'connect', name: latest.peerName, color: latest.peerColor });
        setTimeout(() => setToast(null), 3000);
      }
    } else if (currentSize < (prevRoomsSize.current || 0)) {
      setToast({ type: 'disconnect', name: '—' });
      setTimeout(() => setToast(null), 2000);
    }

    prevRoomsSize.current = currentSize;
  }, [rooms.size]);

  if (!toast) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 70,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      padding: '10px 20px',
      borderRadius: 10,
      background: toast.type === 'connect'
        ? 'rgba(67, 233, 123, 0.12)'
        : 'rgba(255, 107, 107, 0.1)',
      border: `1px solid ${toast.type === 'connect' ? 'rgba(67,233,123,0.3)' : 'rgba(255,107,107,0.3)'}`,
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: 11,
      fontFamily: 'Space Mono, monospace',
      color: toast.type === 'connect' ? '#43e97b' : '#ff6b6b',
      letterSpacing: '0.05em',
      animation: 'slideUp 0.3s ease',
      whiteSpace: 'nowrap',
    }}>
      <span>{toast.type === 'connect' ? '⊕' : '⊖'}</span>
      {toast.type === 'connect'
        ? <>Connected to <span style={{ color: toast.color, fontWeight: 700 }}>{toast.name}</span></>
        : 'Proximity lost — disconnected'
      }
    </div>
  );
}
