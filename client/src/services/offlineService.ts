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
      if (stored) return JSON.parse(stored);
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
      if (stored) return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
    return {
      isOnline: true, // Always “online” for MVP testing
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
    // Auto-sync simulation
    this.startSync();
  }

  private startSync(): void {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => this.performSync(), this.SYNC_INTERVAL);
    this.performSync(); // immediate sync
  }

  private stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private async performSync(): Promise<void> {
    if (this.syncStatus.syncInProgress) return;

    this.syncStatus.syncInProgress = true;
    this.saveSyncStatus();

    try {
      await this.syncPendingActions();
      await this.syncLocalData();
      this.syncStatus.lastSync = new Date().toISOString();
      this.syncStatus.lastError = undefined;
      console.log('✅ Stub sync completed');
    } catch (error: any) {
      this.syncStatus.lastError = error.message;
      console.error('❌ Stub sync failed:', error);
    } finally {
      this.syncStatus.syncInProgress = false;
      this.saveSyncStatus();
    }
  }

  private async syncPendingActions(): Promise<void> {
    const pendingActions = this.offlineData.offlineActions.filter(
      action => action.status === 'pending'
    );

    for (const action of pendingActions) {
      // Stub execution: mark as synced immediately
      await new Promise(resolve => setTimeout(resolve, 50));
      action.status = 'synced';
      action.lastAttempt = new Date().toISOString();
      console.log(`🟢 Offline action stub synced: ${action.type} (${action.id})`);
    }

    this.saveOfflineData();
  }

  private async syncLocalData(): Promise<void> {
    // Stub: no server calls, just increment version
    await new Promise(resolve => setTimeout(resolve, 50));
    this.offlineData.syncVersion++;
    console.log('📄 Stub syncLocalData complete');
    this.saveOfflineData();
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

    // Immediate stub sync
    this.performSync();

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
    if (index >= 0) this.offlineData.users[index] = user;
    else this.offlineData.users.push(user);
    this.saveOfflineData();
  }

  public addTransaction(transaction: Transaction): void {
    this.offlineData.transactions.push(transaction);
    this.saveOfflineData();
  }

  public updateCluster(cluster: Cluster): void {
    const index = this.offlineData.clusters.findIndex(c => c.id === cluster.id);
    if (index >= 0) this.offlineData.clusters[index] = cluster;
    else this.offlineData.clusters.push(cluster);
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
    return true; // always online for stub
  }

  public getPendingActionsCount(): number {
    return this.offlineData.offlineActions.filter(a => a.status === 'pending').length;
  }
}

export default OfflineService;
