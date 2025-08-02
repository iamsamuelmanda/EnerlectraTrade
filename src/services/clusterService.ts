// Innerlectra Cluster Management Service
// Core business logic for energy cooperatives

import { 
  EnergyCluster, 
  ClusterMember, 
  ClusterConfig,
  EquipmentRequest,
  Purchase,
  EnergyDistribution,
  MemberReturns,
  Decision,
  Vote,
  ClusterAnalytics,
  SharedAsset,
  MaintenanceEvent
} from '../types/cluster';
// JSON file operations
const fs = require('fs').promises;

const readJSON = async (filePath: string): Promise<any[]> => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeJSON = async (filePath: string, data: any): Promise<void> => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};

export class ClusterService {
  private clustersFile = 'src/db/clusters.json';
  private decisionsFile = 'src/db/cluster_decisions.json';
  private purchasesFile = 'src/db/cluster_purchases.json';
  private analyticsFile = 'src/db/cluster_analytics.json';

  // Core Cluster Operations
  async createCluster(clusterData: ClusterConfig, founderId: string): Promise<EnergyCluster> {
    const clusters = await readJSON(this.clustersFile);
    
    const newCluster: EnergyCluster = {
      id: this.generateId(),
      name: clusterData.name,
      type: clusterData.type,
      location: clusterData.location,
      members: [{
        userId: founderId,
        joinedAt: new Date(),
        contributionAmount: clusterData.initialFunding,
        sharePercentage: 100, // Founder starts with 100%
        role: 'coordinator',
        votingPower: 100,
        energyUsage: 0,
        isActive: true
      }],
      sharedAssets: [],
      pooledFunds: clusterData.initialFunding,
      energyCapacity: 0,
      currentGeneration: 0,
      governanceRules: {
        votingThreshold: clusterData.governanceRules?.votingThreshold || 60,
        quorumRequirement: clusterData.governanceRules?.quorumRequirement || 50,
        proposalTypes: [
          { type: 'equipment_purchase', requiredApproval: 75, discussionPeriod: 7 },
          { type: 'new_member', requiredApproval: 60, discussionPeriod: 3 },
          { type: 'maintenance', requiredApproval: 50, discussionPeriod: 2 },
          { type: 'budget', requiredApproval: 70, discussionPeriod: 5 },
          { type: 'rules_change', requiredApproval: 80, discussionPeriod: 10 }
        ],
        decisionHistory: [],
        meetingSchedule: 'monthly',
        nextMeeting: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      },
      tradingRules: {
        internalRate: clusterData.tradingRules?.internalRate || 1.0, // Subsidized rate for members
        externalRate: clusterData.tradingRules?.externalRate || 1.2, // Standard market rate
        tradingHours: { start: '06:00', end: '22:00' },
        priorityAllocation: 'contribution_based',
        surplusHandling: 'sell_external',
        minimumReserve: 50 // kWh emergency reserve
      },
      createdAt: new Date(),
      status: 'forming',
      reputation: 50 // Starting reputation score
    };

    clusters.push(newCluster);
    await writeJSON(this.clustersFile, clusters);
    
    return newCluster;
  }

  async joinCluster(userId: string, clusterId: string, contribution: number): Promise<ClusterMember> {
    const clusters = await readJSON(this.clustersFile);
    const cluster = clusters.find((c: EnergyCluster) => c.id === clusterId);
    
    if (!cluster) {
      throw new Error('Cluster not found');
    }

    if (cluster.members.find((m: ClusterMember) => m.userId === userId)) {
      throw new Error('User already member of this cluster');
    }

    // Calculate new member's share percentage
    const totalContributions = cluster.pooledFunds + contribution;
    const sharePercentage = (contribution / totalContributions) * 100;
    
    // Adjust existing members' percentages
    const adjustmentFactor = (totalContributions - contribution) / totalContributions;
    cluster.members.forEach((member: ClusterMember) => {
      member.sharePercentage *= adjustmentFactor;
    });

    const newMember: ClusterMember = {
      userId,
      joinedAt: new Date(),
      contributionAmount: contribution,
      sharePercentage,
      role: 'member',
      votingPower: sharePercentage,
      energyUsage: 0,
      isActive: true
    };

    cluster.members.push(newMember);
    cluster.pooledFunds += contribution;

    // Activate cluster if it has enough members
    if (cluster.members.length >= 3 && cluster.status === 'forming') {
      cluster.status = 'active';
    }

    await writeJSON(this.clustersFile, clusters);
    return newMember;
  }

