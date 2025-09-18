// src/services/RooftopClusterService.ts
import { EnerlectraCoreService, Coordinates, EnergyAsset, EnergyContract, ConsumptionProfile, OptimizationResult } from './enerlectraCoreService';
import { ethers } from 'ethers';
import * as fs from 'fs';

// ==================== TYPE DEFINITIONS ====================
export interface RooftopAsset extends EnergyAsset {
  roofArea: number;
  tiltAngle: number;
  azimuth: number;
  installationDate: Date;
  maintenanceHistory: MaintenanceEvent[];
}

export interface MaintenanceEvent {
  date: Date;
  type: string;
  cost: number;
  description: string;
}

export interface ClusterConfig {
  name: string;
  location: Coordinates;
  assets: RooftopAsset[];
  founderId: string;
  initialFunding: number;
  governanceRules?: GovernanceRules;
  tradingRules?: TradingRules;
}

export interface GovernanceRules {
  votingThreshold: number;
  quorumRequirement: number;
  proposalTypes: ProposalType[];
  decisionHistory: any[];
  meetingSchedule: string;
}

export interface TradingRules {
  internalRate: number;
  externalRate: number;
  tradingHours: { start: string; end: string };
  priorityAllocation: string;
  surplusHandling: string;
  minimumReserve: number;
}

export interface ProposalType {
  type: string;
  requiredApproval: number;
  discussionPeriod: number;
}

export interface ClusterMember {
  userId: string;
  assetIds: string[];
  joinedAt: Date;
  contributionAmount: number;
  sharePercentage: number;
  role: string;
  votingPower: number;
  isActive: boolean;
}

export interface RooftopCluster {
  id: string;
  name: string;
  location: Coordinates;
  assets: RooftopAsset[];
  members: ClusterMember[];
  pooledFunds: number;
  governanceRules: GovernanceRules;
  tradingRules: TradingRules;
  optimizationResults: OptimizationResult[];
}

// ==================== ROOFTOP CLUSTER SERVICE ====================
export class RooftopClusterService {
  private coreService: EnerlectraCoreService;
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private tradingContract: ethers.Contract;

  constructor() {
    this.coreService = new EnerlectraCoreService();
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
    await this.coreService.initialize();
  }

  public async createCluster(config: ClusterConfig): Promise<RooftopCluster> {
    const cluster: RooftopCluster = {
      id: crypto.randomUUID(),
      name: config.name,
      location: config.location,
      assets: config.assets,
      members: [{
        userId: config.founderId,
        assetIds: config.assets.map(a => a.id),
        joinedAt: new Date(),
        contributionAmount: config.initialFunding,
        sharePercentage: 100,
        role: 'coordinator',
        votingPower: 100,
        isActive: true
      }],
      pooledFunds: config.initialFunding,
      governanceRules: config.governanceRules || this.getDefaultGovernanceRules(),
      tradingRules: config.tradingRules || this.getDefaultTradingRules(),
      optimizationResults: []
    };

    await this.saveCluster(cluster);
    await this.optimizeClusterEnergy(cluster);
    return cluster;
  }

  public async addMember(clusterId: string, userId: string, assetIds: string[], contribution: number): Promise<void> {
    const cluster = await this.getCluster(clusterId);
    if (!cluster) throw new Error('Cluster not found');

    const totalShares = cluster.members.reduce((sum, m) => sum + m.sharePercentage, 0);
    const newShare = (contribution / cluster.pooledFunds) * (100 - totalShares);
    cluster.members.push({
      userId,
      assetIds,
      joinedAt: new Date(),
      contributionAmount: contribution,
      sharePercentage: newShare,
      role: 'member',
      votingPower: newShare,
      isActive: true
    });
    cluster.pooledFunds += contribution;

    await this.saveCluster(cluster);
  }

  public async removeMember(clusterId: string, userId: string): Promise<void> {
    const cluster = await this.getCluster(clusterId);
    if (!cluster) throw new Error('Cluster not found');

    cluster.members = cluster.members.filter(m => m.userId !== userId);
    await this.saveCluster(cluster);
  }

  public async optimizeClusterEnergy(cluster: RooftopCluster): Promise<OptimizationResult> {
    const consumption: ConsumptionProfile = {
      hourly: Array(24).fill(0).map((_, i) => 100 + i * 10), // Example consumption profile
      shiftableLoads: []
    };
    const contracts: EnergyContract[] = [{
      id: 'contract-1',
      type: 'variable',
      buyRate: 0.05,
      sellRate: 0.06,
      priorityIndex: 1
    }];

    const result = await this.coreService.optimizeEnergy(cluster.location, cluster.assets, contracts, consumption);
    cluster.optimizationResults.push(result);
    await this.saveCluster(cluster);

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

    return result;
  }

  public async getCluster(clusterId: string): Promise<RooftopCluster | null> {
    const db = this.coreService.mongoClient.db();
    return await db.collection('rooftop_clusters').findOne({ id: clusterId });
  }

  private async saveCluster(cluster: RooftopCluster): Promise<void> {
    const db = this.coreService.mongoClient.db();
    await db.collection('rooftop_clusters').updateOne(
      { id: cluster.id },
      { $set: cluster },
      { upsert: true }
    );
  }

  private getDefaultGovernanceRules(): GovernanceRules {
    return {
      votingThreshold: 60,
      quorumRequirement: 50,
      proposalTypes: [
        { type: 'equipment_purchase', requiredApproval: 75, discussionPeriod: 7 },
        { type: 'new_member', requiredApproval: 60, discussionPeriod: 3 }
      ],
      decisionHistory: [],
      meetingSchedule: 'monthly'
    };
  }

  private getDefaultTradingRules(): TradingRules {
    return {
      internalRate: 1.0,
      externalRate: 1.2,
      tradingHours: { start: '06:00', end: '22:00' },
      priorityAllocation: 'contribution_based',
      surplusHandling: 'sell_external',
      minimumReserve: 50
    };
  }

  public async shutdown(): Promise<void> {
    await this.coreService.shutdown();
  }
}

export default RooftopClusterService;