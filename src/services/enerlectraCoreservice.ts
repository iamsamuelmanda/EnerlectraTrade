// src/services/enerlectraCoreService.ts
import * as tf from '@tensorflow/tfjs-node-gpu';
import * as ee from '@google/earthengine';
import { MongoClient } from 'mongodb';
import { Kafka } from 'kafkajs';
import { createLogger, transports, format } from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { DateTime, Duration } from 'luxon';
import * as Sentry from '@sentry/node';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as AWS from 'aws-sdk';

// ==================== TYPE DEFINITIONS ====================
export interface Coordinates extends Array<number> {
  0: number; // latitude
  1: number; // longitude
}

export interface SolarForecast {
  coordinates: Coordinates;
  timestamp: Date;
  forecastStart: Date;
  hourlyGHI: number[];
  hourlyDNI: number[];
  hourlyDHI: number[];
  confidence: number;
  cloudCover: number[];
  precipitationProb: number[];
  ambientTemperature: number[];
  metadata: {
    modelVersion: string;
    processingTimeMs: number;
    dataSources: string[];
    qualityScore: number;
  };
}

export interface EnergyAsset {
  id: string;
  type: 'solar_pv' | 'battery' | 'wind' | 'diesel_generator';
  capacity: number;
  location: Coordinates;
  efficiency?: number;
  area?: number;
  tempCoefficient?: number;
  degradationRate?: number;
  ageYears?: number;
}

export interface EnergyContract {
  id: string;
  type: 'fixed' | 'variable' | 'spot' | 'ppa';
  buyRate: number;
  sellRate: number;
  priorityIndex: number;
}

export interface ConsumptionProfile {
  hourly: number[];
  shiftableLoads: ShiftableLoad[];
}

export interface ShiftableLoad {
  id: string;
  power: number;
  duration: number;
  earliestStart: string;
  latestEnd: string;
}

export interface ProductionForecast {
  total: number[];
  byAsset: Record<string, number[]>;
  revenuePotential: number;
}

export interface OptimizationResult {
  productionForecast: ProductionForecast;
  allocationPlan: AllocationPlan;
  financialAnalysis: FinancialAnalysis;
  actions: OptimizationAction[];
  resultId: string;
}

export interface WasteAnalysis {
  timestamp: Date;
  userId: string;
  totalProduction: number;
  totalConsumption: number;
  curtailmentWaste: number;
  batteryWaste: number;
  conversionLosses: number;
  suboptimalUsage: number;
  peakPenalty: number;
  totalWaste: number;
  financialImpact: FinancialImpact;
  recommendations: string[];
}

export interface EnergyCluster {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    region: string;
  };
  segments: EnergySegment[];
  members: ClusterMember[];
  sharedAssets: SharedAsset[];
  pooledFunds: number;
  governanceRules: GovernanceRules;
  tradingRules: TradingRules;
}

// ==================== CORE SERVICE ====================
export class EnerlectraCoreService {
  private model: tf.LayersModel | null = null;
  private pricingModel: tf.LayersModel | null = null;
  private mongoClient: MongoClient;
  private kafkaProducer: any;
  private kafkaConsumer: any;
  private logger: any;
  private isInitialized = false;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private CACHE_TTL = 300000; // 5 minutes

  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private tradingContract: ethers.Contract;
  private energyToken: ethers.Contract;

