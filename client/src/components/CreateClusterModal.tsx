import React, { useState } from 'react'
import { X, MapPin, Users, DollarSign } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { apiService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import LoadingSpinner from './LoadingSpinner'

interface CreateClusterModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ClusterFormData {
  name: string
  type: 'micro' | 'neighborhood' | 'industrial' | 'supply'
  region: string
  address: string
  targetMembers: number
  initialFunding: number
  description: string
}

const CreateClusterModal: React.FC<CreateClusterModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClusterFormData>()

  const zambianRegions = [
    'Central Province',
    'Copperbelt Province', 
    'Eastern Province',
    'Luapula Province',
    'Lusaka Province',
    'Muchinga Province',
    'Northern Province',
    'North-Western Province',
    'Southern Province',
    'Western Province'
  ]

  const clusterTypes = [
    {
      value: 'micro',
      label: 'Micro Cluster',
      description: '10-25 households sharing 1 solar installation',
      minMembers: 10,
      maxMembers: 25,
      minFunding: 2000
    },
    {
      value: 'neighborhood',
      label: 'Neighborhood Cluster',
      description: '50-100 prosumers with distributed solar panels',
      minMembers: 50,
      maxMembers: 100,
      minFunding: 5000
    },
    {
      value: 'industrial',
      label: 'Industrial Cluster',
      description: '1-2 independent power producers',
      minMembers: 1,
      maxMembers: 2,
      minFunding: 15000
    },
    {
      value: 'supply',
      label: 'Supply Cluster',
      description: '2-3 solar equipment suppliers',
      minMembers: 2,
      maxMembers: 3,
      minFunding: 10000
    }
  ]

  const onSubmit = async (data: ClusterFormData) => {
    if (!user) {
      toast.error('You must be logged in to create a cluster')
      return
    }

    setIsSubmitting(true)
    try {
      const clusterData = {
        name: data.name,
        type: data.type,
        location: {
          region: data.region,
          address: data.address,
        },
        targetMembers: data.targetMembers,
        initialFunding: data.initialFunding,
        founderId: user.id,
        description: data.description
      }

      const response = await apiService.createCluster(clusterData)
      
      if (response.data.success) {
        toast.success('Cluster created successfully!')
        reset()
        onSuccess()
      } else {
        toast.error(response.data.message || 'Failed to create cluster')
      }
    } catch (error: any) {
      console.error('Error creating cluster:', error)
      toast.error(error.response?.data?.message || 'Failed to create cluster')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Create Energy Cluster
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Basic Information
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cluster Name *
              </label>
              <input
                type="text"
                {...register('name', { required: 'Cluster name is required' })}
                className="input"
                placeholder="e.g., Kabwe Solar Cooperative"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cluster Type *
              </label>
              <select
                {...register('type', { required: 'Cluster type is required' })}
                className="input"
              >
                <option value="">Select cluster type</option>
                {clusterTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
              {errors.type && (
                <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="input"
                placeholder="Describe your cluster's goals and vision..."
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Location
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Region *
              </label>
              <select
                {...register('region', { required: 'Region is required' })}
                className="input"
              >
                <option value="">Select region</option>
                {zambianRegions.map(region => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
              {errors.region && (
                <p className="text-red-500 text-sm mt-1">{errors.region.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Address
              </label>
              <input
                type="text"
                {...register('address')}
                className="input"
                placeholder="Specific address or area"
              />
            </div>
          </div>

          {/* Cluster Setup */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Cluster Setup
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Members *
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    {...register('targetMembers', { 
                      required: 'Target members is required',
                      min: { value: 1, message: 'Must have at least 1 member' },
                      max: { value: 100, message: 'Cannot exceed 100 members' }
                    })}
                    className="input pl-10"
                    placeholder="10"
                  />
                </div>
                {errors.targetMembers && (
                  <p className="text-red-500 text-sm mt-1">{errors.targetMembers.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Initial Funding (ZMW) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    {...register('initialFunding', { 
                      required: 'Initial funding is required',
                      min: { value: 1000, message: 'Minimum funding is 1,000 ZMW' }
                    })}
                    className="input pl-10"
                    placeholder="5000"
                  />
                </div>
                {errors.initialFunding && (
                  <p className="text-red-500 text-sm mt-1">{errors.initialFunding.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Guidelines */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
              Cluster Guidelines
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Members contribute funds for shared solar equipment</li>
              <li>• Democratic governance with voting on major decisions</li>
              <li>• Energy sharing based on contribution and usage patterns</li>
              <li>• Equipment costs range from 22,000-45,000 ZMW</li>
              <li>• Regular maintenance and member meetings required</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-outline"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                'Create Cluster'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateClusterModal