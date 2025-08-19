import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'

// Mock the API service
jest.mock('../services/api')
const mockedApi = api as jest.Mocked<typeof api>

// Test component to access auth context
const TestComponent = () => {
  const auth = useAuth()
  return (
    <div>
      <div data-testid="isAuthenticated">{auth.isAuthenticated.toString()}</div>
      <div data-testid="isLoading">{auth.isLoading.toString()}</div>
      <div data-testid="isGuestMode">{auth.isGuestMode.toString()}</div>
      <div data-testid="userName">{auth.user?.name || 'No User'}</div>
      <button onClick={() => auth.startLogin('1234567890')}>Start Login</button>
      <button onClick={() => auth.verifyLogin('1234567890', '123456', 'Test User')}>Verify Login</button>
      <button onClick={() => auth.register('Test User', '1234567890')}>Register</button>
      <button onClick={() => auth.logout()}>Logout</button>
      <button onClick={() => auth.enableGuestMode()}>Guest Mode</button>
      <button onClick={() => auth.socialLogin('google')}>Google Login</button>
      <button onClick={() => auth.magicLinkAuth('test@example.com', 'email')}>Magic Link</button>
      <button onClick={() => auth.biometricAuth()}>Biometric</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset localStorage
    localStorage.clear()
    // Mock successful API responses by default
    mockedApi.get.mockResolvedValue({ data: { success: false } })
    mockedApi.post.mockResolvedValue({ data: { success: false } })
  })

  describe('Initial State', () => {
    it('should start with unauthenticated state', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false')
      expect(screen.getByTestId('isLoading')).toHaveTextContent('true')
      expect(screen.getByTestId('isGuestMode')).toHaveTextContent('false')
    })

    it('should check for existing session on mount', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            user: {
              id: '1',
              phone: '1234567890',
              name: 'Test User',
              region: 'Zambia',
              walletBalance: { zmw: 100, kwh: 50 },
              carbonSavings: 25,
              reputation: 100,
              clusters: [],
              createdAt: new Date().toISOString()
            }
          }
        }
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false')
      })

      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
      expect(screen.getByTestId('userName')).toHaveTextContent('Test User')
    })
  })

  describe('Phone Authentication', () => {
    it('should start login process successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: { requestId: 'req-123' }
        }
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false')
      })

      const startLoginButton = screen.getByText('Start Login')
      fireEvent.click(startLoginButton)

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith('/auth/login/start', {
          phoneNumber: '1234567890'
        })
      })
    })

    it('should verify login successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            user: {
              id: '1',
              phone: '1234567890',
              name: 'Test User',
              region: 'Zambia',
              walletBalance: { zmw: 100, kwh: 50 },
              carbonSavings: 25,
              reputation: 100,
              clusters: [],
              createdAt: new Date().toISOString()
            }
          }
        }
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false')
      })

      const verifyButton = screen.getByText('Verify Login')
      fireEvent.click(verifyButton)

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith('/auth/login/verify', {
          phoneNumber: '1234567890',
          code: '123456',
          name: 'Test User'
        })
      })

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
        expect(screen.getByTestId('userName')).toHaveTextContent('Test User')
      })
    })

    it('should handle login verification failure gracefully', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Invalid code'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false')
      })

      const verifyButton = screen.getByText('Verify Login')
      
      // Wrap in act to handle async state updates
      await act(async () => {
        fireEvent.click(verifyButton)
      })

      // Should remain unauthenticated after failed login
      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false')
      })
    })
  })

  describe('Registration', () => {
    it('should register user successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            user: {
              id: '1',
              phone: '1234567890',
              name: 'Test User',
              region: 'Zambia',
              walletBalance: { zmw: 0, kwh: 0 },
              carbonSavings: 0,
              reputation: 50,
              clusters: [],
              createdAt: new Date().toISOString()
            }
          }
        }
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false')
      })

      const registerButton = screen.getByText('Register')
      fireEvent.click(registerButton)

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith('/auth/register', {
          name: 'Test User',
          phoneNumber: '1234567890'
        })
      })

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
        expect(screen.getByTestId('userName')).toHaveTextContent('Test User')
      })
    })
  })

  describe('Logout', () => {
    it('should logout user successfully', async () => {
      // First login
      mockedApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            user: {
              id: '1',
              phone: '1234567890',
              name: 'Test User',
              region: 'Zambia',
              walletBalance: { zmw: 100, kwh: 50 },
              carbonSavings: 25,
              reputation: 100,
              clusters: [],
              createdAt: new Date().toISOString()
            }
          }
        }
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
      })

      const logoutButton = screen.getByText('Logout')
      fireEvent.click(logoutButton)

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith('/auth/logout')
      })

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false')
      })
    })
  })

  describe('Guest Mode', () => {
    it('should enable guest mode', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false')
      })

      const guestButton = screen.getByText('Guest Mode')
      fireEvent.click(guestButton)

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
        expect(screen.getByTestId('isGuestMode')).toHaveTextContent('true')
        expect(screen.getByTestId('userName')).toHaveTextContent('Guest User')
      })
    })
  })

  describe('Social Login', () => {
    it('should initiate social login', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: { authUrl: 'https://google.com/auth' }
        }
      })

      // Mock window.location more safely
      const originalLocation = window.location
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false')
      })

      const googleButton = screen.getByText('Google Login')
      fireEvent.click(googleButton)

      await waitFor(() => {
        expect(mockedApi.get).toHaveBeenCalledWith('/auth/google')
      })

      await waitFor(() => {
        expect(window.location.href).toBe('https://google.com/auth')
      })

      // Restore original location
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true
      })
    })
  })

  describe('Magic Link Authentication', () => {
    it('should send magic link successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: { requestId: 'magic-123' }
        }
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false')
      })

      const magicLinkButton = screen.getByText('Magic Link')
      fireEvent.click(magicLinkButton)

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith('/auth/magic-link', {
          contact: 'test@example.com',
          method: 'email'
        })
      })
    })
  })

  describe('Biometric Authentication', () => {
    it('should handle biometric auth when supported', async () => {
      // Mock navigator.credentials
      const mockCredentials = {
        id: 'biometric-credential-123'
      }
      
      Object.defineProperty(navigator, 'credentials', {
        value: {
          get: jest.fn().mockResolvedValue(mockCredentials)
        },
        writable: true
      })

      mockedApi.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            user: {
              id: '1',
              phone: '1234567890',
              name: 'Test User',
              region: 'Zambia',
              walletBalance: { zmw: 100, kwh: 50 },
              carbonSavings: 25,
              reputation: 100,
              clusters: [],
              createdAt: new Date().toISOString()
            }
          }
        }
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false')
      })

      const biometricButton = screen.getByText('Biometric')
      fireEvent.click(biometricButton)

      await waitFor(() => {
        expect(navigator.credentials.get).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith('/auth/biometric', {
          credential: 'biometric-credential-123'
        })
      })

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
      })
    })

    it('should handle biometric auth when not supported', async () => {
      // Mock navigator.credentials as undefined
      Object.defineProperty(navigator, 'credentials', {
        value: undefined,
        writable: true
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false')
      })

      const biometricButton = screen.getByText('Biometric')
      fireEvent.click(biometricButton)

      // Should not call API when biometric is not supported
      expect(mockedApi.post).not.toHaveBeenCalled()
    })
  })

  describe('Token Refresh', () => {
    it('should refresh token when auth check fails', async () => {
      // First call fails, second succeeds
      mockedApi.get
        .mockRejectedValueOnce(new Error('Unauthorized'))
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              user: {
                id: '1',
                phone: '1234567890',
                name: 'Test User',
                region: 'Zambia',
                walletBalance: { zmw: 100, kwh: 50 },
                carbonSavings: 25,
                reputation: 100,
                clusters: [],
                createdAt: new Date().toISOString()
              }
            }
          }
        })

      mockedApi.post.mockResolvedValueOnce({
        data: { success: true }
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false')
      })

      expect(mockedApi.post).toHaveBeenCalledWith('/auth/refresh')
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockedApi.get.mockRejectedValue(new Error('Network error'))
      mockedApi.post.mockRejectedValue(new Error('Network error'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false')
      })

      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false')
    })
  })
}) 