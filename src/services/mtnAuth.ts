import axios from 'axios';
import logger from '../utils/logger';

const MTN_AUTH_URL = 'https://sandbox.momodeveloper.mtn.com/collection/token/';
const API_KEY = process.env.MOBILE_MONEY_API_KEY || '';
const USER_ID = process.env.MOBILE_MONEY_USER_ID || '';

let accessToken = '';
let tokenExpiration = 0;

export const getAuthToken = async () => {
  if (Date.now() < tokenExpiration) return accessToken;

  try {
    const response = await axios.post(MTN_AUTH_URL, {}, {
      auth: {
        username: USER_ID,
        password: API_KEY
      },
      headers: {
        'Ocp-Apim-Subscription-Key': API_KEY
      }
    });

    accessToken = response.data.access_token;
    tokenExpiration = Date.now() + (response.data.expires_in * 1000) - 30000; // 30s buffer
    
    logger.info('MTN authentication token refreshed');
    return accessToken;
  } catch (error: any) {
    logger.error('MTN authentication failed', error.response?.data);
    throw new Error('Payment service unavailable');
  }
};