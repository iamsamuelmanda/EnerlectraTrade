import { readJsonFile, writeJsonFile, generateId } from '../utils/common';
import logger from '../utils/logger';
import axios from 'axios';

interface UserActivity {
  id: string;
  userId: string;
  sessionId: string;
  activity: string;
  category: 'navigation' | 'trading' | 'payment' | 'ai_interaction' | 'ussd' | 'mobile_money' | 'energy_usage' | 'carbon_tracking';
  details: any;
  timestamp: string;
  deviceInfo: {
    userAgent: string;
    platform: string;
    language: string;
    timezone: string;
  };
  location?: {
    country: string;
    region: string;
    city: string;
    coordinates?: [number, number];
  };
  metadata?: any;
}

interface EnergyUsageData {
  id: string;
  userId: string;
  timestamp: string;
  energyConsumed: number; // kWh
  energyGenerated?: number; // kWh
  energyTraded: number; // kWh
  carbonSaved: number; // kg CO2
  cost: number; // ZMW
  source: 'solar' | 'grid' | 'trading' | 'cluster';
  location: {
    region: string;
    coordinates?: [number, number];
  };
  weather?: {
    temperature: number;
    humidity: number;
    solarIrradiance: number;
  };
  efficiency: number; // percentage
}

interface TradingBehavior {
  id: string;
  userId: string;
  timestamp: string;
  action: 'buy' | 'sell' | 'offer' | 'bid' | 'cancel';
  amount: number;
  price: number;
  currency: string;
  marketConditions: {
    demand: 'low' | 'medium' | 'high';
    supply: 'low' | 'medium' | 'high';
    priceVolatility: number;
    timeOfDay: string;
    dayOfWeek: string;
  };
  success: boolean;
  duration: number; // seconds
  retryCount: number;
  paymentMethod: string;
  clusterId?: string;
}

interface AIIntraction {
  id: string;
  userId: string;
  timestamp: string;
  query: string;
  category: 'energy_advice' | 'market_insights' | 'usage_tips' | 'carbon_tracking' | 'trading_strategy' | 'general';
  response: string;
  satisfaction?: number; // 1-5 rating
  followUpActions: string[];
  context: {
    userBalance: number;
    recentTransactions: number;
    energyUsage: number;
    carbonSaved: number;
  };
  model: string;
  tokensUsed: number;
  responseTime: number; // milliseconds
}

interface USSDUsage {
  id: string;
  userId: string;
  phoneNumber: string;
  timestamp: string;
  menuPath: string;
  action: string;
  success: boolean;
  duration: number; // seconds
  errorMessage?: string;
  deviceType: 'feature_phone' | 'smartphone';
  network: string;
  location: {
    country: string;
    region: string;
  };
}

interface MobileMoneyUsage {
  id: string;
  userId: string;
  timestamp: string;
  provider: string;
  action: 'deposit' | 'withdraw' | 'transfer' | 'payment';
  amount: number;
  currency: string;
  success: boolean;
  fees: number;
  duration: number; // seconds
  retryCount: number;
  errorCode?: string;
  deviceInfo: {
    userAgent: string;
    platform: string;
  };
}

interface CarbonFootprint {
  id: string;
  userId: string;
  timestamp: string;
  energySource: 'renewable' | 'fossil' | 'mixed';
  energyConsumed: number; // kWh
  carbonEmitted: number; // kg CO2
  carbonSaved: number; // kg CO2
  offsetCredits: number;
  efficiency: number; // percentage
  location: {
    region: string;
    coordinates?: [number, number];
  };
  weather: {
    temperature: number;
    humidity: number;
    solarIrradiance: number;
  };
}

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalEnergyTraded: number;
  totalCarbonSaved: number;
  totalTransactions: number;
  averageTransactionValue: number;
  peakUsageHours: number[];
  popularFeatures: string[];
  userRetention: number;
  conversionRate: number;
  averageSessionDuration: number;
  errorRate: number;
  satisfactionScore: number;
}

class UsageTrackingService {
  private static instance: UsageTrackingService;
  private cloudDatabaseUrl: string;
  private batchSize: number = 100;
  private syncInterval: NodeJS.Timeout | null = null;
  private pendingData: any[] = [];

