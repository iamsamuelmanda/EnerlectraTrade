import express from 'express';
import { ClusterService } from '../services/clusterService';
// Innerlectra Cluster Management Routes
// API endpoints for energy cooperative operations

interface ApiResponse {
  success: boolean;
  data?: any;
  message: string;
}

const router = express.Router();
const clusterService = new ClusterService();

// Cluster Management Routes

// Create new energy cluster
router.post('/create', async (req, res) => {
  try {
    const { name, type, location, initialFunding, targetMembers, governanceRules, tradingRules } = req.body;
    const { founderId } = req.body;

    if (!name || !type || !location || !initialFunding || !founderId) {
      const response: ApiResponse = {
        success: false,
        message: 'Missing required fields: name, type, location, initialFunding, founderId'
      };
      return res.status(400).json(response);
    }

    if (initialFunding < 2000) {
      const response: ApiResponse = {
        success: false,
        message: 'Minimum initial funding is 2,000 ZMW for cluster formation'
      };
      return res.status(400).json(response);
    }

    const clusterConfig = {
      name,
      type,
      location: {
        region: location.region,
        gps: location.gps || [0, 0],
        address: location.address || ''
      },
      initialFunding,
      targetMembers: targetMembers || 10,
      governanceRules: governanceRules || {},
      tradingRules: tradingRules || {}
    };

    const cluster = await clusterService.createCluster(clusterConfig, founderId);

    const response: ApiResponse = {
      success: true,
      data: cluster,
      message: `Energy cluster "${name}" created successfully! Cluster is now forming and ready to accept members.`
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: `Failed to create cluster: ${(error as Error).message}`
    };
    res.status(500).json(response);
  }
});

// Join existing cluster
router.post('/join', async (req, res) => {
  try {
    const { userId, clusterId, contribution } = req.body;

    if (!userId || !clusterId || !contribution) {
      const response: ApiResponse = {
        success: false,
        message: 'Missing required fields: userId, clusterId, contribution'
      };
      return res.status(400).json(response);
    }

    if (contribution < 2000) {
      const response: ApiResponse = {
        success: false,
        message: 'Minimum contribution is 2,000 ZMW to join a cluster'
      };
      return res.status(400).json(response);
    }

    const membership = await clusterService.joinCluster(userId, clusterId, contribution);

    const response: ApiResponse = {
      success: true,
      data: membership,
      message: `Successfully joined cluster! Your contribution: ${contribution} ZMW, Share: ${membership.sharePercentage.toFixed(2)}%`
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: `Failed to join cluster: ${(error as Error).message}`
    };
    res.status(400).json(response);
  }
});

// Get all clusters
router.get('/', async (req, res) => {
  try {
    const { region, type, status } = req.query;
    let clusters = await clusterService.getClusters();

    // Apply filters
    if (region) {
      clusters = clusters.filter(c => c.location.region.toLowerCase().includes((region as string).toLowerCase()));
    }
    if (type) {
      clusters = clusters.filter(c => c.type === type);
    }
    if (status) {
      clusters = clusters.filter(c => c.status === status);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        clusters,
        total: clusters.length,
        types: {
          micro: clusters.filter(c => c.type === 'micro').length,
          neighborhood: clusters.filter(c => c.type === 'neighborhood').length,
          industrial: clusters.filter(c => c.type === 'industrial').length,
          supply: clusters.filter(c => c.type === 'supply').length
        },
        regions: [...new Set(clusters.map(c => c.location.region))]
      },
      message: `Found ${clusters.length} energy clusters`
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: `Failed to fetch clusters: ${(error as Error).message}`
    };
    res.status(500).json(response);
  }
});

