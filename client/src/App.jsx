import { useRef } from 'react';
import { useSocket } from './hooks/useSocket';
import { useMovement } from './hooks/useMovement';
import CosmosCanvas from './components/CosmosCanvas';
import ChatPanel from './components/ChatPanel';
import HUD from './components/HUD';
import JoinScreen from './components/JoinScreen';
import ProximityToast from './components/ProximityToast';

export default function App() {
  const {
    connected,
    myUser,
    users,
    rooms,
    activeRoom,
    setActiveRoom,
    sendMove,
    sendMessage,
    sendEmoji,
  } = useSocket();

  const prevRoomsSize = useRef(0);

  const localPos = useMovement({
    myUser,
    worldSize: myUser?.worldSize,
    onMove: sendMove,
  });

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Loading screen */}
      <JoinScreen connected={connected} myUser={myUser} />

      {/* Main canvas */}
      {myUser && (
        <CosmosCanvas
          myUser={myUser}
          users={users}
          rooms={rooms}
          worldSize={myUser.worldSize}
          proximityRadius={myUser.proximityRadius}
          localPos={localPos}
        />
      )}

      {/* HUD overlay */}
      {myUser && (
        <HUD
          myUser={myUser}
          users={users}
          rooms={rooms}
          connected={connected}
          sendEmoji={sendEmoji}
        />
      )}

      {/* Chat panel */}
      {myUser && rooms.size > 0 && (
        <ChatPanel
          rooms={rooms}
          activeRoom={activeRoom}
          setActiveRoom={setActiveRoom}
          myUser={myUser}
          sendMessage={sendMessage}
        />
      )}

      {/* Proximity notification toasts */}
      {myUser && (
        <ProximityToast rooms={rooms} prevRoomsSize={prevRoomsSize} />
      )}
    </div>
  );
}
