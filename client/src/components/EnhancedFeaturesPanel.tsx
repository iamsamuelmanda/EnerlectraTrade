import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Brain, 
  BarChart3, 
  Download, 
  Wifi, 
  WifiOff, 
  CreditCard, 
  MessageSquare,
  Settings,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useOffline } from '../hooks/useOffline';
import toast from 'react-hot-toast';

interface MobileMoneyProvider {
  id: string;
  name: string;
  country: string;
  supportedCurrencies: string[];
  minAmount: number;
  maxAmount: number;
  fees: {
    deposit: number;
    withdraw: number;
    transfer: number;
  };
}

interface AIAgent {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
  successfulInteractions: number;
  failedInteractions: number;
}

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalEnergyTraded: number;
  totalCarbonSaved: number;
  totalTransactions: number;
  averageTransactionValue: number;
  peakUsageHours: number[];
  popularFeatures: string[];
  userRetention: number;
  conversionRate: number;
  averageSessionDuration: number;
  errorRate: number;
  satisfactionScore: number;
}

const EnhancedFeaturesPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mobile-money' | 'ai-assistant' | 'analytics' | 'offline' | 'updates'>('mobile-money');
  const [mobileMoneyProviders, setMobileMoneyProviders] = useState<MobileMoneyProvider[]>([]);
  const [aiAgents, setAiAgents] = useState<AIAgent[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [aiQuery, setAiQuery] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  const { isOnline, syncStatus, forceSync } = useOffline();

  useEffect(() => {
    fetchMobileMoneyProviders();
    fetchAIAgents();
    fetchAnalytics();
  }, []);

  const fetchMobileMoneyProviders = async () => {
    try {
      const response = await fetch('/api/enhanced-mobile-money/providers');
      const data = await response.json();
      if (data.success) {
        setMobileMoneyProviders(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch mobile money providers:', error);
      // Mock data for demonstration
      setMobileMoneyProviders([
        {
          id: 'mtn_momo',
          name: 'MTN Mobile Money',
          country: 'Zambia',
          supportedCurrencies: ['ZMW'],
          minAmount: 1,
          maxAmount: 10000,
          fees: { deposit: 0, withdraw: 2.5, transfer: 1.5 }
        },
        {
          id: 'airtel_money',
          name: 'Airtel Money',
          country: 'Zambia',
          supportedCurrencies: ['ZMW'],
          minAmount: 1,
          maxAmount: 10000,
          fees: { deposit: 0, withdraw: 2.0, transfer: 1.0 }
        },
        {
          id: 'zamtel_kwacha',
          name: 'Zamtel Kwacha',
          country: 'Zambia',
          supportedCurrencies: ['ZMW'],
          minAmount: 1,
          maxAmount: 10000,
          fees: { deposit: 0, withdraw: 2.0, transfer: 1.0 }
        }
      ]);
    }
  };

  const fetchAIAgents = async () => {
    try {
      const response = await fetch('/api/enhanced-ai/agents');
      const data = await response.json();
      if (data.success) {
        setAiAgents(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch AI agents:', error);
      // Mock data for demonstration
      setAiAgents([
        {
          id: 'energy_advisor',
          name: 'Enerlectra Energy Advisor',
          role: 'energy_advisor',
          isActive: true,
          successfulInteractions: 1250,
          failedInteractions: 45
        },
        {
          id: 'trading_assistant',
          name: 'Enerlectra Trading Assistant',
          role: 'trading_assistant',
          isActive: true,
          successfulInteractions: 890,
          failedInteractions: 23
        },
        {
          id: 'carbon_tracker',
          name: 'Enerlectra Carbon Tracker',
          role: 'carbon_tracker',
          isActive: true,
          successfulInteractions: 567,
          failedInteractions: 12
        }
      ]);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics/dashboard?timeRange=week');
      const data = await response.json();
      if (data.success) {
        setAnalyticsData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Mock data for demonstration
      setAnalyticsData({
        totalUsers: 1250,
        activeUsers: 890,
        totalEnergyTraded: 15678.5,
        totalCarbonSaved: 12542.8,
        totalTransactions: 3456,
        averageTransactionValue: 4.5,
        peakUsageHours: [9, 14, 19],
        popularFeatures: ['energy_trading', 'mobile_money', 'ai_assistant'],
        userRetention: 78.5,
        conversionRate: 65.2,
        averageSessionDuration: 12.5,
        errorRate: 2.1,
        satisfactionScore: 4.3
      });
    }
  };

  const handleMobileMoneyDeposit = async () => {
    if (!selectedProvider || !depositAmount) {
      toast.error('Please select a provider and enter an amount');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/enhanced-mobile-money/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: selectedProvider,
          amount: depositAmount,
          phoneNumber: '+260978000001', // Mock phone number
          userId: 'user1'
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Deposit initiated! Reference: ${data.data}`);
        setDepositAmount(0);
        setSelectedProvider('');
      } else {
        toast.error('Deposit failed: ' + data.error);
      }
    } catch (error) {
      toast.error('Failed to initiate deposit');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIQuery = async () => {
    if (!aiQuery.trim()) {
      toast.error('Please enter a question');
      return;
    }

    setIsProcessingAI(true);
    try {
      const response = await fetch('/api/enhanced-ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user1',
          query: aiQuery,
          agentType: 'energy_advisor'
        })
      });

      const data = await response.json();
      if (data.success) {
        setAiResponse(data.data.content);
        toast.success('AI response received!');
      } else {
        toast.error('AI query failed: ' + data.error);
      }
    } catch (error) {
      toast.error('Failed to process AI query');
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleForceSync = async () => {
    try {
      await forceSync();
      toast.success('Sync completed successfully!');
    } catch (error) {
      toast.error('Sync failed');
    }
  };

  const handleCheckUpdates = async () => {
    try {
      const response = await fetch('/api/auto-update/check', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success && data.data) {
        toast.success('Update available! Version ' + data.data.version);
      } else {
        toast.success('You are up to date!');
      }
    } catch (error) {
      toast.error('Failed to check for updates');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Enhanced Features</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Test the new Enerlectra capabilities</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'mobile-money', label: 'Mobile Money', icon: Smartphone },
          { id: 'ai-assistant', label: 'AI Assistant', icon: Brain },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'offline', label: 'Offline Mode', icon: isOnline ? Wifi : WifiOff },
          { id: 'updates', label: 'Updates', icon: Download }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`px-4 py-3 text-sm font-medium transition-colors flex items-center space-x-2 ${
              activeTab === id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Mobile Money Tab */}
        {activeTab === 'mobile-money' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Mobile Money Services</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {mobileMoneyProviders.map((provider) => (
                  <div key={provider.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <h5 className="font-medium text-gray-900 dark:text-white">{provider.name}</h5>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{provider.country}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Deposit: {provider.fees.deposit}% | Withdraw: {provider.fees.withdraw}%
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Range: {provider.minAmount} - {provider.maxAmount} ZMW
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h5 className="font-medium text-gray-900 dark:text-white mb-3">Test Deposit</h5>
              <div className="space-y-3">
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Select Provider</option>
                  {mobileMoneyProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Amount (ZMW)"
                  value={depositAmount || ''}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <button
                  onClick={handleMobileMoneyDeposit}
                  disabled={isLoading || !selectedProvider || !depositAmount}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  <span>Initiate Deposit</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Assistant Tab */}
        {activeTab === 'ai-assistant' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">AI Assistant System</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {aiAgents.map((agent) => (
                  <div key={agent.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900 dark:text-white">{agent.name}</h5>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        agent.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {agent.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize mb-2">
                      {agent.role.replace('_', ' ')}
                    </p>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      <p>Success: {agent.successfulInteractions}</p>
                      <p>Failed: {agent.failedInteractions}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h5 className="font-medium text-gray-900 dark:text-white mb-3">Ask AI Assistant</h5>
              <div className="space-y-3">
                <textarea
                  placeholder="Ask about energy efficiency, trading strategies, or carbon reduction..."
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white h-24 resize-none"
                />
                <button
                  onClick={handleAIQuery}
                  disabled={isProcessingAI || !aiQuery.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-2"
                >
                  {isProcessingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                  <span>Ask AI</span>
                </button>
                {aiResponse && (
                  <div className="mt-4 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md">
                    <h6 className="font-medium text-gray-900 dark:text-white mb-2">AI Response:</h6>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{aiResponse}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Usage Analytics</h4>
              {analyticsData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h5 className="font-medium text-blue-900 dark:text-blue-100">Total Users</h5>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{analyticsData.totalUsers}</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h5 className="font-medium text-green-900 dark:text-green-100">Active Users</h5>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{analyticsData.activeUsers}</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <h5 className="font-medium text-purple-900 dark:text-purple-100">Energy Traded</h5>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{analyticsData.totalEnergyTraded.toFixed(1)} kWh</p>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <h5 className="font-medium text-orange-900 dark:text-orange-100">Carbon Saved</h5>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{analyticsData.totalCarbonSaved.toFixed(1)} kg</p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <h5 className="font-medium text-red-900 dark:text-red-100">User Retention</h5>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{analyticsData.userRetention.toFixed(1)}%</p>
                  </div>
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <h5 className="font-medium text-yellow-900 dark:text-yellow-100">Satisfaction</h5>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{analyticsData.satisfactionScore.toFixed(1)}/5</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p>Loading analytics...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Offline Mode Tab */}
        {activeTab === 'offline' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Offline Functionality</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    {isOnline ? <Wifi className="w-5 h-5 text-green-500" /> : <WifiOff className="w-5 h-5 text-orange-500" />}
                    <h5 className="font-medium text-gray-900 dark:text-white">Connection Status</h5>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isOnline ? 'Online - All features available' : 'Offline - Limited functionality'}
                  </p>
                </div>
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <RefreshCw className="w-5 h-5 text-blue-500" />
                    <h5 className="font-medium text-gray-900 dark:text-white">Sync Status</h5>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {syncStatus.syncInProgress ? 'Syncing...' : 'Synced'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Pending: {syncStatus.pendingActions}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h5 className="font-medium text-gray-900 dark:text-white mb-3">Offline Actions</h5>
              <div className="space-y-3">
                <button
                  onClick={handleForceSync}
                  disabled={!isOnline}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Force Sync</span>
                </button>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {isOnline 
                    ? 'Click to manually sync offline data with the server'
                    : 'Connect to internet to enable sync functionality'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Updates Tab */}
        {activeTab === 'updates' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Auto-Update System</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <h5 className="font-medium text-gray-900 dark:text-white">Update Status</h5>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">System is up to date</p>
                </div>
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Settings className="w-5 h-5 text-blue-500" />
                    <h5 className="font-medium text-gray-900 dark:text-white">Auto-Update</h5>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Enabled</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h5 className="font-medium text-gray-900 dark:text-white mb-3">Update Actions</h5>
              <div className="space-y-3">
                <button
                  onClick={handleCheckUpdates}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Check for Updates</span>
                </button>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Check if new updates are available for Enerlectra
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedFeaturesPanel;
