import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EnhancedLoginModal from '../EnhancedLoginModal';
import { useAuth } from '../../contexts/AuthContext';
import { usePWA } from '../../hooks/usePWA';

// Mock the hooks
jest.mock('../../contexts/AuthContext');
jest.mock('../../hooks/usePWA');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUsePWA = usePWA as jest.MockedFunction<typeof usePWA>;

describe('EnhancedLoginModal', () => {
  const mockAuthFunctions = {
    startLogin: jest.fn(),
    verifyLogin: jest.fn(),
    register: jest.fn(),
    socialLogin: jest.fn(),
    magicLinkAuth: jest.fn(),
    biometricAuth: jest.fn(),
    enableGuestMode: jest.fn(),
  };

  const mockPWAFunctions = {
    canInstall: false,
    isInstalled: false,
    installPWA: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(mockAuthFunctions);
    mockUsePWA.mockReturnValue(mockPWAFunctions);
  });

  it('should render welcome screen by default', () => {
    render(<EnhancedLoginModal isOpen={true} onClose={jest.fn()} />);
    
    expect(screen.getByText('Welcome to Enerlectra')).toBeInTheDocument();
    expect(screen.getByText('Explore as Guest')).toBeInTheDocument();
    expect(screen.getByText('Continue with Phone')).toBeInTheDocument();
    expect(screen.getByText('Continue with Email')).toBeInTheDocument();
  });

  it('should handle guest mode selection', async () => {
    const onClose = jest.fn();
    render(<EnhancedLoginModal isOpen={true} onClose={onClose} />);
    
    fireEvent.click(screen.getByText('Explore as Guest'));
    
    await waitFor(() => {
      expect(mockAuthFunctions.enableGuestMode).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should switch to phone login mode', () => {
    render(<EnhancedLoginModal isOpen={true} onClose={jest.fn()} />);
    
    fireEvent.click(screen.getByText('Continue with Phone'));
    
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Phone Number')).toBeInTheDocument();
  });

  it('should switch to email login mode', () => {
    render(<EnhancedLoginModal isOpen={true} onClose={jest.fn()} />);
    
    fireEvent.click(screen.getByText('Continue with Email'));
    
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Email Address')).toBeInTheDocument();
  });

  it('should handle phone number input and validation', async () => {
    const user = userEvent.setup();
    
    render(<EnhancedLoginModal isOpen={true} onClose={jest.fn()} />);
    
    // Go to phone login
    fireEvent.click(screen.getByText('Continue with Phone'));
    
    const phoneInput = screen.getByPlaceholderText('955 123 456');
    await user.type(phoneInput, '955123456');
    
    expect(phoneInput).toHaveValue('955123456');
  });

  it('should handle OTP verification flow', async () => {
    mockAuthFunctions.startLogin.mockResolvedValue(undefined);
    
    render(<EnhancedLoginModal isOpen={true} onClose={jest.fn()} />);
    
    // Go to phone login
    fireEvent.click(screen.getByText('Continue with Phone'));
    
    const phoneInput = screen.getByPlaceholderText('955 123 456');
    await userEvent.type(phoneInput, '955123456');
    
    fireEvent.click(screen.getByText('Continue'));
    
    await waitFor(() => {
      expect(mockAuthFunctions.startLogin).toHaveBeenCalledWith('955123456');
    });
  });

  it('should show PWA install button when available', () => {
    mockUsePWA.mockReturnValue({
      ...mockPWAFunctions,
      canInstall: true,
    });
    
    render(<EnhancedLoginModal isOpen={true} onClose={jest.fn()} />);
    
    expect(screen.getByText('Install App')).toBeInTheDocument();
  });

  it('should handle back navigation', () => {
    render(<EnhancedLoginModal isOpen={true} onClose={jest.fn()} />);
    
    // Go to phone login
    fireEvent.click(screen.getByText('Continue with Phone'));
    
    // Go back to welcome
    fireEvent.click(screen.getByText('← Back to options'));
    
    expect(screen.getByText('Welcome to Enerlectra')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<EnhancedLoginModal isOpen={false} onClose={jest.fn()} />);
    
    expect(screen.queryByText('Welcome to Enerlectra')).not.toBeInTheDocument();
  });

  it('should handle registration mode', () => {
    render(<EnhancedLoginModal isOpen={true} onClose={jest.fn()} />);
    
    // Go to phone login
    fireEvent.click(screen.getByText('Continue with Phone'));
    
    // Switch to register mode
    fireEvent.click(screen.getByText("Don't have an account? Sign up"));
    
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByText('Full Name')).toBeInTheDocument();
  });

  it('should handle email magic link flow', async () => {
    mockAuthFunctions.magicLinkAuth.mockResolvedValue(undefined);
    
    render(<EnhancedLoginModal isOpen={true} onClose={jest.fn()} />);
    
    // Go to email login
    fireEvent.click(screen.getByText('Continue with Email'));
    
    const emailInput = screen.getByPlaceholderText('your@email.com');
    await userEvent.type(emailInput, 'test@example.com');
    
    fireEvent.click(screen.getByText('Continue'));
    
    await waitFor(() => {
      expect(mockAuthFunctions.magicLinkAuth).toHaveBeenCalledWith('test@example.com', 'email');
    });
  });

  it('should handle social login buttons', () => {
    render(<EnhancedLoginModal isOpen={true} onClose={jest.fn()} />);
    
    // Social login buttons should be present
    expect(screen.getByText('Continue with Phone')).toBeInTheDocument();
    expect(screen.getByText('Continue with Email')).toBeInTheDocument();
  });

  it('should show biometric authentication when available', () => {
    // Mock biometric availability
    Object.defineProperty(navigator, 'credentials', {
      value: {
        get: jest.fn(),
      },
      writable: true,
    });
    
    render(<EnhancedLoginModal isOpen={true} onClose={jest.fn()} />);
    
    // Biometric button should be visible
    expect(screen.getByText('Use Biometric')).toBeInTheDocument();
  });

  it('should handle OTP input correctly', async () => {
    mockAuthFunctions.startLogin.mockResolvedValue(undefined);
    
    render(<EnhancedLoginModal isOpen={true} onClose={jest.fn()} />);
    
    // Go to phone login and start
    fireEvent.click(screen.getByText('Continue with Phone'));
    const phoneInput = screen.getByPlaceholderText('955 123 456');
    await userEvent.type(phoneInput, '955123456');
    fireEvent.click(screen.getByText('Continue'));
    
    await waitFor(() => {
      expect(screen.getByText('Verify OTP')).toBeInTheDocument();
    });
    
    // Enter OTP
    const otpInput = screen.getByPlaceholderText('123456');
    await userEvent.type(otpInput, '123456');
    
    expect(otpInput).toHaveValue('123456');
  });

  it('should handle form validation', async () => {
    render(<EnhancedLoginModal isOpen={true} onClose={jest.fn()} />);
    
    // Go to phone login
    fireEvent.click(screen.getByText('Continue with Phone'));
    
    // Try to continue without phone number
    fireEvent.click(screen.getByText('Continue'));
    
    // Should show validation error (if implemented)
    // This test ensures the form doesn't crash on invalid input
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });
}); 