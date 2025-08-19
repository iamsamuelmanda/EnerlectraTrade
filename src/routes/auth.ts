import express from 'express';
import { User, ApiResponse } from '../types';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { readFileSync, writeFileSync } from 'fs';
import * as path from 'path';

const router = express.Router();

// File paths - FIXED: Use correct data directory
const USERS_FILE = path.join(__dirname, '../../data/users.json');
const SESSIONS_FILE = path.join(__dirname, '../../data/sessions.json');
const MAGIC_LINKS_FILE = path.join(__dirname, '../../data/magic_links.json');
const OTP_FILE = path.join(__dirname, '../../data/otp_codes.json');
const QR_FILE = path.join(__dirname, '../../data/qr_tokens.json');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'refresh-secret-change-me';

interface OtpRecord {
  id: string;
  phoneNumber: string;
  code: string;
  createdAt: string;
  expiresAt: string;
  attempts: number;
  verified: boolean;
}

interface QrTokenRecord {
  id: string;
  token: string;
  type: 'signup' | 'payment';
  nonce: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
  metadata?: any;
}

interface UserSession {
  id: string;
  userId: string;
  refreshToken: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  lastUsed: string;
  expiresAt: string;
  isActive: boolean;
}

function signJwt(payload: any, expiresIn: string = '1h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function signRefreshToken(payload: any, expiresIn: string = '7d') {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn });
}

function verifyJwt(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function verifyRefreshToken(token: string) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch {
    return null;
  }
}

function generateDeviceId(req: any): string {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  return crypto.createHash('sha256').update(`${userAgent}${ip}`).digest('hex').substring(0, 16);
}

function setSecureCookies(res: any, accessToken: string, refreshToken: string) {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000, // 1 hour
    path: '/'
  });
  
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
}

