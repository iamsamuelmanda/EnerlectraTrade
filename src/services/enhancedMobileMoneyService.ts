import axios from 'axios';
import logger from '../utils/logger';
import { readJsonFile, writeJsonFile, generateId } from '../utils/common';

// Mobile Money Provider Configurations
interface MobileMoneyProvider {
  id: string;
  name: string;
  country: string;
  baseURL: string;
  apiKey: string;
  userId: string;
  targetEnvironment: 'sandbox' | 'production';
  supportedCurrencies: string[];
  minAmount: number;
  maxAmount: number;
  fees: {
    deposit: number;
    withdraw: number;
    transfer: number;
  };
  endpoints: {
    requestPayment: string;
    getPaymentStatus: string;
    transfer: string;
    balance: string;
  };
}

interface MobileMoneyTransaction {
  id: string;
  provider: string;
  type: 'deposit' | 'withdraw' | 'transfer' | 'payment';
  amount: number;
  currency: string;
  phoneNumber: string;
  reference: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  timestamp: string;
  userId: string;
  metadata?: any;
  fees?: number;
  exchangeRate?: number;
}

interface USSDMenu {
  id: string;
  level: number;
  text: string;
  options: USSDMenuOption[];
  action?: string;
  validation?: string;
}

interface USSDMenuOption {
  key: string;
  text: string;
  nextLevel?: number;
  action?: string;
}

class EnhancedMobileMoneyService {
  private static instance: EnhancedMobileMoneyService;
  private providers: Map<string, MobileMoneyProvider> = new Map();
  private ussdMenus: Map<number, USSDMenu> = new Map();

  private constructor() {
    this.initializeProviders();
    this.initializeUSSDMenus();
  }

  public static getInstance(): EnhancedMobileMoneyService {
    if (!EnhancedMobileMoneyService.instance) {
      EnhancedMobileMoneyService.instance = new EnhancedMobileMoneyService();
    }
    return EnhancedMobileMoneyService.instance;
  }

  private initializeProviders(): void {
    // MTN Mobile Money (Momo)
    this.providers.set('mtn_momo', {
      id: 'mtn_momo',
      name: 'MTN Mobile Money',
      country: 'Zambia',
      baseURL: 'https://sandbox.momodeveloper.mtn.com',
      apiKey: process.env.MTN_MOMO_API_KEY || '',
      userId: process.env.MTN_MOMO_USER_ID || '',
      targetEnvironment: 'sandbox',
      supportedCurrencies: ['ZMW'],
      minAmount: 1,
      maxAmount: 10000,
      fees: {
        deposit: 0,
        withdraw: 2.5,
        transfer: 1.5
      },
      endpoints: {
        requestPayment: '/collection/v1_0/requesttopay',
        getPaymentStatus: '/collection/v1_0/requesttopay',
        transfer: '/disbursement/v1_0/transfer',
        balance: '/collection/v1_0/account/balance'
      }
    });

    // Airtel Money
    this.providers.set('airtel_money', {
      id: 'airtel_money',
      name: 'Airtel Money',
      country: 'Zambia',
      baseURL: 'https://openapiuat.airtel.africa',
      apiKey: process.env.AIRTEL_MONEY_API_KEY || '',
      userId: process.env.AIRTEL_MONEY_USER_ID || '',
      targetEnvironment: 'sandbox',
      supportedCurrencies: ['ZMW'],
      minAmount: 1,
      maxAmount: 10000,
      fees: {
        deposit: 0,
        withdraw: 2.0,
        transfer: 1.0
      },
      endpoints: {
        requestPayment: '/merchant/v1/payments/',
        getPaymentStatus: '/standard/v1/payments/',
        transfer: '/standard/v1/disbursements/',
        balance: '/standard/v1/accounts/balance'
      }
    });

    // Zamtel Kwacha
    this.providers.set('zamtel_kwacha', {
      id: 'zamtel_kwacha',
      name: 'Zamtel Kwacha',
      country: 'Zambia',
      baseURL: 'https://api.zamtel.co.zm',
      apiKey: process.env.ZAMTEL_KWACHA_API_KEY || '',
      userId: process.env.ZAMTEL_KWACHA_USER_ID || '',
      targetEnvironment: 'sandbox',
      supportedCurrencies: ['ZMW'],
      minAmount: 1,
      maxAmount: 10000,
      fees: {
        deposit: 0,
        withdraw: 2.0,
        transfer: 1.0
      },
      endpoints: {
        requestPayment: '/v1/payments/request',
        getPaymentStatus: '/v1/payments/status',
        transfer: '/v1/transfers',
        balance: '/v1/account/balance'
      }
    });

    // Orange Money (for other African countries)
    this.providers.set('orange_money', {
      id: 'orange_money',
      name: 'Orange Money',
      country: 'Multi-country',
      baseURL: 'https://api.orange.com',
      apiKey: process.env.ORANGE_MONEY_API_KEY || '',
      userId: process.env.ORANGE_MONEY_USER_ID || '',
      targetEnvironment: 'sandbox',
      supportedCurrencies: ['XOF', 'XAF', 'MAD'],
      minAmount: 1,
      maxAmount: 10000,
      fees: {
        deposit: 0,
        withdraw: 2.0,
        transfer: 1.0
      },
      endpoints: {
        requestPayment: '/orange-money-webpay/v1/webpayment',
        getPaymentStatus: '/orange-money-webpay/v1/transactionstatus',
        transfer: '/orange-money-webpay/v1/transfer',
        balance: '/orange-money-webpay/v1/balance'
      }
    });
  }

