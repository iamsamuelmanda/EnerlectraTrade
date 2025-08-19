import '@testing-library/jest-dom';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
  default: jest.fn(),
}));

// Mock PWA hook
jest.mock('./hooks/usePWA', () => ({
  usePWA: () => ({
    canInstall: false,
    isInstalled: false,
    installPWA: jest.fn(),
  }),
}));

// Mock WebSocket context
jest.mock('./contexts/SocketContext', () => ({
  useSocket: () => ({
    isConnected: true,
    socket: null,
  }),
}));

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
}); 