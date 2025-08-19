// === src/App.jsx ===
import { useState, useEffect } from 'react';
import { Activity, Zap, TrendingUp, Users, DollarSign, BarChart3, LogIn, User, Brain } from 'lucide-react';
import { apiService } from './services/api';
import { useAuth } from './contexts/AuthContext';
import { useSocket } from './contexts/SocketContext';
import EnhancedLoginModal from './components/EnhancedLoginModal';
import AIInsightsPanel from './components/AIInsightsPanel';
import EnerlectraLogo from './components/EnerlectraLogo';
import LoadingScreen from './components/LoadingScreen';
import toast from 'react-hot-toast';

type ConnectionStatus = 'checking' | 'connected' | 'offline' | 'error';

interface EnergyListing {
  id: string | number;
  amount: number;
  pricePerKwh: number;
  description?: string;
}

interface PricePoint {
  time: string;
  price: number;
  description?: string;
}

interface Stats {
  totalVolume: number;
  activeTraders: number;
  energyPrice: number;
  priceChange: string;
}

const EnerlectraDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalVolume: 2500000,
    activeTraders: 1234,
    energyPrice: 0.12,
    priceChange: '+5.2%'
  });
  
  const [priceData, setPriceData] = useState<PricePoint[]>([
    { time: '09:00', price: 0.11 },
    { time: '10:00', price: 0.12 },
    { time: '11:00', price: 0.13 },
    { time: '12:00', price: 0.12 },
    { time: '13:00', price: 0.14 }
  ]);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const [listings, setListings] = useState<EnergyListing[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const { user, isAuthenticated, logout } = useAuth();
  const { isConnected: wsConnected } = useSocket();

  // Simulate loading progress
  useEffect(() => {
    const timer = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsLoading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    return () => clearInterval(timer);
  }, []);

  // Test backend connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          const healthData = await response.json();
          console.log('✅ Backend connected:', healthData);
          setConnectionStatus('connected');
          fetchMarketData();
        } else {
          console.log('❌ Backend error:', response.status);
          setConnectionStatus('error');
        }
      } catch (error) {
        console.error('❌ Connection failed:', error);
        setConnectionStatus('offline');
      }
    };

    if (!isLoading) {
      testConnection();
    }
  }, [isLoading]);

  // WebSocket event listeners for real-time updates
  useEffect(() => {
    const handleTradeCompleted = (event: CustomEvent) => {
      const { type, amount, cost } = event.detail;
      toast.success(`${type === 'buy' ? 'Purchased' : 'Sold'} ${amount} kWh for ${cost.toFixed(2)} ZMW`, {
        duration: 5000,
        icon: '⚡',
      });
      // Refresh market data
      fetchMarketData();
    };

    const handleOfferCreated = (event: CustomEvent) => {
      const { energyAmount, pricePerKwh } = event.detail;
      toast(`New offer: ${energyAmount} kWh at ${pricePerKwh} ZMW/kWh`, {
        duration: 6000,
        icon: '💡',
        style: {
          background: '#3B82F6',
          color: '#FFFFFF',
        },
      });
    };

    const handleMarketUpdate = (event: CustomEvent) => {
      const { volume, value } = event.detail;
      toast.success(`Market update: ${volume} kWh traded for ${value.toFixed(2)} ZMW`, {
        duration: 4000,
        icon: '📊',
      });
      // Refresh market data
      fetchMarketData();
    };

    window.addEventListener('trade-completed', handleTradeCompleted as EventListener);
    window.addEventListener('offer-created', handleOfferCreated as EventListener);
    window.addEventListener('market-update', handleMarketUpdate as EventListener);

    return () => {
      window.removeEventListener('trade-completed', handleTradeCompleted as EventListener);
      window.removeEventListener('offer-created', handleOfferCreated as EventListener);
      window.removeEventListener('market-update', handleMarketUpdate as EventListener);
    };
  }, []);

  const fetchMarketData = async () => {
    try {
      const pricingRes = await apiService.getPricing();

      const pricing = pricingRes.data?.data;
      const clusterPricing: Array<{
        clusterId: string;
        location: any;
        basePrice: number;
        currentPrice: number;
        availableKWh: number;
        utilizationPercent: number;
      }> = pricing?.clusterPricing || [];

      // Map cluster pricing into listings for the UI
      const mappedListings: EnergyListing[] = clusterPricing.map((p) => ({
        id: p.clusterId,
        amount: Math.round(p.availableKWh || 0),
        pricePerKwh: p.currentPrice,
        description: `${p.location?.region || 'Unknown'} • Utilization ${p.utilizationPercent}%`
      }));

      setListings(mappedListings);

      if (clusterPricing.length > 0) {
        const totalMarketValue = clusterPricing.reduce((sum, p) => sum + (p.availableKWh * p.currentPrice), 0);
        const avgPrice = clusterPricing.reduce((sum, p) => sum + p.currentPrice, 0) / clusterPricing.length;

        const newPriceData: PricePoint[] = clusterPricing.slice(0, 6).map((p, index) => ({
          time: `${9 + index}:00`,
          price: p.currentPrice,
          description: `${p.location?.region || 'Region'} • ${p.utilizationPercent}%`
        }));

        setStats(prev => ({
          ...prev,
          totalVolume: Math.round(totalMarketValue * 100) / 100,
          energyPrice: parseFloat((pricing?.baseRate?.effectiveRate ?? avgPrice).toFixed(3)),
          activeTraders: mappedListings.length * 15
        }));

        setPriceData(newPriceData);
      }
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  const ConnectionBadge = () => {
    const badges: Record<ConnectionStatus, { color: string; text: string }> = {
      checking: { color: 'bg-yellow-100 text-yellow-800', text: 'Connecting...' },
      connected: { color: 'bg-green-100 text-green-800', text: 'Live Data' },
      offline: { color: 'bg-red-100 text-red-800', text: 'Demo Mode' },
      error: { color: 'bg-red-100 text-red-800', text: 'Backend Error' }
    };
    
    const badge = badges[connectionStatus];
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const WebSocketBadge = () => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
      wsConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      {wsConnected ? '🔌 Live Updates' : '📡 Offline'}
    </span>
  );

  // Show loading screen while initializing
  if (isLoading) {
    return <LoadingScreen progress={loadingProgress} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              {/* Logo */}
              <EnerlectraLogo size="small" animated={false} showTagline={false} />
              
              {/* Company Info */}
              <div>
                <h1 className="text-2xl font-bold text-white">Enerlectra</h1>
                <p className="text-slate-400 text-sm">The Energy Internet</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <ConnectionBadge />
              <WebSocketBadge />
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowAIInsights(!showAIInsights)}
                    className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-medium rounded-lg transition-all duration-200 flex items-center space-x-2"
                  >
                    <Brain className="w-4 h-4" />
                    <span>AI Insights</span>
                  </button>
                  <div className="flex items-center space-x-2 text-white">
                    <User className="w-4 h-4" />
                    <span className="text-sm">{user?.name || 'User'}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-all duration-200"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 flex items-center space-x-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <div className="mb-6">
            <EnerlectraLogo size="large" animated={true} showTagline={true} />
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-4">
            Welcome to The Energy Internet
          </h2>
          <p className="text-slate-300 text-lg mb-6">
            Join the future of African energy trading with blockchain-powered efficiency
          </p>
          
          {!isAuthenticated ? (
            <button 
              onClick={() => setShowLoginModal(true)}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Get Started
            </button>
          ) : (
            <div className="flex items-center justify-center space-x-4">
              <span className="text-green-400 text-lg">✅ Welcome back, {user?.name}!</span>
              <button
                onClick={() => setShowAIInsights(!showAIInsights)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200"
              >
                View AI Insights
              </button>
            </div>
          )}
        </div>

        {/* AI Insights Panel */}
        {showAIInsights && (
          <div className="mb-8">
            <AIInsightsPanel />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-green-400" />
              <span className="text-green-400 text-sm font-medium">{stats.priceChange}</span>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 text-sm">Energy Price</p>
              <p className="text-2xl font-bold text-white">${stats.energyPrice}/kWh</p>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 text-sm">Total Volume</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalVolume)}</p>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-purple-400" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 text-sm">Active Traders</p>
              <p className="text-2xl font-bold text-white">{stats.activeTraders.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-8 h-8 text-orange-400" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 text-sm">Market Status</p>
              <p className="text-2xl font-bold text-white">
                {connectionStatus === 'connected' ? 'Live' : 'Demo'}
              </p>
            </div>
          </div>
        </div>

        {/* Current Listings */}
        {connectionStatus === 'connected' && listings.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-8">
            <div className="flex items-center space-x-2 mb-6">
              <Zap className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-semibold text-white">Live Energy Listings</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {listings.map((listing) => (
                <div key={listing.id} className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-white font-medium">{listing.amount} kWh</span>
                    <span className="text-green-400 font-bold">${listing.pricePerKwh}/kWh</span>
                  </div>
                  <p className="text-slate-300 text-sm">{listing.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price Chart */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
          <div className="flex items-center space-x-2 mb-6">
            <BarChart3 className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-white">
              {connectionStatus === 'connected' ? 'Live Energy Prices' : 'Energy Price Trend'}
            </h3>
          </div>
          
          <div className="space-y-4">
            {priceData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <div className="flex-1">
                  <span className="text-slate-300">{item.time}</span>
                  {item.description && (
                    <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                  )}
                </div>
                <span className="text-white font-medium mx-4">${item.price}/kWh</span>
                <div className="w-32 bg-slate-600 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(item.price / 0.07) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-8 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2 text-slate-300">
              <p><strong>Backend URL:</strong> /api (proxied)</p>
              <p><strong>Health Check:</strong> /api/health ✅</p>
              <p><strong>Energy API:</strong> /api/pricing ✅</p>
              <p><strong>Connection:</strong> <span className={connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'}>{connectionStatus}</span></p>
              <p><strong>WebSocket:</strong> <span className={wsConnected ? 'text-green-400' : 'text-red-400'}>{wsConnected ? 'Connected' : 'Disconnected'}</span></p>
            </div>
            <div className="space-y-2 text-slate-300">
              <p><strong>Data Mode:</strong> {connectionStatus === 'connected' ? 'Live Data' : 'Demo Data'}</p>
              <p><strong>Active Listings:</strong> {listings.length}</p>
              <p><strong>Last Updated:</strong> {new Date().toLocaleTimeString()}</p>
              <p><strong>Authentication:</strong> {isAuthenticated ? '🟢 Logged In' : '🔴 Guest'}</p>
              <p><strong>Status:</strong> {connectionStatus === 'connected' ? '🟢 Online' : '🔴 Offline'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Login Modal */}
      <EnhancedLoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
};

export default EnerlectraDashboard;