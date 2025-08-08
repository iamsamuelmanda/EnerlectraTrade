import * as fs from 'fs';
import * as path from 'path';
import { ethers } from 'ethers';
import { User, Cluster, Transaction } from '../types';

const DATA_DIR = path.join(__dirname, 'db');

export const readJsonFile = <T>(filename: string): T[] => {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
};

export const writeJsonFile = <T>(filename: string, data: T[]): void => {
  try {
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    throw new Error(`Failed to save data to ${filename}`);
  }
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const validateBalance = (user: User, amountZMW: number, kWh: number = 0): boolean => {
  return user.balanceZMW >= amountZMW && user.balanceKWh >= kWh;
};

export const calculateCarbonSaved = (kWh: number): number => {
  return kWh * 0.8; // 0.8kg CO2 saved per kWh
};

export const KWH_TO_ZMW_RATE = 1.2; // 1 kWh = 1.2 ZMW

export const updateUserBalance = (
  users: User[], 
  userId: string, 
  deltaZMW: number, 
  deltaKWh: number
): User | null => {
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) return null;
  
  users[userIndex].balanceZMW += deltaZMW;
  users[userIndex].balanceKWh += deltaKWh;
  
  return users[userIndex];
};

export const createTransaction = (
  type: Transaction['type'],
  data: Partial<Transaction>
): Transaction => {
  return {
    id: generateId(),
    type,
    timestamp: new Date().toISOString(),
    carbonSaved: calculateCarbonSaved(data.kWh || 0),
    ...data
  } as Transaction;
};

export const findUserByPhone = (users: User[], phoneNumber: string): User | null => {
  return users.find(u => u.phoneNumber === phoneNumber) || null;
};

// New blockchain-related utilities
export const toBlockchainUnits = (kWh: number): string => {
  return ethers.parseUnits(kWh.toString(), 18).toString();
};

export const fromBlockchainUnits = (units: string): number => {
  return parseFloat(ethers.formatUnits(units, 18));
};

export const validateBlockchainAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};