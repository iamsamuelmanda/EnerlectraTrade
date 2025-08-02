// Innerlectra Cluster Architecture - Core Types
// Community-focused energy cooperatives for African markets

export interface EnergyCluster {
  id: string;
  name: string;
  type: 'micro' | 'neighborhood' | 'industrial' | 'supply';
  location: {
    region: string;
    gps: [number, number];
    address: string;
  };
  members: ClusterMember[];
  sharedAssets: SharedAsset[];
  pooledFunds: number; // Zambian Kwacha
  energyCapacity: number; // kWh total capacity
  currentGeneration: number; // kWh currently generated
  governanceRules: GovernanceConfig;
  tradingRules: TradingConfig;
  createdAt: Date;
  status: 'active' | 'forming' | 'suspended' | 'dissolved';
  reputation: number; // 0-100 score for inter-cluster trading
}

export interface ClusterMember {
  userId: string;
  joinedAt: Date;
  contributionAmount: number; // Initial contribution in Kwacha
  sharePercentage: number; // Ownership percentage based on contribution
  role: 'member' | 'coordinator' | 'treasurer' | 'technician';
  votingPower: number; // Based on contribution and participation
  energyUsage: number; // Monthly kWh consumption
  isActive: boolean;
}

export interface SharedAsset {
  id: string;
  assetType: 'solar_panel' | 'inverter' | 'battery' | 'mini_grid' | 'wiring' | 'meter';
  brand: string;
  model: string;
  cost: number; // Purchase cost in Kwacha (22,000-45,000 range)
  capacity: number; // kWh for batteries, kW for panels/inverters
  ownership: AssetOwnership[];
  installationDate: Date;
  warrantyExpiry: Date;
  maintenanceSchedule: MaintenanceEvent[];
  currentCondition: 'excellent' | 'good' | 'fair' | 'needs_repair' | 'replaced';
  performanceHistory: PerformanceRecord[];
}

export interface AssetOwnership {
  memberId: string;
  sharePercentage: number;
  contributionAmount: number;
}

export interface MaintenanceEvent {
  id: string;
  assetId: string;
  scheduledDate: Date;
  type: 'routine' | 'repair' | 'replacement' | 'upgrade';
  description: string;
  estimatedCost: number;
  assignedTo: string; // member ID or external technician
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  actualCost?: number;
  completedDate?: Date;
  notes?: string;
}

export interface PerformanceRecord {
  date: Date;
  energyGenerated: number; // kWh
  efficiency: number; // percentage
  weatherConditions: string;
  issues: string[];
}

export interface GovernanceConfig {
  votingThreshold: number; // Percentage needed to pass proposals
  quorumRequirement: number; // Minimum members needed for valid vote
  proposalTypes: ProposalType[];
  decisionHistory: Decision[];
  meetingSchedule: 'weekly' | 'monthly' | 'quarterly';
  nextMeeting: Date;
}

export interface ProposalType {
  type: 'equipment_purchase' | 'new_member' | 'maintenance' | 'budget' | 'rules_change';
  requiredApproval: number; // Percentage threshold
  discussionPeriod: number; // Days for discussion before voting
}

export interface Decision {
  id: string;
  proposalId: string;
  title: string;
  description: string;
  type: ProposalType['type'];
  proposedBy: string;
  proposedAt: Date;
  votingDeadline: Date;
  votes: Vote[];
  status: 'open' | 'passed' | 'rejected' | 'expired';
  implementation?: ImplementationRecord;
}

export interface Vote {
  memberId: string;
  vote: 'yes' | 'no' | 'abstain';
  votingPower: number;
  timestamp: Date;
  reason?: string;
}

export interface ImplementationRecord {
  implementedAt: Date;
  implementedBy: string;
  cost: number;
  results: string;
  success: boolean;
}

export interface TradingConfig {
  internalRate: number; // kWh rate for internal cluster trading
  externalRate: number; // kWh rate for inter-cluster trading
  tradingHours: { start: string; end: string };
  priorityAllocation: 'contribution_based' | 'need_based' | 'equal_share';
  surplusHandling: 'sell_external' | 'store_battery' | 'member_credit';
  minimumReserve: number; // kWh to keep for emergencies
}

