import { User, Transaction, Cluster } from '../types';

interface OfflineAction {
  id: string;
  type: 'trade' | 'deposit' | 'withdraw' | 'cluster_join' | 'cluster_leave' | 'profile_update';
  data: any;
  timestamp: string;
  userId: string;
  status: 'pending' | 'synced' | 'failed';
  retryCount: number;
  lastAttempt?: string;
}

interface OfflineData {
  users: User[];
  transactions: Transaction[];
  clusters: Cluster[];
  offlineActions: OfflineAction[];
  lastSync: string;
  syncVersion: number;
}

interface SyncStatus {
  isOnline: boolean;
  lastSync: string;
  pendingActions: number;
  syncInProgress: boolean;
  lastError?: string;
}

class OfflineService {
  private static instance: OfflineService;
  private offlineData: OfflineData;
  private syncStatus: SyncStatus;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly OFFLINE_DATA_KEY = 'enerlectra_offline_data';
  private readonly SYNC_STATUS_KEY = 'enerlectra_sync_status';
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly SYNC_INTERVAL = 30000; // 30 seconds

  private constructor() {
    this.offlineData = this.loadOfflineData();
    this.syncStatus = this.loadSyncStatus();
    this.initializeOfflineMode();
  }

  public static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  private loadOfflineData(): OfflineData {
    try {
      const stored = localStorage.getItem(this.OFFLINE_DATA_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }

    return {
      users: [],
      transactions: [],
      clusters: [],
      offlineActions: [],
      lastSync: new Date().toISOString(),
      syncVersion: 1
    };
  }

  private loadSyncStatus(): SyncStatus {
    try {
      const stored = localStorage.getItem(this.SYNC_STATUS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }

    return {
      isOnline: navigator.onLine,
      lastSync: new Date().toISOString(),
      pendingActions: 0,
      syncInProgress: false
    };
  }

  private saveOfflineData(): void {
    try {
      localStorage.setItem(this.OFFLINE_DATA_KEY, JSON.stringify(this.offlineData));
    } catch (error) {
      console.error('Failed to save offline data:', error);
    }
  }

  private saveSyncStatus(): void {
    try {
      localStorage.setItem(this.SYNC_STATUS_KEY, JSON.stringify(this.syncStatus));
    } catch (error) {
      console.error('Failed to save sync status:', error);
    }
  }

  private initializeOfflineMode(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.syncStatus.isOnline = true;
      this.saveSyncStatus();
      this.startSync();
      console.log('Device came online, starting sync');
    });

    window.addEventListener('offline', () => {
      this.syncStatus.isOnline = false;
      this.saveSyncStatus();
      this.stopSync();
      console.log('Device went offline, stopping sync');
    });

    // Start sync if online
    if (this.syncStatus.isOnline) {
      this.startSync();
    }
  }

