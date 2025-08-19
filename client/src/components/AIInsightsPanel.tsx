import React, { useState, useEffect } from 'react'
import { Brain, TrendingUp, TrendingDown, Zap, Lightbulb, AlertTriangle, Loader2 } from 'lucide-react'
import { apiService } from '../services/api'

interface AIInsight {
  id: string
  type: 'market_analysis' | 'trading_recommendation' | 'risk_alert' | 'opportunity'
  title: string
  description: string
  confidence: number
  impact: 'high' | 'medium' | 'low'
  timestamp: string
  data?: any
}

interface MarketInsight {
  trend: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  factors: string[]
  recommendation: string
  riskLevel: 'low' | 'medium' | 'high'
}

const AIInsightsPanel: React.FC = () => {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [marketInsight, setMarketInsight] = useState<MarketInsight | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'insights' | 'market' | 'recommendations'>('insights')

  useEffect(() => {
    fetchAIInsights()
    fetchMarketInsights()
  }, [])

  const fetchAIInsights = async () => {
    try {
      const response = await apiService.aiAssist('system', 'Get latest market insights and trading recommendations', 'market_analysis')
      if (response.data?.success) {
        // Parse AI response and create insights
        const aiInsights = parseAIResponse(response.data.data)
        setInsights(aiInsights)
      }
    } catch (error) {
      console.error('Failed to fetch AI insights:', error)
      // Fallback to mock data
      setInsights(generateMockInsights())
    }
  }

  const fetchMarketInsights = async () => {
    setIsLoading(true)
    try {
      const response = await apiService.marketInsights()
      if (response.data?.success) {
        setMarketInsight(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch market insights:', error)
      // Fallback to mock data
      setMarketInsight(generateMockMarketInsight())
    } finally {
      setIsLoading(false)
    }
  }

  const parseAIResponse = (aiData: any): AIInsight[] => {
    // This would parse the actual AI response
    // For now, return mock data
    return generateMockInsights()
  }

  const generateMockInsights = (): AIInsight[] => [
    {
      id: '1',
      type: 'market_analysis',
      title: 'Energy Demand Surge Expected',
      description: 'AI analysis predicts 15% increase in energy demand over next 7 days due to weather patterns and economic activity.',
      confidence: 87,
      impact: 'high',
      timestamp: new Date().toISOString(),
      data: { demandIncrease: 15, timeframe: '7 days', factors: ['weather', 'economic_activity'] }
    },
    {
      id: '2',
      type: 'trading_recommendation',
      title: 'Buy Opportunity in Lusaka Cluster',
      description: 'Current pricing shows 8% discount compared to historical averages. Recommended entry point for energy buyers.',
      confidence: 92,
      impact: 'medium',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      data: { discount: 8, location: 'Lusaka', recommendation: 'buy' }
    },
    {
      id: '3',
      type: 'risk_alert',
      title: 'Supply Constraint Warning',
      description: 'Detected potential supply constraints in Copperbelt region. Consider diversifying energy sources.',
      confidence: 78,
      impact: 'high',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      data: { region: 'Copperbelt', riskType: 'supply_constraint' }
    },
    {
      id: '4',
      type: 'opportunity',
      title: 'Peak Hour Arbitrage',
      description: 'Price differential between peak and off-peak hours has increased to 23%. Consider time-shifting energy purchases.',
      confidence: 85,
      impact: 'medium',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      data: { priceDiff: 23, strategy: 'time_arbitrage' }
    }
  ]

  const generateMockMarketInsight = (): MarketInsight => ({
    trend: 'bullish',
    confidence: 82,
    factors: [
      'Increased renewable energy adoption',
      'Growing demand from industrial sector',
      'Favorable regulatory environment',
      'Technology cost reductions'
    ],
    recommendation: 'Consider increasing energy holdings and exploring cluster investments',
    riskLevel: 'medium'
  })

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'market_analysis':
        return <TrendingUp className="w-5 h-5" />
      case 'trading_recommendation':
        return <Lightbulb className="w-5 h-5" />
      case 'risk_alert':
        return <AlertTriangle className="w-5 h-5" />
      case 'opportunity':
        return <Zap className="w-5 h-5" />
      default:
        return <Brain className="w-5 h-5" />
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-400'
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-400'
      case 'low':
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400'
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400'
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'bullish':
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400'
      case 'bearish':
        return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-400'
      case 'neutral':
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400'
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600'
    if (confidence >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Insights</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Powered by Claude AI</p>
          </div>
        </div>
        <button
          onClick={fetchMarketInsights}
          disabled={isLoading}
          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('insights')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'insights'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Latest Insights
        </button>
        <button
          onClick={() => setActiveTab('market')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'market'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Market Analysis
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'recommendations'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Trading Tips
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'insights' && (
          <div className="space-y-4">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {insight.title}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getImpactColor(insight.impact)}`}>
                          {insight.impact}
                        </span>
                        <span className={`text-xs font-medium ${getConfidenceColor(insight.confidence)}`}>
                          {insight.confidence}%
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {insight.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{new Date(insight.timestamp).toLocaleString()}</span>
                      <span className="capitalize">{insight.type.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'market' && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : marketInsight ? (
              <>
                {/* Market Trend */}
                <div className="text-center">
                  <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getTrendColor(marketInsight.trend)}`}>
                    {marketInsight.trend === 'bullish' ? <TrendingUp className="w-4 h-4 mr-2" /> : <TrendingDown className="w-4 h-4 mr-2" />}
                    {marketInsight.trend.charAt(0).toUpperCase() + marketInsight.trend.slice(1)} Market
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Confidence: <span className={`font-medium ${getConfidenceColor(marketInsight.confidence)}`}>{marketInsight.confidence}%</span>
                  </p>
                </div>

                {/* Key Factors */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Key Market Factors</h4>
                  <div className="space-y-2">
                    {marketInsight.factors.map((factor, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendation */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">AI Recommendation</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">{marketInsight.recommendation}</p>
                </div>

                {/* Risk Level */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Risk Level:</span>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getImpactColor(marketInsight.riskLevel)}`}>
                    {marketInsight.riskLevel.charAt(0).toUpperCase() + marketInsight.riskLevel.slice(1)}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No market insights available
              </div>
            )}
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">💡 Smart Trading Tips</h4>
              <ul className="text-sm text-green-800 dark:text-green-200 space-y-2">
                <li>• Monitor peak vs off-peak price differentials for arbitrage opportunities</li>
                <li>• Diversify energy sources across multiple clusters to reduce risk</li>
                <li>• Set price alerts for your preferred energy price points</li>
                <li>• Consider long-term contracts during market dips</li>
                <li>• Use AI insights to time your energy purchases strategically</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">⚠️ Risk Management</h4>
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-2">
                <li>• Never invest more than you can afford to lose</li>
                <li>• Monitor cluster performance and diversification</li>
                <li>• Stay informed about regulatory changes</li>
                <li>• Consider insurance for large energy holdings</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AIInsightsPanel 