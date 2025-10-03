import { useState, useEffect } from 'react';
import OfflineService from '../services/offlineService';

interface UseOfflineReturn {
  isOnline: boolean;
  syncStatus: {
    isOnline: boolean;
    lastSync: string;
    pendingActions: number;
    syncInProgress: boolean;
    lastError?: string;
  };
  forceSync: () => Promise<void>;
  getPendingActionsCount: () => number;
  addOfflineAction: (type: string, data: any, userId: string) => string;
}

export const useOffline = (): UseOfflineReturn => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState(OfflineService.getInstance().getSyncStatus());

  useEffect(() => {
    const offlineService = OfflineService.getInstance();

    const updateSyncStatus = () => {
      setSyncStatus(offlineService.getSyncStatus());
    };

    const handleOnline = () => {
      setIsOnline(true);
      updateSyncStatus();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateSyncStatus();
    };

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update sync status periodically
    const interval = setInterval(updateSyncStatus, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const forceSync = async (): Promise<void> => {
    await OfflineService.getInstance().forceSync();
    setSyncStatus(OfflineService.getInstance().getSyncStatus());
  };

  const getPendingActionsCount = (): number => {
    return OfflineService.getInstance().getPendingActionsCount();
  };

  const addOfflineAction = (type: string, data: any, userId: string): string => {
    const actionId = OfflineService.getInstance().addOfflineAction(
      type as any,
      data,
      userId
    );
    setSyncStatus(OfflineService.getInstance().getSyncStatus());
    return actionId;
  };

  return {
    isOnline,
    syncStatus,
    forceSync,
    getPendingActionsCount,
    addOfflineAction
  };
};