// Get specific cluster details
router.get('/:clusterId', async (req, res) => {
  try {
    const { clusterId } = req.params;
    const cluster = await clusterService.getClusterById(clusterId);

    if (!cluster) {
      const response: ApiResponse = {
        success: false,
        message: 'Cluster not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: cluster,
      message: `Cluster details for "${cluster.name}"`
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: `Failed to fetch cluster: ${(error as Error).message}`
    };
    res.status(500).json(response);
  }
});

// Get cluster dashboard with analytics
router.get('/:clusterId/dashboard', async (req, res) => {
  try {
    const { clusterId } = req.params;
    const cluster = await clusterService.getClusterById(clusterId);

    if (!cluster) {
      const response: ApiResponse = {
        success: false,
        message: 'Cluster not found'
      };
      return res.status(404).json(response);
    }

    const period = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date()
    };

    const analytics = await clusterService.getClusterAnalytics(clusterId, period);

    const dashboard = {
      cluster: {
        id: cluster.id,
        name: cluster.name,
        type: cluster.type,
        status: cluster.status,
        memberCount: cluster.members.length,
        energyCapacity: cluster.energyCapacity,
        pooledFunds: cluster.pooledFunds,
        reputation: cluster.reputation
      },
      analytics,
      recentActivity: {
        energyGenerated: cluster.currentGeneration,
        newMembers: cluster.members.filter(m => 
          new Date(m.joinedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length,
        activeProposals: 2, // Would fetch from decisions
        maintenanceDue: cluster.sharedAssets.filter(asset => 
          asset.maintenanceSchedule.some(m => 
            new Date(m.scheduledDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          )
        ).length
      }
    };

    const response: ApiResponse = {
      success: true,
      data: dashboard,
      message: `Dashboard data for ${cluster.name}`
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: `Failed to fetch dashboard: ${(error as Error).message}`
    };
    res.status(500).json(response);
  }
});

// Equipment and Asset Management

// Propose equipment purchase
router.post('/:clusterId/equipment/propose', async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { assetType, specifications, estimatedCost, supplier, justification, urgency, proposedBy } = req.body;

    if (!assetType || !specifications || !estimatedCost || !proposedBy) {
      const response: ApiResponse = {
        success: false,
        message: 'Missing required fields: assetType, specifications, estimatedCost, proposedBy'
      };
      return res.status(400).json(response);
    }

    const equipmentRequest = {
      assetType,
      specifications,
      estimatedCost,
      supplier: supplier || 'TBD',
      justification: justification || 'Equipment needed for cluster operations',
      urgency: urgency || 'medium',
      requestedBy: proposedBy
    };

    const purchase = await clusterService.initiateGroupPurchase(clusterId, equipmentRequest, proposedBy);

    const response: ApiResponse = {
      success: true,
      data: purchase,
      message: `Equipment purchase proposal submitted. Voting period has begun for cluster members.`
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: `Failed to propose equipment purchase: ${(error as Error).message}`
    };
    res.status(400).json(response);
  }
});

// Get cluster assets
router.get('/:clusterId/assets', async (req, res) => {
  try {
    const { clusterId } = req.params;
    const cluster = await clusterService.getClusterById(clusterId);

    if (!cluster) {
      const response: ApiResponse = {
        success: false,
        message: 'Cluster not found'
      };
      return res.status(404).json(response);
    }

    const assetSummary = {
      totalAssets: cluster.sharedAssets.length,
      totalValue: cluster.sharedAssets.reduce((sum, asset) => sum + asset.cost, 0),
      totalCapacity: cluster.sharedAssets.reduce((sum, asset) => sum + asset.capacity, 0),
      assetTypes: cluster.sharedAssets.reduce((types, asset) => {
        types[asset.assetType] = (types[asset.assetType] || 0) + 1;
        return types;
      }, {} as Record<string, number>),
      assets: cluster.sharedAssets
    };

    const response: ApiResponse = {
      success: true,
      data: assetSummary,
      message: `Found ${cluster.sharedAssets.length} shared assets worth ${assetSummary.totalValue} ZMW`
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: `Failed to fetch assets: ${(error as Error).message}`
    };
    res.status(500).json(response);
  }
});

// Energy Distribution and Trading

// Distribute energy to members
router.post('/:clusterId/energy/distribute', async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { totalGenerated } = req.body;

    if (!totalGenerated || totalGenerated <= 0) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid total generated energy amount'
      };
      return res.status(400).json(response);
    }

    const distribution = await clusterService.distributeEnergy(clusterId, totalGenerated);

    const response: ApiResponse = {
      success: true,
      data: distribution,
      message: `Energy distributed: ${totalGenerated} kWh generated, ${distribution.totalConsumed} kWh consumed, ${distribution.surplus} kWh surplus`
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: `Failed to distribute energy: ${(error as Error).message}`
    };
    res.status(500).json(response);
  }
});

