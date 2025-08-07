import React, { useEffect, useState } from 'react';
import { initSocket } from './socket';

const InitSocketComponent = () => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const socketInstance = await initSocket();
        setSocket(socketInstance);
      } catch (err) {
        console.error('Socket error:', err);
      }
    };

    initialize();

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  return (
    <div>
      {socket ? '✅ Socket connected' : '🔄 Connecting socket...'}
    </div>
  );
};

export default InitSocketComponent;
