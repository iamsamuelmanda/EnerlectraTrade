import logger from '../utils/logger';

interface USSDState {
  phone: string;
  step: 'main' | 'buy_energy' | 'sell_energy' | 'confirm_payment';
  amount?: number;
  reference?: string;
}

const sessions: Record<string, USSDState> = {};

export const handleUSSDRequest = async (sessionId: string, phone: string, text: string) => {
  if (!sessions[sessionId]) {
    sessions[sessionId] = { phone, step: 'main' };
    return `CON Welcome to Enerlectra Energy Trading\n
1. Buy Energy\n2. Sell Energy\n3. Check Balance\n4. Transactions`;
  }

  const session = sessions[sessionId];
  
  switch(session.step) {
    case 'main':
      switch(text) {
        case '1': 
          session.step = 'buy_energy';
          return 'CON Enter amount in kWh:';
        case '2':
          session.step = 'sell_energy';
          return 'CON Enter amount to sell:';
        case '3':
          return `END Your balance: 150 kWh`;
        case '4':
          return `END Recent transactions:\n- Bought 10 kWh\n- Sold 5 kWh`;
        default:
          return 'END Invalid option';
      }
    
    case 'buy_energy':
      const amount = parseFloat(text);
      if (!isNaN(amount)) {
        session.amount = amount;
        session.reference = `ENERGY-${Date.now()}`;
        session.step = 'confirm_payment';
        
        try {
          // TODO: Implement payment initiation
          logger.info(`Payment initiated for ${amount} kWh by ${phone}`);
          return `CON Confirm purchase of ${amount} kWh?\n1. Yes\n2. No`;
        } catch (error) {
          logger.error('Payment initiation failed', error);
          return 'END Payment initiation failed';
        }
      }
      return 'END Invalid amount';
    
    case 'confirm_payment':
      if (text === '1') {
        return `END Payment confirmed! You'll receive ${session.amount} kWh shortly.`;
      }
      return 'END Transaction cancelled';
    
    default:
      return 'END Session expired';
  }
};