import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';
import { SocketProvider } from '../contexts/SocketContext';
import EnerlectraDashboard from '../App';

// Mock the API service
jest.mock('../services/api', () => ({
  apiService: {
    getPricing: jest.fn(),
  },
}));

// Mock the toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
  default: jest.fn(),
}));

// Mock fetch for health check
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('EnerlectraDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful health check
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'healthy' })
    } as Response);
  });

  it('should render the main dashboard', () => {
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    expect(screen.getByText('Enerlectra')).toBeInTheDocument();
    expect(screen.getByText('African Energy Trading Platform')).toBeInTheDocument();
    expect(screen.getByText('Welcome to Enerlectra')).toBeInTheDocument();
  });

  it('should show connection status', () => {
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('should show sign in button when not authenticated', () => {
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('should display market statistics', () => {
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    expect(screen.getByText('Energy Price')).toBeInTheDocument();
    expect(screen.getByText('Total Volume')).toBeInTheDocument();
    expect(screen.getByText('Active Traders')).toBeInTheDocument();
    expect(screen.getByText('Market Status')).toBeInTheDocument();
  });

  it('should show system status information', () => {
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    expect(screen.getByText('System Status')).toBeInTheDocument();
    expect(screen.getByText('Backend URL:')).toBeInTheDocument();
    expect(screen.getByText('Health Check:')).toBeInTheDocument();
  });

  it('should handle login modal opening', () => {
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Sign In'));
    
    // The modal should be rendered
    expect(screen.getByText('Welcome to Enerlectra')).toBeInTheDocument();
  });

  it('should display energy listings when connected', async () => {
    // Mock successful API response
    const mockApiService = require('../services/api').apiService;
    mockApiService.getPricing.mockResolvedValue({
      data: {
        data: {
          clusterPricing: [
            {
              clusterId: 'cluster1',
              location: { region: 'Lusaka' },
              basePrice: 0.10,
              currentPrice: 0.12,
              availableKWh: 1000,
              utilizationPercent: 75
            }
          ]
        }
      }
    });

    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Live Energy Listings')).toBeInTheDocument();
    });
  });

  it('should show price chart data', () => {
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    expect(screen.getByText('Energy Price Trend')).toBeInTheDocument();
  });

  it('should display WebSocket connection status', () => {
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    // Should show WebSocket status (either connected or offline)
    expect(screen.getByText(/🔌 Live Updates|📡 Offline/)).toBeInTheDocument();
  });

  it('should handle AI insights panel toggle', () => {
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    // AI Insights button should be present
    expect(screen.getByText('AI Insights')).toBeInTheDocument();
  });

  it('should show proper currency formatting', () => {
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    // Check if currency values are displayed
    expect(screen.getByText(/kWh/)).toBeInTheDocument();
  });

  it('should handle connection errors gracefully', async () => {
    // Mock failed health check
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    // Should show offline status
    await waitFor(() => {
      expect(screen.getByText('Demo Mode')).toBeInTheDocument();
    });
  });

  it('should show proper navigation structure', () => {
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    // Header should be present
    expect(screen.getByRole('banner')).toBeInTheDocument();
    
    // Main content should be present
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('should display proper branding and messaging', () => {
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    expect(screen.getByText('Join the future of African energy trading')).toBeInTheDocument();
    expect(screen.getByText('Enerlectra')).toBeInTheDocument();
  });
}); 