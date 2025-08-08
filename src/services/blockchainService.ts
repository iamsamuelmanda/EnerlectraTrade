import { ethers } from 'ethers';
import { Transaction, ApiResponse, BlockchainTransaction, TokenBalance } from '../types';
import logger from '../utils/logger';

// Initialize blockchain connection
const provider = new ethers.JsonRpcProvider(
  process.env.BLOCKCHAIN_NODE_URL || 'https://polygon-rpc.com'
);

const wallet = new ethers.Wallet(
  process.env.BLOCKCHAIN_PRIVATE_KEY || '',
  provider
);

// ABI for EnergyToken contract
const ENERGY_TOKEN_ABI = [
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address recipient, uint256 amount) external returns (bool)"
];

// ABI for EnergyTrading contract
const TRADING_ABI = [
  "function createTrade(uint256 kWh, uint256 pricePerkWh) external",
  "function executeTrade(uint256 tradeId) external payable",
  "event TradeCreated(uint256 tradeId, address seller, uint256 kWh, uint256 pricePerkWh)"
];

// Initialize contracts
const energyTokenContract = new ethers.Contract(
  process.env.ENERGY_TOKEN_CONTRACT || '',
  ENERGY_TOKEN_ABI,
  wallet
);

const tradingContract = new ethers.Contract(
  process.env.TRADING_CONTRACT || '',
  TRADING_ABI,
  wallet
);

// Record energy trade on blockchain
export const recordEnergyTrade = async (transaction: Transaction): Promise<ApiResponse> => {
  try {
    // Validate transaction
    if (!transaction.buyerId || !transaction.sellerId || !transaction.kWh) {
      return {
        success: false,
        error: 'Invalid transaction data for blockchain recording'
      };
    }

    // Create trading offer (seller)
    const createTx = await tradingContract.createTrade(
      ethers.parseUnits(transaction.kWh.toString(), 18),
      ethers.parseUnits((transaction.amountZMW / transaction.kWh).toString(), 18)
    );
    
    // Wait for transaction and get receipt
    const createReceipt = await createTx.wait();
    
    // Extract trade ID from event logs
    const tradeCreatedEvent = createReceipt.events?.find((e: any) => e.event === 'TradeCreated');
    const tradeId = tradeCreatedEvent?.args?.tradeId.toString();
    
    if (!tradeId) {
      throw new Error('Trade ID not found in transaction receipt');
    }

    // Execute trade (buyer)
    const executeTx = await tradingContract.executeTrade(tradeId, {
      value: ethers.parseUnits(transaction.amountZMW.toString(), 18)
    });
    
    const executeReceipt = await executeTx.wait();
    const txHash = executeReceipt.transactionHash;
    
    // Prepare blockchain data response
    const blockchainData: BlockchainTransaction = {
      txHash,
      tradeId,
      from: transaction.sellerId,
      to: transaction.buyerId,
      kWh: transaction.kWh,
      amountZMW: transaction.amountZMW
    };
    
    return {
      success: true,
      message: 'Transaction recorded on blockchain',
      blockchainData
    };
  } catch (error: any) {
    logger.error('Blockchain recording failed', error);
    return {
      success: false,
      error: error.message || 'Blockchain transaction failed',
      message: 'Failed to record transaction on blockchain'
    };
  }
};

// Get energy token balance
export const getTokenBalance = async (address: string): Promise<ApiResponse<TokenBalance>> => {
  try {
    const balance = await energyTokenContract.balanceOf(address);
    return {
      success: true,
      data: {
        address,
        balance: ethers.formatUnits(balance, 18)
      }
    };
  } catch (error: any) {
    logger.error('Balance check failed', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch token balance'
    };
  }
};

// Transfer tokens between wallets
export const transferTokens = async (
  fromAddress: string,
  toAddress: string,
  kWh: number
): Promise<ApiResponse<BlockchainTransaction>> => {
  try {
    const transferTx = await energyTokenContract.transfer(
      toAddress,
      ethers.parseUnits(kWh.toString(), 18)
    );
    
    const receipt = await transferTx.wait();
    const txHash = receipt.transactionHash;
    
    return {
      success: true,
      data: {
        txHash,
        from: fromAddress,
        to: toAddress,
        kWh
      }
    };
  } catch (error: any) {
    logger.error('Token transfer failed', error);
    return {
      success: false,
      error: error.message || 'Token transfer failed'
    };
  }
};