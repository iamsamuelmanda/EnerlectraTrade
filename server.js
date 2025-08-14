const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'EnerlectraTrade API is running',
        timestamp: new Date().toISOString()
    });
});

// USSD endpoint
app.post('/api/ussd', (req, res) => {
    const { text, phoneNumber, sessionId } = req.body;
    
    if (!text) {
        // First interaction
        res.send('CON Welcome to EnerlectraTrade\n1. Check Balance\n2. Buy Energy\n3. Sell Energy\n4. Transaction History');
    } else if (text === '1') {
        res.send('END Your energy balance: 150 kWh\nToken balance: 25 ENTR');
    } else if (text === '2') {
        res.send('CON Buy Energy\n1. 10 kWh - $2\n2. 25 kWh - $5\n3. 50 kWh - $9');
    } else if (text === '3') {
        res.send('CON Sell Energy\nEnter amount in kWh:');
    } else if (text === '4') {
        res.send('END Recent Transactions:\n- Bought 25 kWh (Today)\n- Sold 15 kWh (Yesterday)');
    } else {
        res.send('END Thank you for using EnerlectraTrade!');
    }
});

// Mobile Money webhook
app.post('/api/momo/webhook', (req, res) => {
    console.log('📱 Mobile Money webhook received:', req.body);
    res.json({ success: true, message: 'Webhook processed' });
});

// API routes
app.get('/api/energy/listings', (req, res) => {
    res.json([
        { id: 1, amount: 100, pricePerKwh: 0.05, description: 'Solar energy from rooftop' },
        { id: 2, amount: 250, pricePerKwh: 0.04, description: 'Wind energy surplus' },
        { id: 3, amount: 75, pricePerKwh: 0.06, description: 'Hydro power excess' }
    ]);
});

app.post('/api/energy/buy', (req, res) => {
    const { listingId, amount } = req.body;
    res.json({ 
        success: true, 
        message: `Successfully purchased ${amount} kWh`,
        transactionId: 'tx_' + Date.now()
    });
});

app.listen(port, () => {
    console.log(`🌟 EnerlectraTrade API running on port ${port}`);
    console.log(`📡 Health check: http://localhost:${port}/api/health`);
    console.log(`📱 USSD endpoint: http://localhost:${port}/api/ussd`);
    console.log(`⚡ Energy API: http://localhost:${port}/api/energy/listings`);
});