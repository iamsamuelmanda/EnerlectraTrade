"use strict";
// Innerlectra Cluster Management Service
// Core business logic for energy cooperatives
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClusterService = void 0;
// JSON file operations
const fs = require('fs').promises;
const readJSON = async (filePath) => {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    }
    catch (error) {
        return [];
    }
};
const writeJSON = async (filePath, data) => {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};
class ClusterService {
    constructor() {
        this.clustersFile = 'src/db/clusters.json';
        this.decisionsFile = 'src/db/cluster_decisions.json';
        this.purchasesFile = 'src/db/cluster_purchases.json';
        this.analyticsFile = 'src/db/cluster_analytics.json';
    }
    // Core Cluster Operations
    async createCluster(clusterData, founderId) {
        const clusters = await readJSON(this.clustersFile);
        const newCluster = {
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
    async joinCluster(userId, clusterId, contribution) {
        const clusters = await readJSON(this.clustersFile);
        const cluster = clusters.find((c) => c.id === clusterId);
        if (!cluster) {
            throw new Error('Cluster not found');
        }
        if (cluster.members.find((m) => m.userId === userId)) {
            throw new Error('User already member of this cluster');
        }
        // Calculate new member's share percentage
        const totalContributions = cluster.pooledFunds + contribution;
        const sharePercentage = (contribution / totalContributions) * 100;
        // Adjust existing members' percentages
        const adjustmentFactor = (totalContributions - contribution) / totalContributions;
        cluster.members.forEach((member) => {
            member.sharePercentage *= adjustmentFactor;
        });
        const newMember = {
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
    async initiateGroupPurchase(clusterId, equipment, proposedBy) {
        const clusters = await readJSON(this.clustersFile);
        const cluster = clusters.find((c) => c.id === clusterId);
        if (!cluster) {
            throw new Error('Cluster not found');
        }
        if (equipment.estimatedCost > cluster.pooledFunds) {
            throw new Error('Insufficient pooled funds for purchase');
        }
        const purchases = await readJSON(this.purchasesFile);
        const purchase = {
            id: this.generateId(),
            clusterId,
            equipmentRequest: { ...equipment, requestedBy: proposedBy },
            approvalStatus: 'pending'
        };
        purchases.push(purchase);
        await writeJSON(this.purchasesFile, purchases);
        // Create governance proposal for the purchase
        await this.createProposal(clusterId, 'equipment_purchase', `Purchase ${equipment.assetType}: ${equipment.specifications.brand || 'Generic'} ${equipment.specifications.model || ''}`, `Proposal to purchase ${equipment.assetType} with ${equipment.specifications.capacity}kW capacity for ${equipment.estimatedCost} ZMW. Justification: ${equipment.justification}`, proposedBy, { purchaseId: purchase.id });
        return purchase;
    }
    async distributeEnergy(clusterId, totalGenerated) {
        const clusters = await readJSON(this.clustersFile);
        const cluster = clusters.find((c) => c.id === clusterId);
        if (!cluster) {
            throw new Error('Cluster not found');
        }
        const distribution = {
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
        const activeMembers = cluster.members.filter((m) => m.isActive);
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
    async voteOnProposal(clusterId, proposalId, memberId, vote, reason) {
        const decisions = await readJSON(this.decisionsFile);
        const decision = decisions.find((d) => d.id === proposalId && d.status === 'open');
        if (!decision) {
            throw new Error('Proposal not found or voting closed');
        }
        const clusters = await readJSON(this.clustersFile);
        const cluster = clusters.find((c) => c.id === clusterId);
        const member = cluster?.members.find((m) => m.userId === memberId);
        if (!member) {
            throw new Error('Member not found in cluster');
        }
        // Remove existing vote if any
        decision.votes = decision.votes.filter((v) => v.memberId !== memberId);
        // Add new vote
        decision.votes.push({
            memberId,
            vote,
            votingPower: member.votingPower,
            timestamp: new Date(),
            reason
        });
        // Check if voting is complete
        const totalVotingPower = decision.votes.reduce((sum, v) => sum + v.votingPower, 0);
        const yesVotes = decision.votes.filter((v) => v.vote === 'yes').reduce((sum, v) => sum + v.votingPower, 0);
        const requiredThreshold = cluster.governanceRules.proposalTypes.find((pt) => pt.type === decision.type)?.requiredApproval || 60;
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
    async calculateMemberReturns(clusterId, period) {
        const clusters = await readJSON(this.clustersFile);
        const cluster = clusters.find((c) => c.id === clusterId);
        if (!cluster) {
            throw new Error('Cluster not found');
        }
        const returns = [];
        for (const member of cluster.members) {
            // Calculate energy received and cost savings
            const energyReceived = member.energyUsage; // Simplified - would use actual distribution data
            const energyValue = energyReceived * 1.2; // Market rate
            const costSavings = energyReceived * (1.2 - cluster.tradingRules.internalRate);
            // Calculate asset appreciation (simplified)
            const assetValue = cluster.sharedAssets.reduce((sum, asset) => {
                const ownership = asset.ownership.find((o) => o.memberId === member.userId);
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
    async createProposal(clusterId, type, title, description, proposedBy, metadata) {
        const clusters = await readJSON(this.clustersFile);
        const cluster = clusters.find((c) => c.id === clusterId);
        if (!cluster) {
            throw new Error('Cluster not found');
        }
        const proposalType = cluster.governanceRules.proposalTypes.find((pt) => pt.type === type);
        if (!proposalType) {
            throw new Error('Invalid proposal type');
        }
        const decisions = await readJSON(this.decisionsFile);
        const decision = {
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
    async implementDecision(decision) {
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
    async completePurchase(decision) {
        if (!decision.purchaseId)
            return;
        const purchases = await readJSON(this.purchasesFile);
        const purchase = purchases.find((p) => p.id === decision.purchaseId);
        if (purchase) {
            purchase.approvalStatus = 'approved';
            purchase.purchaseDate = new Date();
            // Add to cluster assets
            const clusters = await readJSON(this.clustersFile);
            const cluster = clusters.find((c) => c.id === purchase.clusterId);
            if (cluster) {
                const asset = {
                    id: this.generateId(),
                    assetType: purchase.equipmentRequest.assetType,
                    brand: purchase.equipmentRequest.specifications.brand || 'Generic',
                    model: purchase.equipmentRequest.specifications.model || 'Standard',
                    cost: purchase.equipmentRequest.estimatedCost,
                    capacity: purchase.equipmentRequest.specifications.capacity,
                    ownership: cluster.members.map((member) => ({
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
    async getClusterAnalytics(clusterId, period) {
        const clusters = await readJSON(this.clustersFile);
        const cluster = clusters.find((c) => c.id === clusterId);
        if (!cluster) {
            throw new Error('Cluster not found');
        }
        // Calculate comprehensive analytics
        const analytics = {
            clusterId,
            period,
            energyMetrics: {
                totalGenerated: cluster.currentGeneration * 30, // Monthly estimate
                totalConsumed: cluster.members.reduce((sum, m) => sum + m.energyUsage, 0) * 30,
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
                activeMembers: cluster.members.filter((m) => m.isActive).length,
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
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
    async getClusters() {
        return await readJSON(this.clustersFile);
    }
    async getClusterById(id) {
        const clusters = await this.getClusters();
        return clusters.find((c) => c.id === id) || null;
    }
    async getClustersByRegion(region) {
        const clusters = await this.getClusters();
        return clusters.filter((c) => c.location.region === region);
    }
    async getUserClusters(userId) {
        const clusters = await this.getClusters();
        return clusters.filter((c) => c.members.some(m => m.userId === userId && m.isActive));
    }
}
exports.ClusterService = ClusterService;
//# sourceMappingURL=clusterService.js.map