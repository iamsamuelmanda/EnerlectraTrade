import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful health check
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'healthy' })
    } as Response);
  });

  it('should complete full phone authentication flow', async () => {
    const user = userEvent.setup();
    
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    // Open login modal
    fireEvent.click(screen.getByText('Sign In'));
    
    // Select phone authentication
    fireEvent.click(screen.getByText('Continue with Phone'));
    
    // Enter phone number
    const phoneInput = screen.getByPlaceholderText('955 123 456');
    await user.type(phoneInput, '955123456');
    
    // Continue to OTP
    fireEvent.click(screen.getByText('Continue'));
    
    // Should show OTP screen
    await waitFor(() => {
      expect(screen.getByText('Verify OTP')).toBeInTheDocument();
    });
  });

  it('should handle guest mode access', async () => {
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    // Open login modal
    fireEvent.click(screen.getByText('Sign In'));
    
    // Select guest mode
    fireEvent.click(screen.getByText('Explore as Guest'));
    
    // Should close modal and show guest welcome
    await waitFor(() => {
      expect(screen.queryByText('Welcome to Enerlectra')).not.toBeInTheDocument();
    });
  });

  it('should show multiple authentication options', () => {
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    // Open login modal
    fireEvent.click(screen.getByText('Sign In'));
    
    // Should show all authentication methods
    expect(screen.getByText('Continue with Phone')).toBeInTheDocument();
    expect(screen.getByText('Continue with Email')).toBeInTheDocument();
    expect(screen.getByText('Explore as Guest')).toBeInTheDocument();
  });

  it('should handle email authentication flow', async () => {
    const user = userEvent.setup();
    
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    // Open login modal
    fireEvent.click(screen.getByText('Sign In'));
    
    // Select email authentication
    fireEvent.click(screen.getByText('Continue with Email'));
    
    // Enter email
    const emailInput = screen.getByPlaceholderText('your@email.com');
    await user.type(emailInput, 'test@example.com');
    
    // Continue to magic link
    fireEvent.click(screen.getByText('Continue'));
    
    // Should show magic link sent screen
    await waitFor(() => {
      expect(screen.getByText('Check Your Email')).toBeInTheDocument();
    });
  });

  it('should handle registration flow', async () => {
    const user = userEvent.setup();
    
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    // Open login modal
    fireEvent.click(screen.getByText('Sign In'));
    
    // Select phone authentication
    fireEvent.click(screen.getByText('Continue with Phone'));
    
    // Switch to register mode
    fireEvent.click(screen.getByText("Don't have an account? Sign up"));
    
    // Fill in registration form
    const nameInput = screen.getByPlaceholderText('Enter your full name');
    const phoneInput = screen.getByPlaceholderText('955 123 456');
    
    await user.type(nameInput, 'Test User');
    await user.type(phoneInput, '955123456');
    
    // Should show registration form
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(nameInput).toHaveValue('Test User');
    expect(phoneInput).toHaveValue('955123456');
  });

  it('should handle navigation between authentication modes', () => {
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    // Open login modal
    fireEvent.click(screen.getByText('Sign In'));
    
    // Start with phone
    fireEvent.click(screen.getByText('Continue with Phone'));
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    
    // Go back to options
    fireEvent.click(screen.getByText('← Back to options'));
    expect(screen.getByText('Welcome to Enerlectra')).toBeInTheDocument();
    
    // Try email instead
    fireEvent.click(screen.getByText('Continue with Email'));
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('should maintain state during authentication flow', async () => {
    const user = userEvent.setup();
    
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    // Open login modal
    fireEvent.click(screen.getByText('Sign In'));
    
    // Select phone and enter number
    fireEvent.click(screen.getByText('Continue with Phone'));
    const phoneInput = screen.getByPlaceholderText('955 123 456');
    await user.type(phoneInput, '955123456');
    
    // Go back and forth
    fireEvent.click(screen.getByText('← Back to options'));
    fireEvent.click(screen.getByText('Continue with Phone'));
    
    // Phone number should still be there
    expect(phoneInput).toHaveValue('955123456');
  });

  it('should handle authentication errors gracefully', async () => {
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    // Open login modal
    fireEvent.click(screen.getByText('Sign In'));
    
    // Try to continue without input
    fireEvent.click(screen.getByText('Continue with Phone'));
    fireEvent.click(screen.getByText('Continue'));
    
    // Should handle validation gracefully
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('should provide consistent user experience across modes', () => {
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    // Open login modal
    fireEvent.click(screen.getByText('Sign In'));
    
    // Check phone mode
    fireEvent.click(screen.getByText('Continue with Phone'));
    expect(screen.getByText('Phone Number')).toBeInTheDocument();
    
    // Go back and check email mode
    fireEvent.click(screen.getByText('← Back to options'));
    fireEvent.click(screen.getByText('Continue with Email'));
    expect(screen.getByText('Email Address')).toBeInTheDocument();
    
    // Both should have consistent Continue buttons
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });

  it('should handle modal closing properly', () => {
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    // Open login modal
    fireEvent.click(screen.getByText('Sign In'));
    expect(screen.getByText('Welcome to Enerlectra')).toBeInTheDocument();
    
    // Close modal
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    // Modal should be closed
    expect(screen.queryByText('Welcome to Enerlectra')).not.toBeInTheDocument();
  });

  it('should integrate with main dashboard properly', async () => {
    render(
      <AuthProvider>
        <SocketProvider>
          <EnerlectraDashboard />
        </SocketProvider>
      </AuthProvider>
    );

    // Dashboard should be visible
    expect(screen.getByText('Welcome to Enerlectra')).toBeInTheDocument();
    
    // Login modal should be accessible
    fireEvent.click(screen.getByText('Sign In'));
    expect(screen.getByText('Welcome to Enerlectra')).toBeInTheDocument();
    
    // Dashboard should still be functional
    expect(screen.getByText('Energy Price')).toBeInTheDocument();
  });
}); 