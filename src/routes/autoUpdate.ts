import { Router, Request, Response } from 'express';
import AutoUpdateService from '../services/autoUpdateService';
import { ApiResponse } from '../types';
import logger from '../utils/logger';

const router = Router();
const autoUpdateService = AutoUpdateService.getInstance();

// GET /auto-update/status - Get update status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = autoUpdateService.getUpdateStatus();

    const response: ApiResponse<any> = {
      success: true,
      data: status
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get update status:', error);
    const response: ApiResponse<any> = {
      success: false,
      error: 'Failed to get update status'
    };
    res.status(500).json(response);
  }
});

// GET /auto-update/config - Get update configuration
router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = autoUpdateService.getUpdateConfig();

    const response: ApiResponse<any> = {
      success: true,
      data: config
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get update config:', error);
    const response: ApiResponse<any> = {
      success: false,
      error: 'Failed to get update config'
    };
    res.status(500).json(response);
  }
});

// POST /auto-update/config - Update configuration
router.post('/config', async (req: Request, res: Response) => {
  try {
    const { autoUpdateEnabled, updateChannel, checkInterval, downloadTimeout, installTimeout, rollbackOnFailure, notifyUser, backupBeforeUpdate, maxRetries, allowedUpdateHours } = req.body;

    const newConfig = {
      autoUpdateEnabled,
      updateChannel,
      checkInterval,
      downloadTimeout,
      installTimeout,
      rollbackOnFailure,
      notifyUser,
      backupBeforeUpdate,
      maxRetries,
      allowedUpdateHours
    };

    autoUpdateService.updateConfig(newConfig);

    const response: ApiResponse<string> = {
      success: true,
      data: 'Update configuration updated successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to update config:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'Failed to update config'
    };
    res.status(500).json(response);
  }
});

// POST /auto-update/check - Check for updates
router.post('/check', async (req: Request, res: Response) => {
  try {
    const updateInfo = await autoUpdateService.checkForUpdates();

    const response: ApiResponse<any> = {
      success: true,
      data: updateInfo
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to check for updates:', error);
    const response: ApiResponse<any> = {
      success: false,
      error: 'Failed to check for updates'
    };
    res.status(500).json(response);
  }
});

// POST /auto-update/force - Force update
router.post('/force', async (req: Request, res: Response) => {
  try {
    const success = await autoUpdateService.forceUpdate();

    const response: ApiResponse<boolean> = {
      success: true,
      data: success
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to force update:', error);
    const response: ApiResponse<boolean> = {
      success: false,
      error: 'Failed to force update'
    };
    res.status(500).json(response);
  }
});

// GET /auto-update/history - Get update history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const history = autoUpdateService.getUpdateHistory();

    const response: ApiResponse<any[]> = {
      success: true,
      data: history
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get update history:', error);
    const response: ApiResponse<any[]> = {
      success: false,
      error: 'Failed to get update history'
    };
    res.status(500).json(response);
  }
});

// POST /auto-update/rollback - Rollback update
router.post('/rollback', async (req: Request, res: Response) => {
  try {
    const success = await autoUpdateService.rollbackUpdate();

    const response: ApiResponse<boolean> = {
      success: true,
      data: success
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to rollback update:', error);
    const response: ApiResponse<boolean> = {
      success: false,
      error: 'Failed to rollback update'
    };
    res.status(500).json(response);
  }
});

// POST /auto-update/cleanup - Cleanup old files
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    await autoUpdateService.cleanup();

    const response: ApiResponse<string> = {
      success: true,
      data: 'Cleanup completed successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to cleanup:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'Failed to cleanup'
    };
    res.status(500).json(response);
  }
});

// GET /auto-update/version - Get current version info
router.get('/version', async (req: Request, res: Response) => {
  try {
    const versionInfo = {
      currentVersion: process.env.APP_VERSION || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      buildDate: process.env.BUILD_DATE || new Date().toISOString(),
      gitCommit: process.env.GIT_COMMIT || 'unknown',
      environment: process.env.NODE_ENV || 'development'
    };

    const response: ApiResponse<any> = {
      success: true,
      data: versionInfo
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get version info:', error);
    const response: ApiResponse<any> = {
      success: false,
      error: 'Failed to get version info'
    };
    res.status(500).json(response);
  }
});

// POST /auto-update/restart - Restart application
router.post('/restart', async (req: Request, res: Response) => {
  try {
    // Send response first
    const response: ApiResponse<string> = {
      success: true,
      data: 'Application restart initiated'
    };

    res.json(response);

    // Restart after response is sent
    setTimeout(() => {
      process.exit(0);
    }, 1000);

  } catch (error) {
    logger.error('Failed to restart application:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'Failed to restart application'
    };
    res.status(500).json(response);
  }
});

// GET /auto-update/health - Health check for update service
router.get('/health', async (req: Request, res: Response) => {
  try {
    const status = autoUpdateService.getUpdateStatus();
    const config = autoUpdateService.getUpdateConfig();

    const health = {
      service: 'auto-update',
      status: 'healthy',
      currentVersion: status.currentVersion,
      latestVersion: status.latestVersion,
      updateAvailable: status.updateAvailable,
      updateInProgress: status.updateInProgress,
      autoUpdateEnabled: config.autoUpdateEnabled,
      lastChecked: status.lastChecked,
      nextCheck: status.nextCheck,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };

    const response: ApiResponse<any> = {
      success: true,
      data: health
    };

    res.json(response);
  } catch (error) {
    logger.error('Health check failed:', error);
    const response: ApiResponse<any> = {
      success: false,
      error: 'Health check failed'
    };
    res.status(500).json(response);
  }
});

export default router;
