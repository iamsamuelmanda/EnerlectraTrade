import React, { useState } from 'react'
import { X, Zap, DollarSign, Clock, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { apiService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import LoadingSpinner from './LoadingSpinner'

interface CreateTradeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface TradeFormData {
  tradeType: 'peer_to_peer' | 'cluster_to_user' | 'user_to_cluster'
  energyAmount: number
  pricePerKwh: number
  duration: number // hours
  targetUserId?: string
  targetClusterId?: string
  description?: string
}

const CreateTradeModal: React.FC<CreateTradeModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<TradeFormData>()

  const tradeType = watch('tradeType')
  const energyAmount = watch('energyAmount', 0)
  const pricePerKwh = watch('pricePerKwh', 1.2)

  const totalPrice = energyAmount * pricePerKwh

  const tradeTypes = [
    {
      value: 'peer_to_peer',
      label: 'Peer to Peer',
      description: 'Trade directly with another community member',
      icon: Users
    },
    {
      value: 'cluster_to_user',
      label: 'Sell to Cluster',
      description: 'Sell your surplus energy to a cluster',
      icon: Zap
    },
    {
      value: 'user_to_cluster',
      label: 'Buy from Cluster',
      description: 'Purchase energy from a cluster',
      icon: Zap
    }
  ]

  const onSubmit = async (data: TradeFormData) => {
    if (!user) {
      toast.error('You must be logged in to create a trade')
      return
    }

    // Validate user has enough energy to sell
    if ((data.tradeType === 'peer_to_peer' || data.tradeType === 'cluster_to_user') && 
        user.walletBalance.kwh < data.energyAmount) {
      toast.error('Insufficient energy balance')
      return
    }

    // Validate user has enough money to buy
    if (data.tradeType === 'user_to_cluster' && 
        user.walletBalance.zmw < totalPrice) {
      toast.error('Insufficient ZMW balance')
      return
    }

    setIsSubmitting(true)
    try {
      const tradeData = {
        fromUserId: user.id,
        toUserId: data.targetUserId || undefined,
        energyAmount: data.energyAmount,
        pricePerKwh: data.pricePerKwh,
        tradeType: data.tradeType,
        expiresIn: data.duration * 3600, // Convert hours to seconds
        description: data.description
      }

      const response = await apiService.createTrade(tradeData)
      
      if (response.data.success) {
        toast.success('Trade offer created successfully!')
        reset()
        onSuccess()
      } else {
        toast.error(response.data.message || 'Failed to create trade offer')
      }
    } catch (error: any) {
      console.error('Error creating trade:', error)
      toast.error(error.response?.data?.message || 'Failed to create trade offer')
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
            Create Trade Offer
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
          {/* User Balance Display */}
          {user && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                Your Current Balance
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-800 dark:text-blue-300">Energy Balance</p>
                  <p className="text-lg font-semibold text-blue-900 dark:text-blue-200">
                    {user.walletBalance.kwh.toFixed(1)} kWh
                  </p>
                </div>
                <div>
                  <p className="text-blue-800 dark:text-blue-300">ZMW Balance</p>
                  <p className="text-lg font-semibold text-blue-900 dark:text-blue-200">
                    {user.walletBalance.zmw.toLocaleString()} ZMW
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Trade Type */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Trade Type
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {tradeTypes.map((type) => {
                const Icon = type.icon
                return (
                  <label
                    key={type.value}
                    className={`relative flex items-center p-4 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      tradeType === type.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      {...register('tradeType', { required: 'Trade type is required' })}
                      value={type.value}
                      className="sr-only"
                    />
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        tradeType === type.value
                          ? 'bg-primary-100 dark:bg-primary-800'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          tradeType === type.value
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-gray-500'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {type.label}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {type.description}
                        </p>
                      </div>
                    </div>
                    {tradeType === type.value && (
                      <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </div>
                    )}
                  </label>
                )
              })}
            </div>
            {errors.tradeType && (
              <p className="text-red-500 text-sm">{errors.tradeType.message}</p>
            )}
          </div>

          {/* Trade Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Trade Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Energy Amount (kWh) *
                </label>
                <div className="relative">
                  <Zap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    step="0.1"
                    {...register('energyAmount', { 
                      required: 'Energy amount is required',
                      min: { value: 0.1, message: 'Minimum 0.1 kWh' },
                      max: { value: 1000, message: 'Maximum 1000 kWh' }
                    })}
                    className="input pl-10"
                    placeholder="10.0"
                  />
                </div>
                {errors.energyAmount && (
                  <p className="text-red-500 text-sm mt-1">{errors.energyAmount.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price per kWh (ZMW) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    step="0.01"
                    {...register('pricePerKwh', { 
                      required: 'Price is required',
                      min: { value: 0.1, message: 'Minimum 0.1 ZMW' },
                      max: { value: 10, message: 'Maximum 10 ZMW' }
                    })}
                    className="input pl-10"
                    placeholder="1.20"
                  />
                </div>
                {errors.pricePerKwh && (
                  <p className="text-red-500 text-sm mt-1">{errors.pricePerKwh.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Current market rate: 1.20 ZMW/kWh
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Offer Duration (hours) *
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  {...register('duration', { required: 'Duration is required' })}
                  className="input pl-10"
                >
                  <option value="">Select duration</option>
                  <option value="1">1 hour</option>
                  <option value="6">6 hours</option>
                  <option value="12">12 hours</option>
                  <option value="24">24 hours</option>
                  <option value="72">3 days</option>
                  <option value="168">1 week</option>
                </select>
              </div>
              {errors.duration && (
                <p className="text-red-500 text-sm mt-1">{errors.duration.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="input"
                placeholder="Add any additional details about your trade offer..."
              />
            </div>
          </div>

          {/* Trade Summary */}
          {energyAmount > 0 && pricePerKwh > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Trade Summary
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Energy Amount:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {energyAmount} kWh
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Price per kWh:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {pricePerKwh} ZMW
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span className="font-medium text-gray-900 dark:text-white">Total Price:</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">
                    {totalPrice.toFixed(2)} ZMW
                  </span>
                </div>
              </div>
            </div>
          )}

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
                'Create Trade Offer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateTradeModal