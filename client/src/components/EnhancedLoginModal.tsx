import React, { useState, useEffect } from 'react'
import { 
  X, Phone, Lock, User, QrCode, Eye, EyeOff, 
  Mail, Smartphone, Fingerprint, Globe, 
  Chrome, Download, UserCheck, Zap
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePWA } from '../hooks/usePWA'
import toast from 'react-hot-toast'

interface EnhancedLoginModalProps {
  isOpen: boolean
  onClose: () => void
}

const EnhancedLoginModal: React.FC<EnhancedLoginModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'welcome' | 'login' | 'register' | 'otp' | 'magic-link'>('welcome')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [authMethod, setAuthMethod] = useState<'phone' | 'email' | 'social' | 'biometric' | 'guest'>('phone')

  const { 
    startLogin, 
    verifyLogin, 
    register, 
    socialLogin, 
    magicLinkAuth, 
    biometricAuth, 
    enableGuestMode 
  } = useAuth()

  const { canInstall, isInstalled, installPWA } = usePWA()

  // Check for biometric availability
  const [biometricAvailable, setBiometricAvailable] = useState(false)

  useEffect(() => {
    // Check if biometric authentication is available
    if ('credentials' in navigator) {
      navigator.credentials.get({ publicKey: { challenge: new Uint8Array(32) } })
        .then(() => setBiometricAvailable(true))
        .catch(() => setBiometricAvailable(false))
    }
  }, [])

  // Handle social login
  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    setIsLoading(true)
    try {
      await socialLogin(provider)
      // The socialLogin method will handle the redirect
    } catch (error: any) {
      toast.error(`Failed to login with ${provider}: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle biometric authentication
  const handleBiometricLogin = async () => {
    setIsLoading(true)
    try {
      await biometricAuth()
      toast.success('Biometric authentication successful!')
      onClose()
    } catch (error: any) {
      toast.error(`Biometric authentication failed: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle magic link authentication
  const handleMagicLink = async () => {
    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    setIsLoading(true)
    try {
      await magicLinkAuth(email, 'email')
      toast.success('Magic link sent to your email!')
      setMode('magic-link')
    } catch (error: any) {
      toast.error(`Failed to send magic link: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle guest mode
  const handleGuestMode = () => {
    enableGuestMode()
    toast.success('Welcome! You can explore the app as a guest')
    onClose()
  }

  // Handle PWA installation
  const handlePWAInstall = async () => {
    if (canInstall && !isInstalled) {
      try {
        await installPWA()
        toast.success('PWA installation initiated!')
      } catch (error) {
        toast.error('PWA installation failed')
      }
    } else if (isInstalled) {
      toast.info('App is already installed!')
    } else {
      toast.info('PWA installation not available on this device')
    }
  }

  const handleStartLogin = async () => {
    if (authMethod === 'phone' && !phone) {
      toast.error('Please enter your phone number')
      return
    }
    if (authMethod === 'email' && !email) {
      toast.error('Please enter your email address')
      return
    }

    setIsLoading(true)
    try {
      if (authMethod === 'phone') {
        await startLogin(phone)
        setMode('otp')
        toast.success('OTP sent to your phone')
      } else if (authMethod === 'email') {
        await handleMagicLink()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to start authentication')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!otp) {
      toast.error('Please enter the OTP')
      return
    }

    setIsLoading(true)
    try {
      if (mode === 'register') {
        await verifyLogin(phone, otp, name)
        toast.success('Registration successful!')
      } else {
        await verifyLogin(phone, otp)
        toast.success('Login successful!')
      }
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify OTP')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!name || !phone) {
      toast.error('Please fill in all fields')
      return
    }

    setIsLoading(true)
    try {
      await register(name, phone)
      toast.success('Registration successful!')
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  // Welcome Screen - Multiple Authentication Options
  if (mode === 'welcome') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome to Enerlectra
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Choose how you'd like to access your energy trading platform
          </p>

          {/* Quick Access Options */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleGuestMode}
              className="w-full flex items-center justify-center space-x-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-3 px-4 rounded-lg transition-colors"
            >
              <Guest className="w-5 h-5" />
              <span>Explore as Guest</span>
            </button>

            {canInstall && !isInstalled && (
              <button
                onClick={handlePWAInstall}
                className="w-full flex items-center justify-center space-x-3 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-200 py-3 px-4 rounded-lg transition-colors"
              >
                <Download className="w-5 h-5" />
                <span>Install App</span>
              </button>
            )}

            {isInstalled && (
              <div className="w-full flex items-center justify-center space-x-3 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 py-3 px-4 rounded-lg">
                <Download className="w-5 h-5" />
                <span>✓ App Installed</span>
              </div>
            )}
          </div>

          {/* Authentication Methods */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Sign In or Create Account
            </h3>

            {/* Phone Authentication */}
            <button
              onClick={() => {
                setAuthMethod('phone')
                setMode('login')
              }}
              className="w-full flex items-center justify-center space-x-3 bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-200 py-3 px-4 rounded-lg transition-colors"
            >
              <Smartphone className="w-5 h-5" />
              <span>Continue with Phone</span>
            </button>

            {/* Email Authentication */}
            <button
              onClick={() => {
                setAuthMethod('email')
                setMode('login')
              }}
              className="w-full flex items-center justify-center space-x-3 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-200 py-3 px-4 rounded-lg transition-colors"
            >
              <Mail className="w-5 h-5" />
              <span>Continue with Email</span>
            </button>

            {/* Social Login */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleSocialLogin('google')}
                disabled={isLoading}
                className="flex items-center justify-center bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-200 py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                <Chrome className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleSocialLogin('facebook')}
                disabled={isLoading}
                className="flex items-center justify-center bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-200 py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                <Globe className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleSocialLogin('apple')}
                disabled={isLoading}
                className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                <Zap className="w-5 h-5" />
              </button>
            </div>

            {/* Biometric Authentication */}
            {biometricAvailable && (
              <button
                onClick={handleBiometricLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-3 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-200 py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                <Fingerprint className="w-5 h-5" />
                <span>Use Biometric</span>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Login/Register Screen
  if (mode === 'login' || mode === 'register') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {mode === 'register' ? 'Create Account' : 'Sign In'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Back to Welcome */}
          <button
            onClick={() => setMode('welcome')}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-4"
          >
            ← Back to options
          </button>

          {/* Input Fields */}
          <div className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            )}

            {authMethod === 'phone' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300">
                    +260
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="955 123 456"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleStartLogin}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-lg transition-colors"
              >
                {isLoading ? 'Processing...' : mode === 'register' ? 'Create Account' : 'Continue'}
              </button>

              <button
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="w-full text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // OTP Verification Screen
  if (mode === 'otp') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Verify OTP
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Enter the 6-digit code sent to {authMethod === 'phone' ? phone : email}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                OTP Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center text-lg tracking-widest"
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={handleVerifyOTP}
                disabled={isLoading || otp.length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-lg transition-colors"
              >
                {isLoading ? 'Verifying...' : 'Verify & Continue'}
              </button>

              <button
                onClick={() => setMode('login')}
                className="w-full text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                ← Back to login
              </button>

              <button
                onClick={handleStartLogin}
                className="w-full text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Resend OTP
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Magic Link Sent Screen
  if (mode === 'magic-link') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 text-center">
          <div className="mb-6">
            <Mail className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Check Your Email
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              We've sent a magic link to <strong>{email}</strong>
            </p>
          </div>

          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Click the link in your email to sign in instantly. No passwords needed!
          </p>

          <div className="space-y-3">
            <button
              onClick={() => setMode('welcome')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors"
            >
              Back to Options
            </button>

            <button
              onClick={handleMagicLink}
              className="w-full text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Resend Magic Link
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default EnhancedLoginModal 
