// Owns the single Socket.IO connection for the whole app. Created only
// once a user is logged in (we need the token for the handshake), torn
// down on logout — mirrors the spec's "create after auth, tear down on
// logout" decision.
import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) {
      setSocket(null);
      return;
    }

    const token = localStorage.getItem('token');
    const newSocket = io(import.meta.env.VITE_API_URL, { auth: { token } });
    setSocket(newSocket);

    return () => newSocket.close();
  }, [user]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
