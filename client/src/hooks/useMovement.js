import { useEffect, useRef, useCallback } from 'react';

const SPEED = 4;
const KEYS = {
  ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
  ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
  ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
  ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
};

export function useMovement({ myUser, worldSize, onMove }) {
  const pressedRef = useRef(new Set());
  const posRef = useRef(null);
  const rafRef = useRef(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  // Sync position from myUser on init
  useEffect(() => {
    if (myUser && !posRef.current) {
      posRef.current = { ...myUser.position };
    }
  }, [myUser]);

  const tick = useCallback(() => {
    if (!posRef.current || !worldSize) return;

    let dx = 0, dy = 0;
    for (const key of pressedRef.current) {
      const dir = KEYS[key];
      if (dir) { dx += dir[0]; dy += dir[1]; }
    }

    if (dx !== 0 || dy !== 0) {
      // Normalize diagonal
      const len = Math.sqrt(dx * dx + dy * dy);
      dx = (dx / len) * SPEED;
      dy = (dy / len) * SPEED;

      const newX = Math.max(20, Math.min(worldSize.width - 20, posRef.current.x + dx));
      const newY = Math.max(20, Math.min(worldSize.height - 20, posRef.current.y + dy));

      posRef.current = { x: newX, y: newY };
      onMoveRef.current(newX, newY);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [worldSize]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (KEYS[e.key]) {
        e.preventDefault();
        pressedRef.current.add(e.key);
      }
    };
    const onKeyUp = (e) => pressedRef.current.delete(e.key);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  return posRef;
}
