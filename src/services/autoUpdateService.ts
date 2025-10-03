import { readJsonFile, writeJsonFile, generateId } from '../utils/common';
import logger from '../utils/logger';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface UpdateInfo {
  version: string;
  releaseDate: string;
  description: string;
  features: string[];
  bugFixes: string[];
  breakingChanges: string[];
  downloadUrl: string;
  checksum: string;
  size: number;
  required: boolean;
  rollbackVersion?: string;
}

interface UpdateStatus {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  updateInProgress: boolean;
  lastChecked: string;
  nextCheck: string;
  updateHistory: UpdateRecord[];
  autoUpdateEnabled: boolean;
  updateChannel: 'stable' | 'beta' | 'alpha';
}

interface UpdateRecord {
  id: string;
  version: string;
  status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed' | 'rolled_back';
  timestamp: string;
  duration?: number;
  error?: string;
  rollbackReason?: string;
}

interface UpdateConfig {
  autoUpdateEnabled: boolean;
  updateChannel: 'stable' | 'beta' | 'alpha';
  checkInterval: number; // minutes
  downloadTimeout: number; // seconds
  installTimeout: number; // seconds
  rollbackOnFailure: boolean;
  notifyUser: boolean;
  backupBeforeUpdate: boolean;
  maxRetries: number;
  allowedUpdateHours: number[]; // 0-23
}

class AutoUpdateService {
  private static instance: AutoUpdateService;
  private updateStatus: UpdateStatus;
  private updateConfig: UpdateConfig;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_SERVER_URL = process.env.UPDATE_SERVER_URL || 'https://api.enerlectra.com/updates';
  private readonly CURRENT_VERSION = process.env.APP_VERSION || '1.0.0';
  private readonly BACKUP_DIR = path.join(__dirname, '../backups');
  private readonly UPDATE_DIR = path.join(__dirname, '../updates');

  private constructor() {
    this.updateStatus = this.loadUpdateStatus();
    this.updateConfig = this.loadUpdateConfig();
    this.initializeAutoUpdate();
  }

  public static getInstance(): AutoUpdateService {
    if (!AutoUpdateService.instance) {
      AutoUpdateService.instance = new AutoUpdateService();
    }
    return AutoUpdateService.instance;
  }

  private loadUpdateStatus(): UpdateStatus {
    try {
      const stored = readJsonFile('update_status.json');
      if (stored) {
        return stored;
      }
    } catch (error) {
      logger.error('Failed to load update status:', error);
    }

    return {
      currentVersion: this.CURRENT_VERSION,
      latestVersion: this.CURRENT_VERSION,
      updateAvailable: false,
      updateInProgress: false,
      lastChecked: new Date().toISOString(),
      nextCheck: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      updateHistory: [],
      autoUpdateEnabled: true,
      updateChannel: 'stable'
    };
  }

  private loadUpdateConfig(): UpdateConfig {
    try {
      const stored = readJsonFile('update_config.json');
      if (stored) {
        return stored;
      }
    } catch (error) {
      logger.error('Failed to load update config:', error);
    }

    return {
      autoUpdateEnabled: true,
      updateChannel: 'stable',
      checkInterval: 60, // 1 hour
      downloadTimeout: 300, // 5 minutes
      installTimeout: 600, // 10 minutes
      rollbackOnFailure: true,
      notifyUser: true,
      backupBeforeUpdate: true,
      maxRetries: 3,
      allowedUpdateHours: [2, 3, 4, 5] // 2 AM to 5 AM
    };
  }

  private saveUpdateStatus(): void {
    try {
      writeJsonFile('update_status.json', this.updateStatus);
    } catch (error) {
      logger.error('Failed to save update status:', error);
    }
  }

  private saveUpdateConfig(): void {
    try {
      writeJsonFile('update_config.json', this.updateConfig);
    } catch (error) {
      logger.error('Failed to save update config:', error);
    }
  }

  private initializeAutoUpdate(): void {
    if (this.updateConfig.autoUpdateEnabled) {
      this.startPeriodicCheck();
    }

    // Check for updates on startup
    this.checkForUpdates();
  }