export interface ClusterConfig {
  name: string;
  type: EnergyCluster['type'];
  location: EnergyCluster['location'];
  initialFunding: number;
  targetMembers: number;
  governanceRules: Partial<GovernanceConfig>;
  tradingRules: Partial<TradingConfig>;
}

export interface EquipmentRequest {
  assetType: SharedAsset['assetType'];
  specifications: {
    capacity: number;
    brand?: string;
    model?: string;
    features?: string[];
  };
  estimatedCost: number;
  supplier: string;
  justification: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  requestedBy: string;
}

export interface Purchase {
  id: string;
  clusterId: string;
  equipmentRequest: EquipmentRequest;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  purchaseDate?: Date;
  actualCost?: number;
  supplier?: string;
  deliveryDate?: Date;
  installationDate?: Date;
  warrantyInfo?: string;
}

export interface EnergyDistribution {
  clusterId: string;
  distributionDate: Date;
  totalGenerated: number;
  totalConsumed: number;
  surplus: number;
  deficit: number;
  memberAllocations: MemberAllocation[];
  externalTrades: ExternalTrade[];
  batteryStorage: number;
}

export interface MemberAllocation {
  memberId: string;
  allocatedEnergy: number; // kWh
  consumedEnergy: number; // kWh
  creditBalance: number; // kWh credit/debt
  cost: number; // ZMW charged
}

export interface ExternalTrade {
  tradingPartnerId: string; // Another cluster ID
  energyAmount: number; // kWh
  pricePerKWh: number; // ZMW
  totalValue: number; // ZMW
  tradeType: 'buy' | 'sell';
  status: 'pending' | 'completed' | 'cancelled';
}

export interface MemberReturns {
  memberId: string;
  period: { start: Date; end: Date };
  energyReceived: number; // kWh
  energyValue: number; // ZMW equivalent
  costSavings: number; // vs individual purchase
  assetAppreciation: number; // value increase of owned assets
  profitSharing: number; // from external sales
  totalReturn: number; // ZMW
  returnPercentage: number; // % return on investment
}

// Cluster Analytics and Insights
export interface ClusterAnalytics {
  clusterId: string;
  period: { start: Date; end: Date };
  energyMetrics: {
    totalGenerated: number;
    totalConsumed: number;
    efficiency: number;
    surplusRate: number;
  };
  financialMetrics: {
    totalRevenue: number;
    operatingCosts: number;
    profitMargin: number;
    memberSavings: number;
  };
  membershipMetrics: {
    activeMembers: number;
    newJoins: number;
    departures: number;
    engagementScore: number;
  };
  performanceMetrics: {
    assetUtilization: number;
    maintenanceCompliance: number;
    tradingVolume: number;
    reputationScore: number;
  };
}

// Gamification Elements
export interface ClusterBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirements: BadgeRequirement[];
  reward: BadgeReward;
}

export interface BadgeRequirement {
  metric: string;
  threshold: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface BadgeReward {
  type: 'energy_credit' | 'fee_discount' | 'voting_bonus' | 'recognition';
  value: number;
  description: string;
}

export interface MemberRank {
  memberId: string;
  clusterId: string;
  rank: 'Energy Champion' | 'Solar Sage' | 'Community Builder' | 'Eco Warrior' | 'Tech Pioneer';
  level: number;
  points: number;
  achievements: ClusterBadge[];
  nextMilestone: { points: number; reward: string };
}

// Regional Specializations
export interface RegionalAdaptation {
  region: 'Kabwe' | 'Lusaka' | 'Rural' | 'Copperbelt';
  specializations: string[];
  partnerships: Partnership[];
  incentives: RegionalIncentive[];
}

export interface Partnership {
  type: 'university' | 'mining_company' | 'government' | 'ngo' | 'supplier';
  name: string;
  benefits: string[];
  requirements: string[];
}

export interface RegionalIncentive {
  type: 'tax_break' | 'subsidy' | 'training' | 'equipment_discount';
  value: number;
  eligibility: string[];
  duration: string;
}