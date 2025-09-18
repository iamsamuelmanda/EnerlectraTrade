// src/services/EnerlectraRooftopPlatform.ts
import { EnerlectraCoreService, Coordinates, EnergyAsset, EnergyContract, ConsumptionProfile, OptimizationResult } from './enerlectraCoreService';
import { RooftopClusterService, RooftopCluster, ClusterMember } from './RooftopClusterService';
import { ethers } from 'ethers';

// ==================== TYPE DEFINITIONS ====================
export interface Portfolio {
  userId: string;
  clusters: string[];
  assets: EnergyAsset[];
  contracts: EnergyContract[];
  financialSummary: FinancialSummary;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  roi: number;
  paybackPeriod: number;
}

export interface TradingPortfolio {
  userId: string;
  activeOffers: any[]; // Replace with EnergyOffer type if ABI available
  completedTrades: any[]; // Replace with Trade type if ABI available
  balance: { energy: number; payment: number };
}

// ==================== ENERLECTRA ROOFTOP PLATFORM ====================
export class EnerlectraRooftopPlatform {
  private coreService: EnerlectraCoreService;
  private clusterService: RooftopClusterService;
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private tradingContract: ethers.Contract;

  constructor() {
    this.coreService = new EnerlectraCoreService();
    this.clusterService = new RooftopClusterService();
    this.initializeBlockchain();

    // Contract ABI (replace with actual compiled ABI from EnergyTrading.sol)
    const tradingABI = [
      "function createEnergyOffer(uint256 energyAmount, uint256 pricePerKwh, uint256 expiresAt, bool acceptMobileMoney) external returns (uint256)",
      "function executeTradeWithBlockchain(uint256 offerId) external returns (uint256)",
      "event TradeExecuted(uint256 indexed tradeId, uint256 indexed offerId, address indexed buyer, address seller, uint256 energyAmount, uint256 totalPrice, uint256 paymentMethod)"
    ];
    this.tradingContract = new ethers.Contract(process.env.TRADING_CONTRACT_ADDRESS || '', tradingABI, this.signer);
  }

  private initializeBlockchain(): void {
    this.provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || '');
    this.signer = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY || '', this.provider);
  }

  public async initialize(): Promise<void> {
    await Promise.all([this.coreService.initialize(), this.clusterService.initialize()]);
  }

  public async createCluster(config: any): Promise<RooftopCluster> {
    return await this.clusterService.createCluster(config);
  }

  public async addClusterMember(clusterId: string, userId: string, assetIds: string[], contribution: number): Promise<void> {
    await this.clusterService.addMember(clusterId, userId, assetIds, contribution);
  }

  public async removeClusterMember(clusterId: string, userId: string): Promise<void> {
    await this.clusterService.removeMember(clusterId, userId);
  }

  public async optimizePortfolio(userId: string, location: Coordinates, assets: EnergyAsset[], contracts: EnergyContract[], consumption: ConsumptionProfile): Promise<OptimizationResult> {
    const result = await this.coreService.optimizeEnergy(location, assets, contracts, consumption);

    // Execute trades based on optimization
    for (const alloc of result.allocationPlan.hourlyAllocation) {
      if (alloc.saleOpportunity > 0) {
        const tx = await this.tradingContract.createEnergyOffer(
          ethers.parseUnits(alloc.saleOpportunity.toString(), 18),
          ethers.parseUnits('0.06', 18),
          Math.floor(Date.now() / 1000) + 24 * 3600,
          false
        );
        await tx.wait();
        console.log(`Created offer for ${alloc.saleOpportunity} kWh, tx: ${tx.hash}`);
      }
    }

    await this.updatePortfolio(userId, result);
    return result;
  }

  public async getPortfolio(userId: string): Promise<Portfolio> {
    const db = this.coreService.mongoClient.db();
    const clusters = await db.collection('rooftop_clusters').find({ 'members.userId': userId }).toArray();
    const clusterIds = clusters.map(c => c.id);
    const assets = clusters.flatMap(c => c.assets);
    const contracts = await db.collection('energy_contracts').find().toArray() as EnergyContract[];

    const financialSummary = await this.calculateFinancialSummary(userId, clusters, assets, contracts);
    return {
      userId,
      clusters: clusterIds,
      assets,
      contracts,
      financialSummary
    };
  }

  public async getTradingPortfolio(userId: string): Promise<TradingPortfolio> {
    const filter = { $or: [{ 'buyer': userId }, { 'seller': userId }] };
    const db = this.coreService.mongoClient.db();
    const trades = await db.collection('trades').find(filter).toArray(); // Assuming trades are stored

    return {
      userId,
      activeOffers: [], // Fetch from tradingContract.getActiveOffers() if ABI supports
      completedTrades: trades,
      balance: { energy: 0, payment: 0 } // Fetch from blockchain or DB
    };
  }

  private async calculateFinancialSummary(userId: string, clusters: RooftopCluster[], assets: EnergyAsset[], contracts: EnergyContract[]): Promise<FinancialSummary> {
    let totalRevenue = 0;
    let totalCosts = 0;

    for (const cluster of clusters) {
      const result = cluster.optimizationResults[cluster.optimizationResults.length - 1];
      if (result) {
        totalRevenue += result.financialAnalysis.revenue;
        totalCosts += result.financialAnalysis.costs;
      }
    }

    const netProfit = totalRevenue - totalCosts;
    const roi = netProfit / totalCosts || 0;
    const paybackPeriod = totalCosts > 0 ? totalRevenue / totalCosts : 0;

    return {
      totalRevenue,
      totalCosts,
      netProfit,
      roi,
      paybackPeriod
    };
  }

  private async updatePortfolio(userId: string, result: OptimizationResult): Promise<void> {
    const db = this.coreService.mongoClient.db();
    await db.collection('portfolios').updateOne(
      { userId },
      { $set: { lastOptimization: result, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  public async shutdown(): Promise<void> {
    await Promise.all([this.coreService.shutdown(), this.clusterService.shutdown()]);
  }
}

export default EnerlectraRooftopPlatform;