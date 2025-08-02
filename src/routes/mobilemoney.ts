import { Router, Request, Response } from 'express';
import { readJsonFile, writeJsonFile, findUserByPhone, updateUserBalance, generateId } from '../utils';
import { User, USSDRequest, USSDResponse, ApiResponse } from '../types';

const router = Router();

interface MobileMoneyTransaction {
  id: string;
  phoneNumber: string;
  type: 'deposit' | 'withdrawal' | 'payment';
  amount: number;
  currency: 'ZMW';
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  reference?: string;
  description?: string;
}

// POST /mobilemoney/ussd - Enhanced USSD with mobile money integration
router.post('/ussd', (req: Request, res: Response) => {
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

    // Create user if doesn't exist
    if (!user) {
      user = {
        id: `user_${Date.now()}`,
        name: `User ${phoneNumber.slice(-4)}`,
        balanceZMW: 0,
        balanceKWh: 0,
        phoneNumber
      };
      users.push(user);
      writeJsonFile('users.json', users);
    }

    let ussdResponse: USSDResponse;
    const menuPath = text || '';
    const menuLevels = menuPath.split('*').filter(level => level !== '');

    switch (menuLevels.length) {
      case 0:
        // Main menu with mobile money options
        ussdResponse = {
          text: `CON Welcome to Enerlectra!\nHello ${user.name}\n\n1. Energy Services\n2. Mobile Money\n3. Account Info\n4. Carbon Impact\n0. Exit`,
          continueSession: true
        };
        break;

      case 1:
        switch (menuLevels[0]) {
          case '1':
            // Energy services submenu
            ussdResponse = {
              text: `CON Energy Services:\n\n1. Buy Energy\n2. Check Balance\n3. Trade Energy\n4. Energy History\n0. Back to Main Menu`,
              continueSession: true
            };
            break;

          case '2':
            // Mobile money menu
            ussdResponse = {
              text: `CON Mobile Money:\nBalance: ${user.balanceZMW.toFixed(2)} ZMW\n\n1. Deposit Money\n2. Withdraw Money\n3. Transaction History\n4. Send Money\n0. Back to Main Menu`,
              continueSession: true
            };
            break;

          case '3':
            // Account info
            ussdResponse = {
              text: `END Account Information:\n\nName: ${user.name}\nPhone: ${user.phoneNumber}\nZMW Balance: ${user.balanceZMW.toFixed(2)}\nEnergy Balance: ${user.balanceKWh.toFixed(2)} kWh\n\nTotal Value: ${(user.balanceZMW + user.balanceKWh * 1.2).toFixed(2)} ZMW`,
              continueSession: false
            };
            break;

          case '4':
            // Carbon impact
            const transactions = readJsonFile<any>('transactions.json');
            const userTransactions = transactions.filter(t => 
              t.buyerId === user!.id || t.userId === user!.id
            );
            const totalCarbonSaved = userTransactions.reduce((total, t) => total + t.carbonSaved, 0);

            ussdResponse = {
              text: `END Your Environmental Impact:\n\nCarbon Saved: ${totalCarbonSaved.toFixed(1)} kg CO2\nEnergy Traded: ${userTransactions.reduce((total, t) => total + t.kWh, 0).toFixed(1)} kWh\n\nYou're helping save Africa! 🌍`,
              continueSession: false
            };
            break;

          case '0':
            ussdResponse = {
              text: `END Thank you for using Enerlectra!\nPowering Africa's clean energy future.`,
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
          // Mobile money submenu
          switch (menuLevels[1]) {
            case '1':
              // Deposit money
              ussdResponse = {
                text: `CON Deposit Money:\nCurrent Balance: ${user.balanceZMW.toFixed(2)} ZMW\n\nEnter amount to deposit:\n(Min: 5 ZMW, Max: 1000 ZMW)`,
                continueSession: true
              };
              break;

            case '2':
              // Withdraw money
              ussdResponse = {
                text: `CON Withdraw Money:\nAvailable: ${user.balanceZMW.toFixed(2)} ZMW\n\nEnter amount to withdraw:\n(Min: 5 ZMW, Max: ${Math.min(user.balanceZMW, 500).toFixed(2)} ZMW)`,
                continueSession: true
              };
              break;

            case '3':
              // Transaction history
              const mmTransactions = readJsonFile<MobileMoneyTransaction>('mobile_money_transactions.json');
              const userMmTx = mmTransactions.filter(t => t.phoneNumber === phoneNumber).slice(-5);
              
              let historyText = 'END Recent Mobile Money:\n\n';
              if (userMmTx.length === 0) {
                historyText += 'No recent transactions.';
              } else {
                userMmTx.forEach((tx, i) => {
                  historyText += `${i + 1}. ${tx.type.toUpperCase()}: ${tx.amount} ZMW\n   ${new Date(tx.timestamp).toLocaleDateString()}\n`;
                });
              }

              ussdResponse = {
                text: historyText,
                continueSession: false
              };
              break;

            case '4':
              // Send money
              ussdResponse = {
                text: `CON Send Money:\nAvailable: ${user.balanceZMW.toFixed(2)} ZMW\n\nEnter recipient phone number:\n(Format: +260XXXXXXXXX)`,
                continueSession: true
              };
              break;

            case '0':
              // Back to main menu
              ussdResponse = {
                text: `CON Welcome to Enerlectra!\nHello ${user.name}\n\n1. Energy Services\n2. Mobile Money\n3. Account Info\n4. Carbon Impact\n0. Exit`,
                continueSession: true
              };
              break;

            default:
              ussdResponse = {
                text: `END Invalid mobile money option.`,
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
          // Mobile money operations
          if (menuLevels[1] === '1') {
            // Process deposit
            const depositAmount = parseFloat(menuLevels[2]);
            
            if (isNaN(depositAmount) || depositAmount < 5 || depositAmount > 1000) {
              ussdResponse = {
                text: `END Invalid amount. Deposit must be between 5 and 1000 ZMW.`,
                continueSession: false
              };
            } else {
              // Simulate mobile money deposit
              updateUserBalance(users, user.id, depositAmount, 0);
              
              // Record mobile money transaction
              const mmTransactions = readJsonFile<MobileMoneyTransaction>('mobile_money_transactions.json');
              const mmTransaction: MobileMoneyTransaction = {
                id: generateId(),
                phoneNumber,
                type: 'deposit',
                amount: depositAmount,
                currency: 'ZMW',
                status: 'completed',
                timestamp: new Date().toISOString(),
                reference: `DEP${Date.now()}`,
                description: 'Mobile money deposit to Enerlectra wallet'
              };
              
              mmTransactions.push(mmTransaction);
              writeJsonFile('mobile_money_transactions.json', mmTransactions);
              writeJsonFile('users.json', users);

              ussdResponse = {
                text: `END Deposit Successful! ✅\n\nAmount: ${depositAmount} ZMW\nReference: ${mmTransaction.reference}\nNew Balance: ${user.balanceZMW.toFixed(2)} ZMW\n\nThank you for using Enerlectra!`,
                continueSession: false
              };
            }

          } else if (menuLevels[1] === '2') {
            // Process withdrawal
            const withdrawAmount = parseFloat(menuLevels[2]);
            
            if (isNaN(withdrawAmount) || withdrawAmount < 5 || withdrawAmount > user.balanceZMW || withdrawAmount > 500) {
              ussdResponse = {
                text: `END Invalid amount. Check your balance and limits.`,
                continueSession: false
              };
            } else {
              // Process withdrawal
              updateUserBalance(users, user.id, -withdrawAmount, 0);
              
              // Record mobile money transaction
              const mmTransactions = readJsonFile<MobileMoneyTransaction>('mobile_money_transactions.json');
              const mmTransaction: MobileMoneyTransaction = {
                id: generateId(),
                phoneNumber,
                type: 'withdrawal',
                amount: withdrawAmount,
                currency: 'ZMW',
                status: 'completed',
                timestamp: new Date().toISOString(),
                reference: `WTH${Date.now()}`,
                description: 'Withdrawal from Enerlectra wallet'
              };
              
              mmTransactions.push(mmTransaction);
              writeJsonFile('mobile_money_transactions.json', mmTransactions);
              writeJsonFile('users.json', users);

              ussdResponse = {
                text: `END Withdrawal Successful! ✅\n\nAmount: ${withdrawAmount} ZMW\nReference: ${mmTransaction.reference}\nNew Balance: ${user.balanceZMW.toFixed(2)} ZMW\n\nCash collection SMS sent.`,
                continueSession: false
              };
            }

          } else if (menuLevels[1] === '4') {
            // Validate phone number for money transfer
            const recipientPhone = menuLevels[2];
            const phoneRegex = /^\+260[0-9]{9}$/;
            
            if (!phoneRegex.test(recipientPhone)) {
              ussdResponse = {
                text: `END Invalid phone number format.\nUse: +260XXXXXXXXX`,
                continueSession: false
              };
            } else {
              ussdResponse = {
                text: `CON Send to: ${recipientPhone}\nAvailable: ${user.balanceZMW.toFixed(2)} ZMW\n\nEnter amount to send:\n(Min: 1 ZMW, Max: ${Math.min(user.balanceZMW, 200).toFixed(2)} ZMW)`,
                continueSession: true
              };
            }
          } else {
            ussdResponse = {
              text: `END Session ended.`,
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

      case 4:
        if (menuLevels[0] === '2' && menuLevels[1] === '4') {
          // Complete money transfer
          const recipientPhone = menuLevels[2];
          const sendAmount = parseFloat(menuLevels[3]);
          
          if (isNaN(sendAmount) || sendAmount < 1 || sendAmount > user.balanceZMW || sendAmount > 200) {
            ussdResponse = {
              text: `END Transfer failed. Check amount and balance.`,
              continueSession: false
            };
          } else {
            // Find or create recipient
            let recipient = findUserByPhone(users, recipientPhone);
            if (!recipient) {
              recipient = {
                id: `user_${Date.now()}`,
                name: `User ${recipientPhone.slice(-4)}`,
                balanceZMW: 0,
                balanceKWh: 0,
                phoneNumber: recipientPhone
              };
              users.push(recipient);
            }

            // Execute transfer
            updateUserBalance(users, user.id, -sendAmount, 0);
            updateUserBalance(users, recipient.id, sendAmount, 0);
            
            // Record transactions for both users
            const mmTransactions = readJsonFile<MobileMoneyTransaction>('mobile_money_transactions.json');
            const transferRef = `TXF${Date.now()}`;
            
            mmTransactions.push({
              id: generateId(),
              phoneNumber,
              type: 'payment',
              amount: -sendAmount,
              currency: 'ZMW',
              status: 'completed',
              timestamp: new Date().toISOString(),
              reference: transferRef,
              description: `Transfer to ${recipientPhone}`
            });

            mmTransactions.push({
              id: generateId(),
              phoneNumber: recipientPhone,
              type: 'deposit',
              amount: sendAmount,
              currency: 'ZMW',
              status: 'completed',
              timestamp: new Date().toISOString(),
              reference: transferRef,
              description: `Transfer from ${phoneNumber}`
            });
            
            writeJsonFile('mobile_money_transactions.json', mmTransactions);
            writeJsonFile('users.json', users);

            ussdResponse = {
              text: `END Transfer Successful! ✅\n\nSent: ${sendAmount} ZMW\nTo: ${recipientPhone}\nReference: ${transferRef}\nNew Balance: ${user.balanceZMW.toFixed(2)} ZMW`,
              continueSession: false
            };
          }
        } else {
          ussdResponse = {
            text: `END Session timeout.`,
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
    console.error('Enhanced USSD error:', error);
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

// GET /mobilemoney/transactions/:phoneNumber - Get mobile money transaction history
router.get('/transactions/:phoneNumber', (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.params;
    const { limit, offset, type } = req.query;
    
    const mmTransactions = readJsonFile<MobileMoneyTransaction>('mobile_money_transactions.json');
    
    let userTransactions = mmTransactions.filter(t => t.phoneNumber === phoneNumber);
    
    // Filter by type if specified
    if (type && typeof type === 'string') {
      userTransactions = userTransactions.filter(t => t.type === type);
    }
    
    // Sort by timestamp (newest first)
    userTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Apply pagination
    const limitNum = limit ? parseInt(limit as string) : 20;
    const offsetNum = offset ? parseInt(offset as string) : 0;
    const paginatedTransactions = userTransactions.slice(offsetNum, offsetNum + limitNum);
    
    const response: ApiResponse = {
      success: true,
      data: {
        phoneNumber,
        transactions: paginatedTransactions,
        pagination: {
          total: userTransactions.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < userTransactions.length
        },
        summary: {
          totalTransactions: userTransactions.length,
          totalDeposits: userTransactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0),
          totalWithdrawals: userTransactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + Math.abs(t.amount), 0),
          totalPayments: userTransactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + Math.abs(t.amount), 0)
        }
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Mobile money transactions error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

export default router;