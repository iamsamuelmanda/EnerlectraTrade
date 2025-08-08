import React, { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  sendMessage: (event: string, data: any) => void
  joinRoom: (room: string) => void
  leaveRoom: (room: string) => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

interface SocketProviderProps {
  children: React.ReactNode
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect to Socket.IO server
      const newSocket = io(process.env.VITE_API_URL || 'http://localhost:5000', {
        query: {
          userId: user.id,
          phone: user.phone,
        },
        transports: ['websocket', 'polling']
      })

      newSocket.on('connect', () => {
        console.log('Connected to server')
        setIsConnected(true)
        
        // Join user's personal room and cluster rooms
        newSocket.emit('join-user-room', user.id)
        user.clusters.forEach(clusterId => {
          newSocket.emit('join-cluster-room', clusterId)
        })
      })

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server')
        setIsConnected(false)
      })

      // Handle energy trading notifications
      newSocket.on('energy-offer', (data) => {
        toast.success(`New energy offer: ${data.amount} kWh at ${data.price} ZMW/kWh`, {
          duration: 6000,
        })
      })

      // Handle cluster notifications
      newSocket.on('cluster-update', (data) => {
        toast.info(`Cluster Update: ${data.message}`, {
          duration: 5000,
        })
      })

      // Handle price alerts
      newSocket.on('price-alert', (data) => {
        toast.success(`Price Alert: Energy price ${data.type} to ${data.price} ZMW/kWh`, {
          duration: 8000,
        })
      })

      // Handle surplus energy alerts
      newSocket.on('surplus-alert', (data) => {
        toast.info(`Surplus Energy Available: ${data.amount} kWh in ${data.clusterName}`, {
          duration: 6000,
        })
      })

      // Handle chat messages
      newSocket.on('new-message', (data) => {
        if (data.senderId !== user.id) {
          toast(`💬 ${data.senderName}: ${data.message.substring(0, 50)}...`, {
            duration: 4000,
          })
        }
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
        setSocket(null)
      }
    }
  }, [isAuthenticated, user])

  const sendMessage = (event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data)
    }
  }

  const joinRoom = (room: string) => {
    if (socket && isConnected) {
      socket.emit('join-room', room)
    }
  }

  const leaveRoom = (room: string) => {
    if (socket && isConnected) {
      socket.emit('leave-room', room)
    }
  }

  const value = {
    socket,
    isConnected,
    sendMessage,
    joinRoom,
    leaveRoom,
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}