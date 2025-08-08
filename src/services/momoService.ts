import axios from 'axios';
import { createHmac } from 'crypto';
import logger from '../utils/logger';

const API_BASE_URL = process.env.MOBILE_MONEY_TARGET_ENVIRONMENT === 'production'
  ? 'https://api.mtn.com/v1'
  : 'https://sandbox.api.mtn.com/v1';

const API_KEY = process.env.MOBILE_MONEY_API_KEY || '';
const USER_ID = process.env.MOBILE_MONEY_USER_ID || '';

// Create authenticated client
const momoClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${Buffer.from(`${USER_ID}:${API_KEY}`).toString('base64')}`
  }
});

// Generate OAuth token
export const getOAuthToken = async () => {
  try {
    const response = await momoClient.post('/oauth/access_token', {
      grant_type: 'client_credentials'
    });
    return response.data.access_token;
  } catch (error: any) {
    logger.error('MTN OAuth token request failed', error.response?.data);
    throw new Error('Authentication failed');
  }
};

// Initiate payment (deposit)
export const initiateDeposit = async (phone: string, amount: number, reference: string) => {
  const token = await getOAuthToken();
  const payload = {
    amount: amount.toFixed(2),
    currency: 'ZMW',
    externalId: reference,
    payer: {
      partyIdType: 'MSISDN',
      partyId: phone
    },
    payerMessage: 'Energy Wallet Deposit',
    payeeNote: `Deposit to Enerlectra account`
  };

  try {
    const response = await momoClient.post('/collection/requesttopay', payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Reference-Id': reference,
        'X-Target-Environment': process.env.MOBILE_MONEY_TARGET_ENVIRONMENT || 'sandbox'
      }
    });
    return response.data;
  } catch (error: any) {
    logger.error('Deposit initiation failed', error.response?.data);
    throw new Error('Deposit processing failed');
  }
};

// Initiate withdrawal
export const initiateWithdrawal = async (phone: string, amount: number, reference: string) => {
  const token = await getOAuthToken();
  const payload = {
    amount: amount.toFixed(2),
    currency: 'ZMW',
    externalId: reference,
    payee: {
      partyIdType: 'MSISDN',
      partyId: phone
    },
    payerMessage: 'Energy Wallet Withdrawal',
    payeeNote: `Withdrawal from Enerlectra account`
  };

  try {
    const response = await momoClient.post('/disbursement/transfer', payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Reference-Id': reference,
        'X-Target-Environment': process.env.MOBILE_MONEY_TARGET_ENVIRONMENT || 'sandbox'
      }
    });
    return response.data;
  } catch (error: any) {
    logger.error('Withdrawal initiation failed', error.response?.data);
    throw new Error('Withdrawal processing failed');
  }
};

// Verify webhook signature
export const verifyWebhookSignature = (body: string, signature: string) => {
  const computedSignature = createHmac('sha256', API_KEY)
    .update(body)
    .digest('base64');
  
  return computedSignature === signature;
};