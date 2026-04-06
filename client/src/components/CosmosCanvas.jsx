import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

const STAR_COUNT = 200;
const NEBULA_COUNT = 6;

function hexToNum(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

export default function CosmosCanvas({
  myUser,
  users,
  rooms,
  worldSize,
  proximityRadius,
  localPos,
}) {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const spritesRef = useRef(new Map());
  const tickerRef = useRef(null);

  // Initialize PIXI
  useEffect(() => {
    if (!containerRef.current || appRef.current) return;

    const app = new PIXI.Application({
      resizeTo: containerRef.current,
      backgroundColor: 0x05060f,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    containerRef.current.appendChild(app.view);
    appRef.current = app;

    const world = new PIXI.Container();
    app.stage.addChild(world);
    app._world = world;

    const w = worldSize?.width || 2400;
    const h = worldSize?.height || 1600;

    // Nebula blobs
    const colors = [0x6c63ff, 0xff6b9d, 0x43e97b, 0x00d2ff, 0xf093fb, 0xffa500];
    for (let i = 0; i < NEBULA_COUNT; i++) {
      const g = new PIXI.Graphics();
      g.beginFill(colors[i % colors.length], 0.04);
      g.drawCircle(Math.random() * w, Math.random() * h, 150 + Math.random() * 200);
      g.endFill();
      world.addChild(g);
    }

    // Grid
    const grid = new PIXI.Graphics();
    grid.lineStyle(1, 0xffffff, 0.025);
    for (let x = 0; x <= w; x += 80) { grid.moveTo(x, 0); grid.lineTo(x, h); }
    for (let y = 0; y <= h; y += 80) { grid.moveTo(0, y); grid.lineTo(w, y); }
    world.addChild(grid);

    // Stars
    for (let i = 0; i < STAR_COUNT; i++) {
      const star = new PIXI.Graphics();
      star.beginFill(0xffffff, Math.random() * 0.6 + 0.2);
      star.drawCircle(0, 0, Math.random() * 2 + 0.5);
      star.endFill();
      star.x = Math.random() * w;
      star.y = Math.random() * h;
      world.addChild(star);
    }

    // World border
    const border = new PIXI.Graphics();
    border.lineStyle(2, 0x6c63ff, 0.3);
    border.drawRect(0, 0, w, h);
    world.addChild(border);

    // Camera ticker
    const ticker = () => {
      if (!appRef.current || !myUser) return;
      const pos = localPos?.current || myUser.position;
      const rw = app.renderer.width / (window.devicePixelRatio || 1);
      const rh = app.renderer.height / (window.devicePixelRatio || 1);
      const targetX = -pos.x + rw / 2;
      const targetY = -pos.y + rh / 2;
      world.x += (targetX - world.x) * 0.1;
      world.y += (targetY - world.y) * 0.1;
    };

    tickerRef.current = ticker;
    app.ticker.add(ticker);

    const onResize = () => { if (appRef.current) appRef.current.resize(); };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (appRef.current && tickerRef.current) {
        try { appRef.current.ticker.remove(tickerRef.current); } catch (e) {}
      }
      tickerRef.current = null;
      if (appRef.current) {
        try { appRef.current.destroy(true); } catch (e) {}
      }
      appRef.current = null;
      spritesRef.current.clear();
    };
  }, []);

  // Draw avatars
  useEffect(() => {
    const app = appRef.current;
    if (!app || !myUser || !app._world) return;

    const world = app._world;
    const allConnectedPeers = new Set();
    for (const room of rooms.values()) allConnectedPeers.add(room.peerId);

    const renderUser = (user, isSelf) => {
      const sid = user.socketId;
      const pos = isSelf ? (localPos?.current || user.position) : user.position;
      const isConnected = allConnectedPeers.has(sid);

      let container = spritesRef.current.get(sid);
      if (!container) {
        container = new PIXI.Container();
        world.addChild(container);
        spritesRef.current.set(sid, container);
      }

      container.removeChildren();
      container.x = pos.x;
      container.y = pos.y;

      // Proximity ring (self only)
      if (isSelf && proximityRadius) {
        const ring = new PIXI.Graphics();
        ring.lineStyle(1.5, 0x6c63ff, 0.2);
        ring.beginFill(0x6c63ff, 0.04);
        ring.drawCircle(0, 0, proximityRadius);
        ring.endFill();
        container.addChild(ring);
      }

      // Connection lines to peers
      if (isSelf) {
        for (const room of rooms.values()) {
          const peerState = users.get(room.peerId);
          if (peerState) {
            const line = new PIXI.Graphics();
            line.lineStyle(1.5, hexToNum(user.color), 0.35);
            line.moveTo(0, 0);
            line.lineTo(peerState.position.x - pos.x, peerState.position.y - pos.y);
            container.addChild(line);
          }
        }
      }

      const glowColor = hexToNum(user.color);

      // Glow
      const glow = new PIXI.Graphics();
      glow.beginFill(glowColor, isConnected ? 0.22 : (isSelf ? 0.14 : 0.06));
      glow.drawCircle(0, 0, isSelf ? 28 : 24);
      glow.endFill();
      container.addChild(glow);

      // Main circle
      const circle = new PIXI.Graphics();
      circle.lineStyle(isSelf ? 3 : (isConnected ? 2 : 1.5), 0xffffff, isSelf ? 0.9 : (isConnected ? 0.55 : 0.2));
      circle.beginFill(glowColor, isSelf ? 1 : 0.85);
      circle.drawCircle(0, 0, isSelf ? 20 : 17);
      circle.endFill();
      container.addChild(circle);

      // Self outer ring
      if (isSelf) {
        const selfRing = new PIXI.Graphics();
        selfRing.lineStyle(1.5, 0xffffff, 0.4);
        selfRing.drawCircle(0, 0, 24);
        container.addChild(selfRing);
      }

      // Name label
      const label = new PIXI.Text(
        (isSelf ? '★ ' : '') + user.username,
        new PIXI.TextStyle({
          fontFamily: 'Space Mono, monospace',
          fontSize: 10,
          fill: isSelf ? '#ffffff' : (isConnected ? user.color : '#777990'),
          fontWeight: isSelf ? '700' : '400',
        })
      );
      label.anchor.set(0.5, 0);
      label.y = isSelf ? 27 : 22;
      container.addChild(label);

      // Connected green dot badge
      if (isConnected) {
        const badge = new PIXI.Graphics();
        badge.beginFill(0x43e97b, 1);
        badge.drawCircle(14, -14, 5);
        badge.endFill();
        container.addChild(badge);
      }
    };

    renderUser(myUser, true);
    for (const [, user] of users) renderUser(user, false);

    // Cleanup gone users
    for (const [sid, container] of spritesRef.current) {
      if (sid !== myUser.socketId && !users.has(sid)) {
        try { world.removeChild(container); container.destroy({ children: true }); } catch (e) {}
        spritesRef.current.delete(sid);
      }
    }
  }, [myUser, users, rooms, localPos?.current?.x, localPos?.current?.y]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', cursor: 'crosshair' }} />
  );
}