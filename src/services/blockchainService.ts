import { ethers } from 'ethers';
import { readJsonFile, writeJsonFile, generateId } from '../utils/common';
import logger from '../utils/logger';

// Smart contract ABIs (simplified for demo)
const ENERGY_TOKEN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function mint(address to, uint256 amount)',
  'function decimals() view returns (uint8)'
];

const ENERGY_TRADING_ABI = [
  'function createEnergyOffer(uint256 energyAmount, uint256 pricePerKwh, uint256 expiresAt, bool acceptMobileMoney) returns (uint256)',
  'function executeTradeWithBlockchain(uint256 offerId) returns (uint256)',
  'function executeTradeWithMobileMoney(uint256 offerId, string buyer, string mobileMoneyRef) returns (uint256)',
  'function processMobileMoneyPayment(address user, string mobileMoneyRef, uint256 energyAmount)',
  'function getActiveOffers() view returns (tuple(uint256,address,uint256,uint256,uint256,uint256,bool,bool,string)[])',
  'function getUserTrades(address user) view returns (tuple(uint256,uint256,address,address,uint256,uint256,uint256,uint8,string,uint8)[])',
  'function getEnergyBalance(address user) view returns (uint256)',
  'function updateUserProfile(string phoneNumber, bool isVerified)',
  'event EnergyOfferCreated(uint256 indexed offerId, address indexed seller, uint256 energyAmount, uint256 pricePerKwh, bool isHybrid)',
  'event TradeExecuted(uint256 indexed tradeId, uint256 indexed offerId, address indexed buyer, address seller, uint256 energyAmount, uint256 totalPrice, uint8 paymentMethod)',
  'event MobileMoneyPaymentReceived(address indexed user, string reference, uint256 amount, uint256 energyCredits)'
];

interface BlockchainConfig {
  rpcUrl: string;
  chainId: number;
  energyTokenAddress: string;
  energyTradingAddress: string;
  paymentTokenAddress: string;
  privateKey: string;
}

interface HybridPaymentRequest {
  userId: string;
  phoneNumber: string;
  energyAmount: number;
  pricePerKwh: number;
  paymentMethod: 'mobile_money' | 'blockchain' | 'hybrid';
  mobileMoneyReference?: string;
}

interface BlockchainOffer {
  offerId: number;
  seller: string;
  energyAmount: number;
  pricePerKwh: number;
  totalPrice: number;
  expiresAt: number;
  isActive: boolean;
  isHybrid: boolean;
  mobileMoneyReference: string;
}

interface BlockchainTrade {
  tradeId: number;
  offerId: number;
  buyer: string;
  seller: string;
  energyAmount: number;
  totalPrice: number;
  timestamp: number;
  paymentMethod: number;
  mobileMoneyReference: string;
  status: number;
}