  constructor() {
    this.mongoClient = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017/enerlectra');
    this.initializeLogger();
    this.initializeKafka();

    // Ethereum blockchain setup
    this.provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || '');
    this.signer = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY || '', this.provider);

    // Contract ABIs (replace with actual compiled ABIs from EnergyTrading.sol and EnergyToken.sol)
    const tradingABI = [
      "function createEnergyOffer(uint256 energyAmount, uint256 pricePerKwh, uint256 expiresAt, bool acceptMobileMoney) external returns (uint256)",
      "function executeTradeWithBlockchain(uint256 offerId) external returns (uint256)",
      "event TradeExecuted(uint256 indexed tradeId, uint256 indexed offerId, address indexed buyer, address seller, uint256 energyAmount, uint256 totalPrice, uint256 paymentMethod)"
    ];
    const tokenABI = [
      "function lockTokens(uint256 kWh) external",
      "function unlockTokens(uint256 kWh) external",
      "function transfer(address to, uint256 amount) external returns (bool)"
    ];

    this.tradingContract = new ethers.Contract(process.env.TRADING_CONTRACT_ADDRESS || '', tradingABI, this.signer);
    this.energyToken = new ethers.Contract(process.env.PAYMENT_CONTRACT_ADDRESS || '', tokenABI, this.signer);
  }

  // ==================== INITIALIZATION ====================
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await Promise.all([
        this.connectToDatabase(),
        this.initializeEarthEngine(),
        this.loadModels(),
        this.kafkaProducer.connect(),
        this.kafkaConsumer.connect()
      ]);

      await this.kafkaConsumer.subscribe({ topic: 'energy-measurements', fromBeginning: true });
      await this.kafkaConsumer.run({ eachMessage: this.processKafkaMessage.bind(this) });

      this.isInitialized = true;
      this.logger.info('Enerlectra Core Service initialized successfully');
    } catch (error) {
      this.logger.error('Initialization failed', { error });
      throw error;
    }
  }

  private initializeLogger(): void {
    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: format.combine(format.timestamp(), format.json()),
      transports: [new transports.Console(), new transports.File({ filename: 'logs/enerlectra.log' })]
    });
  }

  private initializeKafka(): void {
    const kafka = new Kafka({
      clientId: 'enerlectra-core',
      brokers: [process.env.KAFKA_BROKERS || 'localhost:9092']
    });
    this.kafkaProducer = kafka.producer();
    this.kafkaConsumer = kafka.consumer({ groupId: 'enerlectra-group' });
  }

  private async initializeEarthEngine(): Promise<void> {
    try {
      const privateKey = JSON.parse(process.env.EARTH_ENGINE_KEY || '{}');
      ee.data.authenticateViaPrivateKey(privateKey, () => {
        ee.initialize(null, null, () => this.logger.info('Earth Engine initialized'));
      });
    } catch (error) {
      this.logger.warn('Earth Engine initialization failed, using fallback mode');
    }
  }

  private async loadModels(): Promise<void> {
    try {
      AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION
      });
      const s3 = new AWS.S3();
      const bucket = process.env.MODEL_BUCKET;

      const getModel = async (path: string) => {
        const modelJson = await s3.getObject({ Bucket: bucket, Key: path }).promise();
        const modelData = JSON.parse(modelJson.Body!.toString());
        return tf.loadLayersModel(tf.io.fromMemory(modelData));
      };

      this.model = await getModel('solar_forecast/model.json');
      this.pricingModel = await getModel('energy_pricing/model.json');
    } catch (error) {
      this.logger.error('Model loading failed', { error });
    }
  }

  // ==================== SOLAR FORECASTING ====================
  public async forecastSolar(
    coordinates: Coordinates,
    date: Date = new Date()
  ): Promise<SolarForecast> {
    const cacheKey = `forecast-${coordinates.join(',')}-${date.toISOString().slice(0, 13)}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const startTime = Date.now();
    
    try {
      const [weatherData, satelliteData] = await Promise.all([
        this.fetchWeatherData(coordinates, date),
        this.fetchSatelliteData(coordinates, date)
      ]);

      const inputTensor = this.prepareInputTensor(weatherData, satelliteData);
      const prediction = this.model!.predict(inputTensor) as tf.Tensor;
      const predictionData = await prediction.array() as number[][];

      const forecast = this.postProcessPrediction(predictionData[0], weatherData, satelliteData, startTime);
      this.setCached(cacheKey, forecast);
      
      return forecast;
    } finally {
      tf.disposeVariables();
    }
  }

  private async fetchWeatherData(coordinates: Coordinates, date: Date): Promise<any> {
    const [lat, lon] = coordinates;
    const apiKey = process.env.WEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,daily,alerts&appid=${apiKey}`;
    const response = await axios.get(url);
    const data = response.data;
    return {
      temp: data.hourly.map(h => h.temp - 273.15), // Convert Kelvin to Celsius
      cloudCover: data.hourly.map(h => h.clouds / 100), // 0-1 scale
      precipitationProb: data.hourly.map(h => h.pop) // Probability of precipitation
    };
  }

  private async fetchSatelliteData(coordinates: Coordinates, date: Date): Promise<any> {
    try {
      const point = ee.Geometry.Point(coordinates);
      const startDate = ee.Date(date);
      const endDate = startDate.advance(1, 'day');

      const aerosolColl = ee.ImageCollection('COPERNICUS/S5P/OFFL/L3_AER_AI')
        .filterDate(startDate, endDate)
        .filterBounds(point);

      const composite = aerosolColl.mean();
      const reduced = composite.reduceRegion({
        reducer: ee.Reducer.first(),
        geometry: point,
        scale: 1000
      });

      return await reduced.getInfo();
    } catch (error) {
      this.logger.warn('Earth Engine fetch failed, using fallback data');
      return {
        aerosol_index: 0.5,
        water_vapor: 2.0,
        cloud_probability: 30
      };
    }
  }

  private prepareInputTensor(weather: any, satellite: any): tf.Tensor {
    const features = [
      ...weather.temp,
      ...weather.cloudCover,
      ...weather.precipitationProb,
      satellite.aerosol_index,
      satellite.water_vapor,
      satellite.cloud_probability
    ];
    return tf.tensor2d([features]);
  }

  private postProcessPrediction(prediction: number[], weather: any, satellite: any, startTime: number): SolarForecast {
    return {
      coordinates: [0, 0], // Placeholder
      timestamp: new Date(),
      forecastStart: new Date(),
      hourlyGHI: prediction.slice(0, 24),
      hourlyDNI: prediction.slice(24, 48),
      hourlyDHI: prediction.slice(48, 72),
      confidence: 0.95,
      cloudCover: weather.cloudCover,
      precipitationProb: weather.precipitationProb,
      ambientTemperature: weather.temp,
      metadata: {
        modelVersion: '1.0',
        processingTimeMs: Date.now() - startTime,
        dataSources: ['Weather API', 'Earth Engine'],
        qualityScore: 0.9
      }
    };
  }

  // ==================== ENERGY OPTIMIZATION ====================
  public async optimizeEnergy(
    location: Coordinates,
    assets: EnergyAsset[],
    contracts: EnergyContract[],
    consumption: ConsumptionProfile
  ): Promise<OptimizationResult> {
    const solarForecast = await this.forecastSolar(location);
    const productionForecast = this.predictEnergyProduction(solarForecast, assets);
    const allocationPlan = this.createAllocationPlan(productionForecast, consumption, contracts);
    const financialAnalysis = this.analyzeFinancials(allocationPlan, contracts);
    const actions = this.generateOptimizationActions(allocationPlan);

    // Execute blockchain trades for excess energy
    for (const alloc of allocationPlan.hourlyAllocation) {
      if (alloc.saleOpportunity > 0) {
        const energyAmount = ethers.parseUnits(alloc.saleOpportunity.toString(), 18);
        const pricePerKwh = ethers.parseUnits('0.06', 18); // Default price; could fetch from oracle
        const expiresAt = Math.floor(Date.now() / 1000) + 24 * 3600; // 24-hour expiration

        const tx = await this.tradingContract.createEnergyOffer(energyAmount, pricePerKwh, expiresAt, false);
        await tx.wait();
        this.logger.info(`Created energy offer for ${alloc.saleOpportunity} kWh, tx: ${tx.hash}`);

        // Optionally execute trade if buyer is available (simplified)
        const offerId = (await tx.wait()).logs[0].args.offerId.toString();
        const activeOffers = await this.tradingContract.getActiveOffers();
        for (let i = 0; i < activeOffers.length; i++) {
          if (activeOffers[i].offerId.toString() === offerId) {
            const buyTx = await this.tradingContract.executeTradeWithBlockchain(offerId);
            await buyTx.wait();
            this.logger.info(`Executed trade for offer ${offerId}, tx: ${buyTx.hash}`);
            break;
          }
        }
      }
    }

    const result: OptimizationResult = {
      productionForecast,
      allocationPlan,
      financialAnalysis,
      actions,
      resultId: uuidv4()
    };

    await this.saveOptimizationResult(result);
    await this.emitKafkaEvent('energy-optimization', result);

    return result;
  }

  private predictEnergyProduction(forecast: SolarForecast, assets: EnergyAsset[]): ProductionForecast {
    const byAsset: Record<string, number[]> = {};
    const total: number[] = Array(24).fill(0);

    for (const asset of assets.filter(a => a.type === 'solar_pv')) {
      const hourly = forecast.hourlyGHI.map(ghi => {
        const efficiency = asset.efficiency || 0.18;
        const tempFactor = 1 + ((forecast.ambientTemperature[0] - 25) * (asset.tempCoefficient || -0.004));
        const degFactor = 1 - (asset.degradationRate || 0.005) * (asset.ageYears || 0);
        return ghi * (asset.area || 1) * efficiency * tempFactor * degFactor;
      });
      byAsset[asset.id] = hourly;
      hourly.forEach((val, i) => total[i] += val);
    }

    return {
      total,
      byAsset,
      revenuePotential: total.reduce((sum, val) => sum + val * 0.06, 0)
    };
  }

  private createAllocationPlan(production: ProductionForecast, consumption: ConsumptionProfile, contracts: EnergyContract[]): AllocationPlan {
    const hourlyAllocation: HourlyAllocation[] = [];
    for (let h = 0; h < 24; h++) {
      const prod = production.total[h];
      const cons = consumption.hourly[h];
      const net = prod - cons;
      let batteryAction = 'idle';
      let batteryAmount = 0;
      let gridAction = 'none';
      let importAmount = 0;
      let exportAmount = 0;
      if (net > 0) {
        batteryAction = 'charge';
        batteryAmount = net * 0.5;
        exportAmount = net - batteryAmount;
        gridAction = 'export';
      } else if (net < 0) {
        batteryAction = 'discharge';
        batteryAmount = -net * 0.5;
        importAmount = -net - batteryAmount;
        gridAction = 'import';
      }
      hourlyAllocation.push({
        time: `Hour ${h}`,
        production: prod,
        consumption: cons,
        net,
        batteryAction,
        batteryAmount,
        gridAction,
        importAmount,
        exportAmount,
        saleOpportunity: net > 0 ? net * 0.06 : 0
      });
    }

    return {
      hourlyAllocation,
      batterySchedule: [],
      salesRecommendations: [],
      purchaseRecommendations: []
    };
  }

  private analyzeFinancials(plan: AllocationPlan, contracts: EnergyContract[]): FinancialAnalysis {
    let revenue = 0;
    let costs = 0;
    plan.hourlyAllocation.forEach(alloc => {
      if (alloc.exportAmount > 0) revenue += alloc.exportAmount * contracts[0].sellRate;
      if (alloc.importAmount > 0) costs += alloc.importAmount * contracts[0].buyRate;
    });
    const baselineCost = plan.hourlyAllocation.reduce((sum, a) => sum + a.consumption * contracts[0].buyRate, 0);
    return {
      revenue,
      costs,
      baselineCost,
      savings: baselineCost - costs + revenue,
      roi: (revenue - costs) / 1000,
      paybackPeriod: 1000 / (revenue - costs)
    };
  }

  private generateOptimizationActions(plan: AllocationPlan): OptimizationAction[] {
    return plan.hourlyAllocation
      .filter(a => a.saleOpportunity > 10)
      .map(a => ({
        type: 'sell',
        time: a.time,
        amount: a.saleOpportunity / 0.06
      }));
  }

  // ==================== WASTE MONITORING ====================
  public async analyzeEnergyWaste(measurement: EnergyMeasurement): Promise<WasteAnalysis> {
    const analysis: WasteAnalysis = {
      timestamp: new Date(),
      userId: measurement.userId,
      totalProduction: measurement.generation,
      totalConsumption: measurement.consumption,
      curtailmentWaste: Math.max(0, measurement.generation - measurement.consumption - (measurement.batteryCharge || 0)),
      batteryWaste: this.calculateBatteryWaste(measurement),
      conversionLosses: measurement.generation * 0.05,
      suboptimalUsage: await this.calculateSuboptimalUsage(measurement.userId),
      peakPenalty: this.calculatePeakPenalty(measurement),
      totalWaste: 0,
      financialImpact: {} as FinancialImpact,
      recommendations: []
    };

    analysis.totalWaste = analysis.curtailmentWaste + analysis.batteryWaste + 
                         analysis.conversionLosses + analysis.suboptimalUsage + analysis.peakPenalty;
    analysis.financialImpact = this.calculateFinancialImpact(analysis);
    analysis.recommendations = this.generateWasteRecommendations(analysis);

    await this.updateUserDashboard(measurement.userId, analysis);
    if (analysis.totalWaste > 5) {
      await this.sendWasteAlert(measurement.userId, analysis);
    }

    return analysis;
  }

  private calculateBatteryWaste(measurement: EnergyMeasurement): number {
    const efficiency = measurement.batteryEfficiency || 0.9;
    const chargeLoss = (measurement.batteryCharge || 0) * (1 - efficiency);
    const dischargeLoss = (measurement.batteryDischarge || 0) * (1 - efficiency);
    return chargeLoss + dischargeLoss;
  }

  private async calculateSuboptimalUsage(userId: string): Promise<number> {
    const db = this.mongoClient.db();
    const historical = await db.collection('measurements').find({ userId }).sort({ timestamp: -1 }).limit(24).toArray();
    return historical.reduce((sum, m) => sum + Math.abs(m.generation - m.consumption) * 0.1, 0) / historical.length;
  }

  private calculatePeakPenalty(measurement: EnergyMeasurement): number {
    const threshold = 100;
    return Math.max(0, measurement.consumption - threshold) * 0.5;
  }

  private calculateFinancialImpact(analysis: WasteAnalysis): FinancialImpact {
    return {
      dailyWasteCost: analysis.totalWaste * 0.06,
      monthlyWasteCost: analysis.totalWaste * 0.06 * 30,
      annualWasteCost: analysis.totalWaste * 0.06 * 365,
      carbonImpact: analysis.totalWaste * 0.5,
      potentialSavings: analysis.totalWaste * 0.06 * 0.5
    };
  }

  private generateWasteRecommendations(analysis: WasteAnalysis): string[] {
    const recs = [];
    if (analysis.curtailmentWaste > 0) recs.push('Increase storage capacity or find export opportunities');
    if (analysis.batteryWaste > 0) recs.push('Optimize battery charge/discharge cycles');
    return recs;
  }

  private async updateUserDashboard(userId: string, analysis: WasteAnalysis): Promise<void> {
    const db = this.mongoClient.db();
    await db.collection('dashboards').updateOne(
      { userId },
      { $set: { lastWasteAnalysis: analysis } },
      { upsert: true }
    );
  }

  private async sendWasteAlert(userId: string, analysis: WasteAnalysis): Promise<void> {
    this.logger.info(`Sending waste alert to user ${userId}`, { waste: analysis.totalWaste });
  }

  // ==================== CLUSTER MANAGEMENT ====================
  public async createEnergyCluster(config: ClusterConfig): Promise<EnergyCluster> {
    const cluster: EnergyCluster = {
      id: uuidv4(),
      name: config.name,
      location: config.location,
      segments: config.segments,
      members: [{
        userId: config.founderId,
        segment: config.segments[0].type,
        joinedAt: new Date(),
        contributionAmount: config.initialFunding,
        sharePercentage: 100,
        role: 'coordinator',
        votingPower: 100,
        energyProfile: this.getDefaultEnergyProfile(config.segments[0].type),
        isActive: true
      }],
      sharedAssets: [],
      pooledFunds: config.initialFunding,
      governanceRules: config.governanceRules || this.getDefaultGovernanceRules(),
      tradingRules: config.tradingRules || this.getDefaultTradingRules()
    };

    await this.saveCluster(cluster);
    return cluster;
  }

  // ==================== HELPER METHODS ====================
  private getCached(key: string): any {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.CACHE_TTL) {
      return item.data;
    }
    return null;
  }

  private setCached(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async processKafkaMessage({ message }: any): Promise<void> {
    try {
      const measurement = JSON.parse(message.value.toString());
      await this.analyzeEnergyWaste(measurement);
    } catch (error) {
      this.logger.error('Failed to process Kafka message', { error });
    }
  }

  private async emitKafkaEvent(topic: string, data: any): Promise<void> {
    try {
      await this.kafkaProducer.send({
        topic,
        messages: [{ value: JSON.stringify(data) }]
      });
    } catch (error) {
      this.logger.error('Failed to emit Kafka event', { error, topic });
    }
  }

  // ==================== DATABASE OPERATIONS ====================
  private async connectToDatabase(): Promise<void> {
    try {
      await this.mongoClient.connect();
      this.logger.info('Connected to MongoDB');
    } catch (error) {
      this.logger.error('Database connection failed', { error });
      throw error;
    }
  }

  private async saveOptimizationResult(result: OptimizationResult): Promise<void> {
    const db = this.mongoClient.db();
    await db.collection('optimization_results').insertOne({
      ...result,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
  }

  private async saveCluster(cluster: EnergyCluster): Promise<void> {
    const db = this.mongoClient.db();
    await db.collection('energy_clusters').insertOne(cluster);
  }

  // ==================== FALLBACK METHODS ====================
  private getFallbackSatelliteData(): any {
    return {
      aerosol_index: 0.5,
      water_vapor: 2.0,
      cloud_probability: 30
    };
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

  private getDefaultEnergyProfile(segmentType: string): any {
    const profiles = {
      industrial: { demandForecast: 5000, loadProfile: 'continuous', priority: 'high' },
      commercial: { demandForecast: 1500, loadProfile: 'daytime-peak', priority: 'medium' },
      residential: { demandForecast: 300, loadProfile: 'evening-peak', priority: 'variable' }
    };
    return profiles[segmentType] || { demandForecast: 1000, loadProfile: 'variable', priority: 'medium' };
  }

  // ==================== CLEANUP ====================
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Enerlectra Core Service');
    
    await Promise.all([
      this.mongoClient.close(),
      this.kafkaProducer.disconnect(),
      this.kafkaConsumer.disconnect()
    ]);

    tf.disposeVariables();
    this.isInitialized = false;
    this.logger.info('Shutdown completed');
  }
}

// ==================== ADDITIONAL TYPES ====================
interface EnergyMeasurement {
  userId: string;
  timestamp: Date;
  generation: number;
  consumption: number;
  gridImport: number;
  gridExport: number;
  batteryCharge?: number;
  batteryDischarge?: number;
  batteryState?: number;
  batteryEfficiency?: number;
}

interface GovernanceRules {
  votingThreshold: number;
  quorumRequirement: number;
  proposalTypes: ProposalType[];
  decisionHistory: any[];
  meetingSchedule: string;
}

interface TradingRules {
  internalRate: number;
  externalRate: number;
  tradingHours: { start: string; end: string };
  priorityAllocation: string;
  surplusHandling: string;
  minimumReserve: number;
}

interface ProposalType {
  type: string;
  requiredApproval: number;
  discussionPeriod: number;
}

interface ClusterConfig {
  name: string;
  location: { latitude: number; longitude: number; region: string };
  segments: EnergySegment[];
  founderId: string;
  initialFunding: number;
  governanceRules?: GovernanceRules;
  tradingRules?: TradingRules;
}

interface EnergySegment {
  type: string;
  capacityCommitment?: number;
  participants?: number;
  households?: number;
}

interface ClusterMember {
  userId: string;
  segment: string;
  joinedAt: Date;
  contributionAmount: number;
  sharePercentage: number;
  role: string;
  votingPower: number;
  energyProfile: any;
  isActive: boolean;
}

interface SharedAsset {
  id: string;
  assetType: string;
  cost: number;
  capacity: number;
  ownership: Ownership[];
}

interface Ownership {
  memberId: string;
  sharePercentage: number;
  contributionAmount: number;
}

interface AllocationPlan {
  hourlyAllocation: HourlyAllocation[];
  batterySchedule: BatteryAction[];
  salesRecommendations: SaleRecommendation[];
  purchaseRecommendations: PurchaseRecommendation[];
}

interface FinancialAnalysis {
  revenue: number;
  costs: number;
  baselineCost: number;
  savings: number;
  roi: number;
  paybackPeriod: number;
}

interface OptimizationAction {
  type: string;
  [key: string]: any;
}

interface FinancialImpact {
  dailyWasteCost: number;
  monthlyWasteCost: number;
  annualWasteCost: number;
  carbonImpact: number;
  potentialSavings: number;
}

interface HourlyAllocation {
  time: string;
  production: number;
  consumption: number;
  net: number;
  batteryAction: string;
  batteryAmount?: number;
  gridAction: string;
  importAmount?: number;
  exportAmount?: number;
  saleOpportunity: number;
}

interface BatteryAction {
  assetId: string;
  action: string;
  amount: number;
  time: string;
}

interface SaleRecommendation {
  time: string;
  amount: number;
  contractId: string;
  value: number;
}

interface PurchaseRecommendation {
  time: string;
  amount: number;
  contractId: string;
  cost: number;
}

// ==================== EXPORT FOR EXTERNAL USE ====================
export default EnerlectraCoreService;