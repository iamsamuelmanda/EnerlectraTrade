import { Router, Request, Response } from 'express';
import { readJsonFile, writeJsonFile, generateId } from '../utils';
import { User, ApiResponse } from '../types';

const router = Router();

// POST /users/register - Register new user
router.post('/register', (req: Request, res: Response) => {
  try {
    const { name, phoneNumber, initialBalanceZMW = 50 } = req.body;

    // Validation
    if (!name || !phoneNumber) {
      const response: ApiResponse = {
        success: false,
        error: 'Name and phone number are required'
      };
      return res.status(400).json(response);
    }

    // Validate phone number format (Zambian format)
    const phoneRegex = /^\+260[0-9]{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid phone number format. Use Zambian format: +260XXXXXXXXX'
      };
      return res.status(400).json(response);
    }

    const users = readJsonFile<User>('users.json');

    // Check if user already exists
    const existingUser = users.find(u => u.phoneNumber === phoneNumber);
    if (existingUser) {
      const response: ApiResponse = {
        success: false,
        error: 'User with this phone number already exists'
      };
      return res.status(400).json(response);
    }

    // Create new user
    const newUser: User = {
      id: generateId(),
      name: name.trim(),
      phoneNumber,
      balanceZMW: Math.max(0, initialBalanceZMW),
      balanceKWh: 0
    };

    users.push(newUser);
    writeJsonFile('users.json', users);

    const response: ApiResponse = {
      success: true,
      data: {
        userId: newUser.id,
        name: newUser.name,
        phoneNumber: newUser.phoneNumber,
        balanceZMW: newUser.balanceZMW,
        balanceKWh: newUser.balanceKWh,
        registrationDate: new Date().toISOString()
      },
      message: 'User registered successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('User registration error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// GET /users/:userId - Get user profile
router.get('/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const users = readJsonFile<User>('users.json');
    
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        userId: user.id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        balanceZMW: user.balanceZMW,
        balanceKWh: user.balanceKWh,
        totalValueZMW: user.balanceZMW + (user.balanceKWh * 1.2)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('User fetch error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// GET /users - Get all users (admin view)
router.get('/', (req: Request, res: Response) => {
  try {
    const { limit, offset } = req.query;
    const users = readJsonFile<User>('users.json');

    // Apply pagination
    const limitNum = limit ? parseInt(limit as string) : 50;
    const offsetNum = offset ? parseInt(offset as string) : 0;
    const paginatedUsers = users.slice(offsetNum, offsetNum + limitNum);

    // Calculate summary stats
    const totalBalanceZMW = users.reduce((sum, u) => sum + u.balanceZMW, 0);
    const totalBalanceKWh = users.reduce((sum, u) => sum + u.balanceKWh, 0);

    const response: ApiResponse = {
      success: true,
      data: {
        users: paginatedUsers.map(user => ({
          userId: user.id,
          name: user.name,
          phoneNumber: user.phoneNumber,
          balanceZMW: user.balanceZMW,
          balanceKWh: user.balanceKWh,
          totalValueZMW: user.balanceZMW + (user.balanceKWh * 1.2)
        })),
        pagination: {
          total: users.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < users.length
        },
        summary: {
          totalUsers: users.length,
          totalBalanceZMW: Math.round(totalBalanceZMW * 100) / 100,
          totalBalanceKWh: Math.round(totalBalanceKWh * 100) / 100,
          averageBalanceZMW: Math.round((totalBalanceZMW / users.length) * 100) / 100,
          averageBalanceKWh: Math.round((totalBalanceKWh / users.length) * 100) / 100
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Users fetch error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

export default router;