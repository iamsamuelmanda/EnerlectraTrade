import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const user = localStorage.getItem('innerlectra-user')
    if (user) {
      try {
        const userData = JSON.parse(user)
        config.headers['X-User-ID'] = userData.id
        config.headers['X-User-Phone'] = userData.phone
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
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
  (error) => {
    if (error.response?.status === 401) {
      // Clear user data and redirect to login
      localStorage.removeItem('innerlectra-user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API service functions
export const apiService = {
  // User management
  async getUser(userId: string) {
    return api.get(`/users/${userId}`)
  },

  async registerUser(userData: { phone: string; region: string; name?: string }) {
    return api.post('/users/register', userData)
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
  async createTrade(tradeData: {
    fromUserId: string
    toUserId: string
    energyAmount: number
    pricePerKwh: number
    tradeType: 'peer_to_peer' | 'cluster_to_user'
  }) {
    return api.post('/trade', tradeData)
  },

  async getTradeOffers(userId?: string) {
    return api.get(`/trade/offers${userId ? `?userId=${userId}` : ''}`)
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
  }
}

export default api
