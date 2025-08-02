import { Router, Request, Response } from 'express';
import { readJsonFile } from '../utils';
import { User, Transaction, ApiResponse } from '../types';

const router = Router();

// GET /carbon/:userId - Get carbon footprint data for user
router.get('/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const users = readJsonFile<User>('users.json');
    const transactions = readJsonFile<Transaction>('transactions.json');

    const user = users.find(u => u.id === userId);
    
    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found'
      };
      return res.status(404).json(response);
    }

    // Calculate carbon impact from user's transactions
    const userTransactions = transactions.filter(t => 
      t.buyerId === userId || t.sellerId === userId || t.userId === userId
    );

    const totalCarbonSaved = userTransactions.reduce((total, transaction) => {
      return total + transaction.carbonSaved;
    }, 0);

    const totalEnergyTraded = userTransactions.reduce((total, transaction) => {
      // Only count energy acquired/purchased by this user
      if (transaction.buyerId === userId || transaction.userId === userId) {
        return total + transaction.kWh;
      }
      return total;
    }, 0);

    // Calculate equivalent environmental impact
    const treesEquivalent = Math.round(totalCarbonSaved / 22); // Avg tree absorbs 22kg CO2/year
    const carMilesOffset = Math.round(totalCarbonSaved * 2.3); // 1kg CO2 = ~2.3 miles of car emissions

    const response: ApiResponse = {
      success: true,
      data: {
        userId: user.id,
        userName: user.name,
        totalCarbonSavedKg: Math.round(totalCarbonSaved * 100) / 100,
        totalEnergyTradedKWh: Math.round(totalEnergyTraded * 100) / 100,
        treesEquivalent,
        carMilesOffset,
        transactionCount: userTransactions.length,
        carbonPerKWh: 0.8,
        impactSummary: {
          message: `By trading ${totalEnergyTraded.toFixed(1)} kWh of clean energy, you've saved ${totalCarbonSaved.toFixed(1)} kg of CO2 emissions!`,
          environmentalBenefit: `This is equivalent to planting ${treesEquivalent} trees or offsetting ${carMilesOffset} miles of car emissions.`
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Carbon tracking error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

export default router;