  private initializeUSSDMenus(): void {
    // Main Menu (Level 0)
    this.ussdMenus.set(0, {
      id: 'main_menu',
      level: 0,
      text: 'CON Welcome to Enerlectra Energy Trading\n\n1. Energy Trading\n2. Mobile Money\n3. Account Balance\n4. Transaction History\n5. AI Assistant\n6. Settings\n0. Exit',
      options: [
        { key: '1', text: 'Energy Trading', nextLevel: 1 },
        { key: '2', text: 'Mobile Money', nextLevel: 2 },
        { key: '3', text: 'Account Balance', action: 'show_balance' },
        { key: '4', text: 'Transaction History', action: 'show_history' },
        { key: '5', text: 'AI Assistant', nextLevel: 5 },
        { key: '6', text: 'Settings', nextLevel: 6 },
        { key: '0', text: 'Exit', action: 'exit' }
      ]
    });

    // Energy Trading Menu (Level 1)
    this.ussdMenus.set(1, {
      id: 'energy_trading',
      level: 1,
      text: 'CON Energy Trading\n\n1. Buy Energy\n2. Sell Energy\n3. View Offers\n4. My Trades\n0. Back',
      options: [
        { key: '1', text: 'Buy Energy', nextLevel: 11 },
        { key: '2', text: 'Sell Energy', nextLevel: 12 },
        { key: '3', text: 'View Offers', action: 'show_offers' },
        { key: '4', text: 'My Trades', action: 'show_my_trades' },
        { key: '0', text: 'Back', nextLevel: 0 }
      ]
    });

    // Mobile Money Menu (Level 2)
    this.ussdMenus.set(2, {
      id: 'mobile_money',
      level: 2,
      text: 'CON Mobile Money Services\n\n1. Deposit Money\n2. Withdraw Money\n3. Send Money\n4. Transaction History\n5. Provider Settings\n0. Back',
      options: [
        { key: '1', text: 'Deposit Money', nextLevel: 21 },
        { key: '2', text: 'Withdraw Money', nextLevel: 22 },
        { key: '3', text: 'Send Money', nextLevel: 23 },
        { key: '4', text: 'Transaction History', action: 'show_mm_history' },
        { key: '5', text: 'Provider Settings', nextLevel: 25 },
        { key: '0', text: 'Back', nextLevel: 0 }
      ]
    });

    // Deposit Money Menu (Level 21)
    this.ussdMenus.set(21, {
      id: 'deposit_money',
      level: 21,
      text: 'CON Deposit Money\n\nSelect Provider:\n1. MTN Mobile Money\n2. Airtel Money\n3. Zamtel Kwacha\n0. Back',
      options: [
        { key: '1', text: 'MTN Mobile Money', nextLevel: 211 },
        { key: '2', text: 'Airtel Money', nextLevel: 212 },
        { key: '3', text: 'Zamtel Kwacha', nextLevel: 213 },
        { key: '0', text: 'Back', nextLevel: 2 }
      ]
    });

    // MTN Mobile Money Deposit (Level 211)
    this.ussdMenus.set(211, {
      id: 'mtn_deposit',
      level: 211,
      text: 'CON MTN Mobile Money Deposit\n\nEnter amount to deposit:\n(Min: 1 ZMW, Max: 10000 ZMW)',
      options: [],
      action: 'deposit_amount',
      validation: 'amount:1:10000'
    });

    // Airtel Money Deposit (Level 212)
    this.ussdMenus.set(212, {
      id: 'airtel_deposit',
      level: 212,
      text: 'CON Airtel Money Deposit\n\nEnter amount to deposit:\n(Min: 1 ZMW, Max: 10000 ZMW)',
      options: [],
      action: 'deposit_amount',
      validation: 'amount:1:10000'
    });

    // Zamtel Kwacha Deposit (Level 213)
    this.ussdMenus.set(213, {
      id: 'zamtel_deposit',
      level: 213,
      text: 'CON Zamtel Kwacha Deposit\n\nEnter amount to deposit:\n(Min: 1 ZMW, Max: 10000 ZMW)',
      options: [],
      action: 'deposit_amount',
      validation: 'amount:1:10000'
    });

    // AI Assistant Menu (Level 5)
    this.ussdMenus.set(5, {
      id: 'ai_assistant',
      level: 5,
      text: 'CON AI Energy Assistant\n\n1. Energy Advice\n2. Market Insights\n3. Usage Tips\n4. Carbon Tracking\n0. Back',
      options: [
        { key: '1', text: 'Energy Advice', action: 'ai_energy_advice' },
        { key: '2', text: 'Market Insights', action: 'ai_market_insights' },
        { key: '3', text: 'Usage Tips', action: 'ai_usage_tips' },
        { key: '4', text: 'Carbon Tracking', action: 'ai_carbon_tracking' },
        { key: '0', text: 'Back', nextLevel: 0 }
      ]
    });
  }

