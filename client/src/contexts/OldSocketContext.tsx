import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = () => {
    if (socket?.connected) return;

    const newSocket = io(process.env.REACT_APP_WS_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Listen for energy trading events
    newSocket.on('trade-completed', (data) => {
      console.log('⚡ Trade completed:', data);
      // Dispatch custom event for components to listen to
      window.dispatchEvent(new CustomEvent('trade-completed', { detail: data }));
    });

    newSocket.on('offer-created', (data) => {
      console.log('💡 New offer created:', data);
      window.dispatchEvent(new CustomEvent('offer-created', { detail: data }));
    });

    newSocket.on('market-update', (data) => {
      console.log('📊 Market update:', data);
      window.dispatchEvent(new CustomEvent('market-update', { detail: data }));
    });

    setSocket(newSocket);
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    // Auto-connect on mount
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, []);

  const value = {
    socket,
    isConnected,
    connect,
    disconnect,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};