// Helper functions for users and sessions - FIXED: Use correct file paths
function loadUsers(): User[] {
  try {
    const data = readFileSync(path.join(__dirname, '../../data/users.json'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load users:', error);
    return [];
  }
}

function saveUsers(users: User[]): void {
  try {
    writeFileSync(path.join(__dirname, '../../data/users.json'), JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Failed to save users:', error);
    throw error;
  }
}

function loadSessions(): UserSession[] {
  try {
    const data = readFileSync(path.join(__dirname, '../../data/sessions.json'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load sessions:', error);
    return [];
  }
}

function saveSessions(sessions: UserSession[]): void {
  try {
    writeFileSync(path.join(__dirname, '../../data/sessions.json'), JSON.stringify(sessions, null, 2));
  } catch (error) {
    console.error('Failed to save sessions:', error);
    throw error;
  }
}

function loadOtpCodes(): OtpRecord[] {
  try {
    const data = readFileSync(path.join(__dirname, '../../data/otp_codes.json'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load OTP codes:', error);
    return [];
  }
}

function saveOtpCodes(otpCodes: OtpRecord[]): void {
  try {
    writeFileSync(path.join(__dirname, '../../data/otp_codes.json'), JSON.stringify(otpCodes, null, 2));
  } catch (error) {
    console.error('Failed to save OTP codes:', error);
    throw error;
  }
}

function loadMagicLinks(): { [key: string]: any } {
  try {
    const data = readFileSync(MAGIC_LINKS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

function saveMagicLinks(magicLinks: { [key: string]: any }): void {
  try {
    writeFileSync(MAGIC_LINKS_FILE, JSON.stringify(magicLinks, null, 2));
  } catch (error) {
    console.error('Failed to save magic links:', error);
  }
}

function signAccessTokenForUser(userId: string): string {
  return signJwt({ sub: userId });
}

function signRefreshTokenForUser(userId: string): string {
  return signRefreshToken({ sub: userId });
}

// POST /auth/register - simple registration by name + phone
router.post('/register', (req, res) => {
  try {
    const { name, phoneNumber, initialBalanceZMW = 50 } = req.body;
    if (!name || !phoneNumber) {
      const response: ApiResponse = { success: false, error: 'name and phoneNumber required' };
      return res.status(400).json(response);
    }
    
    const users = loadUsers();
    if (users.find(u => u.phoneNumber === phoneNumber)) {
      const response: ApiResponse = { success: false, error: 'User already exists' };
      return res.status(400).json(response);
    }
    
    const user: User = {
      id: generateId(),
      name,
      phoneNumber,
      balanceZMW: Math.max(0, initialBalanceZMW),
      balanceKWh: 0
    };
    
    users.push(user);
    saveUsers(users);
    
    // Create session with refresh token
    const deviceId = generateDeviceId(req);
    const accessToken = signJwt({ sub: user.id, deviceId });
    const refreshToken = signRefreshToken({ sub: user.id, deviceId });
    
    const sessions = loadSessions();
    const session: UserSession = {
      id: generateId(),
      userId: user.id,
      refreshToken,
      deviceId,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true
    };
    sessions.push(session);
    saveSessions(sessions);
    
    setSecureCookies(res, accessToken, refreshToken);
    
    const response: ApiResponse = {
      success: true,
      data: { user, message: 'Check cookies for tokens' },
      message: 'Registered successfully'
    };
    res.status(201).json(response);
  } catch (error) {
    console.error('Registration error:', error);
    const response: ApiResponse = { success: false, error: 'Registration failed' };
    res.status(500).json(response);
  }
});

// POST /auth/login/start - issue OTP
router.post('/login/start', (req, res) => {
  try {
    const { phoneNumber } = req.body as { phoneNumber: string };
    if (!phoneNumber) {
      const response: ApiResponse = { success: false, error: 'phoneNumber required' };
      return res.status(400).json(response);
    }
    
    const code = ('' + Math.floor(100000 + Math.random() * 900000));
    const otps = loadOtpCodes();
    const record: OtpRecord = {
      id: generateId(),
      phoneNumber,
      code,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      attempts: 0,
      verified: false
    };
    otps.push(record);
    saveOtpCodes(otps);
    
    const response: ApiResponse = {
      success: true,
      data: { requestId: record.id },
      message: 'OTP sent (simulated in dev)'
    };
    res.json(response);
  } catch (error) {
    console.error('Login start error:', error);
    const response: ApiResponse = { success: false, error: 'Failed to start login' };
    res.status(500).json(response);
  }
});

// POST /auth/login/verify - verify OTP and issue JWT
router.post('/login/verify', (req, res) => {
  try {
    const { phoneNumber, code, name } = req.body as { phoneNumber: string; code: string; name?: string };
    if (!phoneNumber || !code) {
      const response: ApiResponse = { success: false, error: 'phoneNumber and code required' };
      return res.status(400).json(response);
    }
    
    const otps = loadOtpCodes();
    const recordIndex = otps.findIndex(o => o.phoneNumber === phoneNumber && !o.verified);
    if (recordIndex === -1) {
      const response: ApiResponse = { success: false, error: 'OTP not found or already used' };
      return res.status(400).json(response);
    }
    
    const record = otps[recordIndex];
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      const response: ApiResponse = { success: false, error: 'OTP expired' };
      return res.status(400).json(response);
    }
    
    if (record.code !== code) {
      otps[recordIndex].attempts += 1;
      saveOtpCodes(otps);
      const response: ApiResponse = { success: false, error: 'Invalid code' };
      return res.status(400).json(response);
    }
    
    otps[recordIndex].verified = true;
    saveOtpCodes(otps);

    const users = loadUsers();
    let user = users.find(u => u.phoneNumber === phoneNumber);
    if (!user) {
      user = { 
        id: generateId(), 
        name: name || `User ${phoneNumber.slice(-4)}`, 
        phoneNumber, 
        balanceZMW: 0, 
        balanceKWh: 0 
      };
      users.push(user);
      saveUsers(users);
    }
    
    // Create session with refresh token
    const deviceId = generateDeviceId(req);
    const accessToken = signJwt({ sub: user.id, deviceId });
    const refreshToken = signRefreshToken({ sub: user.id, deviceId });
    
    const sessions = loadSessions();
    const session: UserSession = {
      id: generateId(),
      userId: user.id,
      refreshToken,
      deviceId,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true
    };
    sessions.push(session);
    saveSessions(sessions);
    
    setSecureCookies(res, accessToken, refreshToken);
    
    const response: ApiResponse = {
      success: true,
      data: { user, message: 'Check cookies for tokens' },
      message: 'Login successful'
    };
    res.json(response);
  } catch (error) {
    console.error('Login verification error:', error);
    const response: ApiResponse = { success: false, error: 'Failed to verify login' };
    res.status(500).json(response);
  }
});

// GET /auth/me - get profile by JWT
router.get('/me', (req, res) => {
  try {
    let token = req.cookies?.accessToken;
    if (!token) {
      const auth = req.headers.authorization;
      if (auth && auth.startsWith('Bearer ')) {
        token = auth.slice(7);
      }
    }
    
    if (!token) {
      const response: ApiResponse = { success: false, error: 'Unauthorized' };
      return res.status(401).json(response);
    }
    
    const payload = verifyJwt(token) as any;
    if (!payload?.sub) {
      const response: ApiResponse = { success: false, error: 'Invalid token' };
      return res.status(401).json(response);
    }
    
    // Update session last used
    const sessions = loadSessions();
    const sessionIndex = sessions.findIndex(s => s.userId === payload.sub && s.deviceId === payload.deviceId);
    if (sessionIndex !== -1) {
      sessions[sessionIndex].lastUsed = new Date().toISOString();
      saveSessions(sessions);
    }
    
    const users = loadUsers();
    const user = users.find(u => u.id === payload.sub);
    if (!user) {
      const response: ApiResponse = { success: false, error: 'User not found' };
      return res.status(404).json(response);
    }
    
    const response: ApiResponse = {
      success: true,
      data: { user },
      message: 'Profile retrieved successfully'
    };
    res.json(response);
  } catch (error) {
    console.error('Profile retrieval error:', error);
    const response: ApiResponse = { success: false, error: 'Failed to retrieve profile' };
    res.status(500).json(response);
  }
});

// POST /auth/refresh - refresh access token
router.post('/refresh', (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      const response: ApiResponse = { success: false, error: 'Refresh token required' };
      return res.status(400).json(response);
    }
    
    const payload = verifyRefreshToken(refreshToken) as any;
    if (!payload?.sub) {
      const response: ApiResponse = { success: false, error: 'Invalid refresh token' };
      return res.status(401).json(response);
    }
    
    // Verify session exists and is active
    const sessions = loadSessions();
    const session = sessions.find(s => s.userId === payload.sub && s.refreshToken === refreshToken);
    if (!session || !session.isActive || new Date() > new Date(session.expiresAt)) {
      const response: ApiResponse = { success: false, error: 'Session expired or invalid' };
      return res.status(401).json(response);
    }
    
    // Generate new tokens
    const deviceId = generateDeviceId(req);
    const newAccessToken = signJwt({ sub: payload.sub, deviceId });
    const newRefreshToken = signRefreshToken({ sub: payload.sub, deviceId });
    
    // Update session
    session.refreshToken = newRefreshToken;
    session.lastUsed = new Date().toISOString();
    saveSessions(sessions);
    
    setSecureCookies(res, newAccessToken, newRefreshToken);
    
    const response: ApiResponse = {
      success: true,
      data: { message: 'Tokens refreshed successfully' },
      message: 'Token refresh successful'
    };
    res.json(response);
  } catch (error) {
    console.error('Token refresh error:', error);
    const response: ApiResponse = { success: false, error: 'Failed to refresh token' };
    res.status(500).json(response);
  }
});

// POST /auth/logout - logout and invalidate session
router.post('/logout', (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      // Invalidate session
      const sessions = loadSessions();
      const sessionIndex = sessions.findIndex(s => s.refreshToken === refreshToken);
      if (sessionIndex !== -1) {
        sessions[sessionIndex].isActive = false;
        saveSessions(sessions);
      }
    }
    
    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    
    const response: ApiResponse = {
      success: true,
      data: { message: 'Logged out successfully' },
      message: 'Logout successful'
    };
    res.json(response);
  } catch (error) {
    console.error('Logout error:', error);
    const response: ApiResponse = { success: false, error: 'Failed to logout' };
    res.status(500).json(response);
  }
});

// POST /auth/magic-link - send magic link
router.post('/magic-link', (req, res) => {
  try {
    const { contact, method } = req.body;
    if (!contact || !method) {
      const response: ApiResponse = { success: false, error: 'contact and method required' };
      return res.status(400).json(response);
    }
    
    const token = crypto.randomBytes(32).toString('hex');
    const magicLinks = loadMagicLinks();
    magicLinks[token] = {
      contact,
      method,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      used: false
    };
    saveMagicLinks(magicLinks);
    
    const response: ApiResponse = {
      success: true,
      data: { requestId: token },
      message: 'Magic link sent successfully'
    };
    res.json(response);
  } catch (error) {
    console.error('Magic link error:', error);
    const response: ApiResponse = { success: false, error: 'Failed to send magic link' };
    res.status(500).json(response);
  }
});

// POST /auth/magic-link/verify - verify magic link
router.post('/magic-link/verify', (req, res) => {
  try {
    const { token, phoneNumber, name } = req.body;
    if (!token || !phoneNumber) {
      const response: ApiResponse = { success: false, error: 'token and phoneNumber required' };
      return res.status(400).json(response);
    }
    
    const magicLinks = loadMagicLinks();
    const magicLink = magicLinks[token];
    
    if (!magicLink || magicLink.used || new Date() > new Date(magicLink.expiresAt)) {
      const response: ApiResponse = { success: false, error: 'Invalid or expired magic link' };
      return res.status(400).json(response);
    }
    
    // Mark as used
    magicLink.used = true;
    saveMagicLinks(magicLinks);
    
    // Find or create user
    const users = loadUsers();
    let user = users.find(u => u.phoneNumber === phoneNumber);
    if (!user) {
      user = {
        id: generateId(),
        name: name || `User ${phoneNumber.slice(-4)}`,
        phoneNumber,
        balanceZMW: 0,
        balanceKWh: 0
      };
      users.push(user);
      saveUsers(users);
    }
    
    // Create session
    const deviceId = generateDeviceId(req);
    const accessToken = signJwt({ sub: user.id, deviceId });
    const refreshToken = signRefreshToken({ sub: user.id, deviceId });
    
    const sessions = loadSessions();
    const session: UserSession = {
      id: generateId(),
      userId: user.id,
      refreshToken,
      deviceId,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true
    };
    sessions.push(session);
    saveSessions(sessions);
    
    setSecureCookies(res, accessToken, refreshToken);
    
    res.json({
      success: true,
      data: {
        user,
        message: 'Magic link authentication successful'
      }
    });
  } catch (error) {
    console.error('Magic link verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify magic link'
    });
  }
});

// Biometric Authentication
router.post('/biometric', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({
        success: false,
        error: 'Biometric credential is required'
      });
    }
    
    // TODO: Implement actual biometric verification
    // For now, simulate successful verification
    
    // Find user by biometric credential (in real implementation, this would be stored securely)
    const users = loadUsers();
    const user = users[0]; // Mock user for demonstration
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Create session
    const sessionId = crypto.randomUUID();
    const accessToken = signAccessTokenForUser(user.id);
    const refreshToken = signRefreshTokenForUser(user.id);
    
    const sessions = loadSessions();
    sessions.push({
      id: sessionId,
      userId: user.id,
      refreshToken,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    } as UserSession);
    saveSessions(sessions);
    
    // Set secure cookies
    setSecureCookies(res, accessToken, refreshToken);
    
    res.json({
      success: true,
      data: {
        user,
        message: 'Biometric authentication successful'
      }
    });
  } catch (error) {
    console.error('Biometric authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Biometric authentication failed'
    });
  }
});

export default router;

