import { Anthropic } from '@anthropic-ai/sdk';
import { User } from '../types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});
const MODEL = 'claude-4-sonnet'; // Updated to Claude Sonnet 4

// Helper functions
const generateOptimalNotificationSchedule = (user: User) => {
  return {
    frequency: 'daily',
    preferredTime: '09:00',
    channels: ['push', 'email'],
    topics: ['market-updates', 'energy-tips']
  };
};

const createSocialEngagementOpportunities = (user: User) => {
  return {
    communityGroups: ['energy-traders', 'renewable-enthusiasts'],
    challenges: ['weekly-trading', 'carbon-reduction'],
    events: ['monthly-meetup', 'energy-workshop']
  };
};

export const generatePersonalizedEngagement = async (user: User) => {
  // Adaptive mastery program
  const challenge = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: "Create a personalized energy mastery program with: 1) Skill-based progression 2) Dynamic difficulty adjustment 3) Real-world energy challenges 4) Social competition features",
    messages: [{
      role: 'user',
      content: JSON.stringify({
        userLevel: (user as any).level || 'beginner',
        learningGoals: (user as any).learningGoals || ['energy-trading', 'sustainability'],
        behavioralProfile: (user as any).behaviorProfile || 'analytical'
      })
    }]
  });

  // Predictive content generation
  const educationalContent = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: "Generate interactive micro-learning content about energy markets tailored to: 1) Current knowledge gaps 2) Upcoming market events 3) User's preferred learning style",
    messages: [{
      role: 'user',
      content: `Knowledge assessment: ${(user as any).knowledgeAssessment || 'beginner'}
      Content preferences: ${JSON.stringify((user as any).contentPreferences || ['video', 'interactive'])}`
    }]
  });

  return {
    masteryProgram: JSON.parse((challenge.content[0] as any).text || '{}'),
    learningContent: JSON.parse((educationalContent.content[0] as any).text || '{}'),
    engagementFeatures: {
      predictiveNotifications: generateOptimalNotificationSchedule(user),
      communityFeatures: createSocialEngagementOpportunities(user)
    }
  };
};