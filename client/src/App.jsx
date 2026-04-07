import { useRef } from 'react';
import { useSocket } from './hooks/useSocket';
import { useMovement } from './hooks/useMovement';
import CosmosCanvas from './components/CosmosCanvas';
import ChatPanel from './components/ChatPanel';
import ZoneChatPanel from './components/ZoneChatPanel';
import HUD from './components/HUD';
import JoinScreen from './components/JoinScreen';
import ProximityToast from './components/ProximityToast';

export default function App() {
  const {
    connected, myUser, users,
    rooms, activeRoom, setActiveRoom,
    zones, myZones, activeZone, setActiveZone,
    sendMove, sendMessage, sendZoneMessage, sendEmoji,
  } = useSocket();

  const prevRoomsSize = useRef(0);

  const localPos = useMovement({
    myUser,
    worldSize: myUser?.worldSize,
    onMove: sendMove,
  });

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <JoinScreen connected={connected} myUser={myUser} />

      {myUser && (
        <CosmosCanvas
          myUser={myUser}
          users={users}
          rooms={rooms}
          worldSize={myUser.worldSize}
          proximityRadius={myUser.proximityRadius}
          localPos={localPos}
          zones={zones}
          myZones={myZones}
        />
      )}

      {myUser && (
        <HUD
          myUser={myUser}
          users={users}
          rooms={rooms}
          myZones={myZones}
          connected={connected}
          sendEmoji={sendEmoji}
        />
      )}

      {/* Proximity chat — bottom right */}
      {myUser && rooms.size > 0 && (
        <ChatPanel
          rooms={rooms}
          activeRoom={activeRoom}
          setActiveRoom={setActiveRoom}
          myUser={myUser}
          sendMessage={sendMessage}
        />
      )}

      {/* Zone chat — bottom left */}
      {myUser && myZones.size > 0 && (
        <ZoneChatPanel
          myZones={myZones}
          activeZone={activeZone}
          setActiveZone={setActiveZone}
          myUser={myUser}
          sendZoneMessage={sendZoneMessage}
        />
      )}

      {myUser && (
        <ProximityToast rooms={rooms} prevRoomsSize={prevRoomsSize} />
      )}
    </div>
  );
}
