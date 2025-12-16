import axios from "axios";

const API_BASE_URL =
  (import.meta as any).env.VITE_API_URL || "http://localhost:3000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: { "Content-Type": "application/json" },
});

// --- Simple stub for unimplemented endpoints ---
const stub = async (data: any) =>
  new Promise((resolve) => setTimeout(() => resolve({ data }), 60));

export const apiService = {
  //
  // 🔥 REAL MVP ENDPOINTS (match server.js)
  //
  getClusters() {
    return api.get("/clusters");
  },

  getCluster(id: string) {
    return api.get(`/clusters/${id}`);
  },

  joinCluster(userId: string, clusterId: string) {
    return api.post(`/clusters/${clusterId}/join`, { userId });
  },

  getUserBalance(userId: string) {
    return api.get(`/user/${userId}/balance`);
  },

  reportEnergy(deviceId: string, value_kWh: number, userId: string) {
    return api.post("/device/report", { deviceId, value_kWh, userId });
  },

  contribute(userId: string, clusterId: string, amount: number) {
    return api.post("/contributions", { userId, clusterId, amount });
  },

  getContributionHistory(userId: string) {
    return api.get(`/contributions/history/${userId}`);
  },

  getMarketplace(type?: string) {
    return api.get("/marketplace", { params: { type } });
  },

  getMap() {
    return api.get("/map");
  },

  getLedger() {
    return api.get("/ledger");
  },

  //
  // 🧩 STUBBED ENDPOINTS (frontend expects them but backend doesn’t have them)
  //
  startLogin() {
    return stub({ success: true, token: "mvp-login" });
  },

  verifyLogin() {
    return stub({ success: true, token: "mvp-login" });
  },

  getProfile() {
    return stub({
      userId: "USER1",
      name: "MVP User",
      role: "Prosumer",
      balances: { money: 200, energy: 50 },
    });
  },

  getUser(userId: string) {
    return stub({ userId, name: "MVP User" });
  },

  getTransactions() {
    return stub([]);
  },

  addFunds() {
    return stub({ success: true });
  },

  executeBlockchainTrade() {
    return stub({ success: true });
  },

  executeMobileMoneyTrade() {
    return stub({ success: true });
  },

  connectWallet() {
    return stub({ connected: true });
  },

  getBlockchainBalance() {
    return stub({ balance: 0 });
  },

  marketInsights() {
    return stub({ insights: [] });
  },

  aiAssist() {
    return stub({ response: "AI disabled for MVP" });
  },
};

export default api;
