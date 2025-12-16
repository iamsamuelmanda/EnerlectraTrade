require("dotenv").config();
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARE
app.use(express.json());

// CORS
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
});

// HEALTH ENDPOINT
app.get("/api/v1/health", (req, res) => {
    res.json({
        status: "OK",
        message: "Energy Trading Platform",
        version: "1.0.0",
        timestamp: new Date().toISOString()
    });
});

// SIMPLE USER REGISTRATION (IN-MEMORY FOR TESTING)
const users = new Map();

app.post("/api/v1/auth/register", (req, res) => {
    const { phoneNumber, name, role, initialContribution = 0 } = req.body;
    
    // Validate phone
    if (!/^09\d{8}$/.test(phoneNumber)) {
        return res.status(400).json({
            status: "error",
            message: "Invalid phone number. Use format: 09XXXXXXXX"
        });
    }
    
    const userId = "USER#" + (role === "Prosumer" ? "P" : "C") + Date.now().toString().slice(-4);
    
    users.set(userId, {
        userId,
        phoneNumber,
        name,
        role,
        energy: { available: role === "Prosumer" ? 0 : 0, locked: 0 },
        money: { available: initialContribution, locked: 0 }
    });
    
    res.json({
        status: "success",
        data: {
            userId,
            phoneNumber,
            name,
            role,
            message: "User registered successfully"
        }
    });
});

// GET USER BALANCE
app.get("/api/v1/user/:userId/balance", (req, res) => {
    const userId = req.params.userId;
    const user = users.get(userId);
    
    if (!user) {
        return res.status(404).json({
            status: "error",
            message: "User not found"
        });
    }
    
    res.json({
        status: "success",
        data: {
            userId: user.userId,
            balances: {
                energy: user.energy,
                money: user.money
            }
        }
    });
});

// DEVICE ENERGY REPORTING
app.post("/api/v1/device/report", (req, res) => {
    const { deviceId, value_kWh, userId } = req.body;
    
    if (!deviceId || !value_kWh || !userId) {
        return res.status(400).json({
            status: "error",
            message: "Missing required fields"
        });
    }
    
    const user = users.get(userId);
    if (!user) {
        return res.status(404).json({
            status: "error",
            message: "User not found"
        });
    }
    
    if (user.role !== "Prosumer") {
        return res.status(400).json({
            status: "error",
            message: "Only prosumers can report energy generation"
        });
    }
    
    // Add energy
    user.energy.available += parseFloat(value_kWh);
    
    res.json({
        status: "success",
        data: {
            deviceId,
            energyGenerated: value_kWh,
            userId,
            newBalance: user.energy.available
        }
    });
});

// CREATE MARKET OFFER
app.post("/api/v1/market/create-offer", (req, res) => {
    const { userId, amount_kWh, price_ZMW_per_kWh, expiresInHours = 24 } = req.body;
    
    const user = users.get(userId);
    if (!user) {
        return res.status(404).json({
            status: "error",
            message: "User not found"
        });
    }
    
    if (user.role !== "Prosumer") {
        return res.status(400).json({
            status: "error",
            message: "Only prosumers can create offers"
        });
    }
    
    const amount = parseFloat(amount_kWh);
    if (user.energy.available < amount) {
        return res.status(400).json({
            status: "error",
            message: "Insufficient available energy"
        });
    }
    
    // Lock the energy
    user.energy.available -= amount;
    user.energy.locked += amount;
    
    const offerId = "OFFER#" + Date.now().toString(36).toUpperCase();
    
    // Store offer
    const offer = {
        offerId,
        userId,
        amount,
        price: parseFloat(price_ZMW_per_kWh),
        expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
        status: "active"
    };
    
    if (!app.locals.offers) app.locals.offers = new Map();
    app.locals.offers.set(offerId, offer);
    
    res.json({
        status: "success",
        data: {
            offerId,
            details: {
                amount,
                pricePerUnit: offer.price,
                expiresIn: expiresInHours,
                expiresAt: offer.expiresAt.toISOString()
            }
        }
    });
});

// BUY ENERGY
app.post("/api/v1/market/buy", (req, res) => {
    const { buyerPhoneNumber, offerId, amount_kWh } = req.body;
    
    // Find buyer
    let buyer = null;
    let buyerId = null;
    for (const [id, user] of users.entries()) {
        if (user.phoneNumber === buyerPhoneNumber) {
            buyer = user;
            buyerId = id;
            break;
        }
    }
    
    if (!buyer) {
        return res.status(404).json({
            status: "error",
            message: "Buyer not found"
        });
    }
    
    // Find offer
    const offer = app.locals.offers?.get(offerId);
    if (!offer) {
        return res.status(404).json({
            status: "error",
            message: "Offer not found"
        });
    }
    
    const amount = parseFloat(amount_kWh);
    if (offer.amount < amount) {
        return res.status(400).json({
            status: "error",
            message: "Insufficient energy in offer"
        });
    }
    
    const seller = users.get(offer.userId);
    if (!seller) {
        return res.status(404).json({
            status: "error",
            message: "Seller not found"
        });
    }
    
    const totalPrice = amount * offer.price;
    
    // Check buyer has enough money
    if (buyer.money.available < totalPrice) {
        return res.status(400).json({
            status: "error",
            message: "Insufficient funds"
        });
    }
    
    // EXECUTE TRADE
    // 1. Transfer energy
    seller.energy.locked -= amount;
    buyer.energy.available += amount;
    
    // 2. Transfer money
    buyer.money.available -= totalPrice;
    seller.money.available += totalPrice;
    
    // 3. Update offer
    offer.amount -= amount;
    if (offer.amount <= 0) {
        app.locals.offers.delete(offerId);
    }
    
    const tradeId = "TRADE#" + Date.now().toString(36).toUpperCase();
    const carbonSaved = amount * 0.8; // kg CO2
    
    res.json({
        status: "success",
        data: {
            tradeId,
            details: {
                energyTransferred: amount,
                totalPrice,
                pricePerUnit: offer.price,
                carbonSaved: carbonSaved.toFixed(2),
                sellerId: seller.userId,
                buyerId: buyer.userId
            }
        }
    });
});

// LIST OFFERS
app.get("/api/v1/market/offers", (req, res) => {
    const offers = app.locals.offers ? Array.from(app.locals.offers.values()) : [];
    
    res.json({
        status: "success",
        data: {
            offers: offers.map(offer => ({
                offerId: offer.offerId,
                sellerId: offer.userId,
                amount: offer.amount,
                pricePerUnit: offer.price,
                expiresAt: offer.expiresAt.toISOString()
            }))
        }
    });
});

// START SERVER
app.listen(PORT, () => {
    console.log("=".repeat(50));
    console.log("🚀 ENERGY TRADING PLATFORM STARTED");
    console.log("=".repeat(50));
    console.log(`📡 API: http://localhost:${PORT}`);
    console.log(`🏥 Health: http://localhost:${PORT}/api/v1/health`);
    console.log("=".repeat(50));
    console.log("ENDPOINTS:");
    console.log("  POST   /api/v1/auth/register");
    console.log("  GET    /api/v1/user/:userId/balance");
    console.log("  POST   /api/v1/device/report");
    console.log("  POST   /api/v1/market/create-offer");
    console.log("  POST   /api/v1/market/buy");
    console.log("  GET    /api/v1/market/offers");
    console.log("=".repeat(50));
});
