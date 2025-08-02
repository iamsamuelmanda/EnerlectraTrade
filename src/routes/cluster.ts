import { Router, Request, Response } from 'express';
import { readJsonFile } from '../utils';
import { Cluster, ApiResponse } from '../types';

const router = Router();

// GET /cluster/:id - Get cluster information
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clusters = readJsonFile<Cluster>('clusters.json');
    
    const cluster = clusters.find(c => c.id === id);
    
    if (!cluster) {
      const response: ApiResponse = {
        success: false,
        error: 'Cluster not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        ...cluster,
        utilizationPercent: Math.round(((cluster.capacityKWh - cluster.availableKWh) / cluster.capacityKWh) * 100),
        status: cluster.availableKWh > 0 ? 'Available' : 'Full Capacity'
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Cluster fetch error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// GET /cluster - Get all clusters
router.get('/', (req: Request, res: Response) => {
  try {
    const clusters = readJsonFile<Cluster>('clusters.json');
    
    const clustersWithStats = clusters.map(cluster => ({
      ...cluster,
      utilizationPercent: Math.round(((cluster.capacityKWh - cluster.availableKWh) / cluster.capacityKWh) * 100),
      status: cluster.availableKWh > 0 ? 'Available' : 'Full Capacity'
    }));

    const response: ApiResponse = {
      success: true,
      data: {
        clusters: clustersWithStats,
        totalCapacity: clusters.reduce((sum, c) => sum + c.capacityKWh, 0),
        totalAvailable: clusters.reduce((sum, c) => sum + c.availableKWh, 0),
        averagePrice: clusters.reduce((sum, c) => sum + c.pricePerKWh, 0) / clusters.length
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Clusters fetch error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

export default router;
