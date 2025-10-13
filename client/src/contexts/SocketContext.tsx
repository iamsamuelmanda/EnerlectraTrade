import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  joinClusterRoom: (clusterId: string) => void;
  leaveClusterRoom: (clusterId: string) => void;
  emit: (event: string, data: any) => void;
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

  const connect = useCallback(() => {
    if (socket?.connected) return;

    // Get auth token from localStorage or cookies
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');

    const newSocket = io(process.env.REACT_APP_WS_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      reconnectionDelayMax: 5000,
      auth: {
        token: token || undefined
      }
    });

    // ========================================
    // CONNECTION EVENTS
    // ========================================
    newSocket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      setIsConnected(true);

      // Rejoin rooms after reconnection
      if (userId) {
        const clusterIds = JSON.parse(localStorage.getItem('userClusterIds') || '[]');
        newSocket.emit('rejoin-rooms', { userId, clusterIds });
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
      setIsConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`🔌 WebSocket reconnected after ${attemptNumber} attempts`);
    });

    // ========================================
    // TRADING EVENTS
    // ========================================
    newSocket.on('trade-completed', (data) => {
      console.log('⚡ Trade completed:', data);
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

    newSocket.on('offer-matched', (data) => {
      console.log('🎯 Offer matched:', data);
      window.dispatchEvent(new CustomEvent('offer-matched', { detail: data }));
    });

    // ========================================
    // AI SERVICE EVENTS
    // ========================================
    newSocket.on('ai-response-ready', (data) => {
      console.log('🤖 AI response ready:', data);
      window.dispatchEvent(new CustomEvent('ai-response-ready', { detail: data }));
    });

    newSocket.on('ai-chat-message', (data) => {
      console.log('💬 AI chat message:', data);
      window.dispatchEvent(new CustomEvent('ai-chat-message', { detail: data }));
    });

    newSocket.on('energy-advice-updated', (data) => {
      console.log('💡 Energy advice updated:', data);
      window.dispatchEvent(new CustomEvent('energy-advice-updated', { detail: data }));
    });

    newSocket.on('market-insights-ready', (data) => {
      console.log('📈 Market insights ready:', data);
      window.dispatchEvent(new CustomEvent('market-insights-ready', { detail: data }));
    });

    // ========================================
    // ANALYTICS EVENTS
    // ========================================
    newSocket.on('analytics-sync-complete', (data) => {
      console.log('📊 Analytics sync complete:', data);
      window.dispatchEvent(new CustomEvent('analytics-sync-complete', { detail: data }));
    });

    newSocket.on('usage-metrics-updated', (data) => {
      console.log('📈 Usage metrics updated:', data);
      window.dispatchEvent(new CustomEvent('usage-metrics-updated', { detail: data }));
    });

    newSocket.on('dashboard-refresh', (data) => {
      console.log('🔄 Dashboard refresh:', data);
      window.dispatchEvent(new CustomEvent('dashboard-refresh', { detail: data }));
    });

    // ========================================
    // PAYMENT & TRANSACTION EVENTS
    // ========================================
    newSocket.on('payment-status-changed', (data) => {
      console.log('💳 Payment status changed:', data);
      window.dispatchEvent(new CustomEvent('payment-status-changed', { detail: data }));
    });

    newSocket.on('balance-updated', (data) => {
      console.log('💰 Balance updated:', data);
      window.dispatchEvent(new CustomEvent('balance-updated', { detail: data }));
    });

    newSocket.on('transaction-confirmed', (data) => {
      console.log('✅ Transaction confirmed:', data);
      window.dispatchEvent(new CustomEvent('transaction-confirmed', { detail: data }));
    });

    // ========================================
    // AUTO-UPDATE EVENTS
    // ========================================
    newSocket.on('update-available', (data) => {
      console.log('🆕 Update available:', data);
      window.dispatchEvent(new CustomEvent('update-available', { detail: data }));
    });

    newSocket.on('update-progress', (data) => {
      console.log('⬇️ Update progress:', data);
      window.dispatchEvent(new CustomEvent('update-progress', { detail: data }));
    });

    newSocket.on('update-complete', (data) => {
      console.log('✅ Update complete:', data);
      window.dispatchEvent(new CustomEvent('update-complete', { detail: data }));
    });

    newSocket.on('update-failed', (data) => {
      console.error('❌ Update failed:', data);
      window.dispatchEvent(new CustomEvent('update-failed', { detail: data }));
    });

    // ========================================
    // USER ACTIVITY EVENTS
    // ========================================
    newSocket.on('user-connected', (data) => {
      console.log('👤 User connected:', data);
      window.dispatchEvent(new CustomEvent('user-connected', { detail: data }));
    });

    newSocket.on('user-disconnected', (data) => {
      console.log('👤 User disconnected:', data);
      window.dispatchEvent(new CustomEvent('user-disconnected', { detail: data }));
    });

    newSocket.on('user-activity', (data) => {
      console.log('🔔 User activity:', data);
      window.dispatchEvent(new CustomEvent('user-activity', { detail: data }));
    });

    // ========================================
    // CLUSTER EVENTS
    // ========================================
    newSocket.on('cluster-status-changed', (data) => {
      console.log('🏢 Cluster status changed:', data);
      window.dispatchEvent(new CustomEvent('cluster-status-changed', { detail: data }));
    });

    newSocket.on('cluster-member-joined', (data) => {
      console.log('🏢 Cluster member joined:', data);
      window.dispatchEvent(new CustomEvent('cluster-member-joined', { detail: data }));
    });

    // ========================================
    // SYSTEM EVENTS
    // ========================================
    newSocket.on('offline-mode-activated', (data) => {
      console.log('📱 Offline mode activated:', data);
      window.dispatchEvent(new CustomEvent('offline-mode-activated', { detail: data }));
    });

    newSocket.on('blockchain-sync-status', (data) => {
      console.log('⛓️ Blockchain sync status:', data);
      window.dispatchEvent(new CustomEvent('blockchain-sync-status', { detail: data }));
    });

    setSocket(newSocket);
  }, [socket]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  const joinClusterRoom = useCallback((clusterId: string) => {
    if (socket && isConnected) {
      socket.emit('join-cluster-room', clusterId);
      console.log(`🏢 Joining cluster room: ${clusterId}`);
    }
  }, [socket, isConnected]);

  const leaveClusterRoom = useCallback((clusterId: string) => {
    if (socket && isConnected) {
      socket.emit('leave-cluster-room', clusterId);
      console.log(`🏢 Leaving cluster room: ${clusterId}`);
    }
  }, [socket, isConnected]);

  const emit = useCallback((event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn(`Cannot emit event '${event}': Socket not connected`);
    }
  }, [socket, isConnected]);

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
    joinClusterRoom,
    leaveClusterRoom,
    emit,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