  private constructor() {
    this.cloudDatabaseUrl = process.env.CLOUD_DATABASE_URL || 'https://enerlectra-analytics.herokuapp.com';
    this.startPeriodicSync();
  }

  public static getInstance(): UsageTrackingService {
    if (!UsageTrackingService.instance) {
      UsageTrackingService.instance = new UsageTrackingService();
    }
    return UsageTrackingService.instance;
  }

  private startPeriodicSync(): void {
    // Sync every 5 minutes
    this.syncInterval = setInterval(() => {
      this.syncToCloud();
    }, 5 * 60 * 1000);
  }

  private async syncToCloud(): Promise<void> {
    if (this.pendingData.length === 0) return;

    try {
      const batch = this.pendingData.splice(0, this.batchSize);
      
      await axios.post(`${this.cloudDatabaseUrl}/api/analytics/batch`, {
        data: batch,
        timestamp: new Date().toISOString(),
        source: 'enerlectra-backend'
      });

      logger.info(`Synced ${batch.length} analytics records to cloud`);
    } catch (error) {
      logger.error('Failed to sync analytics to cloud:', error);
      // Re-add failed data to pending queue
      this.pendingData.unshift(...this.pendingData);
    }
  }

  public trackUserActivity(activity: Omit<UserActivity, 'id' | 'timestamp'>): void {
    try {
      const userActivity: UserActivity = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        ...activity
      };

      // Save locally
      const activities = readJsonFile('user_activities.json');
      activities.push(userActivity);
      writeJsonFile('user_activities.json', activities);

      // Queue for cloud sync
      this.pendingData.push({
        type: 'user_activity',
        data: userActivity
      });

      logger.info(`Tracked user activity: ${activity.activity}`);
    } catch (error) {
      logger.error('Failed to track user activity:', error);
    }
  }

  public trackEnergyUsage(usage: Omit<EnergyUsageData, 'id' | 'timestamp'>): void {
    try {
      const energyUsage: EnergyUsageData = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        ...usage
      };

      // Save locally
      const usages = readJsonFile('energy_usage.json');
      usages.push(energyUsage);
      writeJsonFile('energy_usage.json', usages);

      // Queue for cloud sync
      this.pendingData.push({
        type: 'energy_usage',
        data: energyUsage
      });

      logger.info(`Tracked energy usage: ${usage.energyConsumed} kWh`);
    } catch (error) {
      logger.error('Failed to track energy usage:', error);
    }
  }

  public trackTradingBehavior(behavior: Omit<TradingBehavior, 'id' | 'timestamp'>): void {
    try {
      const tradingBehavior: TradingBehavior = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        ...behavior
      };

      // Save locally
      const behaviors = readJsonFile('trading_behaviors.json');
      behaviors.push(tradingBehavior);
      writeJsonFile('trading_behaviors.json', behaviors);

      // Queue for cloud sync
      this.pendingData.push({
        type: 'trading_behavior',
        data: tradingBehavior
      });

      logger.info(`Tracked trading behavior: ${behavior.action} ${behavior.amount} ${behavior.currency}`);
    } catch (error) {
      logger.error('Failed to track trading behavior:', error);
    }
  }

  public trackAIIntraction(interaction: Omit<AIIntraction, 'id' | 'timestamp'>): void {
    try {
      const aiInteraction: AIIntraction = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        ...interaction
      };

      // Save locally
      const interactions = readJsonFile('ai_interactions.json');
      interactions.push(aiInteraction);
      writeJsonFile('ai_interactions.json', interactions);

      // Queue for cloud sync
      this.pendingData.push({
        type: 'ai_interaction',
        data: aiInteraction
      });

      logger.info(`Tracked AI interaction: ${interaction.category}`);
    } catch (error) {
      logger.error('Failed to track AI interaction:', error);
    }
  }

  public trackUSSDUsage(usage: Omit<USSDUsage, 'id' | 'timestamp'>): void {
    try {
      const ussdUsage: USSDUsage = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        ...usage
      };

      // Save locally
      const usages = readJsonFile('ussd_usage.json');
      usages.push(ussdUsage);
      writeJsonFile('ussd_usage.json', usages);

      // Queue for cloud sync
      this.pendingData.push({
        type: 'ussd_usage',
        data: ussdUsage
      });

      logger.info(`Tracked USSD usage: ${usage.action}`);
    } catch (error) {
      logger.error('Failed to track USSD usage:', error);
    }
  }

  public trackMobileMoneyUsage(usage: Omit<MobileMoneyUsage, 'id' | 'timestamp'>): void {
    try {
      const mobileMoneyUsage: MobileMoneyUsage = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        ...usage
      };

      // Save locally
      const usages = readJsonFile('mobile_money_usage.json');
      usages.push(mobileMoneyUsage);
      writeJsonFile('mobile_money_usage.json', usages);

      // Queue for cloud sync
      this.pendingData.push({
        type: 'mobile_money_usage',
        data: mobileMoneyUsage
      });

      logger.info(`Tracked mobile money usage: ${usage.action} ${usage.amount} ${usage.currency}`);
    } catch (error) {
      logger.error('Failed to track mobile money usage:', error);
    }
  }

  public trackCarbonFootprint(footprint: Omit<CarbonFootprint, 'id' | 'timestamp'>): void {
    try {
      const carbonFootprint: CarbonFootprint = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        ...footprint
      };

      // Save locally
      const footprints = readJsonFile('carbon_footprints.json');
      footprints.push(carbonFootprint);
      writeJsonFile('carbon_footprints.json', footprints);

      // Queue for cloud sync
      this.pendingData.push({
        type: 'carbon_footprint',
        data: carbonFootprint
      });

      logger.info(`Tracked carbon footprint: ${footprint.carbonSaved} kg CO2 saved`);
    } catch (error) {
      logger.error('Failed to track carbon footprint:', error);
    }
  }

  public async generateAnalytics(timeRange: 'day' | 'week' | 'month' | 'year' = 'week'): Promise<AnalyticsData> {
    try {
      const now = new Date();
      const startDate = this.getStartDate(now, timeRange);

      // Load all data
      const activities = readJsonFile('user_activities.json');
      const energyUsages = readJsonFile('energy_usage.json');
      const tradingBehaviors = readJsonFile('trading_behaviors.json');
      const aiInteractions = readJsonFile('ai_interactions.json');
      const ussdUsages = readJsonFile('ussd_usage.json');
      const mobileMoneyUsages = readJsonFile('mobile_money_usage.json');
      const carbonFootprints = readJsonFile('carbon_footprints.json');
      const users = readJsonFile('users.json');
      const transactions = readJsonFile('transactions.json');

      // Filter data by time range
      const filterByDate = (data: any[]) => 
        data.filter(item => new Date(item.timestamp) >= startDate);

      const filteredActivities = filterByDate(activities);
      const filteredEnergyUsages = filterByDate(energyUsages);
      const filteredTradingBehaviors = filterByDate(tradingBehaviors);
      const filteredAIInteractions = filterByDate(aiInteractions);
      const filteredUSSDUsages = filterByDate(ussdUsages);
      const filteredMobileMoneyUsages = filterByDate(mobileMoneyUsages);
      const filteredCarbonFootprints = filterByDate(carbonFootprints);
      const filteredTransactions = filterByDate(transactions);

      // Calculate analytics
      const analytics: AnalyticsData = {
        totalUsers: users.length,
        activeUsers: new Set(filteredActivities.map(a => a.userId)).size,
        totalEnergyTraded: filteredEnergyUsages.reduce((sum, u) => sum + u.energyTraded, 0),
        totalCarbonSaved: filteredCarbonFootprints.reduce((sum, f) => sum + f.carbonSaved, 0),
        totalTransactions: filteredTransactions.length,
        averageTransactionValue: filteredTransactions.length > 0 
          ? filteredTransactions.reduce((sum, t) => sum + t.amount, 0) / filteredTransactions.length 
          : 0,
        peakUsageHours: this.calculatePeakUsageHours(filteredActivities),
        popularFeatures: this.calculatePopularFeatures(filteredActivities),
        userRetention: this.calculateUserRetention(users, filteredActivities),
        conversionRate: this.calculateConversionRate(filteredActivities, filteredTransactions),
        averageSessionDuration: this.calculateAverageSessionDuration(filteredActivities),
        errorRate: this.calculateErrorRate(filteredActivities, filteredUSSDUsages, filteredMobileMoneyUsages),
        satisfactionScore: this.calculateSatisfactionScore(filteredAIInteractions)
      };

      return analytics;
    } catch (error) {
      logger.error('Failed to generate analytics:', error);
      throw error;
    }
  }

  private getStartDate(now: Date, timeRange: string): Date {
    const start = new Date(now);
    
    switch (timeRange) {
      case 'day':
        start.setDate(start.getDate() - 1);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    
    return start;
  }

  private calculatePeakUsageHours(activities: UserActivity[]): number[] {
    const hourCounts = new Array(24).fill(0);
    
    activities.forEach(activity => {
      const hour = new Date(activity.timestamp).getHours();
      hourCounts[hour]++;
    });
    
    // Find top 3 peak hours
    return hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);
  }

  private calculatePopularFeatures(activities: UserActivity[]): string[] {
    const featureCounts = new Map<string, number>();
    
    activities.forEach(activity => {
      const count = featureCounts.get(activity.activity) || 0;
      featureCounts.set(activity.activity, count + 1);
    });
    
    return Array.from(featureCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([feature]) => feature);
  }

  private calculateUserRetention(users: any[], activities: UserActivity[]): number {
    const activeUsers = new Set(activities.map(a => a.userId)).size;
    return users.length > 0 ? (activeUsers / users.length) * 100 : 0;
  }

  private calculateConversionRate(activities: UserActivity[], transactions: any[]): number {
    const usersWithActivities = new Set(activities.map(a => a.userId)).size;
    const usersWithTransactions = new Set(transactions.map(t => t.userId)).size;
    
    return usersWithActivities > 0 ? (usersWithTransactions / usersWithActivities) * 100 : 0;
  }

  private calculateAverageSessionDuration(activities: UserActivity[]): number {
    const sessionDurations = new Map<string, { start: Date; end: Date }>();
    
    activities.forEach(activity => {
      const session = sessionDurations.get(activity.sessionId);
      const timestamp = new Date(activity.timestamp);
      
      if (!session) {
        sessionDurations.set(activity.sessionId, { start: timestamp, end: timestamp });
      } else {
        if (timestamp < session.start) session.start = timestamp;
        if (timestamp > session.end) session.end = timestamp;
      }
    });
    
    const durations = Array.from(sessionDurations.values())
      .map(session => session.end.getTime() - session.start.getTime())
      .filter(duration => duration > 0);
    
    return durations.length > 0 
      ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length / 1000 / 60 // minutes
      : 0;
  }

  private calculateErrorRate(activities: UserActivity[], ussdUsages: USSDUsage[], mobileMoneyUsages: MobileMoneyUsage[]): number {
    const totalActions = activities.length + ussdUsages.length + mobileMoneyUsages.length;
    const failedActions = 
      ussdUsages.filter(u => !u.success).length +
      mobileMoneyUsages.filter(u => !u.success).length;
    
    return totalActions > 0 ? (failedActions / totalActions) * 100 : 0;
  }

  private calculateSatisfactionScore(aiInteractions: AIIntraction[]): number {
    const ratedInteractions = aiInteractions.filter(i => i.satisfaction !== undefined);
    
    if (ratedInteractions.length === 0) return 0;
    
    const totalScore = ratedInteractions.reduce((sum, i) => sum + (i.satisfaction || 0), 0);
    return totalScore / ratedInteractions.length;
  }

  public async exportData(format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const data = {
        userActivities: readJsonFile('user_activities.json'),
        energyUsages: readJsonFile('energy_usage.json'),
        tradingBehaviors: readJsonFile('trading_behaviors.json'),
        aiInteractions: readJsonFile('ai_interactions.json'),
        ussdUsages: readJsonFile('ussd_usage.json'),
        mobileMoneyUsages: readJsonFile('mobile_money_usage.json'),
        carbonFootprints: readJsonFile('carbon_footprints.json'),
        exportedAt: new Date().toISOString()
      };

      if (format === 'csv') {
        // Convert to CSV format (simplified)
        return JSON.stringify(data, null, 2);
      }

      return JSON.stringify(data, null, 2);
    } catch (error) {
      logger.error('Failed to export data:', error);
      throw error;
    }
  }

  public async forceSync(): Promise<void> {
    await this.syncToCloud();
  }

  public getPendingDataCount(): number {
    return this.pendingData.length;
  }
}

export default UsageTrackingService;