  public async processUSSDRequest(text: string, phoneNumber: string): Promise<string> {
    try {
      const menuPath = text || '';
      const menuLevels = menuPath.split('*').filter(level => level !== '');
      const currentLevel = menuLevels.length;

      // Get user data
      const users = readJsonFile('users.json');
      let user = users.find(u => u.phoneNumber === phoneNumber);

      if (!user) {
        // Create new user
        user = {
          id: generateId(),
          name: `User ${phoneNumber.slice(-4)}`,
          balanceZMW: 0,
          balanceKWh: 0,
          phoneNumber,
          createdAt: new Date().toISOString()
        };
        users.push(user);
        writeJsonFile('users.json', users);
      }

      // Handle menu navigation
      if (currentLevel === 0) {
        return this.ussdMenus.get(0)?.text || 'END Welcome to Enerlectra';
      }

      const currentMenu = this.ussdMenus.get(currentLevel - 1);
      if (!currentMenu) {
        return 'END Invalid menu selection. Please try again.';
      }

      const selectedOption = currentMenu.options.find(opt => opt.key === menuLevels[currentLevel - 1]);
      if (!selectedOption) {
        return 'END Invalid selection. Please try again.';
      }

      // Handle actions
      if (selectedOption.action) {
        return await this.handleUSSDAction(selectedOption.action, menuLevels, user);
      }

      // Navigate to next level
      if (selectedOption.nextLevel !== undefined) {
        const nextMenu = this.ussdMenus.get(selectedOption.nextLevel);
        return nextMenu?.text || 'END Menu not found.';
      }

      return 'END Invalid selection. Please try again.';

    } catch (error) {
      logger.error('USSD processing error:', error);
      return 'END System error. Please try again later.';
    }
  }

