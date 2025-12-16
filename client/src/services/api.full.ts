import axios from 'axios'

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for JWT auth
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available (fallback for non-cookie scenarios)
    const jwtToken = localStorage.getItem('innerlectra-jwt')
    if (jwtToken) {
      config.headers['Authorization'] = `Bearer ${jwtToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      try {
        await api.post('/auth/refresh')
        // Retry original request
        return api.request(error.config)
      } catch (refreshError) {
        // Clear user data and redirect to login
        localStorage.removeItem('innerlectra-jwt')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// API service functions
export const apiService = {
  // Authentication
  async register(userData: { name: string; phoneNumber: string; initialBalanceZMW?: number }) {
    return api.post('/auth/register', userData)
  },

  async startLogin(phoneNumber: string) {
    return api.post('/auth/login/start', { phoneNumber })
  },

  async verifyLogin(phoneNumber: string, code: string, name?: string) {
    return api.post('/auth/login/verify', { phoneNumber, code, name })
  },

  async refreshToken() {
    return api.post('/auth/refresh')
  },

  async logout() {
    return api.post('/auth/logout')
  },

  async getProfile() {
    return api.get('/auth/me')
  },

  // QR Authentication
  async issueQrToken(type: 'signup' | 'payment', metadata?: any) {
    return api.post('/auth/qr/issue', { type, metadata })
  },

  async redeemQrToken(qrToken: string, phoneNumber?: string, name?: string) {
    return api.post('/auth/qr/redeem', { qrToken, phoneNumber, name })
  },

  // User management
  async getUser(userId: string) {
    return api.get(`/users/${userId}`)
  },

  async updateUser(userId: string, userData: Partial<any>) {
    return api.put(`/users/${userId}`, userData)
  },

  // Wallet operations
  async getWallet(userId: string) {
    return api.get(`/wallet/${userId}`)
  },

  async addFunds(userId: string, amount: number, currency: 'zmw' | 'kwh') {
    return api.post('/wallet/add', { userId, amount, currency })
  },

  // Cluster operations
  async getClusters() {
    return api.get('/clusters')
  },

  async getCluster(clusterId: string) {
    return api.get(`/clusters/${clusterId}`)
  },

  async createCluster(clusterData: any) {
    return api.post('/clusters/create', clusterData)
  },

  async joinCluster(userId: string, clusterId: string, contribution: number) {
    return api.post('/clusters/join', { userId, clusterId, contribution })
  },

  async getClustersByRegion(region: string) {
    return api.get(`/clusters/region/${region}`)
  },

  async getClusterDashboard(clusterId: string) {
    return api.get(`/clusters/${clusterId}/dashboard`)
  },

  async proposeEquipment(clusterId: string, proposalData: any) {
    return api.post(`/clusters/${clusterId}/equipment/propose`, proposalData)
  },

  async voteOnProposal(clusterId: string, proposalId: string, vote: 'approve' | 'reject') {
    return api.post(`/clusters/${clusterId}/vote`, { proposalId, vote })
  },

  async distributeEnergy(clusterId: string) {
    return api.post(`/clusters/${clusterId}/energy/distribute`)
  },

  async getClusterReturns(clusterId: string) {
    return api.get(`/clusters/${clusterId}/returns`)
  },

  // Trading operations
  async createTrade(tradeData: { buyerId: string; sellerId: string; kWh: number }) {
    return api.post('/trade', tradeData)
  },

  async getTradeOffers(userId?: string) {
    return api.get(`/trade/offers${userId ? `?userId=${userId}` : ''}`)
  },

  async createTradeOffer(offerData: {
    fromUserId: string
    energyAmount: number
    pricePerKwh: number
    tradeType: 'peer_to_peer' | 'cluster_to_user' | 'user_to_cluster'
    toUserId?: string
    fromUserName?: string
    clusterName?: string
    region?: string
  }) {
    return api.post('/trade/offers', offerData)
  },

  async acceptTrade(tradeId: string, userId: string) {
    return api.post(`/trade/${tradeId}/accept`, { userId })
  },

  async bulkTrade(trades: any[]) {
    return api.post('/trade/bulk/trade', { trades })
  },

  // Market data
  async getMarketStats() {
    return api.get('/market/stats')
  },

  async getPricing() {
    return api.get('/pricing')
  },

  // Carbon tracking
  async getCarbonFootprint(userId: string) {
    return api.get(`/carbon/${userId}`)
  },

  // Transaction history
  async getTransactions(userId: string) {
    return api.get(`/transactions/${userId}`)
  },

  // Mobile money
  async depositMobileMoney(userId: string, amount: number, provider: string, phone: string) {
    return api.post('/mobilemoney/deposit', { userId, amount, provider, phone })
  },

  async withdrawMobileMoney(userId: string, amount: number, provider: string, phone: string) {
    return api.post('/mobilemoney/withdraw', { userId, amount, provider, phone })
  },

  async getMobileMoneyLedger(userId: string) {
    return api.get(`/mobilemoney/ledger/${userId}`)
  },

  // Price alerts
  async subscribeToPriceAlert(userId: string, alertData: any) {
    return api.post('/alerts/subscribe', { userId, ...alertData })
  },

  async getUserAlerts(userId: string) {
    return api.get(`/alerts/user/${userId}`)
  },

  // Leaderboard
  async getLeaderboard(clusterId?: string) {
    return api.get(`/leaderboard${clusterId ? `?clusterId=${clusterId}` : ''}`)
  },

  // Blockchain operations
  async connectWallet(walletAddress: string, userId: string) {
    return api.post('/blockchain/connect', { walletAddress, userId })
  },

  async getBlockchainBalance(userId: string) {
    return api.get(`/blockchain/balance/${userId}`)
  },

  // USSD operations
  async processUssdRequest(sessionId: string, phoneNumber: string, text: string) {
    return api.post('/ussd', { sessionId, phoneNumber, text })
  },

  // AI operations
  async analyzeTransaction(transactionId: string) {
    return api.post('/ai/analyze-transaction', { transactionId })
  },

  async marketInsights() {
    return api.post('/ai/market-insights', {})
  },

  async aiAssist(userId: string, query: string, category?: string) {
    return api.post('/ai/user-assistance', { userId, query, category })
  },

  // Hybrid Payment System
  async executeHybridTrade(data: {
    offerId: string
    buyerId: string
    phoneNumber: string
    paymentMethod: 'hybrid'
  }) {
    return api.post('/blockchain/trade/execute', data)
  },

  async executeMobileMoneyTrade(data: {
    offerId: string
    buyerPhone: string
    mobileMoneyReference: string
  }) {
    return api.post('/blockchain/trade/mobile-money', data)
  },

  async executeBlockchainTrade(data: {
    offerId: string
    buyerAddress: string
  }) {
    return api.post('/blockchain/trade/blockchain', data)
  },

  async getBlockchainStatus() {
    return api.get('/blockchain/status')
  },

  async getBlockchainHealth() {
    return api.get('/blockchain/health')
  },

  async syncBlockchainData() {
    return api.post('/blockchain/sync')
  }
}

export default api
