import React from 'react';
import { Wifi, WifiOff, Sync, AlertCircle, CheckCircle } from 'lucide-react';
import { useOffline } from '../hooks/useOffline';
import { motion, AnimatePresence } from 'framer-motion';

const OfflineIndicator: React.FC = () => {
  const { isOnline, syncStatus, forceSync } = useOffline();

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (syncStatus.syncInProgress) return 'bg-yellow-500';
    if (syncStatus.pendingActions > 0) return 'bg-orange-500';
    if (syncStatus.lastError) return 'bg-red-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncStatus.syncInProgress) return 'Syncing...';
    if (syncStatus.pendingActions > 0) return `${syncStatus.pendingActions} pending`;
    if (syncStatus.lastError) return 'Sync failed';
    return 'Online';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    if (syncStatus.syncInProgress) return <Sync className="w-4 h-4 animate-spin" />;
    if (syncStatus.pendingActions > 0) return <AlertCircle className="w-4 h-4" />;
    if (syncStatus.lastError) return <AlertCircle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const formatLastSync = (timestamp: string) => {
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-medium shadow-lg ${getStatusColor()}`}
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
        
        {isOnline && (
          <div className="flex items-center gap-2 ml-2">
            <span className="text-xs opacity-75">
              Last sync: {formatLastSync(syncStatus.lastSync)}
            </span>
            
            {(syncStatus.pendingActions > 0 || syncStatus.lastError) && (
              <button
                onClick={forceSync}
                className="p-1 rounded hover:bg-white/20 transition-colors"
                title="Force sync"
              >
                <Sync className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
        
        {syncStatus.lastError && (
          <div className="ml-2 text-xs opacity-75" title={syncStatus.lastError}>
            Error
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default OfflineIndicator;
