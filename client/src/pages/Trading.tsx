import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Users, 
  Clock,
  Filter,
  Plus,
  Eye,
  Check,
  X,
  Activity,
  DollarSign,
  Battery
} from 'lucide-react'
import { apiService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import LoadingSpinner from '../components/LoadingSpinner'
import CreateTradeModal from '../components/CreateTradeModal'
import toast from 'react-hot-toast'

interface TradeOffer {
  id: string
  fromUserId: string
  fromUserName: string
  toUserId?: string
  energyAmount: number
  pricePerKwh: number
  totalPrice: number
  tradeType: 'peer_to_peer' | 'cluster_to_user' | 'user_to_cluster'
  status: 'pending' | 'accepted' | 'rejected' | 'completed'
  createdAt: string
  expiresAt: string
  clusterName?: string
  region?: string
}

const Trading: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'offers' | 'my-trades' | 'history'>('offers')
  const [filterType, setFilterType] = useState<'all' | 'peer_to_peer' | 'cluster_to_user' | 'user_to_cluster'>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
  const { user } = useAuth()
  const { t } = useLanguage()

  // Fetch trade offers
  const { data: offersData, isLoading: offersLoading, refetch: refetchOffers } = useQuery({
    queryKey: ['trade-offers'],
    queryFn: () => apiService.getTradeOffers(),
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  // Fetch user's trades
  const { data: userTradesData, isLoading: userTradesLoading } = useQuery({
    queryKey: ['user-trades', user?.id],
    queryFn: () => user ? apiService.getTradeOffers(user.id) : null,
    enabled: !!user,
  })

  // Fetch current pricing
  const { data: pricingData } = useQuery({
    queryKey: ['pricing'],
    queryFn: () => apiService.getPricing(),
  })

  const offers: TradeOffer[] = offersData?.data?.offers || []
  const userTrades: TradeOffer[] = userTradesData?.data?.offers || []

  // Filter offers
  const filteredOffers = offers.filter(offer => {
    if (filterType === 'all') return true
    return offer.tradeType === filterType
  })

  const handleAcceptTrade = async (tradeId: string) => {
    if (!user) return

    try {
      const response = await apiService.acceptTrade(tradeId, user.id)
      if (response.data.success) {
        toast.success('Trade accepted successfully!')
        refetchOffers()
      } else {
        toast.error(response.data.message || 'Failed to accept trade')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to accept trade')
    }
  }

  const currentPrice = pricingData?.data?.currentRate || 1.2

  const tradingStats = [
    {
      name: 'Current Rate',
      value: `${currentPrice} ZMW/kWh`,
      icon: TrendingUp,
      color: 'text-green-600',
      change: '+5%'
    },
    {
      name: 'Active Offers',
      value: offers.length,
      icon: Activity,
      color: 'text-blue-600',
      change: `${offers.length} available`
    },
    {
      name: 'Your Balance',
      value: `${user?.walletBalance.kwh.toFixed(1) || 0} kWh`,
      icon: Battery,
      color: 'text-yellow-600',
      change: `${user?.walletBalance.zmw.toLocaleString() || 0} ZMW`
    },
    {
      name: 'Today\'s Volume',
      value: '1,250 kWh',
      icon: Zap,
      color: 'text-purple-600',
      change: '+12%'
    }
  ]

  const getTradeTypeColor = (type: string) => {
    const colors = {
      peer_to_peer: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      cluster_to_user: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      user_to_cluster: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      accepted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const isLoading = offersLoading || userTradesLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('trading.title')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Trade energy with community members and clusters
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Trade Offer
          </button>
        </div>
      </div>

      {/* Trading Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tradingStats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {stat.name}
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                  <p className={`text-xs ${stat.color} mt-1`}>
                    {stat.change}
                  </p>
                </div>
                <div className={`w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'offers', name: 'Available Offers', count: offers.length },
            { id: 'my-trades', name: 'My Trades', count: userTrades.length },
            { id: 'history', name: 'Trade History', count: 0 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              {tab.name}
              {tab.count > 0 && (
                <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="input w-auto"
        >
          <option value="all">All Types</option>
          <option value="peer_to_peer">Peer to Peer</option>
          <option value="cluster_to_user">Cluster to User</option>
          <option value="user_to_cluster">User to Cluster</option>
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'offers' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredOffers.map((offer) => (
                <div key={offer.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {offer.energyAmount} kWh Available
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        From {offer.fromUserName} • {offer.region}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTradeTypeColor(offer.tradeType)}`}>
                        {offer.tradeType.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(offer.status)}`}>
                        {offer.status}
                      </span>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Price per kWh</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {offer.pricePerKwh} ZMW
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Total Price</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {offer.totalPrice.toLocaleString()} ZMW
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>Expires {new Date(offer.expiresAt).toLocaleDateString()}</span>
                    </div>
                    {offer.clusterName && (
                      <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>{offer.clusterName}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button className="flex-1 btn-outline">
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </button>
                    {offer.fromUserId !== user?.id && offer.status === 'pending' && (
                      <button
                        onClick={() => handleAcceptTrade(offer.id)}
                        className="flex-1 btn-primary"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Accept Trade
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'my-trades' && (
            <div className="space-y-4">
              {userTrades.map((trade) => (
                <div key={trade.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        trade.tradeType === 'peer_to_peer' ? 'bg-blue-100 dark:bg-blue-900' :
                        trade.tradeType === 'cluster_to_user' ? 'bg-green-100 dark:bg-green-900' :
                        'bg-purple-100 dark:bg-purple-900'
                      }`}>
                        <Zap className={`w-6 h-6 ${
                          trade.tradeType === 'peer_to_peer' ? 'text-blue-600 dark:text-blue-400' :
                          trade.tradeType === 'cluster_to_user' ? 'text-green-600 dark:text-green-400' :
                          'text-purple-600 dark:text-purple-400'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {trade.energyAmount} kWh • {trade.pricePerKwh} ZMW/kWh
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {trade.tradeType.replace('_', ' ')} • Created {new Date(trade.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {trade.totalPrice.toLocaleString()} ZMW
                      </p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trade.status)}`}>
                        {trade.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Trade History Coming Soon
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Detailed trade history and analytics will be available here.
              </p>
            </div>
          )}

          {/* Empty States */}
          {activeTab === 'offers' && filteredOffers.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No trade offers available
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Be the first to create a trade offer in your area.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Trade Offer
              </button>
            </div>
          )}

          {activeTab === 'my-trades' && userTrades.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No trades yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Start trading energy to see your transactions here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create Trade Modal */}
      <CreateTradeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false)
          refetchOffers()
        }}
      />
    </div>
  )
}

export default Trading