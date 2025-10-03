import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, AlertCircle, RefreshCw, Settings, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface UpdateStatus {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  updateInProgress: boolean;
  lastChecked: string;
  nextCheck: string;
  updateHistory: any[];
  autoUpdateEnabled: boolean;
  updateChannel: string;
}

interface AutoUpdateIndicatorProps {
  className?: string;
}

const AutoUpdateIndicator: React.FC<AutoUpdateIndicatorProps> = ({ className = '' }) => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkUpdateStatus();
    
    // Check for updates every 5 minutes
    const interval = setInterval(checkUpdateStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const checkUpdateStatus = async () => {
    try {
      const response = await fetch('/api/auto-update/status');
      const data = await response.json();
      
      if (data.success) {
        setUpdateStatus(data.data);
        setIsVisible(data.data.updateAvailable || data.data.updateInProgress);
      }
    } catch (error) {
      console.error('Failed to check update status:', error);
    }
  };

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/auto-update/check', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        if (data.data) {
          toast.success('Update available!');
          setUpdateStatus(prev => prev ? { ...prev, updateAvailable: true, latestVersion: data.data.version } : null);
        } else {
          toast.success('You are up to date!');
        }
      } else {
        toast.error('Failed to check for updates');
      }
    } catch (error) {
      toast.error('Failed to check for updates');
    } finally {
      setIsChecking(false);
    }
  };

  const handleForceUpdate = async () => {
    try {
      const response = await fetch('/api/auto-update/force', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Update initiated!');
      } else {
        toast.error('Failed to start update');
      }
    } catch (error) {
      toast.error('Failed to start update');
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const formatLastChecked = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (!isVisible || !updateStatus) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className={`fixed top-4 left-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-sm ${className}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {updateStatus.updateInProgress ? (
              <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
            ) : updateStatus.updateAvailable ? (
              <Download className="w-5 h-5 text-orange-500" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {updateStatus.updateInProgress 
                  ? 'Update in Progress' 
                  : updateStatus.updateAvailable 
                    ? 'Update Available' 
                    : 'Up to Date'
                }
              </h3>
              
              {updateStatus.updateAvailable && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Version {updateStatus.latestVersion} is available
                </p>
              )}
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Last checked: {formatLastChecked(updateStatus.lastChecked)}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {updateStatus.updateAvailable && !updateStatus.updateInProgress && (
          <div className="mt-3 flex space-x-2">
            <button
              onClick={handleForceUpdate}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-2 rounded-md transition-colors"
            >
              Update Now
            </button>
            
            <button
              onClick={handleCheckForUpdates}
              disabled={isChecking}
              className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs px-3 py-2 rounded-md transition-colors disabled:opacity-50"
            >
              {isChecking ? (
                <RefreshCw className="w-3 h-3 animate-spin mx-auto" />
              ) : (
                'Check Again'
              )}
            </button>
          </div>
        )}
        
        {updateStatus.updateInProgress && (
          <div className="mt-3">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Installing update... Please don't close this window.
            </p>
          </div>
        )}
        
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <Settings className="w-3 h-3" />
            <span>{showDetails ? 'Hide' : 'Show'} Details</span>
          </button>
          
          {showDetails && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div>Current Version: {updateStatus.currentVersion}</div>
              <div>Latest Version: {updateStatus.latestVersion}</div>
              <div>Channel: {updateStatus.updateChannel}</div>
              <div>Auto Update: {updateStatus.autoUpdateEnabled ? 'Enabled' : 'Disabled'}</div>
              <div>Next Check: {formatLastChecked(updateStatus.nextCheck)}</div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AutoUpdateIndicator;