  private async handleUSSDAction(action: string, menuLevels: string[], user: any): Promise<string> {
    switch (action) {
      case 'show_balance':
        return `END Account Balance:\n\nZMW: ${user.balanceZMW.toFixed(2)}\nEnergy: ${user.balanceKWh.toFixed(2)} kWh\n\nLast updated: ${new Date().toLocaleString()}`;

      case 'show_history':
        const transactions = readJsonFile('transactions.json');
        const userTransactions = transactions.filter(t => t.userId === user.id).slice(-5);
        
        let historyText = 'END Recent Transactions:\n\n';
        if (userTransactions.length === 0) {
          historyText += 'No recent transactions.';
        } else {
          userTransactions.forEach((tx, i) => {
            historyText += `${i + 1}. ${tx.type.toUpperCase()}: ${tx.amount} ${tx.currency}\n   ${new Date(tx.timestamp).toLocaleDateString()}\n`;
          });
        }
        return historyText;

      case 'deposit_amount':
        const amount = parseFloat(menuLevels[menuLevels.length - 1]);
        if (isNaN(amount) || amount < 1 || amount > 10000) {
          return 'END Invalid amount. Please enter between 1 and 10000 ZMW.';
        }

        // Determine provider from menu path
        let provider = 'mtn_momo';
        if (menuLevels.includes('2')) provider = 'airtel_money';
        if (menuLevels.includes('3')) provider = 'zamtel_kwacha';

        const transactionId = await this.initiateDeposit(provider, amount, user.phoneNumber, user.id);
        
        return `END Deposit initiated!\n\nAmount: ${amount} ZMW\nProvider: ${this.providers.get(provider)?.name}\nReference: ${transactionId}\n\nYou will receive a payment request on your phone.`;

      case 'ai_energy_advice':
        return `END Energy Advice:\n\n• Use energy during off-peak hours (6AM-10AM, 6PM-10PM)\n• Consider solar panels for long-term savings\n• Monitor your usage with smart meters\n• Join energy clusters for better rates\n\nFor personalized advice, visit our web platform.`;

      case 'ai_market_insights':
        return `END Market Insights:\n\nCurrent Rates:\n• Energy: 1.2 ZMW/kWh\n• Carbon Savings: 0.8 kg CO2/kWh\n• Peak Hours: 10AM-6PM\n• Off-Peak: 6PM-10AM\n\nMarket is stable with moderate demand.`;

      case 'ai_usage_tips':
        return `END Usage Tips:\n\n• Turn off lights when not needed\n• Use energy-efficient appliances\n• Consider LED bulbs\n• Unplug devices when not in use\n• Use natural light during day\n\nSave up to 30% on energy costs!`;

      case 'ai_carbon_tracking':
        const totalCarbonSaved = userTransactions?.reduce((sum, t) => sum + (t.carbonSaved || 0), 0) || 0;
        return `END Carbon Tracking:\n\nTotal CO2 Saved: ${totalCarbonSaved.toFixed(1)} kg\n\nThis is equivalent to:\n• ${(totalCarbonSaved * 0.4).toFixed(1)} trees planted\n• ${(totalCarbonSaved * 0.1).toFixed(1)} cars off road\n\nKeep trading to save more!`;

      case 'exit':
        return 'END Thank you for using Enerlectra. Have a great day!';

      default:
        return 'END Action not implemented yet.';
    }
  }

  public async initiateDeposit(providerId: string, amount: number, phoneNumber: string, userId: string): Promise<string> {
    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        throw new Error(`Provider ${providerId} not found`);
      }

      const transactionId = generateId();
      const reference = `ENERLECTRA_${transactionId}`;

      // Create transaction record
      const transaction: MobileMoneyTransaction = {
        id: transactionId,
        provider: providerId,
        type: 'deposit',
        amount,
        currency: 'ZMW',
        phoneNumber,
        reference,
        status: 'pending',
        timestamp: new Date().toISOString(),
        userId,
        fees: provider.fees.deposit
      };

      // Save transaction
      const transactions = readJsonFile('mobile_money_transactions.json');
      transactions.push(transaction);
      writeJsonFile('mobile_money_transactions.json', transactions);

      // Initiate payment with provider
      await this.requestPayment(provider, amount, phoneNumber, reference);

