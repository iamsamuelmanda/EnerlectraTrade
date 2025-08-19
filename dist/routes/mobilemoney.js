"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const common_1 = require("../utils/common");
const momoService_1 = require("../services/momoService");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const crypto = require('crypto');
const router = (0, express_1.Router)();
const LEDGER_FILE = 'ledger_entries.json';
const WEBHOOK_LOGS_FILE = 'webhook_logs.json';
// Helper function to create ledger entry
function createLedgerEntry(userId, type, amount, currency, description, reference, balanceBefore, metadata) {
    return {
        id: (0, common_1.generateId)(),
        userId,
        type,
        amount,
        currency,
        description,
        reference,
        timestamp: new Date().toISOString(),
        balanceBefore,
        balanceAfter: type === 'credit' ? balanceBefore + amount : balanceBefore - amount,
        metadata
    };
}
// Helper function to log webhook
function logWebhook(payload, signature, status, error) {
    const logs = (0, common_1.readJsonFile)(WEBHOOK_LOGS_FILE);
    logs.push({
        id: (0, common_1.generateId)(),
        timestamp: new Date().toISOString(),
        payload,
        signature,
        status,
        error,
        ip: 'webhook'
    });
    (0, common_1.writeJsonFile)(WEBHOOK_LOGS_FILE, logs);
}
// POST /mobilemoney/ussd - Enhanced USSD with mobile money integration
router.post('/ussd', async (req, res) => {
    try {
        const { text, phoneNumber } = req.body;
        if (!phoneNumber) {
            const response = {
                success: false,
                error: 'Phone number is required'
            };
            return res.status(400).json(response);
        }
        const users = (0, common_1.readJsonFile)('users.json');
        let user = (0, common_1.findUserByPhone)(users, phoneNumber);
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
            (0, common_1.writeJsonFile)('users.json', users);
        }
        let ussdResponse;
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
                            text: `END Account Information:\n\nName: ${user.name}\nPhone: ${user.phoneNumber}\nZMW Balance: ${user.balanceZMW.toFixed(2)}\nEnergy Balance: ${user.balanceKWh.toFixed(2)} kWh\n\nTotal Value: ${(user.balanceZMW + user.balanceKWh * parseFloat(process.env.KWH_TO_ZMW_RATE || '1.2')).toFixed(2)} ZMW`,
                            continueSession: false
                        };
                        break;
                    case '4':
                        // Carbon impact
                        const transactions = (0, common_1.readJsonFile)('transactions.json');
                        const userTransactions = transactions.filter(t => t.buyerId === user.id || t.userId === user.id);
                        const carbonPerKWh = parseFloat(process.env.CARBON_SAVINGS_PER_KWH || '0.8');
                        const totalCarbonSaved = userTransactions.reduce((total, t) => total + (t.kWh * carbonPerKWh), 0);
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
                            const mmTransactions = (0, common_1.readJsonFile)('mobile_money_transactions.json');
                            const userMmTx = mmTransactions.filter(t => t.phoneNumber === phoneNumber).slice(-5);
                            let historyText = 'END Recent Mobile Money:\n\n';
                            if (userMmTx.length === 0) {
                                historyText += 'No recent transactions.';
                            }
                            else {
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
                }
                else {
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
                        }
                        else {
                            try {
                                const reference = `DEP${Date.now()}`;
                                const idempotencyKey = crypto.randomBytes(16).toString('hex');
                                // Check if this idempotency key was already used
                                const mmTransactions = (0, common_1.readJsonFile)('mobile_money_transactions.json');
                                const existingTransaction = mmTransactions.find(t => t.idempotencyKey === idempotencyKey);
                                if (existingTransaction) {
                                    ussdResponse = {
                                        text: `END Deposit already processed with reference: ${existingTransaction.reference}`,
                                        continueSession: false
                                    };
                                }
                                else {
                                    // Initiate real MTN deposit
                                    await (0, momoService_1.initiateDeposit)(phoneNumber, depositAmount, reference);
                                    // Update user balance immediately (will be confirmed via callback)
                                    const balanceBefore = user.balanceZMW;
                                    (0, common_1.updateUserBalance)(users, user.id, depositAmount, 0);
                                    // Record mobile money transaction
                                    const mmTransaction = {
                                        id: (0, common_1.generateId)(),
                                        phoneNumber,
                                        type: 'deposit',
                                        amount: depositAmount,
                                        currency: 'ZMW',
                                        status: 'pending',
                                        timestamp: new Date().toISOString(),
                                        reference: reference,
                                        description: 'Mobile money deposit to Enerlectra wallet',
                                        idempotencyKey
                                    };
                                    mmTransactions.push(mmTransaction);
                                    (0, common_1.writeJsonFile)('mobile_money_transactions.json', mmTransactions);
                                    (0, common_1.writeJsonFile)('users.json', users);
                                    // Create ledger entry
                                    const ledger = (0, common_1.readJsonFile)(LEDGER_FILE);
                                    const ledgerEntry = createLedgerEntry(user.id, 'credit', depositAmount, 'ZMW', 'Mobile money deposit', reference, balanceBefore, { phoneNumber, provider: 'MTN', idempotencyKey });
                                    ledger.push(ledgerEntry);
                                    (0, common_1.writeJsonFile)(LEDGER_FILE, ledger);
                                    ussdResponse = {
                                        text: `END Deposit Initiated! ⏳\n\nAmount: ${depositAmount} ZMW\nReference: ${mmTransaction.reference}\n\nDial *151# to confirm payment. Balance will update after confirmation.`,
                                        continueSession: false
                                    };
                                }
                            }
                            catch (error) {
                                ussdResponse = {
                                    text: `END Deposit Failed: ${error.message}`,
                                    continueSession: false
                                };
                            }
                        }
                    }
                    else if (menuLevels[1] === '2') {
                        // Process withdrawal
                        const withdrawAmount = parseFloat(menuLevels[2]);
                        if (isNaN(withdrawAmount) || withdrawAmount < 5 || withdrawAmount > user.balanceZMW || withdrawAmount > 500) {
                            ussdResponse = {
                                text: `END Invalid amount. Check your balance and limits.`,
                                continueSession: false
                            };
                        }
                        else {
                            try {
                                const reference = `WTH${Date.now()}`;
                                const idempotencyKey = crypto.randomBytes(16).toString('hex');
                                // Check idempotency
                                const mmTransactions = (0, common_1.readJsonFile)('mobile_money_transactions.json');
                                const existingTransaction = mmTransactions.find(t => t.idempotencyKey === idempotencyKey);
                                if (existingTransaction) {
                                    ussdResponse = {
                                        text: `END Withdrawal already processed with reference: ${existingTransaction.reference}`,
                                        continueSession: false
                                    };
                                }
                                else {
                                    // Initiate real MTN withdrawal
                                    await (0, momoService_1.initiateWithdrawal)(phoneNumber, withdrawAmount, reference);
                                    // Update user balance immediately
                                    const balanceBefore = user.balanceZMW;
                                    (0, common_1.updateUserBalance)(users, user.id, -withdrawAmount, 0);
                                    // Record mobile money transaction
                                    const mmTransaction = {
                                        id: (0, common_1.generateId)(),
                                        phoneNumber,
                                        type: 'withdrawal',
                                        amount: withdrawAmount,
                                        currency: 'ZMW',
                                        status: 'pending',
                                        timestamp: new Date().toISOString(),
                                        reference: reference,
                                        description: 'Withdrawal from Enerlectra wallet',
                                        idempotencyKey
                                    };
                                    mmTransactions.push(mmTransaction);
                                    (0, common_1.writeJsonFile)('mobile_money_transactions.json', mmTransactions);
                                    (0, common_1.writeJsonFile)('users.json', users);
                                    // Create ledger entry
                                    const ledger = (0, common_1.readJsonFile)(LEDGER_FILE);
                                    const ledgerEntry = createLedgerEntry(user.id, 'debit', withdrawAmount, 'ZMW', 'Mobile money withdrawal', reference, balanceBefore, { phoneNumber, provider: 'MTN', idempotencyKey });
                                    ledger.push(ledgerEntry);
                                    (0, common_1.writeJsonFile)(LEDGER_FILE, ledger);
                                    ussdResponse = {
                                        text: `END Withdrawal Initiated! ⏳\n\nAmount: ${withdrawAmount} ZMW\nReference: ${mmTransaction.reference}\n\nYou will receive funds shortly.`,
                                        continueSession: false
                                    };
                                }
                            }
                            catch (error) {
                                ussdResponse = {
                                    text: `END Withdrawal Failed: ${error.message}`,
                                    continueSession: false
                                };
                            }
                        }
                    }
                    else if (menuLevels[1] === '4') {
                        // Validate phone number for money transfer
                        const recipientPhone = menuLevels[2];
                        const phoneRegex = /^\+260[0-9]{9}$/;
                        if (!phoneRegex.test(recipientPhone)) {
                            ussdResponse = {
                                text: `END Invalid phone number format.\nUse: +260XXXXXXXXX`,
                                continueSession: false
                            };
                        }
                        else {
                            ussdResponse = {
                                text: `CON Send to: ${recipientPhone}\nAvailable: ${user.balanceZMW.toFixed(2)} ZMW\n\nEnter amount to send:\n(Min: 1 ZMW, Max: ${Math.min(user.balanceZMW, 200).toFixed(2)} ZMW)`,
                                continueSession: true
                            };
                        }
                    }
                    else {
                        ussdResponse = {
                            text: `END Session ended.`,
                            continueSession: false
                        };
                    }
                }
                else {
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
                    }
                    else {
                        // Find or create recipient
                        let recipient = (0, common_1.findUserByPhone)(users, recipientPhone);
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
                        // Execute transfer with ledger entries
                        const transferRef = `TXF${Date.now()}`;
                        const senderBalanceBefore = user.balanceZMW;
                        const recipientBalanceBefore = recipient.balanceZMW;
                        (0, common_1.updateUserBalance)(users, user.id, -sendAmount, 0);
                        (0, common_1.updateUserBalance)(users, recipient.id, sendAmount, 0);
                        // Record transactions for both users
                        const mmTransactions = (0, common_1.readJsonFile)('mobile_money_transactions.json');
                        mmTransactions.push({
                            id: (0, common_1.generateId)(),
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
                            id: (0, common_1.generateId)(),
                            phoneNumber: recipientPhone,
                            type: 'deposit',
                            amount: sendAmount,
                            currency: 'ZMW',
                            status: 'completed',
                            timestamp: new Date().toISOString(),
                            reference: transferRef,
                            description: `Transfer from ${phoneNumber}`
                        });
                        (0, common_1.writeJsonFile)('mobile_money_transactions.json', mmTransactions);
                        (0, common_1.writeJsonFile)('users.json', users);
                        // Create ledger entries
                        const ledger = (0, common_1.readJsonFile)(LEDGER_FILE);
                        // Sender debit
                        const senderEntry = createLedgerEntry(user.id, 'debit', sendAmount, 'ZMW', `Transfer to ${recipientPhone}`, transferRef, senderBalanceBefore, { recipientPhone, type: 'transfer' });
                        ledger.push(senderEntry);
                        // Recipient credit
                        const recipientEntry = createLedgerEntry(recipient.id, 'credit', sendAmount, 'ZMW', `Transfer from ${phoneNumber}`, transferRef, recipientBalanceBefore, { senderPhone: phoneNumber, type: 'transfer' });
                        ledger.push(recipientEntry);
                        (0, common_1.writeJsonFile)(LEDGER_FILE, ledger);
                        ussdResponse = {
                            text: `END Transfer Successful! ✅\n\nSent: ${sendAmount} ZMW\nTo: ${recipientPhone}\nReference: ${transferRef}\nNew Balance: ${user.balanceZMW.toFixed(2)} ZMW`,
                            continueSession: false
                        };
                    }
                }
                else {
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
        const response = {
            success: true,
            data: ussdResponse
        };
        res.json(response);
    }
    catch (error) {
        console.error('Enhanced USSD error:', error);
        const response = {
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
// MTN Callback Handler with enhanced security and idempotency
router.post('/callback', (req, res) => {
    try {
        const signature = req.headers['x-momo-signature'];
        const body = JSON.stringify(req.body);
        // Log webhook receipt
        logWebhook(req.body, signature, 'received');
        if (!(0, momoService_1.verifyWebhookSignature)(body, signature)) {
            logWebhook(req.body, signature, 'failed', 'Invalid signature');
            return res.status(401).send('Unauthorized');
        }
        const { reference, status, amount, webhookId } = req.body;
        // Check idempotency using webhookId
        if (webhookId) {
            const mmTransactions = (0, common_1.readJsonFile)('mobile_money_transactions.json');
            const existingWebhook = mmTransactions.find(t => t.webhookId === webhookId);
            if (existingWebhook) {
                logWebhook(req.body, signature, 'processed', 'Webhook already processed');
                return res.status(200).send('OK - Already processed');
            }
        }
        // Update transaction status
        const mmTransactions = (0, common_1.readJsonFile)('mobile_money_transactions.json');
        const transaction = mmTransactions.find(t => t.reference === reference);
        if (transaction) {
            transaction.status = status === 'SUCCESSFUL' ? 'completed' : 'failed';
            if (webhookId)
                transaction.webhookId = webhookId;
            (0, common_1.writeJsonFile)('mobile_money_transactions.json', mmTransactions);
            // Update user balance if deposit completed
            if (transaction.type === 'deposit' && status === 'SUCCESSFUL') {
                const users = (0, common_1.readJsonFile)('users.json');
                const user = (0, common_1.findUserByPhone)(users, transaction.phoneNumber);
                if (user) {
                    // Create ledger entry for confirmed deposit
                    const ledger = (0, common_1.readJsonFile)(LEDGER_FILE);
                    const balanceBefore = user.balanceZMW;
                    const ledgerEntry = createLedgerEntry(user.id, 'credit', amount, 'ZMW', 'Mobile money deposit confirmed', reference, balanceBefore, { phoneNumber: transaction.phoneNumber, provider: 'MTN', webhookId });
                    ledger.push(ledgerEntry);
                    (0, common_1.writeJsonFile)(LEDGER_FILE, ledger);
                    // Update user balance
                    (0, common_1.updateUserBalance)(users, user.id, amount, 0);
                    (0, common_1.writeJsonFile)('users.json', users);
                }
            }
            logWebhook(req.body, signature, 'processed');
        }
        else {
            logWebhook(req.body, signature, 'failed', 'Transaction not found');
        }
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('Callback error:', error);
        logWebhook(req.body || {}, req.headers['x-momo-signature'] || '', 'failed', error.message);
        res.status(500).send('Internal Server Error');
    }
});
// GET /mobilemoney/ledger/:userId - Get user's ledger entries
router.get('/ledger/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const ledger = (0, common_1.readJsonFile)(LEDGER_FILE);
        const userEntries = ledger.filter(entry => entry.userId === userId);
        const response = {
            success: true,
            data: {
                entries: userEntries,
                summary: {
                    totalCredits: userEntries.filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0),
                    totalDebits: userEntries.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0),
                    currentBalance: userEntries.length > 0 ? userEntries[userEntries.length - 1].balanceAfter : 0
                }
            }
        };
        res.json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: 'Failed to fetch ledger'
        };
        res.status(500).json(response);
    }
});
exports.default = router;
//# sourceMappingURL=mobilemoney.js.map