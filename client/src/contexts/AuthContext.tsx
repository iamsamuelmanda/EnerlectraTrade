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
  isGuest?: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isGuestMode: boolean
  login: (phone: string, pin?: string) => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
  refreshUser: () => Promise<void>
  register: (name: string, phone: string) => Promise<void>
  startLogin: (phone: string) => Promise<void>
  verifyLogin: (phone: string, code: string, name?: string) => Promise<void>
  refreshToken: () => Promise<void>
  // Enhanced authentication methods
  socialLogin: (provider: 'google' | 'facebook' | 'apple') => Promise<void>
  magicLinkAuth: (contact: string, method: 'sms' | 'email') => Promise<void>
  biometricAuth: () => Promise<void>
  enableGuestMode: () => void
  disableGuestMode: () => void
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
  const [isGuestMode, setIsGuestMode] = useState(false)

  useEffect(() => {
    // Check for stored user session and try to refresh token
    const checkAuth = async () => {
      try {
        const response = await api.get('/auth/me')
        if (response.data.success) {
          setUser(response.data.data.user)
          setIsGuestMode(false)
        }
      } catch (error) {
        // Try to refresh token
        try {
          await refreshToken()
        } catch (refreshError) {
          console.log('No valid session found')
        }
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const startLogin = async (phone: string) => {
    try {
      const response = await api.post('/auth/login/start', { phoneNumber: phone })
      if (response.data.success) {
        return response.data.data.requestId
      } else {
        throw new Error(response.data.error || 'Failed to start login')
      }
    } catch (error) {
      console.error('Start login error:', error)
      throw error
    }
  }

  const verifyLogin = async (phone: string, code: string, name?: string) => {
    try {
      const response = await api.post('/auth/login/verify', { 
        phoneNumber: phone, 
        code, 
        name 
      })
      
      if (response.data.success) {
        const userData = response.data.data.user
        setUser(userData)
        // Token is now in httpOnly cookies, no need to store in localStorage
      } else {
        throw new Error(response.data.error || 'Login verification failed')
      }
    } catch (error) {
      console.error('Login verification error:', error)
      throw error
    }
  }

  const register = async (name: string, phone: string) => {
    try {
      const response = await api.post('/auth/register', { 
        name, 
        phoneNumber: phone 
      })
      
      if (response.data.success) {
        const userData = response.data.data.user
        setUser(userData)
        // Token is now in httpOnly cookies
      } else {
        throw new Error(response.data.error || 'Registration failed')
      }
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }

  const refreshToken = async () => {
    try {
      const response = await api.post('/auth/refresh')
      if (response.data.success) {
        // Token refreshed in cookies, try to get user profile
        await refreshUser()
      } else {
        throw new Error('Token refresh failed')
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      throw error
    }
  }

  const login = async (phone: string, pin?: string) => {
    // Legacy method - use startLogin + verifyLogin instead
    await startLogin(phone)
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
    }
  }

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData }
      setUser(updatedUser)
    }
  }

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me')
      if (response.data.success) {
        const userData = response.data.data.user
        setUser(userData)
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
      // If auth fails, try to refresh token
      try {
        await refreshToken()
      } catch (refreshError) {
        setUser(null)
      }
    }
  }

  // Enhanced authentication methods
  const socialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    setIsLoading(true)
    try {
      // Redirect to social OAuth
      const response = await api.get(`/auth/${provider}`)
      if (response.data.success) {
        // Handle OAuth redirect
        window.location.href = response.data.data.authUrl
      } else {
        throw new Error(`Failed to start ${provider} login`)
      }
    } catch (error: any) {
      console.error(`${provider} login error:`, error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const magicLinkAuth = async (contact: string, method: 'sms' | 'email') => {
    setIsLoading(true)
    try {
      const response = await api.post('/auth/magic-link', { contact, method })
      if (response.data.success) {
        // Magic link sent successfully
        return response.data.data.requestId
      } else {
        throw new Error(response.data.error || 'Failed to send magic link')
      }
    } catch (error: any) {
      console.error('Magic link error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const biometricAuth = async () => {
    setIsLoading(true)
    try {
      if ('credentials' in navigator) {
        const credential = await navigator.credentials.get({
          publicKey: { challenge: new Uint8Array(32) }
        })
        
        if (credential) {
          // Verify biometric with backend
          const response = await api.post('/auth/biometric', { 
            credential: credential.id 
          })
          
          if (response.data.success) {
            const userData = response.data.data.user
            setUser(userData)
            setIsGuestMode(false)
          } else {
            throw new Error('Biometric verification failed')
          }
        } else {
          throw new Error('Biometric authentication cancelled')
        }
      } else {
        throw new Error('Biometric authentication not supported')
      }
    } catch (error: any) {
      console.error('Biometric auth error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const enableGuestMode = () => {
    const guestUser: User = {
      id: 'guest',
      phone: 'guest',
      name: 'Guest User',
      region: 'Zambia',
      walletBalance: { zmw: 0, kwh: 0 },
      carbonSavings: 0,
      reputation: 0,
      clusters: [],
      createdAt: new Date().toISOString(),
      isGuest: true
    }
    setUser(guestUser)
    setIsGuestMode(true)
  }

  const disableGuestMode = () => {
    setUser(null)
    setIsGuestMode(false)
  }

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isGuestMode,
    login,
    logout,
    updateUser,
    refreshUser,
    register,
    startLogin,
    verifyLogin,
    refreshToken,
    // Enhanced methods
    socialLogin,
    magicLinkAuth,
    biometricAuth,
    enableGuestMode,
    disableGuestMode,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
