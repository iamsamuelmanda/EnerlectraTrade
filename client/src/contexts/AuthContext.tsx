import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  region: string;
  walletBalance: {
    zmw: number;
    kwh: number;
  };
  carbonSavings: number;
  reputation: number;
  clusters: string[];
  createdAt: string;
  isGuest?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuestMode: boolean;
  login: (phone: string, pin?: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  register: (name: string, phone: string) => Promise<void>;
  startLogin: (phone: string) => Promise<void>;
  verifyLogin: (phone: string, code: string, name?: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  socialLogin: (provider: 'google' | 'facebook' | 'apple') => Promise<void>;
  magicLinkAuth: (contact: string, method: 'sms' | 'email') => Promise<void>;
  biometricAuth: () => Promise<void>;
  enableGuestMode: () => void;
  disableGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);

  // MVP stubs
  const asyncStub = async (result?: any) => new Promise<void>((resolve) => setTimeout(() => resolve(result), 50));

  const startLogin = async (phone: string) => asyncStub();
  const verifyLogin = async (phone: string, code: string, name?: string) => asyncStub(setUser({
    id: 'USER#1',
    phone,
    name: name || 'MVP User',
    region: 'Zambia',
    walletBalance: { zmw: 0, kwh: 0 },
    carbonSavings: 0,
    reputation: 0,
    clusters: [],
    createdAt: new Date().toISOString(),
  }));
  const register = async (name: string, phone: string) => asyncStub(setUser({
    id: 'USER#1',
    phone,
    name,
    region: 'Zambia',
    walletBalance: { zmw: 0, kwh: 0 },
    carbonSavings: 0,
    reputation: 0,
    clusters: [],
    createdAt: new Date().toISOString(),
  }));
  const refreshToken = async () => asyncStub();
  const login = async (phone: string, pin?: string) => asyncStub();
  const logout = () => setUser(null);
  const updateUser = (userData: Partial<User>) => setUser((prev) => prev ? { ...prev, ...userData } : null);
  const refreshUser = async () => asyncStub();
  const socialLogin = async (_provider: 'google' | 'facebook' | 'apple') => asyncStub();
  const magicLinkAuth = async (_contact: string, _method: 'sms' | 'email') => asyncStub();
  const biometricAuth = async () => asyncStub();
  const enableGuestMode = () => setUser({
    id: 'guest',
    phone: 'guest',
    name: 'Guest User',
    region: 'Zambia',
    walletBalance: { zmw: 0, kwh: 0 },
    carbonSavings: 0,
    reputation: 0,
    clusters: [],
    createdAt: new Date().toISOString(),
    isGuest: true
  }) || setIsGuestMode(true);
  const disableGuestMode = () => setUser(null) || setIsGuestMode(false);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isGuestMode,
    login,
    logout,
    updateUser,
    refreshUser,
    register,
    startLogin,
    verifyLogin,
    refreshToken,
    socialLogin,
    magicLinkAuth,
    biometricAuth,
    enableGuestMode,
    disableGuestMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
