import { Router, Request, Response } from 'express';
import { 
  readJsonFile, 
  writeJsonFile, 
  findUserByPhone, 
  updateUserBalance, 
  createTransaction,
  generateId,
} from '../utils/common';
import { initiateDeposit } from '../services/momoService';
import { ussdChatSupport } from '../services/aiService';
import { User, Cluster, Transaction, USSDRequest, USSDResponse, ApiResponse } from '../types';

const router = Router();

// Track USSD sessions
const activeSessions: Record<string, { 
  step: string, 
  data?: any,
  history?: string 
}> = {};

// POST /ussd - Handle USSD interactions
router.post('/', async (req: Request, res: Response) => {
  try {
    const { text, phoneNumber, sessionId }: USSDRequest = req.body;

    if (!phoneNumber || !sessionId) {
      const response: ApiResponse<USSDResponse> = {
        success: false,
        error: 'Phone number and session ID are required'
      };
      return res.status(400).json(response);
    }

    const users = readJsonFile<User>('users.json');
    let user = findUserByPhone(users, phoneNumber);
    const currentSession = activeSessions[sessionId] || { step: 'main' };

    // Create new user if not exists
    if (!user) {
      user = {
        id: `user_${Date.now()}`,
        name: `User ${phoneNumber.slice(-4)}`,
        balanceZMW: 50,
        balanceKWh: 0,
        phoneNumber
      };
      users.push(user);
      writeJsonFile('users.json', users);
    }

    let ussdResponse: USSDResponse;
    const menuPath = text?.split('*') || [];
    const currentStep = menuPath[menuPath.length - 1] || '';

    switch (currentSession.step) {
      case 'main':
        // Main menu with Sonnet AI support
        ussdResponse = {
          text: `CON Welcome to Enerlectra!\nHello ${user.name}\n\n1. Check Balance\n2. Buy Energy\n3. View Carbon Impact\n4. Energy Trading\n5. Deposit Funds\n6. Sonnet AI Support\n0. Exit`,
          continueSession: true
        };
        activeSessions[sessionId] = { step: 'option_select' };
        break;
        
      case 'option_select':
        switch (currentStep) {
          case '1': // Check balance
            ussdResponse = {
              text: `END Your Account Balance:\n\nZMW: ${user.balanceZMW.toFixed(2)}\nkWh: ${user.balanceKWh.toFixed(2)}\n\nTotal Value: ${(user.balanceZMW + user.balanceKWh * 1.2).toFixed(2)} ZMW`,
              continueSession: false
            };
            break;
            
          case '2': // Buy energy
            const clusters = readJsonFile<Cluster>('clusters.json');
            let clusterMenu = 'CON Select Energy Source:\n\n';
            clusters.forEach((cluster, index) => {
              clusterMenu += `${index + 1}. ${cluster.location}\n   ${cluster.availableKWh} kWh @ ${cluster.pricePerKWh} ZMW/kWh\n`;
            });
            clusterMenu += '0. Back';
            
            ussdResponse = {
              text: clusterMenu,
              continueSession: true
            };
            activeSessions[sessionId] = { 
              step: 'buy_energy_select', 
              data: { clusters } 
            };
            break;
            
          case '3': // Carbon impact
            const transactions = readJsonFile<Transaction>('transactions.json');
            const userTransactions = transactions.filter(t => 
              t.buyerId === user!.id || t.sellerId === user!.id
            );
            const carbonPerKWh = 0.8;
            const totalCarbonSaved = userTransactions.reduce((total, t) => 
              total + (t.kWh * carbonPerKWh), 0);
            
            ussdResponse = {
              text: `END Your Environmental Impact:\n\nCarbon Saved: ${totalCarbonSaved.toFixed(1)} kg CO2\nEnergy Traded: ${userTransactions.reduce((total, t) => total + t.kWh, 0).toFixed(1)} kWh\n\nYou're helping save the planet! 🌍`,
              continueSession: false
            };
            break;
            
          case '4': // Energy trading
            ussdResponse = {
              text: `CON Energy Trading:\n\n1. Sell Energy\n2. View My Listings\n3. Market Prices\n0. Back`,
              continueSession: true
            };
            activeSessions[sessionId] = { step: 'trading_submenu' };
            break;
            
          case '5': // Deposit funds
            ussdResponse = {
              text: `CON Deposit Funds:\nCurrent Balance: ${user.balanceZMW.toFixed(2)} ZMW\n\nEnter amount to deposit:\n(Min: 5 ZMW, Max: 1000 ZMW)`,
              continueSession: true
            };
            activeSessions[sessionId] = { step: 'deposit_amount' };
            break;
            
          case '6': // Sonnet AI Support
            ussdResponse = {
              text: `CON Sonnet AI Support:\nPremium AI assistance powered by Claude Sonnet\n\nType your question:`,
              continueSession: true
            };
            activeSessions[sessionId] = { 
              step: 'ai_support', 
              history: `User: ${user.name}\nBalance: ${user.balanceZMW} ZMW, ${user.balanceKWh} kWh` 
            };
            break;
            
          case '0': // Exit
            ussdResponse = {
              text: `END Thank you for using Enerlectra!\nPowering Africa's clean energy future. 🔋`,
              continueSession: false
            };
            delete activeSessions[sessionId];
            break;
            
          default:
            ussdResponse = {
              text: `END Invalid option. Please try again.`,
              continueSession: false
            };
        }
        break;
        
      case 'ai_support':
        try {
          // Use Sonnet model for premium AI support
          const aiResponse = await ussdChatSupport(currentStep, user);
          ussdResponse = {
            text: `END ${aiResponse}\n\nPowered by Claude Sonnet AI`,
            continueSession: false
          };
          delete activeSessions[sessionId];
        } catch (error) {
          ussdResponse = {
            text: `END Sorry, I couldn't process your request. Please try again later.`,
            continueSession: false
          };
        }
        break;
        
      case 'buy_energy_select':
        if (currentStep === '0') {
          // Back to main menu
          ussdResponse = {
            text: `CON Welcome to Enerlectra!\nHello ${user.name}\n\n1. Check Balance\n2. Buy Energy\n3. View Carbon Impact\n4. Energy Trading\n5. Deposit Funds\n6. Sonnet AI Support\n0. Exit`,
            continueSession: true
          };
          activeSessions[sessionId] = { step: 'option_select' };
        } else {
          const clusterIndex = parseInt(currentStep) - 1;
          const clusters = currentSession.data?.clusters || [];
          
          if (clusterIndex >= 0 && clusterIndex < clusters.length) {
            const selectedCluster = clusters[clusterIndex];
            activeSessions[sessionId] = { 
              step: 'buy_energy_amount', 
              data: { cluster: selectedCluster } 
            };
            
            ussdResponse = {
              text: `CON ${selectedCluster.location}\nAvailable: ${selectedCluster.availableKWh} kWh\nPrice: ${selectedCluster.pricePerKWh} ZMW/kWh\n\nEnter kWh amount to buy:\n(Max: ${Math.min(selectedCluster.availableKWh, user.balanceZMW / selectedCluster.pricePerKWh).toFixed(1)})`,
              continueSession: true
            };
          } else {
            ussdResponse = {
              text: `END Invalid cluster selection.`,
              continueSession: false
            };
          }
        }
        break;
        
      case 'buy_energy_amount':
        const kWhToBuy = parseFloat(currentStep);
        const cluster = currentSession.data?.cluster;
        
        if (!isNaN(kWhToBuy) && kWhToBuy > 0 && cluster) {
          const totalCost = kWhToBuy * cluster.pricePerKWh;
          
          if (user.balanceZMW >= totalCost && cluster.availableKWh >= kWhToBuy) {
            // Execute purchase
            user.balanceZMW -= totalCost;
            user.balanceKWh += kWhToBuy;
            
            // Update cluster
            const clusters = readJsonFile<Cluster>('clusters.json');
            const clusterIndex = clusters.findIndex(c => c.id === cluster.id);
            if (clusterIndex !== -1) {
              clusters[clusterIndex].availableKWh -= kWhToBuy;
              writeJsonFile('clusters.json', clusters);
            }
            
            // Create transaction
            const transactions = readJsonFile<Transaction>('transactions.json');
            transactions.push({
              id: generateId(),
              type: 'purchase',
              buyerId: user.id,
              clusterId: cluster.id,
              kWh: kWhToBuy,
              amountZMW: totalCost,
              carbonSaved: kWhToBuy * 0.8,
              timestamp: new Date().toISOString()
            });
            writeJsonFile('transactions.json', transactions);
            
            // Update user
            writeJsonFile('users.json', users);
            
            ussdResponse = {
              text: `END Purchase Successful! ✅\n\nBought: ${kWhToBuy} kWh\nFrom: ${cluster.location}\nCost: ${totalCost.toFixed(2)} ZMW\n\nNew Balance:\nZMW: ${user.balanceZMW.toFixed(2)}\nkWh: ${user.balanceKWh.toFixed(2)}`,
              continueSession: false
            };
          } else {
            ussdResponse = {
              text: `END Purchase Failed:\n${user.balanceZMW < totalCost ? 'Insufficient ZMW balance' : 'Not enough energy available'}`,
              continueSession: false
            };
          }
        } else {
          ussdResponse = {
            text: `END Invalid amount. Please try again.`,
            continueSession: false
          };
        }
        delete activeSessions[sessionId];
        break;
        
      case 'deposit_amount':
        const depositAmount = parseFloat(currentStep);
        
        if (!isNaN(depositAmount) && depositAmount >= 5 && depositAmount <= 1000) {
          try {
            const reference = `DEP${Date.now()}`;
            // Initiate real MTN deposit
            await initiateDeposit(phoneNumber, depositAmount, reference);
            
            // Record transaction as pending
            const mmTransactions = readJsonFile<any>('mobile_money_transactions.json');
            mmTransactions.push({
              id: generateId(),
              phoneNumber,
              type: 'deposit',
              amount: depositAmount,
              currency: 'ZMW',
              status: 'pending',
              timestamp: new Date().toISOString(),
              reference
            });
            writeJsonFile('mobile_money_transactions.json', mmTransactions);
            
            ussdResponse = {
              text: `END Deposit Initiated! ⏳\n\nAmount: ${depositAmount} ZMW\nReference: ${reference}\n\nDial *151# to confirm payment. Balance will update after confirmation.`,
              continueSession: false
            };
          } catch (error: any) {
            ussdResponse = {
              text: `END Deposit Failed: ${error.message || 'Service unavailable'}`,
              continueSession: false
            };
          }
        } else {
          ussdResponse = {
            text: `END Invalid amount. Deposit must be between 5 and 1000 ZMW.`,
            continueSession: false
          };
        }
        delete activeSessions[sessionId];
        break;
        
      default:
        ussdResponse = {
          text: `END Session timeout. Please start again.`,
          continueSession: false
        };
        delete activeSessions[sessionId];
    }

    const response: ApiResponse<USSDResponse> = {
      success: true,
      data: ussdResponse
    };

    res.json(response);
  } catch (error) {
    console.error('USSD error:', error);
    const response: ApiResponse<USSDResponse> = {
      success: false,
      data: {
        text: 'END Service temporarily unavailable. Please try again later.',
        continueSession: false
      },
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

export default router;