      return transactionId;
    } catch (error) {
      logger.error('Deposit initiation failed:', error);
      throw error;
    }
  }

  private async requestPayment(provider: MobileMoneyProvider, amount: number, phoneNumber: string, reference: string): Promise<any> {
    try {
      const client = axios.create({
        baseURL: provider.baseURL,
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'X-Target-Environment': provider.targetEnvironment,
          'Content-Type': 'application/json'
        }
      });

      const payload = {
        amount,
        currency: 'ZMW',
        externalId: reference,
        payer: {
          partyIdType: 'MSISDN',
          partyId: phoneNumber
        },
        payerMessage: 'Enerlectra Energy Trading Deposit',
        payeeNote: `Deposit for energy trading - ${amount} ZMW`
      };

      const response = await client.post(provider.endpoints.requestPayment, payload);
      return response.data;
    } catch (error) {
      logger.error(`Payment request failed for ${provider.name}:`, error);
      throw error;
    }
  }

  public async getPaymentStatus(providerId: string, referenceId: string): Promise<any> {
    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        throw new Error(`Provider ${providerId} not found`);
      }

      const client = axios.create({
        baseURL: provider.baseURL,
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'X-Target-Environment': provider.targetEnvironment,
          'Content-Type': 'application/json'
        }
      });

      const response = await client.get(`${provider.endpoints.getPaymentStatus}/${referenceId}`);
      return response.data;
    } catch (error) {
      logger.error(`Payment status check failed for ${providerId}:`, error);
      throw error;
    }
  }

  public async transferMoney(providerId: string, amount: number, fromPhone: string, toPhone: string, userId: string): Promise<string> {
    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        throw new Error(`Provider ${providerId} not found`);
      }

      const transactionId = generateId();
      const reference = `ENERLECTRA_TRANSFER_${transactionId}`;

      // Create transaction record
      const transaction: MobileMoneyTransaction = {
        id: transactionId,
        provider: providerId,
        type: 'transfer',
        amount,
        currency: 'ZMW',
        phoneNumber: fromPhone,
        reference,
        status: 'pending',
        timestamp: new Date().toISOString(),
        userId,
        fees: provider.fees.transfer,
        metadata: { toPhone }
      };

      // Save transaction
      const transactions = readJsonFile('mobile_money_transactions.json');
      transactions.push(transaction);
      writeJsonFile('mobile_money_transactions.json', transactions);

      // Execute transfer
      await this.executeTransfer(provider, amount, fromPhone, toPhone, reference);

      return transactionId;
    } catch (error) {
      logger.error('Money transfer failed:', error);
      throw error;
    }
  }

  private async executeTransfer(provider: MobileMoneyProvider, amount: number, fromPhone: string, toPhone: string, reference: string): Promise<any> {
    try {
      const client = axios.create({
        baseURL: provider.baseURL,
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'X-Target-Environment': provider.targetEnvironment,
          'Content-Type': 'application/json'
        }
      });

      const payload = {
        amount,
        currency: 'ZMW',
        externalId: reference,
        payee: {
          partyIdType: 'MSISDN',
          partyId: toPhone
        },
        payerMessage: 'Enerlectra Energy Trading Transfer',
        payeeNote: `Transfer from ${fromPhone} - ${amount} ZMW`
      };

      const response = await client.post(provider.endpoints.transfer, payload);
      return response.data;
    } catch (error) {
      logger.error(`Transfer execution failed for ${provider.name}:`, error);
      throw error;
    }
  }

  public getSupportedProviders(): MobileMoneyProvider[] {
    return Array.from(this.providers.values());
  }

  public getProviderById(providerId: string): MobileMoneyProvider | undefined {
    return this.providers.get(providerId);
  }

  public async processWebhook(providerId: string, payload: any, signature: string): Promise<void> {
    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        throw new Error(`Provider ${providerId} not found`);
      }

      // Verify webhook signature
      if (!this.verifyWebhookSignature(provider, payload, signature)) {
        throw new Error('Invalid webhook signature');
      }

      // Process webhook based on provider
      switch (providerId) {
        case 'mtn_momo':
          await this.processMTNWebhook(payload);
          break;
        case 'airtel_money':
          await this.processAirtelWebhook(payload);
          break;
        case 'zamtel_kwacha':
          await this.processZamtelWebhook(payload);
          break;
        default:
          logger.warn(`Webhook processing not implemented for ${providerId}`);
      }
    } catch (error) {
      logger.error('Webhook processing failed:', error);
      throw error;
    }
  }

  private verifyWebhookSignature(provider: MobileMoneyProvider, payload: any, signature: string): boolean {
    // Implement signature verification based on provider
    // This is a simplified version - implement proper verification
    return true;
  }

  private async processMTNWebhook(payload: any): Promise<void> {
    // Process MTN Mobile Money webhook
    const { externalId, status } = payload;
    
    if (status === 'SUCCESSFUL') {
      await this.updateTransactionStatus(externalId, 'completed');
    } else if (status === 'FAILED') {
      await this.updateTransactionStatus(externalId, 'failed');
    }
  }

  private async processAirtelWebhook(payload: any): Promise<void> {
    // Process Airtel Money webhook
    const { transactionId, status } = payload;
    
    if (status === 'SUCCESS') {
      await this.updateTransactionStatus(transactionId, 'completed');
    } else if (status === 'FAILED') {
      await this.updateTransactionStatus(transactionId, 'failed');
    }
  }

  private async processZamtelWebhook(payload: any): Promise<void> {
    // Process Zamtel Kwacha webhook
    const { reference, status } = payload;
    
    if (status === 'COMPLETED') {
      await this.updateTransactionStatus(reference, 'completed');
    } else if (status === 'FAILED') {
      await this.updateTransactionStatus(reference, 'failed');
    }
  }

  private async updateTransactionStatus(reference: string, status: string): Promise<void> {
    try {
      const transactions = readJsonFile('mobile_money_transactions.json');
      const transaction = transactions.find(t => t.reference === reference);
      
      if (transaction) {
        transaction.status = status as any;
        writeJsonFile('mobile_money_transactions.json', transactions);
        
        // Update user balance if deposit completed
        if (status === 'completed' && transaction.type === 'deposit') {
          const users = readJsonFile('users.json');
          const user = users.find(u => u.id === transaction.userId);
          
          if (user) {
            user.balanceZMW += transaction.amount;
            writeJsonFile('users.json', users);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to update transaction status:', error);
    }
  }
}

export default EnhancedMobileMoneyService;



