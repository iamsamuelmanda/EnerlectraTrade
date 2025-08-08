import { Router, Request, Response } from 'express';
import { readJsonFile } from '../utils/common';
import { User, ApiResponse } from '../types';

const router = Router();

// GET /wallet/:userId - Get user wallet information
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
        balanceZMW: user.balanceZMW,
        balanceKWh: user.balanceKWh,
        totalValueZMW: user.balanceZMW + (user.balanceKWh * 1.2)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Wallet fetch error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

export default router;