  async initiateGroupPurchase(clusterId: string, equipment: EquipmentRequest, proposedBy: string): Promise<Purchase> {
    const clusters = await readJSON(this.clustersFile);
    const cluster = clusters.find((c: EnergyCluster) => c.id === clusterId);
    
    if (!cluster) {
      throw new Error('Cluster not found');
    }

    if (equipment.estimatedCost > cluster.pooledFunds) {
      throw new Error('Insufficient pooled funds for purchase');
    }

    const purchases = await readJSON(this.purchasesFile);
    
    const purchase: Purchase = {
      id: this.generateId(),
      clusterId,
      equipmentRequest: { ...equipment, requestedBy: proposedBy },
      approvalStatus: 'pending'
    };

    purchases.push(purchase);
    await writeJSON(this.purchasesFile, purchases);

    // Create governance proposal for the purchase
    await this.createProposal(
      clusterId,
      'equipment_purchase',
      `Purchase ${equipment.assetType}: ${equipment.specifications.brand || 'Generic'} ${equipment.specifications.model || ''}`,
      `Proposal to purchase ${equipment.assetType} with ${equipment.specifications.capacity}kW capacity for ${equipment.estimatedCost} ZMW. Justification: ${equipment.justification}`,
      proposedBy,
      { purchaseId: purchase.id }
    );

    return purchase;
  }

  async distributeEnergy(clusterId: string, totalGenerated: number): Promise<EnergyDistribution> {
    const clusters = await readJSON(this.clustersFile);
    const cluster = clusters.find((c: EnergyCluster) => c.id === clusterId);
    
    if (!cluster) {
      throw new Error('Cluster not found');
    }

    const distribution: EnergyDistribution = {
      clusterId,
      distributionDate: new Date(),
      totalGenerated,
      totalConsumed: 0,
      surplus: 0,
      deficit: 0,
      memberAllocations: [],
      externalTrades: [],
      batteryStorage: 0
    };

    // Calculate energy allocation based on priority rules
    const activeMembers = cluster.members.filter((m: ClusterMember) => m.isActive);
    let availableEnergy = totalGenerated - cluster.tradingRules.minimumReserve;

    // Allocate energy based on contribution and usage patterns
    for (const member of activeMembers) {
      let allocation = 0;
      
      switch (cluster.tradingRules.priorityAllocation) {
        case 'contribution_based':
          allocation = (availableEnergy * member.sharePercentage) / 100;
          break;
        case 'need_based':
          allocation = Math.min(member.energyUsage * 1.1, availableEnergy / activeMembers.length);
          break;
        case 'equal_share':
          allocation = availableEnergy / activeMembers.length;
          break;
      }

      const consumed = Math.min(allocation, member.energyUsage);
      const cost = consumed * cluster.tradingRules.internalRate;

      distribution.memberAllocations.push({
        memberId: member.userId,
        allocatedEnergy: allocation,
        consumedEnergy: consumed,
        creditBalance: allocation - consumed,
        cost
      });

      distribution.totalConsumed += consumed;
    }

    distribution.surplus = totalGenerated - distribution.totalConsumed - cluster.tradingRules.minimumReserve;
    
    // Handle surplus energy
    if (distribution.surplus > 0) {
      switch (cluster.tradingRules.surplusHandling) {
        case 'sell_external':
          // Create external trade opportunities
          distribution.externalTrades.push({
            tradingPartnerId: 'market',
            energyAmount: distribution.surplus,
            pricePerKWh: cluster.tradingRules.externalRate,
            totalValue: distribution.surplus * cluster.tradingRules.externalRate,
            tradeType: 'sell',
            status: 'pending'
          });
          break;
        case 'store_battery':
          distribution.batteryStorage = distribution.surplus;
          break;
        case 'member_credit':
          // Distribute as credits to members
          const creditPerMember = distribution.surplus / activeMembers.length;
          distribution.memberAllocations.forEach(allocation => {
            allocation.creditBalance += creditPerMember;
          });
          break;
      }
    }

    return distribution;
  }

