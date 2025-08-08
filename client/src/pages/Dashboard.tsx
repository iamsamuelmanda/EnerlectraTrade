import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Zap, 
  TrendingUp, 
  Users, 
  Leaf, 
  Battery, 
  Sun,
  Wind,
  Droplets,
  ArrowUp,
  ArrowDown,
  Activity
} from 'lucide-react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { Pie, Bar } from 'react-chartjs-2'
import { apiService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import EnergyMap from '../components/EnergyMap'
import LoadingSpinner from '../components/LoadingSpinner'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

const Dashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuth()
  const { t } = useLanguage()

  // Fetch market statistics
  const { data: marketData, isLoading: marketLoading } = useQuery({
    queryKey: ['market-stats'],
    queryFn: () => apiService.getMarketStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // Fetch user's carbon footprint
  const { data: carbonData, isLoading: carbonLoading } = useQuery({
    queryKey: ['carbon-footprint', user?.id],
    queryFn: () => user ? apiService.getCarbonFootprint(user.id) : null,
    enabled: !!user,
  })

  // Fetch user's transactions
  const { data: transactionData, isLoading: transactionLoading } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: () => user ? apiService.getTransactions(user.id) : null,
    enabled: !!user,
  })

  // Fetch clusters data
  const { data: clustersData, isLoading: clustersLoading } = useQuery({
    queryKey: ['clusters'],
    queryFn: () => apiService.getClusters(),
    refetchInterval: 60000, // Refresh every minute
  })

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('dashboard.welcome')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Join the future of African energy trading
          </p>
          <button className="btn-primary">
            Get Started
          </button>
        </div>
      </div>
    )
  }

  const stats = [
    {
      name: t('dashboard.total_generated'),
      value: marketData?.data?.totalEnergyGenerated || 0,
      unit: 'kWh',
      icon: Sun,
      color: 'energy-solar',
      change: '+12%',
      changeType: 'positive'
    },
    {
      name: t('dashboard.total_consumed'),
      value: marketData?.data?.totalEnergyConsumed || 0,
      unit: 'kWh',
      icon: Zap,
      color: 'primary-600',
      change: '+8%',
      changeType: 'positive'
    },
    {
      name: t('dashboard.total_traded'),
      value: marketData?.data?.totalEnergyTraded || 0,
      unit: 'kWh',
      icon: TrendingUp,
      color: 'energy-wind',
      change: '+25%',
      changeType: 'positive'
    },
    {
      name: t('dashboard.carbon_saved'),
      value: carbonData?.data?.totalCarbonSaved || user.carbonSavings || 0,
      unit: 'kg CO₂',
      icon: Leaf,
      color: 'energy-wind',
      change: '+15%',
      changeType: 'positive'
    },
  ]

  // Energy mix chart data
  const energyMixData = {
    labels: ['Solar', 'Wind', 'Hydro', 'Battery Storage'],
    datasets: [
      {
        data: [45, 25, 20, 10],
        backgroundColor: [
          '#f59e0b', // Solar
          '#10b981', // Wind
          '#3b82f6', // Hydro
          '#8b5cf6', // Battery
        ],
        borderWidth: 0,
      },
    ],
  }

  // Trading volume chart data
  const tradingVolumeData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Energy Traded (kWh)',
        data: [120, 190, 300, 500, 200, 300, 450],
        backgroundColor: 'rgba(14, 165, 233, 0.8)',
        borderColor: 'rgba(14, 165, 233, 1)',
        borderWidth: 1,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="gradient-bg rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              {t('dashboard.welcome')}, {user.name || user.phone}!
            </h1>
            <p className="text-blue-100 mb-4">
              Powering Africa's sustainable energy future through community cooperatives
            </p>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{user.clusters.length} clusters joined</span>
              </div>
              <div className="flex items-center space-x-1">
                <Activity className="w-4 h-4" />
                <span>Active in {user.region}</span>
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center float">
              <Zap className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.name}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      {stat.unit}
                    </span>
                  </p>
                  <div className={`flex items-center mt-1 text-sm ${
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.changeType === 'positive' ? (
                      <ArrowUp className="w-3 h-3 mr-1" />
                    ) : (
                      <ArrowDown className="w-3 h-3 mr-1" />
                    )}
                    <span>{stat.change}</span>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 text-${stat.color}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Energy Mix Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Energy Mix
            </h3>
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <Battery className="w-4 h-4" />
              <span>Real-time</span>
            </div>
          </div>
          <div className="h-64">
            {!marketLoading ? (
              <Pie data={energyMixData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <LoadingSpinner />
              </div>
            )}
          </div>
        </div>

        {/* Trading Volume Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Weekly Trading Volume
            </h3>
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <TrendingUp className="w-4 h-4" />
              <span>This week</span>
            </div>
          </div>
          <div className="h-64">
            <Bar data={tradingVolumeData} options={chartOptions} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button className="w-full btn-primary">
              <TrendingUp className="w-4 h-4 mr-2" />
              Start Trading
            </button>
            <button className="w-full btn-outline">
              <Users className="w-4 h-4 mr-2" />
              Join Cluster
            </button>
            <button className="w-full btn-outline">
              <Sun className="w-4 h-4 mr-2" />
              Buy Solar Equipment
            </button>
            <button className="w-full btn-outline">
              <Leaf className="w-4 h-4 mr-2" />
              View Carbon Impact
            </button>
          </div>
        </div>
      </div>

      {/* Energy Map and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Energy Map */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Cluster Locations
            </h3>
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <span>{clustersData?.data?.total || 0} active clusters</span>
            </div>
          </div>
          <div className="h-64 rounded-lg overflow-hidden">
            <EnergyMap clusters={clustersData?.data?.clusters || []} />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            {transactionLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Mock recent activities - replace with real data */}
                <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-8 h-8 bg-energy-solar/20 rounded-full flex items-center justify-center">
                    <Sun className="w-4 h-4 text-energy-solar" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Energy purchased from Kabwe Solar Cooperative
                    </p>
                    <p className="text-xs text-gray-500">2 hours ago • 15 kWh</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-8 h-8 bg-energy-wind/20 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-energy-wind" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Sold surplus energy to grid
                    </p>
                    <p className="text-xs text-gray-500">5 hours ago • 8 kWh</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Joined Copperbelt Mining Cluster
                    </p>
                    <p className="text-xs text-gray-500">1 day ago • 3,000 ZMW contribution</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard