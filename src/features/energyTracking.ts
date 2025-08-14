// src/features/energyTracking.ts
import { User } from '../types';

// Types for energy tracking data
export interface EnergyInsights {
  liveUsage: {
    current: number;
    average: number;
    peak: number;
  };
  peakPeriods: string[];
  usageAnomalies: Array<{
    type: string;
    value: number;
    timestamp: string;
  }>;
  optimizationTips: string[];
  financial: {
    savings: number;
    tradingEarnings: number;
  };
  environmental: {
    carbonReduction: number;
  };
}

export interface RealtimeUsageData {
  current: number;
  average: number;
  peak: number;
  peakHours: string[];
}

export interface AnomalyAlertData {
  deviations: Array<{
    type: string;
    value: number;
    timestamp: string;
  }>;
  recommendations: string[];
}

export interface ValueSummaryData {
  savings: number;
  earnings: number;
  carbonImpact: number;
}

// Custom hook for energy insights
export const useEnergyInsights = (user: User): { insights: EnergyInsights } => {
  // Mock data - in real implementation, this would fetch from API
  const insights: EnergyInsights = {
    liveUsage: {
      current: 2.5,
      average: 2.1,
      peak: 4.2
    },
    peakPeriods: ['09:00-11:00', '18:00-20:00'],
    usageAnomalies: [
      { type: 'spike', value: 4.5, timestamp: '2024-01-15T10:30:00Z' }
    ],
    optimizationTips: [
      'Consider shifting heavy usage to off-peak hours',
      'Your solar panels are performing 15% above average'
    ],
    financial: {
      savings: 45.20,
      tradingEarnings: 12.80
    },
    environmental: {
      carbonReduction: 23.5
    }
  };

  return { insights };
};

// Service functions for energy tracking
export const getRealtimeUsageData = (user: User): RealtimeUsageData => {
  const { insights } = useEnergyInsights(user);
  return {
    ...insights.liveUsage,
    peakHours: insights.peakPeriods
  };
};

export const getAnomalyAlertData = (user: User): AnomalyAlertData => {
  const { insights } = useEnergyInsights(user);
  return {
    deviations: insights.usageAnomalies,
    recommendations: insights.optimizationTips
  };
};

export const getValueSummaryData = (user: User): ValueSummaryData => {
  const { insights } = useEnergyInsights(user);
  return {
    savings: insights.financial.savings,
    earnings: insights.financial.tradingEarnings,
    carbonImpact: insights.environmental.carbonReduction
  };
};

// Main energy dashboard service
export const getEnergyDashboardData = (user: User) => {
  const { insights } = useEnergyInsights(user);
  
  return {
    realtimeUsage: getRealtimeUsageData(user),
    anomalyAlerts: getAnomalyAlertData(user),
    valueSummary: getValueSummaryData(user),
    fullInsights: insights
  };
}; 