  async voteOnProposal(clusterId: string, proposalId: string, memberId: string, vote: 'yes' | 'no' | 'abstain', reason?: string): Promise<Decision> {
    const decisions = await readJSON(this.decisionsFile);
    const decision = decisions.find((d: Decision) => d.id === proposalId && d.status === 'open');
    
    if (!decision) {
      throw new Error('Proposal not found or voting closed');
    }

    const clusters = await readJSON(this.clustersFile);
    const cluster = clusters.find((c: EnergyCluster) => c.id === clusterId);
    const member = cluster?.members.find((m: ClusterMember) => m.userId === memberId);
    
    if (!member) {
      throw new Error('Member not found in cluster');
    }

    // Remove existing vote if any
    decision.votes = decision.votes.filter((v: Vote) => v.memberId !== memberId);
    
    // Add new vote
    decision.votes.push({
      memberId,
      vote,
      votingPower: member.votingPower,
      timestamp: new Date(),
      reason
    });

    // Check if voting is complete
    const totalVotingPower = decision.votes.reduce((sum: number, v: Vote) => sum + v.votingPower, 0);
    const yesVotes = decision.votes.filter((v: Vote) => v.vote === 'yes').reduce((sum: number, v: Vote) => sum + v.votingPower, 0);
    
    const requiredThreshold = cluster.governanceRules.proposalTypes.find((pt: any) => pt.type === decision.type)?.requiredApproval || 60;
    const quorumMet = totalVotingPower >= cluster.governanceRules.quorumRequirement;
    const approvalMet = (yesVotes / totalVotingPower) * 100 >= requiredThreshold;

    if (quorumMet && (approvalMet || new Date() > decision.votingDeadline)) {
      decision.status = approvalMet ? 'passed' : 'rejected';
      
      // Implement decision if passed
      if (decision.status === 'passed') {
        await this.implementDecision(decision);
      }
    }

    await writeJSON(this.decisionsFile, decisions);
    return decision;
  }

  async calculateMemberReturns(clusterId: string, period: { start: Date; end: Date }): Promise<MemberReturns[]> {
    const clusters = await readJSON(this.clustersFile);
    const cluster = clusters.find((c: EnergyCluster) => c.id === clusterId);
    
    if (!cluster) {
      throw new Error('Cluster not found');
    }

    const returns: MemberReturns[] = [];

    for (const member of cluster.members) {
      // Calculate energy received and cost savings
      const energyReceived = member.energyUsage; // Simplified - would use actual distribution data
      const energyValue = energyReceived * 1.2; // Market rate
      const costSavings = energyReceived * (1.2 - cluster.tradingRules.internalRate);
      
      // Calculate asset appreciation (simplified)
      const assetValue = cluster.sharedAssets.reduce((sum: number, asset: any) => {
        const ownership = asset.ownership.find((o: any) => o.memberId === member.userId);
        return sum + (ownership ? (ownership.sharePercentage / 100) * asset.cost : 0);
      }, 0);
      const assetAppreciation = assetValue * 0.02; // 2% annual appreciation
      
      // Profit sharing from external sales
      const profitSharing = 100 * member.sharePercentage / 100; // Simplified calculation
      
      const totalReturn = costSavings + assetAppreciation + profitSharing;
      const returnPercentage = (totalReturn / member.contributionAmount) * 100;

      returns.push({
        memberId: member.userId,
        period,
        energyReceived,
        energyValue,
        costSavings,
        assetAppreciation,
        profitSharing,
        totalReturn,
        returnPercentage
      });
    }

    return returns;
  }

  // Governance and Decision Making
  async createProposal(
    clusterId: string,
    type: Decision['type'],
    title: string,
    description: string,
    proposedBy: string,
    metadata?: any
  ): Promise<Decision> {
    const clusters = await readJSON(this.clustersFile);
    const cluster = clusters.find((c: EnergyCluster) => c.id === clusterId);
    
    if (!cluster) {
      throw new Error('Cluster not found');
    }

    const proposalType = cluster.governanceRules.proposalTypes.find((pt: any) => pt.type === type);
    if (!proposalType) {
      throw new Error('Invalid proposal type');
    }

    const decisions = await readJSON(this.decisionsFile);
    
    const decision: Decision = {
      id: this.generateId(),
      proposalId: this.generateId(),
      title,
      description,
      type,
      proposedBy,
      proposedAt: new Date(),
      votingDeadline: new Date(Date.now() + proposalType.discussionPeriod * 24 * 60 * 60 * 1000),
      votes: [],
      status: 'open',
      ...metadata
    };

    decisions.push(decision);
    await writeJSON(this.decisionsFile, decisions);
    
    return decision;
  }

