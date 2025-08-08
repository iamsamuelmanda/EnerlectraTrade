import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Zap, 
  TrendingUp, 
  MessageCircle, 
  CreditCard, 
  Wallet, 
  User, 
  Trophy,
  BarChart3,
  Sun,
  Moon,
  Menu,
  X,
  Globe,
  ChevronDown
} from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage, languages, Language } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()

  const navigation = [
    { name: t('nav.dashboard'), href: '/', icon: Home },
    { name: t('nav.clusters'), href: '/clusters', icon: Zap },
    { name: t('nav.trading'), href: '/trading', icon: TrendingUp },
    { name: t('nav.chat'), href: '/chat', icon: MessageCircle },
    { name: t('nav.microfinance'), href: '/microfinance', icon: CreditCard },
    { name: t('nav.wallet'), href: '/wallet', icon: Wallet },
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  ]

  const isActiveRoute = (href: string) => {
    return location.pathname === href
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div className={`${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Innerlectra</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Energy Trading</p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        {isAuthenticated && user && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.name || user.phone}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user.region}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                <p className="text-gray-500 dark:text-gray-400">Balance</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {user.walletBalance.zmw.toLocaleString()} ZMW
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                <p className="text-gray-500 dark:text-gray-400">Energy</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {user.walletBalance.kwh.toFixed(1)} kWh
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = isActiveRoute(item.href)
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`${
                  isActive
                    ? 'bg-primary-100 border-primary-500 text-primary-700 dark:bg-primary-900 dark:border-primary-400 dark:text-primary-300'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                } group flex items-center px-3 py-2 text-sm font-medium border-l-4 transition-colors duration-200`}
              >
                <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Theme & Language Controls */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              ) : (
                <Sun className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              )}
            </button>

            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                className="flex items-center space-x-1 p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Globe className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                  {language}
                </span>
                <ChevronDown className="w-3 h-3 text-gray-500" />
              </button>

              {isLanguageDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  {Object.entries(languages).map(([code, name]) => (
                    <button
                      key={code}
                      onClick={() => {
                        setLanguage(code as Language)
                        setIsLanguageDropdownOpen(false)
                      }}
                      className={`${
                        language === code
                          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      } block w-full text-left px-3 py-2 text-sm first:rounded-t-lg last:rounded-b-lg`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1 lg:flex lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {navigation.find(item => isActiveRoute(item.href))?.name || 'Dashboard'}
                </h2>
              </div>

              {/* Quick Stats */}
              {isAuthenticated && user && (
                <div className="hidden lg:flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1 text-energy-solar">
                    <Sun className="w-4 h-4" />
                    <span className="font-medium">{user.carbonSavings.toFixed(1)} kg CO₂</span>
                  </div>
                  <div className="flex items-center space-x-1 text-primary-600 dark:text-primary-400">
                    <Trophy className="w-4 h-4" />
                    <span className="font-medium">{user.reputation}</span>
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    {user.clusters.length} cluster{user.clusters.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Sidebar overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  )
}

export default Layout