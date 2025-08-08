import { Anthropic } from '@anthropic-ai/sdk';
import logger from '../utils/logger';
import { readJsonFile } from '../utils/common';
import { User, Transaction, Cluster } from '../types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

// System prompt for consistent behavior
const SYSTEM_PROMPT = `
You are EnerlectraAI, an assistant for Africa's largest peer-to-peer energy trading platform. 
Specialize in renewable energy, mobile payments, and African energy markets. Respond in clear, 
simple language suitable for USSD interfaces when needed.

Key parameters:
- Current energy rate: ${process.env.KWH_TO_ZMW_RATE || '1.2'} ZMW/kWh
- Carbon savings: ${process.env.CARBON_SAVINGS_PER_KWH || '0.8'} kg CO2/kWh
- Supported countries: Zambia, Nigeria, Kenya, South Africa
- Current date: ${new Date().toISOString().split('T')[0]}
`;

// <important_do_not_delete>
const DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";
// </important_do_not_delete>

export const aiQuery = async (prompt: string, context: string = "") => {
  try {
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL_STR,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `${context}\n\n${prompt}`
        }
      ]
    });
    
    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }
    return "AI response format not supported";
  } catch (error) {
    logger.error('AI request failed', error);
    return "I'm having trouble connecting to the AI service. Please try again later.";
  }
};

// Specialized AI functions
export const detectAnomalies = async (transactionData: any) => {
  const prompt = `
  Analyze this energy transaction data for anomalies. Consider:
  - Unusual kWh amounts
  - Price deviations >15% from market rate
  - Suspicious timing patterns
  - Mismatched user behavior
  
  Transaction data: ${JSON.stringify(transactionData)}
  
  Respond in JSON format: 
  { anomaly: boolean, confidence: number, reasons: string[], suggested_action: string }
  `;
  
  try {
    return JSON.parse(await aiQuery(prompt));
  } catch (error) {
    logger.error('Anomaly detection parsing failed', error);
    return { anomaly: false, confidence: 0, reasons: [], suggested_action: "Review manually" };
  }
};

export const predictEnergyDemand = async (clusterId: string) => {
  const clusters = readJsonFile<Cluster>('clusters.json');
  const cluster = clusters.find(c => c.id === clusterId);
  
  const transactions = readJsonFile<Transaction>('transactions.json');
  const clusterTransactions = transactions.filter(t => t.clusterId === clusterId);
  
  const prompt = `
  Predict energy demand for the next 24 hours based on:
  - Cluster location: ${cluster?.location || 'Unknown'}
  - Current utilization: ${cluster ? ((cluster.capacityKWh - cluster.availableKWh) / cluster.capacityKWh * 100).toFixed(1) : 0}%
  - Historical patterns (last 7 days):
    ${clusterTransactions.slice(-20).map(t => 
      `- ${new Date(t.timestamp).toLocaleTimeString()}: ${t.kWh} kWh`
    ).join('\n')}
  - Weather forecast: Sunny
  - Day of week: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}
  
  Respond in JSON format:
  { 
    prediction: { 
      hour_0: number, hour_1: number, hour_2: number, hour_3: number,
      hour_4: number, hour_5: number, hour_6: number, hour_7: number,
      hour_8: number, hour_9: number, hour_10: number, hour_11: number,
      hour_12: number, hour_13: number, hour_14: number, hour_15: number,
      hour_16: number, hour_17: number, hour_18: number, hour_19: number,
      hour_20: number, hour_21: number, hour_22: number, hour_23: number 
    },
    peak_hour: string
  }
  `;
  
  try {
    return JSON.parse(await aiQuery(prompt));
  } catch (error) {
    logger.error('Demand prediction parsing failed', error);
    return { prediction: {}, peak_hour: "N/A" };
  }
};

export const ussdChatSupport = async (userMessage: string, user: User) => {
  const transactions = readJsonFile<Transaction>('transactions.json');
  const userTransactions = transactions.filter(t => 
    t.buyerId === user.id || t.sellerId === user.id
  ).slice(-5);
  
  const context = `
  User Profile:
  - Name: ${user.name}
  - Balance: ${user.balanceZMW.toFixed(2)} ZMW, ${user.balanceKWh.toFixed(2)} kWh
  - Recent Transactions: ${userTransactions.length}
  - Last Transaction: ${userTransactions.length > 0 ? new Date(userTransactions[0].timestamp).toLocaleDateString() : 'None'}
  `;
  
  const prompt = `
  User message: ${userMessage}
  
  Provide helpful, concise response for USSD interface (max 160 characters). 
  Focus on energy trading, payments, or technical issues.
  `;
  
  return aiQuery(prompt, context);
};

export const blockchainAnalysis = async (transactionHashes: string[]) => {
  const prompt = `
  Analyze these blockchain transactions for energy trading patterns:
  Transaction Hashes: ${transactionHashes.join(', ')}
  
  Identify:
  1. Suspicious activity patterns
  2. Large energy transfers
  3. Address clustering
  4. Market trend indicators
  
  Respond in JSON format:
  {
    risk_score: number,
    insights: string[],
    trend_analysis: string,
    recommendations: string[]
  }
  `;
  
  try {
    return JSON.parse(await aiQuery(prompt));
  } catch (error) {
    logger.error('Blockchain analysis parsing failed', error);
    return {
      risk_score: 0,
      insights: [],
      trend_analysis: "Unable to analyze",
      recommendations: ["Review manually"]
    };
  }
};