import axios from 'axios';
import logger from '../utils/logger';

const baseURL = 'https://sandbox.momodeveloper.mtn.com';
const apiKey = process.env.MOBILE_MONEY_API_KEY || '';
const userId = process.env.MOBILE_MONEY_USER_ID || '';
const targetEnvironment = process.env.MOBILE_MONEY_TARGET_ENVIRONMENT || 'sandbox';

if (!apiKey || !userId) {
  logger.error('Mobile Money API credentials are missing!');
  process.exit(1);
}

const mobileMoneyClient = axios.create({
  baseURL,
  headers: {
    'Ocp-Apim-Subscription-Key': apiKey,
    'X-Target-Environment': targetEnvironment,
    'Content-Type': 'application/json'
  }
});

export const requestPayment = async (phone: string, amount: number, currency: string, reference: string) => {
  try {
    const response = await mobileMoneyClient.post('/collection/v1_0/requesttopay', {
      amount,
      currency,
      externalId: reference,
      payer: {
        partyIdType: 'MSISDN',
        partyId: phone
      },
      payerMessage: 'Energy Purchase',
      payeeNote: `Payment for ${amount} kWh`
    });
    
    return response.data;
  } catch (error) {
    logger.error('Mobile Money payment failed', error);
    throw new Error('Payment processing failed');
  }
};

export const getPaymentStatus = async (referenceId: string) => {
  try {
    const response = await mobileMoneyClient.get(`/collection/v1_0/requesttopay/${referenceId}`);
    return response.data;
  } catch (error) {
    logger.error('Payment status check failed', error);
    throw new Error('Failed to retrieve payment status');
  }
};