// Get member returns analysis
router.get('/:clusterId/returns', async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { startDate, endDate } = req.query;

    const period = {
      start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate as string) : new Date()
    };

    const returns = await clusterService.calculateMemberReturns(clusterId, period);

    const summary = {
      period,
      totalMembers: returns.length,
      averageReturn: returns.reduce((sum, r) => sum + r.totalReturn, 0) / returns.length,
      averageReturnPercentage: returns.reduce((sum, r) => sum + r.returnPercentage, 0) / returns.length,
      totalSavings: returns.reduce((sum, r) => sum + r.costSavings, 0),
      memberReturns: returns
    };

    const response: ApiResponse = {
      success: true,
      data: summary,
      message: `Member returns calculated for ${returns.length} members`
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: `Failed to calculate returns: ${(error as Error).message}`
    };
    res.status(500).json(response);
  }
});

// Governance Routes

// Vote on proposal
router.post('/:clusterId/vote', async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { proposalId, memberId, vote, reason } = req.body;

    if (!proposalId || !memberId || !vote) {
      const response: ApiResponse = {
        success: false,
        message: 'Missing required fields: proposalId, memberId, vote'
      };
      return res.status(400).json(response);
    }

    if (!['yes', 'no', 'abstain'].includes(vote)) {
      const response: ApiResponse = {
        success: false,
        message: 'Vote must be "yes", "no", or "abstain"'
      };
      return res.status(400).json(response);
    }

    const decision = await clusterService.voteOnProposal(clusterId, proposalId, memberId, vote, reason);

    const response: ApiResponse = {
      success: true,
      data: {
        decision,
        voteCount: decision.votes.length,
        status: decision.status
      },
      message: `Vote recorded: ${vote}. Proposal status: ${decision.status}`
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: `Failed to record vote: ${(error as Error).message}`
    };
    res.status(400).json(response);
  }
});

// Get user's clusters
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const clusters = await clusterService.getUserClusters(userId);

    const clusterSummary = clusters.map(cluster => {
      const member = cluster.members.find(m => m.userId === userId);
      return {
        clusterId: cluster.id,
        name: cluster.name,
        type: cluster.type,
        region: cluster.location.region,
        status: cluster.status,
        memberSince: member?.joinedAt,
        sharePercentage: member?.sharePercentage,
        role: member?.role,
        pooledFunds: cluster.pooledFunds,
        memberCount: cluster.members.length,
        energyCapacity: cluster.energyCapacity
      };
    });

    const response: ApiResponse = {
      success: true,
      data: {
        clusters: clusterSummary,
        totalClusters: clusters.length,
        totalShares: clusterSummary.reduce((sum, c) => sum + (c.sharePercentage || 0), 0),
        roles: [...new Set(clusterSummary.map(c => c.role))]
      },
      message: `User is member of ${clusters.length} energy clusters`
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: `Failed to fetch user clusters: ${(error as Error).message}`
    };
    res.status(500).json(response);
  }
});

// Get clusters by region
router.get('/region/:region', async (req, res) => {
  try {
    const { region } = req.params;
    const clusters = await clusterService.getClustersByRegion(region);

    const regionSummary = {
      region,
      totalClusters: clusters.length,
      clusterTypes: clusters.reduce((types, cluster) => {
        types[cluster.type] = (types[cluster.type] || 0) + 1;
        return types;
      }, {} as Record<string, number>),
      totalMembers: clusters.reduce((sum, cluster) => sum + cluster.members.length, 0),
      totalCapacity: clusters.reduce((sum, cluster) => sum + cluster.energyCapacity, 0),
      totalFunds: clusters.reduce((sum, cluster) => sum + cluster.pooledFunds, 0),
      clusters: clusters.map(cluster => ({
        id: cluster.id,
        name: cluster.name,
        type: cluster.type,
        status: cluster.status,
        memberCount: cluster.members.length,
        energyCapacity: cluster.energyCapacity,
        reputation: cluster.reputation
      }))
    };

    const response: ApiResponse = {
      success: true,
      data: regionSummary,
      message: `Found ${clusters.length} clusters in ${region} with ${regionSummary.totalMembers} total members`
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: `Failed to fetch regional clusters: ${(error as Error).message}`
    };
    res.status(500).json(response);
  }
});

export default router;