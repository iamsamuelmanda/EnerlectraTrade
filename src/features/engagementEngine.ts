// src/features/engagementEngine.ts
import { User } from '../types';

// Types for engagement data
export interface EngagementData {
  masteryProgram: {
    currentChallenge: string;
    rewards: string[];
    level: string;
  };
  learningContent: {
    content: string;
    format: string;
  };
  userPreferences: {
    format: string;
  };
  userRank: number;
}

export interface AdaptivePathwayData {
  level: string;
  modules: Array<{
    type: 'microLearning' | 'tradingSimulator' | 'communityChallenge';
    content?: string;
    format?: string;
    strategy?: string;
    marketConditions?: string;
    currentRank?: number;
    rewards?: string[];
  }>;
}

// Mock function for generating engagement data
const generateEngagement = (user: User): EngagementData => {
  return {
    masteryProgram: {
      currentChallenge: 'Complete your first energy trade',
      rewards: ['Energy Trader Badge', '50 ZMW bonus'],
      level: (user as any).level || 'beginner'
    },
    learningContent: {
      content: 'Learn the basics of energy trading',
      format: (user as any).preferences?.format || 'video'
    },
    userPreferences: {
      format: (user as any).preferences?.format || 'video'
    },
    userRank: (user as any).rank || 1
  };
};

// Service function for engagement flow
export const initEngagementFlow = (user: User): AdaptivePathwayData => {
  const { masteryProgram, learningContent, userPreferences, userRank } = generateEngagement(user);
  
  return {
    level: masteryProgram.level,
    modules: [
      {
        type: 'microLearning',
        content: learningContent.content,
        format: userPreferences.format
      },
      {
        type: 'tradingSimulator',
        strategy: masteryProgram.currentChallenge,
        marketConditions: 'historical'
      },
      {
        type: 'communityChallenge',
        currentRank: userRank,
        rewards: masteryProgram.rewards
      }
    ]
  };
};