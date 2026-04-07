import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

const STAR_COUNT = 200;
const NEBULA_COUNT = 6;

function hexToNum(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

export default function CosmosCanvas({
  myUser, users, rooms, worldSize, proximityRadius, localPos, zones, myZones,
}) {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const spritesRef = useRef(new Map());
  const zoneGraphicsRef = useRef(new Map());
  const tickerRef = useRef(null);

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
    const nebulaColors = [0x6c63ff, 0xff6b9d, 0x43e97b, 0x00d2ff, 0xf093fb, 0xffa500];
    for (let i = 0; i < NEBULA_COUNT; i++) {
      const g = new PIXI.Graphics();
      g.beginFill(nebulaColors[i % nebulaColors.length], 0.035);
      g.drawCircle(Math.random() * w, Math.random() * h, 160 + Math.random() * 200);
      g.endFill();
      world.addChild(g);
    }

    // Grid
    const grid = new PIXI.Graphics();
    grid.lineStyle(1, 0xffffff, 0.022);
    for (let x = 0; x <= w; x += 80) { grid.moveTo(x, 0); grid.lineTo(x, h); }
    for (let y = 0; y <= h; y += 80) { grid.moveTo(0, y); grid.lineTo(w, y); }
    world.addChild(grid);

    // Stars
    for (let i = 0; i < STAR_COUNT; i++) {
      const star = new PIXI.Graphics();
      star.beginFill(0xffffff, Math.random() * 0.6 + 0.2);
      star.drawCircle(0, 0, Math.random() * 2 + 0.4);
      star.endFill();
      star.x = Math.random() * w;
      star.y = Math.random() * h;
      world.addChild(star);
    }

    // World border
    const border = new PIXI.Graphics();
    border.lineStyle(2, 0x6c63ff, 0.25);
    border.drawRect(0, 0, w, h);
    world.addChild(border);

    // Zones layer (drawn before avatars)
    app._zoneLayer = new PIXI.Container();
    world.addChild(app._zoneLayer);

    // Avatar layer
    app._avatarLayer = new PIXI.Container();
    world.addChild(app._avatarLayer);

    // Camera ticker
    const ticker = () => {
      if (!appRef.current || !myUser) return;
      const pos = localPos?.current || myUser.position;
      const rw = app.renderer.width / (window.devicePixelRatio || 1);
      const rh = app.renderer.height / (window.devicePixelRatio || 1);
      world.x += (-pos.x + rw / 2 - world.x) * 0.1;
      world.y += (-pos.y + rh / 2 - world.y) * 0.1;
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
      if (appRef.current) { try { appRef.current.destroy(true); } catch (e) {} }
      appRef.current = null;
      spritesRef.current.clear();
      zoneGraphicsRef.current.clear();
    };
  }, []);

  // Draw zones
  useEffect(() => {
    const app = appRef.current;
    if (!app || !app._zoneLayer || !zones?.length) return;

    app._zoneLayer.removeChildren();
    zoneGraphicsRef.current.clear();

    for (const zone of zones) {
      const isActive = myZones?.has(zone.id);
      const memberCount = myZones?.get(zone.id)?.members?.length || 0;
      const color = hexToNum(zone.color);

      const container = new PIXI.Container();

      // Zone fill
      const rect = new PIXI.Graphics();
      rect.lineStyle(isActive ? 2 : 1, color, isActive ? 0.8 : 0.3);
      rect.beginFill(color, isActive ? 0.1 : 0.04);
      rect.drawRoundedRect(0, 0, zone.w, zone.h, 12);
      rect.endFill();
      container.addChild(rect);

      // Corner accent top-left
      const accent = new PIXI.Graphics();
      accent.lineStyle(2, color, isActive ? 1 : 0.4);
      accent.moveTo(0, 30); accent.lineTo(0, 0); accent.lineTo(30, 0);
      container.addChild(accent);

      // Corner accent bottom-right
      const accent2 = new PIXI.Graphics();
      accent2.lineStyle(2, color, isActive ? 1 : 0.4);
      accent2.moveTo(zone.w - 30, zone.h);
      accent2.lineTo(zone.w, zone.h);
      accent2.lineTo(zone.w, zone.h - 30);
      container.addChild(accent2);

      // Zone name
      const nameLabel = new PIXI.Text(zone.name, new PIXI.TextStyle({
        fontFamily: 'Syne, sans-serif',
        fontSize: isActive ? 15 : 13,
        fill: isActive ? zone.color : '#ffffff',
        fontWeight: '800',
        alpha: isActive ? 1 : 0.5,
      }));
      nameLabel.x = 14;
      nameLabel.y = 12;
      container.addChild(nameLabel);

      // Description
      const descLabel = new PIXI.Text(zone.description, new PIXI.TextStyle({
        fontFamily: 'Space Mono, monospace',
        fontSize: 9,
        fill: isActive ? '#aab0cc' : '#555770',
        fontWeight: '400',
      }));
      descLabel.x = 14;
      descLabel.y = 32;
      container.addChild(descLabel);

      // Member count badge
      if (memberCount > 0) {
        const badge = new PIXI.Graphics();
        badge.beginFill(color, 0.9);
        badge.drawRoundedRect(zone.w - 46, 10, 36, 18, 9);
        badge.endFill();
        container.addChild(badge);

        const badgeText = new PIXI.Text(`${memberCount} 👤`, new PIXI.TextStyle({
          fontFamily: 'Space Mono, monospace',
          fontSize: 9,
          fill: '#ffffff',
          fontWeight: '700',
        }));
        badgeText.x = zone.w - 43;
        badgeText.y = 14;
        container.addChild(badgeText);
      }

      container.x = zone.x;
      container.y = zone.y;
      app._zoneLayer.addChild(container);
      zoneGraphicsRef.current.set(zone.id, container);
    }
  }, [zones, myZones?.size, ...(zones?.map(z => myZones?.has(z.id)) || [])]);

  // Draw avatars
  useEffect(() => {
    const app = appRef.current;
    if (!app || !myUser || !app._avatarLayer) return;

    const world = app._avatarLayer;
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

      // Proximity ring
      if (isSelf && proximityRadius) {
        const ring = new PIXI.Graphics();
        ring.lineStyle(1.5, 0x6c63ff, 0.18);
        ring.beginFill(0x6c63ff, 0.04);
        ring.drawCircle(0, 0, proximityRadius);
        ring.endFill();
        container.addChild(ring);
      }

      // Connection lines
      if (isSelf) {
        for (const room of rooms.values()) {
          const peer = users.get(room.peerId);
          if (peer) {
            const line = new PIXI.Graphics();
            line.lineStyle(1.5, hexToNum(user.color), 0.3);
            line.moveTo(0, 0);
            line.lineTo(peer.position.x - pos.x, peer.position.y - pos.y);
            container.addChild(line);
          }
        }
      }

      const glowColor = hexToNum(user.color);

      const glow = new PIXI.Graphics();
      glow.beginFill(glowColor, isConnected ? 0.2 : (isSelf ? 0.13 : 0.05));
      glow.drawCircle(0, 0, isSelf ? 28 : 22);
      glow.endFill();
      container.addChild(glow);

      const circle = new PIXI.Graphics();
      circle.lineStyle(isSelf ? 3 : (isConnected ? 2 : 1.5), 0xffffff, isSelf ? 0.9 : (isConnected ? 0.5 : 0.18));
      circle.beginFill(glowColor, isSelf ? 1 : 0.85);
      circle.drawCircle(0, 0, isSelf ? 20 : 17);
      circle.endFill();
      container.addChild(circle);

      if (isSelf) {
        const selfRing = new PIXI.Graphics();
        selfRing.lineStyle(1.5, 0xffffff, 0.38);
        selfRing.drawCircle(0, 0, 24);
        container.addChild(selfRing);
      }

      const label = new PIXI.Text(
        (isSelf ? '★ ' : '') + user.username,
        new PIXI.TextStyle({
          fontFamily: 'Space Mono, monospace', fontSize: 10,
          fill: isSelf ? '#ffffff' : (isConnected ? user.color : '#6a6f88'),
          fontWeight: isSelf ? '700' : '400',
        })
      );
      label.anchor.set(0.5, 0);
      label.y = isSelf ? 27 : 22;
      container.addChild(label);

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

    for (const [sid, container] of spritesRef.current) {
      if (sid !== myUser.socketId && !users.has(sid)) {
        try { world.removeChild(container); container.destroy({ children: true }); } catch (e) {}
        spritesRef.current.delete(sid);
      }
    }
  }, [myUser, users, rooms, myZones, localPos?.current?.x, localPos?.current?.y]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', cursor: 'crosshair' }} />
  );
}
