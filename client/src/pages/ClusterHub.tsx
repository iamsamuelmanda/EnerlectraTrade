import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { 
  Users, 
  Zap, 
  MapPin, 
  Plus, 
  Search,
  Filter,
  TrendingUp,
  Battery,
  Star,
  Eye,
  DollarSign,
  Activity
} from 'lucide-react'
import { apiService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import LoadingSpinner from '../components/LoadingSpinner'
import CreateClusterModal from '../components/CreateClusterModal'

interface Cluster {
  id: string
  name: string
  type: 'micro' | 'neighborhood' | 'industrial' | 'supply'
  location: {
    region: string
    gps?: [number, number]
    address?: string
  }
  memberCount: number
  energyCapacity: number
  pooledFunds: number
  status: 'forming' | 'active' | 'full'
  reputation: number
}

const ClusterHub: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedRegion, setSelectedRegion] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
  const { user } = useAuth()
  const { t } = useLanguage()

  // Fetch all clusters
  const { data: clustersData, isLoading, refetch } = useQuery({
    queryKey: ['clusters'],
    queryFn: () => apiService.getClusters(),
  })

  // Get user's clusters
  const { data: userClustersData } = useQuery({
    queryKey: ['user-clusters', user?.id],
    queryFn: () => user ? apiService.getUser(user.id) : null,
    enabled: !!user,
  })

  const clusters: Cluster[] = clustersData?.data?.clusters || []
  const userClusterIds = user?.clusters || []

  // Filter clusters
  const filteredClusters = clusters.filter(cluster => {
    const matchesSearch = cluster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cluster.location.region.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === 'all' || cluster.type === selectedType
    const matchesRegion = selectedRegion === 'all' || cluster.location.region === selectedRegion
    
    return matchesSearch && matchesType && matchesRegion
  })

  // Get unique regions
  const regions = Array.from(new Set(clusters.map(c => c.location.region)))

  const clusterTypes = [
    { value: 'micro', label: 'Micro Clusters', description: '10-25 households' },
    { value: 'neighborhood', label: 'Neighborhood', description: '50-100 prosumers' },
    { value: 'industrial', label: 'Industrial', description: '1-2 power producers' },
    { value: 'supply', label: 'Supply', description: '2-3 equipment suppliers' },
  ]

  const getClusterTypeColor = (type: string) => {
    const colors = {
      micro: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      neighborhood: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      industrial: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      supply: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusColor = (status: string) => {
    const colors = {
      forming: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      full: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('clusters.title')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Join energy cooperatives and build sustainable communities
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('clusters.create')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Clusters</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{clusters.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Your Clusters</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{userClusterIds.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
              <Battery className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Capacity</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {clusters.reduce((sum, c) => sum + c.energyCapacity, 0).toLocaleString()} kWh
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pooled Funds</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {clusters.reduce((sum, c) => sum + c.pooledFunds, 0).toLocaleString()} ZMW
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search clusters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="input"
            >
              <option value="all">All Types</option>
              {clusterTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Region Filter */}
          <div>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="input"
            >
              <option value="all">All Regions</option>
              {regions.map(region => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          <div>
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedType('all')
                setSelectedRegion('all')
              }}
              className="btn-outline w-full"
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Cluster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClusters.map((cluster) => {
          const isUserMember = userClusterIds.includes(cluster.id)
          
          return (
            <div
              key={cluster.id}
              className="cluster-card"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {cluster.name}
                  </h3>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <MapPin className="w-3 h-3 mr-1" />
                    {cluster.location.region}
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getClusterTypeColor(cluster.type)}`}>
                    {cluster.type}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(cluster.status)}`}>
                    {cluster.status}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Members</p>
                  <p className="font-semibold text-gray-900 dark:text-white flex items-center">
                    <Users className="w-3 h-3 mr-1" />
                    {cluster.memberCount}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Capacity</p>
                  <p className="font-semibold text-gray-900 dark:text-white flex items-center">
                    <Battery className="w-3 h-3 mr-1" />
                    {cluster.energyCapacity} kWh
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Pooled Funds</p>
                  <p className="font-semibold text-gray-900 dark:text-white flex items-center">
                    <DollarSign className="w-3 h-3 mr-1" />
                    {cluster.pooledFunds.toLocaleString()} ZMW
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Reputation</p>
                  <p className="font-semibold text-gray-900 dark:text-white flex items-center">
                    <Star className="w-3 h-3 mr-1" />
                    {cluster.reputation}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <Link
                  to={`/clusters/${cluster.id}`}
                  className="flex-1 btn-outline text-center"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </Link>
                
                {!isUserMember && cluster.status !== 'full' && (
                  <button className="flex-1 btn-primary">
                    <Plus className="w-4 h-4 mr-1" />
                    {t('clusters.join')}
                  </button>
                )}
                
                {isUserMember && (
                  <div className="flex-1 flex items-center justify-center px-3 py-2 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-md text-sm font-medium">
                    <Activity className="w-4 h-4 mr-1" />
                    Member
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredClusters.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No clusters found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Try adjusting your filters or create a new cluster to get started.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Cluster
          </button>
        </div>
      )}

      {/* Create Cluster Modal */}
      <CreateClusterModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false)
          refetch()
        }}
      />
    </div>
  )
}

export default ClusterHub