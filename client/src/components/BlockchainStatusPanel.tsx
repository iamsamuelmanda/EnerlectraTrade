import React, { useState, useEffect } from 'react';
import { Zap, Smartphone, CreditCard, Shield, Activity, TrendingUp, AlertTriangle, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

interface BlockchainStatus {
  isInitialized: boolean;
  network?: string;
  blockNumber?: number;
}

interface SystemFeatures {
  hybridPayments: boolean;
  mobileMoneyIntegration: boolean;
  automaticFallback: boolean;
  realTimeSync: boolean;
}

interface BlockchainStatusData {
  blockchain: BlockchainStatus;
  features: SystemFeatures;
  message: string;
}

const BlockchainStatusPanel: React.FC = () => {
  const [status, setStatus] = useState<BlockchainStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchBlockchainStatus();
  }, []);

  const fetchBlockchainStatus = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getBlockchainStatus();
      if (response.data?.success) {
        setStatus(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch blockchain status:', error);
      toast.error('Failed to fetch blockchain status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncStatus('syncing');
      const response = await apiService.syncBlockchainData();
      if (response.data?.success) {
        setSyncStatus('success');
        setLastSync(new Date());
        toast.success('Blockchain data synced successfully');
        
        // Refresh status after sync
        setTimeout(() => {
          fetchBlockchainStatus();
        }, 1000);
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      toast.error('Failed to sync blockchain data');
    } finally {
      setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);
    }
  };

  const getStatusIcon = (isInitialized: boolean) => {
    if (isInitialized) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusColor = (isInitialized: boolean) => {
    if (isInitialized) {
      return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400';
    }
    return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-400';
  };

  const getFeatureIcon = (featureName: string) => {
    switch (featureName) {
      case 'hybridPayments':
        return <Zap className="w-4 h-4" />;
      case 'mobileMoneyIntegration':
        return <Smartphone className="w-4 h-4" />;
      case 'automaticFallback':
        return <Shield className="w-4 h-4" />;
      case 'realTimeSync':
        return <Activity className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getFeatureDescription = (featureName: string) => {
    switch (featureName) {
      case 'hybridPayments':
        return 'Automatically selects the best payment method';
      case 'mobileMoneyIntegration':
        return 'Seamless mobile money processing';
      case 'automaticFallback':
        return 'Automatic fallback to alternative methods';
      case 'realTimeSync':
        return 'Real-time blockchain synchronization';
      default:
        return 'Feature available';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600 dark:text-gray-400">Loading blockchain status...</span>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Blockchain Status Unavailable
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Unable to fetch blockchain service status
          </p>
          <button
            onClick={fetchBlockchainStatus}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Hybrid Payment System</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Blockchain-powered energy trading</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSync}
            disabled={syncStatus === 'syncing'}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            {syncStatus === 'syncing' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>Sync</span>
          </button>
          
          <button
            onClick={fetchBlockchainStatus}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Blockchain Status */}
          <div className="space-y-4">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white">System Status</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(status.blockchain.isInitialized)}
                  <span className="font-medium text-gray-900 dark:text-white">Blockchain Service</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status.blockchain.isInitialized)}`}>
                  {status.blockchain.isInitialized ? 'Operational' : 'Unavailable'}
                </span>
              </div>

              {status.blockchain.isInitialized && (
                <>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400">Network</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {status.blockchain.network || 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400">Block Number</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {status.blockchain.blockNumber?.toLocaleString() || 'Unknown'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white">Available Features</h4>
            
            <div className="space-y-3">
              {Object.entries(status.features).map(([featureName, isEnabled]) => (
                <div key={featureName} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-blue-600 dark:text-blue-400">
                      {getFeatureIcon(featureName)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white capitalize">
                        {featureName.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {getFeatureDescription(featureName)}
                      </div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isEnabled 
                      ? 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400'
                      : 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-400'
                  }`}>
                    {isEnabled ? 'Active' : 'Inactive'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Last Sync Info */}
        {lastSync && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium">Last synchronized</p>
                <p>{lastSync.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Sync Status */}
        {syncStatus !== 'idle' && (
          <div className="mt-4 p-4 rounded-lg border ${
            syncStatus === 'syncing' 
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              : syncStatus === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }">
            <div className="flex items-center space-x-3">
              {syncStatus === 'syncing' ? (
                <Loader2 className="w-5 h-5 text-yellow-600 dark:text-yellow-400 animate-spin" />
              ) : syncStatus === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
              <div className={`text-sm ${
                syncStatus === 'syncing' 
                  ? 'text-yellow-800 dark:text-yellow-200'
                  : syncStatus === 'success'
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200'
              }`}>
                <p className="font-medium">
                  {syncStatus === 'syncing' && 'Synchronizing blockchain data...'}
                  {syncStatus === 'success' && 'Synchronization completed successfully'}
                  {syncStatus === 'error' && 'Synchronization failed'}
                </p>
                {syncStatus === 'syncing' && (
                  <p>Please wait while we sync the latest data...</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Information Panel */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">How It Works</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">1</span>
                </div>
                <span className="font-medium">Smart Selection</span>
              </div>
              <p>Our system automatically analyzes your preferences and available payment methods</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">2</span>
                </div>
                <span className="font-medium">Seamless Processing</span>
              </div>
              <p>Payments are processed using the most efficient method available</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">3</span>
                </div>
                <span className="font-medium">Instant Settlement</span>
              </div>
              <p>Energy credits are immediately available after successful payment</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockchainStatusPanel; 