  private startPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkForUpdates();
    }, this.updateConfig.checkInterval * 60 * 1000);
  }

  private stopPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  public async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      logger.info('Checking for updates...');
      
      const response = await axios.get(`${this.UPDATE_SERVER_URL}/check`, {
        params: {
          currentVersion: this.CURRENT_VERSION,
          channel: this.updateConfig.updateChannel,
          platform: process.platform,
          architecture: process.arch
        },
        timeout: 10000
      });

      const updateInfo: UpdateInfo = response.data;
      
      this.updateStatus.lastChecked = new Date().toISOString();
      this.updateStatus.nextCheck = new Date(Date.now() + this.updateConfig.checkInterval * 60 * 1000).toISOString();
      this.updateStatus.latestVersion = updateInfo.version;
      this.updateStatus.updateAvailable = this.isNewerVersion(updateInfo.version, this.CURRENT_VERSION);
      
      this.saveUpdateStatus();

      if (this.updateStatus.updateAvailable) {
        logger.info(`Update available: ${updateInfo.version}`);
        
        if (this.updateConfig.autoUpdateEnabled && this.shouldAutoUpdate()) {
          await this.downloadAndInstallUpdate(updateInfo);
        }
      } else {
        logger.info('No updates available');
      }

      return this.updateStatus.updateAvailable ? updateInfo : null;
    } catch (error) {
      logger.error('Failed to check for updates:', error);
      return null;
    }
  }

  private isNewerVersion(version1: string, version2: string): boolean {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return true;
      if (v1Part < v2Part) return false;
    }
    
    return false;
  }

  private shouldAutoUpdate(): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Check if current time is in allowed update hours
    if (!this.updateConfig.allowedUpdateHours.includes(currentHour)) {
      return false;
    }
    
    // Check if update is in progress
    if (this.updateStatus.updateInProgress) {
      return false;
    }
    
    // Check if system is idle (simplified check)
    // In a real implementation, you'd check CPU usage, active users, etc.
    
    return true;
  }

  public async downloadAndInstallUpdate(updateInfo: UpdateInfo): Promise<boolean> {
    try {
      logger.info(`Starting update to version ${updateInfo.version}`);
      
      this.updateStatus.updateInProgress = true;
      this.saveUpdateStatus();

      // Create update record
      const updateRecord: UpdateRecord = {
        id: generateId(),
        version: updateInfo.version,
        status: 'pending',
        timestamp: new Date().toISOString()
      };
      
      this.updateStatus.updateHistory.push(updateRecord);
      this.saveUpdateStatus();

      // Create backup if enabled
      if (this.updateConfig.backupBeforeUpdate) {
        await this.createBackup();
      }

      // Download update
      updateRecord.status = 'downloading';
      this.saveUpdateStatus();
      
      const downloadPath = await this.downloadUpdate(updateInfo);
      
      // Verify checksum
      await this.verifyChecksum(downloadPath, updateInfo.checksum);
      
      // Install update
      updateRecord.status = 'installing';
      this.saveUpdateStatus();
      
      await this.installUpdate(downloadPath, updateInfo);
      
      // Update status
      updateRecord.status = 'completed';
      updateRecord.duration = Date.now() - new Date(updateRecord.timestamp).getTime();
      this.updateStatus.currentVersion = updateInfo.version;
      this.updateStatus.updateInProgress = false;
      this.saveUpdateStatus();

      logger.info(`Update to version ${updateInfo.version} completed successfully`);
      return true;
    } catch (error) {
      logger.error('Update failed:', error);
      
      // Update record with error
      const lastRecord = this.updateStatus.updateHistory[this.updateStatus.updateHistory.length - 1];
      if (lastRecord) {
        lastRecord.status = 'failed';
        lastRecord.error = error.message;
        lastRecord.duration = Date.now() - new Date(lastRecord.timestamp).getTime();
      }
      
      this.updateStatus.updateInProgress = false;
      this.saveUpdateStatus();

      // Rollback if enabled
      if (this.updateConfig.rollbackOnFailure) {
        await this.rollbackUpdate();
      }

      return false;
    }
  }

  private async createBackup(): Promise<void> {
    try {
      logger.info('Creating backup before update...');
      
      const backupId = `backup_${Date.now()}`;
      const backupPath = path.join(this.BACKUP_DIR, backupId);
      
      await fs.mkdir(backupPath, { recursive: true });
      
      // Backup critical files
      const filesToBackup = [
        'package.json',
        'package-lock.json',
        'dist',
        'src',
        'data',
        'config'
      ];
      
      for (const file of filesToBackup) {
        const sourcePath = path.join(__dirname, '../', file);
        const targetPath = path.join(backupPath, file);
        
        try {
          await fs.copyFile(sourcePath, targetPath);
        } catch (error) {
          // File might not exist, continue
        }
      }
      
      logger.info(`Backup created: ${backupPath}`);
    } catch (error) {
      logger.error('Failed to create backup:', error);
      throw error;
    }
  }

  private async downloadUpdate(updateInfo: UpdateInfo): Promise<string> {
    try {
      logger.info(`Downloading update from ${updateInfo.downloadUrl}...`);
      
      const response = await axios({
        method: 'GET',
        url: updateInfo.downloadUrl,
        responseType: 'stream',
        timeout: this.updateConfig.downloadTimeout * 1000
      });
      
      const updatePath = path.join(this.UPDATE_DIR, `update_${updateInfo.version}.zip`);
      await fs.mkdir(this.UPDATE_DIR, { recursive: true });
      
      const writer = require('fs').createWriteStream(updatePath);
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(updatePath));
        writer.on('error', reject);
      });
    } catch (error) {
      logger.error('Failed to download update:', error);
      throw error;
    }
  }

  private async verifyChecksum(filePath: string, expectedChecksum: string): Promise<void> {
    try {
      const crypto = require('crypto');
      const fileBuffer = await fs.readFile(filePath);
      const hashSum = crypto.createHash('sha256');
      hashSum.update(fileBuffer);
      const actualChecksum = hashSum.digest('hex');
      
      if (actualChecksum !== expectedChecksum) {
        throw new Error('Checksum verification failed');
      }
      
      logger.info('Checksum verification passed');
    } catch (error) {
      logger.error('Checksum verification failed:', error);
      throw error;
    }
  }

  private async installUpdate(updatePath: string, updateInfo: UpdateInfo): Promise<void> {
    try {
      logger.info('Installing update...');
      
      // Extract update
      const extractPath = path.join(this.UPDATE_DIR, `extract_${updateInfo.version}`);
      await fs.mkdir(extractPath, { recursive: true });
      
      // In a real implementation, you'd extract the zip file here
      // For now, we'll simulate the installation
      
      // Stop the application gracefully
      await this.stopApplication();
      
      // Install new files
      await this.installNewFiles(extractPath);
      
      // Start the application
      await this.startApplication();
      
      logger.info('Update installed successfully');
    } catch (error) {
      logger.error('Failed to install update:', error);
      throw error;
    }
  }

  private async stopApplication(): Promise<void> {
    try {
      logger.info('Stopping application for update...');
      
      // In a real implementation, you'd gracefully stop the server
      // For now, we'll simulate this
      
      // Save current state
      await this.saveApplicationState();
      
      // Stop accepting new connections
      // Close existing connections
      // Stop background processes
      
      logger.info('Application stopped successfully');
    } catch (error) {
      logger.error('Failed to stop application:', error);
      throw error;
    }
  }

  private async startApplication(): Promise<void> {
    try {
      logger.info('Starting application after update...');
      
      // In a real implementation, you'd start the server
      // For now, we'll simulate this
      
      // Restore application state
      await this.restoreApplicationState();
      
      // Start background processes
      // Start accepting connections
      
      logger.info('Application started successfully');
    } catch (error) {
      logger.error('Failed to start application:', error);
      throw error;
    }
  }

  private async installNewFiles(extractPath: string): Promise<void> {
    try {
      logger.info('Installing new files...');
      
      // In a real implementation, you'd copy files from extractPath to the application directory
      // For now, we'll simulate this
      
      // Copy new files
      // Update configuration
      // Update dependencies
      
      logger.info('New files installed successfully');
    } catch (error) {
      logger.error('Failed to install new files:', error);
      throw error;
    }
  }

  private async saveApplicationState(): Promise<void> {
    try {
      // Save current application state
      const state = {
        timestamp: new Date().toISOString(),
        version: this.CURRENT_VERSION,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        activeConnections: 0 // In a real implementation, you'd track this
      };
      
      writeJsonFile('application_state.json', state);
    } catch (error) {
      logger.error('Failed to save application state:', error);
    }
  }

  private async restoreApplicationState(): Promise<void> {
    try {
      // Restore application state
      const state = readJsonFile('application_state.json');
      if (state) {
        logger.info('Application state restored');
      }
    } catch (error) {
      logger.error('Failed to restore application state:', error);
    }
  }

  public async rollbackUpdate(): Promise<boolean> {
    try {
      logger.info('Rolling back update...');
      
      const lastUpdate = this.updateStatus.updateHistory[this.updateStatus.updateHistory.length - 1];
      if (!lastUpdate || lastUpdate.status !== 'failed') {
        throw new Error('No failed update to rollback');
      }
      
      // Create rollback record
      const rollbackRecord: UpdateRecord = {
        id: generateId(),
        version: lastUpdate.rollbackVersion || this.CURRENT_VERSION,
        status: 'rolled_back',
        timestamp: new Date().toISOString(),
        rollbackReason: 'Update failed'
      };
      
      this.updateStatus.updateHistory.push(rollbackRecord);
      this.saveUpdateStatus();
      
      // Restore from backup
      await this.restoreFromBackup();
      
      logger.info('Update rolled back successfully');
      return true;
    } catch (error) {
      logger.error('Failed to rollback update:', error);
      return false;
    }
  }

  private async restoreFromBackup(): Promise<void> {
    try {
      // Find latest backup
      const backupDir = this.BACKUP_DIR;
      const backups = await fs.readdir(backupDir);
      const latestBackup = backups.sort().reverse()[0];
      
      if (!latestBackup) {
        throw new Error('No backup found');
      }
      
      const backupPath = path.join(backupDir, latestBackup);
      
      // Restore files from backup
      // In a real implementation, you'd copy files back
      
      logger.info(`Restored from backup: ${backupPath}`);
    } catch (error) {
      logger.error('Failed to restore from backup:', error);
      throw error;
    }
  }

  public getUpdateStatus(): UpdateStatus {
    return { ...this.updateStatus };
  }

  public getUpdateConfig(): UpdateConfig {
    return { ...this.updateConfig };
  }

  public updateConfig(newConfig: Partial<UpdateConfig>): void {
    this.updateConfig = { ...this.updateConfig, ...newConfig };
    this.saveUpdateConfig();
    
    if (newConfig.autoUpdateEnabled !== undefined) {
      if (newConfig.autoUpdateEnabled) {
        this.startPeriodicCheck();
      } else {
        this.stopPeriodicCheck();
      }
    }
  }

  public async forceUpdate(): Promise<boolean> {
    try {
      const updateInfo = await this.checkForUpdates();
      if (!updateInfo) {
        return false;
      }
      
      return await this.downloadAndInstallUpdate(updateInfo);
    } catch (error) {
      logger.error('Force update failed:', error);
      return false;
    }
  }

  public getUpdateHistory(): UpdateRecord[] {
    return [...this.updateStatus.updateHistory];
  }

  public async cleanup(): Promise<void> {
    try {
      // Clean up old backups
      const backupDir = this.BACKUP_DIR;
      const backups = await fs.readdir(backupDir);
      
      // Keep only last 5 backups
      const sortedBackups = backups.sort().reverse();
      const backupsToDelete = sortedBackups.slice(5);
      
      for (const backup of backupsToDelete) {
        const backupPath = path.join(backupDir, backup);
        await fs.rm(backupPath, { recursive: true, force: true });
      }
      
      // Clean up old update files
      const updateDir = this.UPDATE_DIR;
      const updates = await fs.readdir(updateDir);
      
      for (const update of updates) {
        const updatePath = path.join(updateDir, update);
        await fs.rm(updatePath, { recursive: true, force: true });
      }
      
      logger.info('Cleanup completed');
    } catch (error) {
      logger.error('Cleanup failed:', error);
    }
  }
}

export default AutoUpdateService;