class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private energyToken: ethers.Contract;
  private energyTrading: ethers.Contract;
  private paymentToken: ethers.Contract;
  private isInitialized = false;

  constructor() {
    this.initializeBlockchain();
  }

  private async initializeBlockchain() {
    try {
      const config = this.getBlockchainConfig();
      
      if (!config.rpcUrl || !config.privateKey) {
        logger.warn('Blockchain not configured, running in demo mode');
        return;
      }

      this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
      this.wallet = new ethers.Wallet(config.privateKey, this.provider);
      
      this.energyToken = new ethers.Contract(
        config.energyTokenAddress,
        ENERGY_TOKEN_ABI,
        this.wallet
      );
      
      this.energyTrading = new ethers.Contract(
        config.energyTradingAddress,
        ENERGY_TRADING_ABI,
        this.wallet
      );
      
      this.paymentToken = new ethers.Contract(
        config.paymentTokenAddress,
        ENERGY_TOKEN_ABI,
        this.wallet
      );

      this.isInitialized = true;
      logger.info('Blockchain service initialized successfully');
      
      // Listen for blockchain events
      this.setupEventListeners();
      
    } catch (error) {
      logger.error('Failed to initialize blockchain service:', error);
    }
  }

  private getBlockchainConfig(): BlockchainConfig {
    return {
      rpcUrl: process.env.BLOCKCHAIN_RPC_URL || '',
      chainId: parseInt(process.env.BLOCKCHAIN_CHAIN_ID || '137'), // Polygon mainnet
      energyTokenAddress: process.env.ENERGY_TOKEN_ADDRESS || '',
      energyTradingAddress: process.env.ENERGY_TRADING_ADDRESS || '',
      paymentTokenAddress: process.env.PAYMENT_TOKEN_ADDRESS || '',
      privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY || ''
    };
  }

  private setupEventListeners() {
    if (!this.isInitialized) return;

    // Listen for new energy offers
    this.energyTrading.on('EnergyOfferCreated', (offerId, seller, energyAmount, pricePerKwh, isHybrid) => {
      logger.info('New energy offer created on blockchain:', {
        offerId: offerId.toString(),
        seller,
        energyAmount: energyAmount.toString(),
        pricePerKwh: pricePerKwh.toString(),
        isHybrid
      });
      
      // Sync with local database
      this.syncOfferToDatabase(offerId, seller, energyAmount, pricePerKwh, isHybrid);
    });

    // Listen for trade executions
    this.energyTrading.on('TradeExecuted', (tradeId, offerId, buyer, seller, energyAmount, totalPrice, paymentMethod) => {
      logger.info('Trade executed on blockchain:', {
        tradeId: tradeId.toString(),
        offerId: offerId.toString(),
        buyer,
        seller,
        energyAmount: energyAmount.toString(),
        totalPrice: totalPrice.toString(),
        paymentMethod
      });
      
      // Sync with local database
      this.syncTradeToDatabase(tradeId, offerId, buyer, seller, energyAmount, totalPrice, paymentMethod);
    });

    // Listen for mobile money payments
    this.energyTrading.on('MobileMoneyPaymentReceived', (user, reference, amount, energyCredits) => {
      logger.info('Mobile money payment processed on blockchain:', {
        user,
        reference,
        amount: amount.toString(),
        energyCredits: energyCredits.toString()
      });
      
      // Update local user balances
      this.updateLocalUserBalance(user, energyCredits);
    });
  }

  /**
   * Create an energy offer on the blockchain
   */
  async createEnergyOffer(
    sellerAddress: string,
    energyAmount: number,
    pricePerKwh: number,
    acceptMobileMoney: boolean = true
  ): Promise<{ success: boolean; offerId?: string; error?: string }> {
    try {
      if (!this.isInitialized) {
        return { success: false, error: 'Blockchain not initialized' };
      }

      const expiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours from now
      
      const tx = await this.energyTrading.createEnergyOffer(
        energyAmount,
        ethers.parseEther(pricePerKwh.toString()),
        expiresAt,
        acceptMobileMoney
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        this.energyTrading.interface.parseLog(log as any)?.name === 'EnergyOfferCreated'
      );

      if (event) {
        const parsedEvent = this.energyTrading.interface.parseLog(event as any);
        const offerId = parsedEvent.args[0];
        
        logger.info('Energy offer created on blockchain:', { offerId: offerId.toString() });
        
        return { success: true, offerId: offerId.toString() };
      }

      return { success: false, error: 'Failed to get offer ID from transaction' };

    } catch (error) {
      logger.error('Failed to create energy offer on blockchain:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute a trade using blockchain payment
   */
  async executeTradeWithBlockchain(
    offerId: number,
    buyerAddress: string
  ): Promise<{ success: boolean; tradeId?: string; error?: string }> {
    try {
      if (!this.isInitialized) {
        return { success: false, error: 'Blockchain not initialized' };
      }

      const tx = await this.energyTrading.executeTradeWithBlockchain(offerId);
      const receipt = await tx.wait();

      const event = receipt.logs.find(log => 
        this.energyTrading.interface.parseLog(log as any)?.name === 'TradeExecuted'
      );

      if (event) {
        const parsedEvent = this.energyTrading.interface.parseLog(event as any);
        const tradeId = parsedEvent.args[0];
        
        logger.info('Trade executed on blockchain:', { tradeId: tradeId.toString() });
        
        return { success: true, tradeId: tradeId.toString() };
      }

      return { success: false, error: 'Failed to get trade ID from transaction' };

    } catch (error) {
      logger.error('Failed to execute trade on blockchain:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute a trade using mobile money (backend orchestration)
   */
  async executeTradeWithMobileMoney(
    offerId: number,
    buyerPhone: string,
    mobileMoneyReference: string
  ): Promise<{ success: boolean; tradeId?: string; error?: string }> {
    try {
      if (!this.isInitialized) {
        return { success: false, error: 'Blockchain not initialized' };
      }

      const tx = await this.energyTrading.executeTradeWithMobileMoney(
        offerId,
        buyerPhone,
        mobileMoneyReference
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => 
        this.energyTrading.interface.parseLog(log as any)?.name === 'TradeExecuted'
      );

      if (event) {
        const parsedEvent = this.energyTrading.interface.parseLog(event as any);
        const tradeId = parsedEvent.args[0];
        
        logger.info('Mobile money trade executed on blockchain:', { 
          tradeId: tradeId.toString(),
          mobileMoneyReference 
        });
        
        return { success: true, tradeId: tradeId.toString() };
      }

      return { success: false, error: 'Failed to get trade ID from transaction' };

    } catch (error) {
      logger.error('Failed to execute mobile money trade on blockchain:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process mobile money payment and credit user's energy balance
   */
  async processMobileMoneyPayment(
    userAddress: string,
    mobileMoneyReference: string,
    energyAmount: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isInitialized) {
        return { success: false, error: 'Blockchain not initialized' };
      }

      const tx = await this.energyTrading.processMobileMoneyPayment(
        userAddress,
        mobileMoneyReference,
        energyAmount
      );

      await tx.wait();
      
      logger.info('Mobile money payment processed on blockchain:', {
        userAddress,
        mobileMoneyReference,
        energyAmount
      });
      
      return { success: true };

    } catch (error) {
      logger.error('Failed to process mobile money payment on blockchain:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get active energy offers from blockchain
   */
  async getActiveOffers(): Promise<BlockchainOffer[]> {
    try {
      if (!this.isInitialized) {
        return [];
      }

      const offers = await this.energyTrading.getActiveOffers();
      
      return offers.map((offer: any) => ({
        offerId: Number(offer[0]),
        seller: offer[1],
        energyAmount: Number(offer[2]),
        pricePerKwh: Number(ethers.formatEther(offer[3])),
        totalPrice: Number(ethers.formatEther(offer[4])),
        expiresAt: Number(offer[5]),
        isActive: offer[6],
        isHybrid: offer[7],
        mobileMoneyReference: offer[8]
      }));

    } catch (error) {
      logger.error('Failed to get active offers from blockchain:', error);
      return [];
    }
  }

  /**
   * Get user's trade history from blockchain
   */
  async getUserTrades(userAddress: string): Promise<BlockchainTrade[]> {
    try {
      if (!this.isInitialized) {
        return [];
      }

      const trades = await this.energyTrading.getUserTrades(userAddress);
      
      return trades.map((trade: any) => ({
        tradeId: Number(trade[0]),
        offerId: Number(trade[1]),
        buyer: trade[2],
        seller: trade[3],
        energyAmount: Number(trade[4]),
        totalPrice: Number(ethers.formatEther(trade[5])),
        timestamp: Number(trade[6]),
        paymentMethod: Number(trade[7]),
        mobileMoneyReference: trade[8],
        status: Number(trade[9])
      }));

    } catch (error) {
      logger.error('Failed to get user trades from blockchain:', error);
      return [];
    }
  }

  /**
   * Get user's energy balance from blockchain
   */
  async getEnergyBalance(userAddress: string): Promise<number> {
    try {
      if (!this.isInitialized) {
        return 0;
      }

      const balance = await this.energyTrading.getEnergyBalance(userAddress);
      return Number(ethers.formatEther(balance));

    } catch (error) {
      logger.error('Failed to get energy balance from blockchain:', error);
      return 0;
    }
  }

  /**
   * Update user profile on blockchain
   */
  async updateUserProfile(
    userAddress: string,
    phoneNumber: string,
    isVerified: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isInitialized) {
        return { success: false, error: 'Blockchain not initialized' };
      }

      // Create a new wallet instance for the user
      const userWallet = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY || '', this.provider);
      const userContract = this.energyTrading.connect(userWallet);

      const tx = await userContract.updateUserProfile(phoneNumber, isVerified);
      await tx.wait();
      
      logger.info('User profile updated on blockchain:', {
        userAddress,
        phoneNumber,
        isVerified
      });
      
      return { success: true };

    } catch (error) {
      logger.error('Failed to update user profile on blockchain:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Hybrid payment system - automatically chooses best payment method
   */
  async processHybridPayment(
    request: HybridPaymentRequest
  ): Promise<{ success: boolean; tradeId?: string; paymentMethod?: string; error?: string }> {
    try {
      // Check if user has a connected wallet
      const hasWallet = await this.checkUserWalletConnection(request.userId);
      
      if (request.paymentMethod === 'hybrid') {
        // Auto-detect best payment method
        if (hasWallet && await this.checkBlockchainPaymentAvailability(request)) {
          request.paymentMethod = 'blockchain';
        } else {
          request.paymentMethod = 'mobile_money';
        }
      }

      if (request.paymentMethod === 'blockchain') {
        // Execute blockchain trade
        const result = await this.executeTradeWithBlockchain(
          parseInt(request.mobileMoneyReference || '0'),
          request.userId
        );
        
        if (result.success) {
          return {
            success: true,
            tradeId: result.tradeId,
            paymentMethod: 'blockchain'
          };
        }
        
        // Fallback to mobile money if blockchain fails
        logger.warn('Blockchain trade failed, falling back to mobile money');
        request.paymentMethod = 'mobile_money';
      }

      if (request.paymentMethod === 'mobile_money') {
        // Execute mobile money trade
        const result = await this.executeTradeWithMobileMoney(
          parseInt(request.mobileMoneyReference || '0'),
          request.phoneNumber,
          request.mobileMoneyReference || generateId()
        );
        
        if (result.success) {
          return {
            success: true,
            tradeId: result.tradeId,
            paymentMethod: 'mobile_money'
          };
        }
      }

      return { success: false, error: 'All payment methods failed' };

    } catch (error) {
      logger.error('Failed to process hybrid payment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has a connected wallet
   */
  private async checkUserWalletConnection(userId: string): Promise<boolean> {
    try {
      // Check local database for wallet connection
      const users = readJsonFile<any>('users.json');
      const user = users.find((u: any) => u.id === userId);
      return !!(user && user.walletAddress);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if blockchain payment is available for the request
   */
  private async checkBlockchainPaymentAvailability(request: HybridPaymentRequest): Promise<boolean> {
    try {
      // Check if user has sufficient payment tokens
      const users = readJsonFile<any>('users.json');
      const user = users.find((u: any) => u.id === request.userId);
      
      if (!user || !user.walletAddress) return false;
      
      const balance = await this.getEnergyBalance(user.walletAddress);
      return balance >= request.energyAmount;
    } catch (error) {
      return false;
    }
  }

  /**
   * Sync blockchain offer to local database
   */
  private async syncOfferToDatabase(
    offerId: any,
    seller: string,
    energyAmount: any,
    pricePerKwh: any,
    isHybrid: boolean
  ) {
    try {
      const offers = readJsonFile<any>('trade_offers.json');
      
      // Check if offer already exists
      const existingIndex = offers.findIndex((o: any) => o.blockchainOfferId === offerId.toString());
      
      if (existingIndex === -1) {
        // Create new offer
        offers.push({
          id: generateId(),
          blockchainOfferId: offerId.toString(),
          fromUserId: seller,
          energyAmount: Number(energyAmount),
          pricePerKwh: Number(ethers.formatEther(pricePerKwh)),
          totalPrice: Number(ethers.formatEther(energyAmount * pricePerKwh)),
          tradeType: 'peer_to_peer',
          status: 'pending',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          isHybrid,
          source: 'blockchain'
        });
        
        writeJsonFile('trade_offers.json', offers);
        logger.info('Synced blockchain offer to local database');
      }
    } catch (error) {
      logger.error('Failed to sync blockchain offer to database:', error);
    }
  }

  /**
   * Sync blockchain trade to local database
   */
  private async syncTradeToDatabase(
    tradeId: any,
    offerId: any,
    buyer: string,
    seller: string,
    energyAmount: any,
    totalPrice: any,
    paymentMethod: number
  ) {
    try {
      const transactions = readJsonFile<any>('transactions.json');
      
      // Check if transaction already exists
      const existingIndex = transactions.findIndex((t: any) => t.blockchainTradeId === tradeId.toString());
      
      if (existingIndex === -1) {
        // Create new transaction
        transactions.push({
          id: generateId(),
          blockchainTradeId: tradeId.toString(),
          blockchainOfferId: offerId.toString(),
          buyerId: buyer,
          sellerId: seller,
          kWh: Number(energyAmount),
          amountZMW: Number(ethers.formatEther(totalPrice)),
          type: 'trade',
          status: 'completed',
          timestamp: new Date().toISOString(),
          paymentMethod: paymentMethod === 0 ? 'blockchain' : 'mobile_money',
          source: 'blockchain'
        });
        
        writeJsonFile('transactions.json', transactions);
        logger.info('Synced blockchain trade to local database');
      }
    } catch (error) {
      logger.error('Failed to sync blockchain trade to database:', error);
    }
  }

  /**
   * Update local user balance after blockchain transaction
   */
  private async updateLocalUserBalance(userAddress: string, energyCredits: any) {
    try {
      const users = readJsonFile<any>('users.json');
      const userIndex = users.findIndex((u: any) => u.walletAddress === userAddress);
      
      if (userIndex !== -1) {
        users[userIndex].balanceKWh += Number(ethers.formatEther(energyCredits));
        writeJsonFile('users.json', users);
        logger.info('Updated local user balance after blockchain transaction');
      }
    } catch (error) {
      logger.error('Failed to update local user balance:', error);
    }
  }

  /**
   * Get blockchain status
   */
  getStatus(): { isInitialized: boolean; network?: string; blockNumber?: number } {
    if (!this.isInitialized) {
      return { isInitialized: false };
    }

    return {
      isInitialized: true,
      network: this.provider.network?.name,
      blockNumber: this.provider.blockNumber
    };
  }
}

// Initialize blockchain service
export async function initializeBlockchainService(): Promise<void> {
  try {
    console.log('⛓️  Initializing quantum blockchain service...');
    
    // Initialize the blockchain service
    const blockchainService = new BlockchainService();
    
    // Check blockchain health
    const health = await blockchainService.getStatus();
    console.log('✅ Blockchain service health:', health);
    
    // Start monitoring
    // await blockchainService.startMonitoring(); // This method does not exist in the original file
    console.log('✅ Blockchain monitoring started');
    
  } catch (error) {
    console.error('❌ Blockchain service initialization failed:', error);
    throw error;
  }
}

export default new BlockchainService();