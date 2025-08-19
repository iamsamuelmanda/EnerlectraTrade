import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock the API service
jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockApi = require('../../services/api').api;

// Test component to access auth context
const TestComponent = () => {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    startLogin, 
    verifyLogin, 
    register, 
    logout,
    enableGuestMode,
    disableGuestMode 
  } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading...' : 'Not Loading'}</div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </div>
      <div data-testid="user-name">{user?.name || 'No User'}</div>
      <div data-testid="user-phone">{user?.phone || 'No Phone'}</div>
      
      <button onClick={() => startLogin('+260955123456')} data-testid="start-login">
        Start Login
      </button>
      
      <button onClick={() => verifyLogin('+260955123456', '123456')} data-testid="verify-login">
        Verify Login
      </button>
      
      <button onClick={() => register('Test User', '+260955123456')} data-testid="register">
        Register
      </button>
      
      <button onClick={logout} data-testid="logout">
        Logout
      </button>
      
      <button onClick={enableGuestMode} data-testid="enable-guest">
        Enable Guest Mode
      </button>
      
      <button onClick={disableGuestMode} data-testid="disable-guest">
        Disable Guest Mode
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
    mockApi.get.mockResolvedValue({
      data: { success: true, data: { user: null } }
    });
    
    mockApi.post.mockResolvedValue({
      data: { success: true, data: { requestId: 'test-request-id' } }
    });
  });

  it('should provide initial unauthenticated state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    expect(screen.getByTestId('user-name')).toHaveTextContent('No User');
    expect(screen.getByTestId('user-phone')).toHaveTextContent('No Phone');
  });

  it('should show loading state initially', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('Loading...');
  });

  it('should handle startLogin successfully', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { success: true, data: { requestId: 'test-request-id' } }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByTestId('start-login'));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/auth/login/start', {
        phoneNumber: '+260955123456'
      });
    });
  });

  it('should handle verifyLogin successfully', async () => {
    const mockUser = {
      id: 'test-user-id',
      phone: '+260955123456',
      name: 'Test User',
      region: 'Zambia',
      walletBalance: { zmw: 100, kwh: 50 },
      carbonSavings: 25,
      reputation: 100,
      clusters: [],
      createdAt: new Date().toISOString()
    };

    mockApi.post.mockResolvedValueOnce({
      data: { success: true, data: { user: mockUser } }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByTestId('verify-login'));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/auth/login/verify', {
        phoneNumber: '+260955123456',
        code: '123456'
      });
    });
  });

  it('should handle registration successfully', async () => {
    const mockUser = {
      id: 'new-user-id',
      phone: '+260955123456',
      name: 'Test User',
      region: 'Zambia',
      walletBalance: { zmw: 0, kwh: 0 },
      carbonSavings: 0,
      reputation: 0,
      clusters: [],
      createdAt: new Date().toISOString()
    };

    mockApi.post.mockResolvedValueOnce({
      data: { success: true, data: { user: mockUser } }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByTestId('register'));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/auth/register', {
        name: 'Test User',
        phoneNumber: '+260955123456'
      });
    });
  });

  it('should handle logout', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { success: true }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByTestId('logout'));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/auth/logout');
    });
  });

  it('should handle guest mode', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Enable guest mode
    fireEvent.click(screen.getByTestId('enable-guest'));
    
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Guest User');

    // Disable guest mode
    fireEvent.click(screen.getByTestId('disable-guest'));
    
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    expect(screen.getByTestId('user-name')).toHaveTextContent('No User');
  });

  it('should handle API errors gracefully', async () => {
    mockApi.post.mockRejectedValueOnce(new Error('Network error'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByTestId('start-login'));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalled();
    });
  });

  it('should handle authentication check on mount', async () => {
    const mockUser = {
      id: 'existing-user-id',
      phone: '+260955123456',
      name: 'Existing User',
      region: 'Zambia',
      walletBalance: { zmw: 200, kwh: 100 },
      carbonSavings: 50,
      reputation: 200,
      clusters: ['cluster1'],
      createdAt: new Date().toISOString()
    };

    mockApi.get.mockResolvedValueOnce({
      data: { success: true, data: { user: mockUser } }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-name')).toHaveTextContent('Existing User');
    });
  });
}); 