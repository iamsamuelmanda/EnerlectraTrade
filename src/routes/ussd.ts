import { Router, Request, Response } from 'express';
import { readJsonFile, writeJsonFile, findUserByPhone, updateUserBalance, createTransaction, KWH_TO_ZMW_RATE } from '../utils';
import { User, Cluster, Transaction, USSDRequest, USSDResponse, ApiResponse } from '../types';

const router = Router();

// POST /ussd - Handle USSD interactions
router.post('/', (req: Request, res: Response) => {
  try {
    const { text, phoneNumber }: USSDRequest = req.body;

    if (!phoneNumber) {
      const response: ApiResponse<USSDResponse> = {
        success: false,
        error: 'Phone number is required'
      };
      return res.status(400).json(response);
    }

    const users = readJsonFile<User>('users.json');
    let user = findUserByPhone(users, phoneNumber);

    // If user doesn't exist, create a new one
    if (!user) {
      user = {
        id: `user_${Date.now()}`,
        name: `User ${phoneNumber.slice(-4)}`,
        balanceZMW: 50, // Starting balance
        balanceKWh: 0,
        phoneNumber
      };
      users.push(user);
      writeJsonFile('users.json', users);
    }

    let ussdResponse: USSDResponse;

    // Parse USSD menu navigation
    const menuPath = text || '';
    const menuLevels = menuPath.split('*').filter(level => level !== '');

    switch (menuLevels.length) {
      case 0:
        // Main menu
        ussdResponse = {
          text: `CON Welcome to Enerlectra!\nHello ${user.name}\n\n1. Check Balance\n2. Buy Energy\n3. View Carbon Impact\n4. Energy Trading\n0. Exit`,
          continueSession: true
        };
        break;

      case 1:
        switch (menuLevels[0]) {
          case '1':
            // Check balance
            ussdResponse = {
              text: `END Your Account Balance:\n\nZMW: ${user.balanceZMW.toFixed(2)}\nkWh: ${user.balanceKWh.toFixed(2)}\n\nTotal Value: ${(user.balanceZMW + user.balanceKWh * KWH_TO_ZMW_RATE).toFixed(2)} ZMW`,
              continueSession: false
            };
            break;

          case '2':
            // Buy energy menu
            const clusters = readJsonFile<Cluster>('clusters.json');
            let clusterMenu = 'CON Select Energy Source:\n\n';
            clusters.forEach((cluster, index) => {
              clusterMenu += `${index + 1}. ${cluster.location}\n   ${cluster.availableKWh} kWh @ ${cluster.pricePerKWh} ZMW/kWh\n`;
            });
            clusterMenu += '0. Back to Main Menu';

            ussdResponse = {
              text: clusterMenu,
              continueSession: true
            };
            break;

          case '3':
            // Carbon impact
            const transactions = readJsonFile<Transaction>('transactions.json');
            const userTransactions = transactions.filter(t => 
              t.buyerId === user!.id || t.userId === user!.id
            );
            const totalCarbonSaved = userTransactions.reduce((total, t) => total + t.carbonSaved, 0);

            ussdResponse = {
              text: `END Your Environmental Impact:\n\nCarbon Saved: ${totalCarbonSaved.toFixed(1)} kg CO2\nEnergy Traded: ${userTransactions.reduce((total, t) => total + t.kWh, 0).toFixed(1)} kWh\n\nYou're helping save the planet! 🌍`,
              continueSession: false
            };
            break;

          case '4':
            // Energy trading menu
            ussdResponse = {
              text: `CON Energy Trading:\n\n1. Sell Energy\n2. View My Listings\n3. Market Prices\n0. Back to Main Menu`,
              continueSession: true
            };
            break;

          case '0':
            ussdResponse = {
              text: `END Thank you for using Enerlectra!\nPowering Africa's clean energy future. 🔋`,
              continueSession: false
            };
            break;

          default:
            ussdResponse = {
              text: `END Invalid option. Please try again.`,
              continueSession: false
            };
        }
        break;

      case 2:
        if (menuLevels[0] === '2') {
          // Energy purchase - cluster selection
          const clusters = readJsonFile<Cluster>('clusters.json');
          const clusterIndex = parseInt(menuLevels[1]) - 1;

          if (clusterIndex >= 0 && clusterIndex < clusters.length) {
            const selectedCluster = clusters[clusterIndex];
            ussdResponse = {
              text: `CON ${selectedCluster.location}\nAvailable: ${selectedCluster.availableKWh} kWh\nPrice: ${selectedCluster.pricePerKWh} ZMW/kWh\n\nEnter kWh amount to buy:\n(Max: ${Math.min(selectedCluster.availableKWh, user.balanceZMW / selectedCluster.pricePerKWh).toFixed(1)})`,
              continueSession: true
            };
          } else if (menuLevels[1] === '0') {
            // Back to main menu
            ussdResponse = {
              text: `CON Welcome to Enerlectra!\nHello ${user.name}\n\n1. Check Balance\n2. Buy Energy\n3. View Carbon Impact\n4. Energy Trading\n0. Exit`,
              continueSession: true
            };
          } else {
            ussdResponse = {
              text: `END Invalid cluster selection.`,
              continueSession: false
            };
          }
        } else if (menuLevels[0] === '4') {
          // Trading submenu
          switch (menuLevels[1]) {
            case '1':
              ussdResponse = {
                text: `CON Sell Energy:\nYour kWh: ${user.balanceKWh.toFixed(2)}\n\nEnter kWh amount to sell:\n(Current rate: ${KWH_TO_ZMW_RATE} ZMW/kWh)`,
                continueSession: true
              };
              break;
            case '2':
              ussdResponse = {
                text: `END Your Energy Listings:\n\nNo active listings.\nUse option 1 to create a listing.`,
                continueSession: false
              };
              break;
            case '3':
              ussdResponse = {
                text: `END Market Prices:\n\nCurrent Rate: ${KWH_TO_ZMW_RATE} ZMW/kWh\nTrend: Stable\n\nBuy low, sell high! 📈`,
                continueSession: false
              };
              break;
            default:
              ussdResponse = {
                text: `END Invalid trading option.`,
                continueSession: false
              };
          }
        } else {
          ussdResponse = {
            text: `END Invalid menu selection.`,
            continueSession: false
          };
        }
        break;

      case 3:
        if (menuLevels[0] === '2') {
          // Complete energy purchase
          const clusters = readJsonFile<Cluster>('clusters.json');
          const clusterIndex = parseInt(menuLevels[1]) - 1;
          const kWhToBuy = parseFloat(menuLevels[2]);

          if (clusterIndex >= 0 && clusterIndex < clusters.length && kWhToBuy > 0) {
            const selectedCluster = clusters[clusterIndex];
            const totalCost = kWhToBuy * selectedCluster.pricePerKWh;

            if (user.balanceZMW >= totalCost && selectedCluster.availableKWh >= kWhToBuy) {
              // Execute purchase
              updateUserBalance(users, user.id, -totalCost, kWhToBuy);
              
              // Update cluster
              clusters[clusterIndex].availableKWh -= kWhToBuy;

              // Create transaction
              const transactions = readJsonFile<Transaction>('transactions.json');
              const transaction = createTransaction('purchase', {
                userId: user.id,
                clusterId: selectedCluster.id,
                kWh: kWhToBuy,
                amountZMW: totalCost
              });
              transactions.push(transaction);

              // Save changes
              writeJsonFile('users.json', users);
              writeJsonFile('clusters.json', clusters);
              writeJsonFile('transactions.json', transactions);

              ussdResponse = {
                text: `END Purchase Successful! ✅\n\nBought: ${kWhToBuy} kWh\nFrom: ${selectedCluster.location}\nCost: ${totalCost.toFixed(2)} ZMW\nCarbon Saved: ${transaction.carbonSaved.toFixed(1)} kg CO2\n\nNew Balance:\nZMW: ${user.balanceZMW.toFixed(2)}\nkWh: ${user.balanceKWh.toFixed(2)}`,
                continueSession: false
              };
            } else {
              ussdResponse = {
                text: `END Purchase Failed:\n${user.balanceZMW < totalCost ? 'Insufficient ZMW balance' : 'Not enough energy available'}\n\nRequired: ${totalCost.toFixed(2)} ZMW\nAvailable: ${user.balanceZMW.toFixed(2)} ZMW`,
                continueSession: false
              };
            }
          } else {
            ussdResponse = {
              text: `END Invalid purchase amount.`,
              continueSession: false
            };
          }
        } else {
          ussdResponse = {
            text: `END Session ended.`,
            continueSession: false
          };
        }
        break;

      default:
        ussdResponse = {
          text: `END Session timeout. Please try again.`,
          continueSession: false
        };
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