  private async implementDecision(decision: Decision & { purchaseId?: string }): Promise<void> {
    // Implementation logic based on decision type
    switch (decision.type) {
      case 'equipment_purchase':
        await this.completePurchase(decision);
        break;
      case 'new_member':
        // Handle new member approval
        break;
      case 'maintenance':
        // Schedule maintenance
        break;
      // Add other implementation logic
    }
  }

  private async completePurchase(decision: Decision & { purchaseId?: string }): Promise<void> {
    if (!decision.purchaseId) return;

    const purchases = await readJSON(this.purchasesFile);
    const purchase = purchases.find((p: Purchase) => p.id === decision.purchaseId);
    
    if (purchase) {
      purchase.approvalStatus = 'approved';
      purchase.purchaseDate = new Date();
      
      // Add to cluster assets
      const clusters = await readJSON(this.clustersFile);
      const cluster = clusters.find((c: EnergyCluster) => c.id === purchase.clusterId);
      
      if (cluster) {
        const asset: SharedAsset = {
          id: this.generateId(),
          assetType: purchase.equipmentRequest.assetType,
          brand: purchase.equipmentRequest.specifications.brand || 'Generic',
          model: purchase.equipmentRequest.specifications.model || 'Standard',
          cost: purchase.equipmentRequest.estimatedCost,
          capacity: purchase.equipmentRequest.specifications.capacity,
          ownership: cluster.members.map((member: any) => ({
            memberId: member.userId,
            sharePercentage: member.sharePercentage,
            contributionAmount: (member.sharePercentage / 100) * purchase.equipmentRequest.estimatedCost
          })),
          installationDate: new Date(),
          warrantyExpiry: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years
          maintenanceSchedule: [],
          currentCondition: 'excellent',
          performanceHistory: []
        };

        cluster.sharedAssets.push(asset);
        cluster.pooledFunds -= purchase.equipmentRequest.estimatedCost;
        cluster.energyCapacity += purchase.equipmentRequest.specifications.capacity;
        
        await writeJSON(this.clustersFile, clusters);
      }
      
      await writeJSON(this.purchasesFile, purchases);
    }
  }

  // Analytics and Reporting
  async getClusterAnalytics(clusterId: string, period: { start: Date; end: Date }): Promise<ClusterAnalytics> {
    const clusters = await readJSON(this.clustersFile);
    const cluster = clusters.find((c: EnergyCluster) => c.id === clusterId);
    
    if (!cluster) {
      throw new Error('Cluster not found');
    }

    // Calculate comprehensive analytics
    const analytics: ClusterAnalytics = {
      clusterId,
      period,
      energyMetrics: {
        totalGenerated: cluster.currentGeneration * 30, // Monthly estimate
        totalConsumed: cluster.members.reduce((sum: number, m: any) => sum + m.energyUsage, 0) * 30,
        efficiency: 85, // Calculated efficiency
        surplusRate: 15 // Percentage of surplus energy
      },
      financialMetrics: {
        totalRevenue: cluster.pooledFunds * 0.1, // 10% monthly revenue
        operatingCosts: cluster.pooledFunds * 0.05, // 5% operating costs
        profitMargin: 5, // 5% profit margin
        memberSavings: cluster.members.length * 50 // Average savings per member
      },
      membershipMetrics: {
        activeMembers: cluster.members.filter((m: any) => m.isActive).length,
        newJoins: 1, // Simplified calculation
        departures: 0,
        engagementScore: 85 // Based on voting participation
      },
      performanceMetrics: {
        assetUtilization: 90, // Asset utilization rate
        maintenanceCompliance: 95, // Maintenance schedule adherence
        tradingVolume: cluster.pooledFunds * 0.2, // Trading volume
        reputationScore: cluster.reputation
      }
    };

    return analytics;
  }

  // Utility functions
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  async getClusters(): Promise<EnergyCluster[]> {
    return await readJSON(this.clustersFile);
  }

  async getClusterById(id: string): Promise<EnergyCluster | null> {
    const clusters = await this.getClusters();
    return clusters.find((c: EnergyCluster) => c.id === id) || null;
  }

  async getClustersByRegion(region: string): Promise<EnergyCluster[]> {
    const clusters = await this.getClusters();
    return clusters.filter((c: EnergyCluster) => c.location.region === region);
  }

  async getUserClusters(userId: string): Promise<EnergyCluster[]> {
    const clusters = await this.getClusters();
    return clusters.filter((c: EnergyCluster) => 
      c.members.some(m => m.userId === userId && m.isActive)
    );
  }
}