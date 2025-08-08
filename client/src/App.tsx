import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ClusterHub from './pages/ClusterHub'
import ClusterDetail from './pages/ClusterDetail'
import Trading from './pages/Trading'
import Chat from './pages/Chat'
import Microfinance from './pages/Microfinance'
import Profile from './pages/Profile'
import Wallet from './pages/Wallet'
import Leaderboard from './pages/Leaderboard'
import Analytics from './pages/Analytics'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clusters" element={<ClusterHub />} />
          <Route path="/clusters/:id" element={<ClusterDetail />} />
          <Route path="/trading" element={<Trading />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/microfinance" element={<Microfinance />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Layout>
      
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--toast-color)',
          },
          className: 'dark:bg-gray-800 dark:text-white',
        }}
      />
    </div>
  )
}

export default App