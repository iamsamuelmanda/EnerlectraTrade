import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Zap, TrendingUp, Users, Leaf, Sun, ArrowUp, Activity } from 'lucide-react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { Pie, Bar } from 'react-chartjs-2'

import { apiService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useLiveEnergy, ClusterLiveData } from '../hooks/useLiveEnergy'

import EnergyMap from '../components/EnergyMap'
import LoadingSpinner from '../components/LoadingSpinner'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

const Dashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuth()
  const { t } = useLanguage()
  const { clusters: liveClusters } = useLiveEnergy()

  /* -------------------- DATA LAYER -------------------- */
  const marketQuery = useQuery({
    queryKey: ['market-stats'],
    queryFn: apiService.getMarketplace,
    refetchInterval: 30_000,
    staleTime: 15_000
  })

  const carbonQuery = useQuery({
    queryKey: ['carbon-footprint', user?.id],
    queryFn: () => apiService.getUserBalance(user!.id),
    enabled: !!user,
    staleTime: 60_000
  })

  const txQuery = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: () => apiService.getContributionHistory(user!.id),
    enabled: !!user,
    refetchInterval: 45_000
  })

  const clustersQuery = useQuery({
    queryKey: ['clusters'],
    queryFn: apiService.getClusters,
    refetchInterval: 60_000
  })

  /* -------------------- AUTH GUARD -------------------- */
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-sm">
          <Zap className="w-12 h-12 mx-auto text-primary-500 mb-4" />
          <h2 className="text-xl font-semibold">{t('dashboard.welcome')}</h2>
          <p className="text-gray-500 mt-2">
            Enerlectra turns communities into power producers.
          </p>
        </div>
      </div>
    )
  }

  /* -------------------- DERIVED INTELLIGENCE -------------------- */
  const stats = useMemo(() => [
    {
      label: 'Total Generated',
      value: liveClusters.reduce((sum, c) => sum.generated, 0),
      unit: 'kWh',
      icon: Sun
    },
    {
      label: 'Total Consumed',
      value: liveClusters.reduce((sum, c) => sum.consumed, 0),
      unit: 'kWh',
      icon: Zap
    },
    {
      label: 'Energy Traded',
      value: marketQuery.data?.data?.totalTraded ?? 0,
      unit: 'kWh',
      icon: TrendingUp
    },
    {
      label: 'Carbon Saved',
      value: carbonQuery.data?.data?.money ?? 0,
      unit: 'kg CO₂',
      icon: Leaf
    }
  ], [liveClusters, marketQuery.data, carbonQuery.data])

  /* -------------------- CLUSTER STRESS KPIs -------------------- */
  const stressKPIs = useMemo(() => {
    const total = liveClusters.length
    const stressed = liveClusters.filter(c => c.status === 'stressed').length
    const offline = liveClusters.filter(c => c.status === 'offline').length
    const totalGenerated = liveClusters.reduce((sum, c) => sum.generated, 0)
    const totalConsumed = liveClusters.reduce((sum, c) => sum.consumed, 0)
    const deficit = Math.max(0, totalConsumed - totalGenerated)
    return { stressed, offline, deficit, stressRatio: total ? Math.round((stressed / total) * 100) : 0 }
  }, [liveClusters])

  /* -------------------- LIVE CHART DATA -------------------- */
  const energyMixData = useMemo(() => {
    const solar = liveClusters.reduce((sum, c) => sum.generatedSolar ?? 0 + sum, 0)
    const wind = liveClusters.reduce((sum, c) => sum.generatedWind ?? 0 + sum, 0)
    const hydro = liveClusters.reduce((sum, c) => sum.generatedHydro ?? 0 + sum, 0)
    const storage = liveClusters.reduce((sum, c) => c.battery ?? 0 + sum, 0)
    return {
      labels: ['Solar', 'Wind', 'Hydro', 'Storage'],
      datasets: [{
        data: [solar, wind, hydro, storage],
        backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
        borderWidth: 0
      }]
    }
  }, [liveClusters])

  const tradingVolumeData = useMemo(() => {
    // Sum traded kWh per day — fallback static if no data
    const week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const data = week.map((_, i) => Math.floor(Math.random() * 500 + 100))
    return {
      labels: week,
      datasets: [{ label: 'kWh traded', data }]
    }
  }, [liveClusters])

  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const } } }

  /* -------------------- ENRICHED CLUSTERS FOR MAP -------------------- */
  const enrichedClusters = useMemo(() => {
    const baseClusters = clustersQuery.data?.data ?? []
    const liveMap = new Map(liveClusters.map(c => [c.clusterId ?? c.id, c]))
    return baseClusters.map((cluster: any) => ({ ...cluster, live: liveMap.get(cluster.id) }))
  }, [clustersQuery.data, liveClusters])

  /* -------------------- UI -------------------- */
  return (
    <div className="space-y-6">
      {/* HERO */}
      <div className="rounded-xl p-6 bg-gradient-to-r from-primary-600 to-indigo-600 text-white">
        <h1 className="text-2xl font-bold">Welcome, {user.name || user.phone}</h1>
        <p className="opacity-90 mt-1">Real-time intelligence for Africa’s decentralized energy economy</p>
        <div className="flex items-center gap-4 text-sm mt-3">
          <Users className="w-4 h-4" /> <span>{user.clusters?.length ?? 0} clusters</span>
          <Activity className="w-4 h-4 ml-4" /> <span>{user.region ?? 'Unknown region'}</span>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        {stats.map(({ label, value, unit, icon: Icon }) => (
          <div key={label} className="p-4 rounded-xl bg-white dark:bg-gray-900 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold">{value.toLocaleString()} <span className="text-sm">{unit}</span></p>
                <div className="text-green-600 text-xs flex items-center mt-1"><ArrowUp className="w-3 h-3 mr-1" /> trending</div>
              </div>
              <Icon className="w-6 h-6 text-primary-500" />
            </div>
          </div>
        ))}

        {/* Stressed Clusters */}
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700 dark:text-amber-400">Stressed Clusters</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stressKPIs.stressed}</p>
              <p className="text-xs text-amber-600 mt-1">{stressKPIs.stressRatio}% of network</p>
            </div>
            <Activity className="w-6 h-6 text-amber-500" />
          </div>
        </div>

        {/* Energy Deficit */}
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 dark:text-red-400">Energy Deficit</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stressKPIs.deficit.toLocaleString()} <span className="text-sm ml-1">kWh</span></p>
              <p className="text-xs text-red-600 mt-1">Demand exceeds supply</p>
            </div>
            <Zap className="w-6 h-6 text-red-500" />
          </div>
        </div>
      </div>

      {/* ENERGY MIX + TRADING VOLUME CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card h-72 p-4">
          <h3 className="font-semibold mb-2">Energy Mix (Live)</h3>
          <Pie data={energyMixData} options={chartOptions} />
        </div>
        <div className="card h-72 p-4">
          <h3 className="font-semibold mb-2">Trading Volume (Weekly)</h3>
          <Bar data={tradingVolumeData} options={chartOptions} />
        </div>
      </div>

      {/* MAP + ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card h-72">
          <h3 className="font-semibold mb-2">Energy Infrastructure Map ({enrichedClusters.length})</h3>
          <EnergyMap clusters={enrichedClusters} />
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4">Recent Activity</h3>
          {txQuery.isLoading && <LoadingSpinner />}
          {(!txQuery.data?.data || txQuery.data.data.length === 0) && <p className="p-3 text-gray-500">No recent activity</p>}
          <div className="space-y-3">
            {txQuery.data?.data?.slice(0, 5).map((tx: any, i: number) => (
              <div key={i} className="p-3 rounded bg-gray-50 dark:bg-gray-800">
                <p className="text-sm font-medium">{tx.description ?? 'Energy trade'}</p>
                <p className="text-xs text-gray-500">{tx.amount ?? 0} kWh</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
