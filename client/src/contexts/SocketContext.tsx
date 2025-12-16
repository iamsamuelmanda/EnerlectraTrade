import React, { createContext, useContext, ReactNode } from 'react';

interface SocketContextType {
  socket: null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  // MVP-safe: no real socket
  const connect = () => {
    console.log('⚡ SocketProvider MVP: connect called (stub)');
  };

  const disconnect = () => {
    console.log('⚡ SocketProvider MVP: disconnect called (stub)');
  };

  const value: SocketContextType = {
    socket: null,
    isConnected: true, // always true for MVP
    connect,
    disconnect,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
