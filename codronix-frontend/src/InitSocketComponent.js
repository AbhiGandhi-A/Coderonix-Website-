import React, { useEffect, useState } from 'react';
import { initSocket } from './socket';

const InitSocketComponent = () => {
  const [socket, setSocket] = useState(null);

  // Get the backend URL from environment variables
  const SERVER_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    const initialize = async () => {
      try {
        // Pass the SERVER_URL to the initSocket function
        const socketInstance = await initSocket(SERVER_URL);
        setSocket(socketInstance);
      } catch (err) {
        console.error('Socket error:', err);
      }
    };

    initialize();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [SERVER_URL, socket]); // Include dependencies to handle re-initialization

  return (
    <div>
      {socket ? '✅ Socket connected' : '🔄 Connecting socket...'}
    </div>
  );
};

export default InitSocketComponent;