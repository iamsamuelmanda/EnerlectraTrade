import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../services/api'

interface User {
  id: string
  phone: string
  name?: string
  email?: string
  region: string
  walletBalance: {
    zmw: number
    kwh: number
  }
  carbonSavings: number
  reputation: number
  clusters: string[]
  createdAt: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (phone: string, pin?: string) => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('innerlectra-user')
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)
        refreshUser(parsedUser.id)
      } catch (error) {
        console.error('Error parsing stored user:', error)
        localStorage.removeItem('innerlectra-user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (phone: string, pin?: string) => {
    setIsLoading(true)
    try {
      // For demo purposes, we'll use a simplified login
      // In production, this would involve proper authentication
      const response = await api.get(`/users/${phone}`)
      
      if (response.data.success) {
        const userData = response.data.data
        setUser(userData)
        localStorage.setItem('innerlectra-user', JSON.stringify(userData))
      } else {
        // Try to register new user if not found
        const registerResponse = await api.post('/users/register', { 
          phone,
          region: 'Lusaka' // Default region
        })
        
        if (registerResponse.data.success) {
          const userData = registerResponse.data.data
          setUser(userData)
          localStorage.setItem('innerlectra-user', JSON.stringify(userData))
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('innerlectra-user')
  }

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData }
      setUser(updatedUser)
      localStorage.setItem('innerlectra-user', JSON.stringify(updatedUser))
    }
  }

  const refreshUser = async (userId?: string) => {
    const targetUserId = userId || user?.id
    if (!targetUserId) return

    try {
      const response = await api.get(`/users/${targetUserId}`)
      if (response.data.success) {
        const userData = response.data.data
        setUser(userData)
        localStorage.setItem('innerlectra-user', JSON.stringify(userData))
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}