  private startSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.performSync();
    }, this.SYNC_INTERVAL);

    // Perform immediate sync
    this.performSync();
  }

  private stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private async performSync(): Promise<void> {
    if (this.syncStatus.syncInProgress || !this.syncStatus.isOnline) {
      return;
    }

    this.syncStatus.syncInProgress = true;
    this.saveSyncStatus();

    try {
      // Sync pending actions
      await this.syncPendingActions();
      
      // Sync local data with server
      await this.syncLocalData();
      
      this.syncStatus.lastSync = new Date().toISOString();
      this.syncStatus.lastError = undefined;
      
      console.log('Sync completed successfully');
    } catch (error: any) {
      this.syncStatus.lastError = error.message;
      console.error('Sync failed:', error);
    } finally {
      this.syncStatus.syncInProgress = false;
      this.saveSyncStatus();
    }
  }

  private async syncPendingActions(): Promise<void> {
    const pendingActions = this.offlineData.offlineActions.filter(
      action => action.status === 'pending' && action.retryCount < this.MAX_RETRY_ATTEMPTS
    );

    for (const action of pendingActions) {
      try {
        await this.executeOfflineAction(action);
        action.status = 'synced';
        action.lastAttempt = new Date().toISOString();
      } catch (error) {
        action.retryCount++;
        action.lastAttempt = new Date().toISOString();
        
        if (action.retryCount >= this.MAX_RETRY_ATTEMPTS) {
          action.status = 'failed';
        }
        
        console.error(`Failed to sync action ${action.id}:`, error);
      }
    }

    this.saveOfflineData();
  }

  private async executeOfflineAction(action: OfflineAction): Promise<void> {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    switch (action.type) {
      case 'trade':
        await fetch(`${baseUrl}/api/trade`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        break;
        
      case 'deposit':
        await fetch(`${baseUrl}/api/wallet/deposit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        break;
        
      case 'withdraw':
        await fetch(`${baseUrl}/api/wallet/withdraw`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        break;
        
      case 'cluster_join':
        await fetch(`${baseUrl}/api/cluster/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        break;
        
      case 'profile_update':
        await fetch(`${baseUrl}/api/user/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        break;
        
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async syncLocalData(): Promise<void> {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    try {
      // Fetch latest data from server
      const [usersResponse, transactionsResponse, clustersResponse] = await Promise.all([
        fetch(`${baseUrl}/api/users`),
        fetch(`${baseUrl}/api/transactions`),
        fetch(`${baseUrl}/api/clusters`)
      ]);

      if (usersResponse.ok) {
        const serverUsers = await usersResponse.json();
        this.mergeUsers(serverUsers.data || []);
      }

      if (transactionsResponse.ok) {
        const serverTransactions = await transactionsResponse.json();
        this.mergeTransactions(serverTransactions.data || []);
      }

      if (clustersResponse.ok) {
        const serverClusters = await clustersResponse.json();
        this.mergeClusters(serverClusters.data || []);
      }

      this.offlineData.syncVersion++;
      this.saveOfflineData();
    } catch (error) {
      console.error('Failed to sync local data:', error);
      throw error;
    }
  }

  private mergeUsers(serverUsers: User[]): void {
    const localUsers = this.offlineData.users;
    const mergedUsers = [...localUsers];

    serverUsers.forEach(serverUser => {
      const localIndex = mergedUsers.findIndex(u => u.id === serverUser.id);
      if (localIndex >= 0) {
        // Merge with server data (server takes precedence)
        mergedUsers[localIndex] = { ...mergedUsers[localIndex], ...serverUser };
      } else {
        mergedUsers.push(serverUser);
      }
    });

    this.offlineData.users = mergedUsers;
  }

  private mergeTransactions(serverTransactions: Transaction[]): void {
    const localTransactions = this.offlineData.transactions;
    const mergedTransactions = [...localTransactions];

    serverTransactions.forEach(serverTransaction => {
      const localIndex = mergedTransactions.findIndex(t => t.id === serverTransaction.id);
      if (localIndex >= 0) {
        mergedTransactions[localIndex] = { ...mergedTransactions[localIndex], ...serverTransaction };
      } else {
        mergedTransactions.push(serverTransaction);
      }
    });

    this.offlineData.transactions = mergedTransactions;
  }

  private mergeClusters(serverClusters: Cluster[]): void {
    const localClusters = this.offlineData.clusters;
    const mergedClusters = [...localClusters];

    serverClusters.forEach(serverCluster => {
      const localIndex = mergedClusters.findIndex(c => c.id === serverCluster.id);
      if (localIndex >= 0) {
        mergedClusters[localIndex] = { ...mergedClusters[localIndex], ...serverCluster };
      } else {
        mergedClusters.push(serverCluster);
      }
    });

    this.offlineData.clusters = mergedClusters;
  }

  // Public methods
  public getOfflineData(): OfflineData {
    return { ...this.offlineData };
  }

  public getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  public addOfflineAction(type: OfflineAction['type'], data: any, userId: string): string {
    const action: OfflineAction = {
      id: this.generateId(),
      type,
      data,
      timestamp: new Date().toISOString(),
      userId,
      status: 'pending',
      retryCount: 0
    };

    this.offlineData.offlineActions.push(action);
    this.syncStatus.pendingActions = this.offlineData.offlineActions.filter(a => a.status === 'pending').length;
    
    this.saveOfflineData();
    this.saveSyncStatus();

    // Try immediate sync if online
    if (this.syncStatus.isOnline) {
      this.performSync();
    }

    return action.id;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  public getUsers(): User[] {
    return this.offlineData.users;
  }

  public getTransactions(): Transaction[] {
    return this.offlineData.transactions;
  }

  public getClusters(): Cluster[] {
    return this.offlineData.clusters;
  }

  public getUserById(userId: string): User | undefined {
    return this.offlineData.users.find(u => u.id === userId);
  }

  public getTransactionsByUser(userId: string): Transaction[] {
    return this.offlineData.transactions.filter(t => t.userId === userId);
  }

  public updateUser(user: User): void {
    const index = this.offlineData.users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      this.offlineData.users[index] = user;
    } else {
      this.offlineData.users.push(user);
    }
    this.saveOfflineData();
  }

  public addTransaction(transaction: Transaction): void {
    this.offlineData.transactions.push(transaction);
    this.saveOfflineData();
  }

  public updateCluster(cluster: Cluster): void {
    const index = this.offlineData.clusters.findIndex(c => c.id === cluster.id);
    if (index >= 0) {
      this.offlineData.clusters[index] = cluster;
    } else {
      this.offlineData.clusters.push(cluster);
    }
    this.saveOfflineData();
  }

  public clearOfflineData(): void {
    this.offlineData = {
      users: [],
      transactions: [],
      clusters: [],
      offlineActions: [],
      lastSync: new Date().toISOString(),
      syncVersion: 1
    };
    this.saveOfflineData();
  }

  public forceSync(): Promise<void> {
    return this.performSync();
  }

  public isOnline(): boolean {
    return this.syncStatus.isOnline;
  }

  public getPendingActionsCount(): number {
    return this.syncStatus.pendingActions;
  }
}

export default OfflineService;


