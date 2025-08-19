// Mock API service for testing
export const apiService = {
  getPricing: jest.fn().mockResolvedValue({
    data: {
      data: {
        baseRate: {
          effectiveRate: 0.12
        },
        clusterPricing: [
          {
            clusterId: 'cluster1',
            location: { region: 'Lusaka' },
            basePrice: 0.10,
            currentPrice: 0.12,
            availableKWh: 1000,
            utilizationPercent: 75
          },
          {
            clusterId: 'cluster2',
            location: { region: 'Copperbelt' },
            basePrice: 0.11,
            currentPrice: 0.13,
            availableKWh: 800,
            utilizationPercent: 60
          }
        ]
      }
    }
  }),

  // Add other API methods as needed for testing
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

export default apiService; 