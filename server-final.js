const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// CORS - Allow all for testing
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
});

// ============ IN-MEMORY DATABASE ============

const users = new Map();
const offers = new Map();

// Add test users for immediate testing
users.set("USER#P105", {
    userId: "USER#P105",
    phoneNumber: "0977000001",
    name: "Test Prosumer 105",
    role: "Prosumer",
    energy: { available: 100, locked: 0 },
    money: { available: 500, locked: 0 }
});

users.set("USER#P109", {
    userId: "USER#P109",
    phoneNumber: "0977000002",
    name: "Test Prosumer 109",
    role: "Prosumer",
    energy: { available: 150, locked: 0 },
    money: { available: 1000, locked: 0 }
});

// ============ API ENDPOINTS ============

// 1. Health Check
app.get("/api/v1/health", (req, res) => {
    res.json({
        status: "OK",
        message: "Energy Trading Platform",
        version: "1.0.0",
        users: users.size,
        offers: offers.size,
        timestamp: new Date().toISOString()
    });
});

// 2. Register User
app.post("/api/v1/auth/register", (req, res) => {
    try {
        const { phoneNumber, name, role, initialContribution = 0 } = req.body;
        
        // Validate phone (Zambian format)
        if (!/^09\d{8}$/.test(phoneNumber)) {
            return res.status(400).json({
                status: "error",
                message: "Invalid phone number. Use format: 09XXXXXXXX"
            });
        }
        
        // Check if phone already exists
        for (const user of users.values()) {
            if (user.phoneNumber === phoneNumber) {
                return res.status(400).json({
                    status: "error",
                    message: "Phone number already registered"
                });
            }
        }
        
        const userId = "USER#" + (role === "Prosumer" ? "P" : "C") + Date.now().toString().slice(-4);
        
        const newUser = {
            userId,
            phoneNumber,
            name,
            role,
            energy: { available: 0, locked: 0 },
            money: { available: parseFloat(initialContribution), locked: 0 }
        };
        
        users.set(userId, newUser);
        
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
        
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Registration failed",
            error: error.message
        });
    }
});

// 3. Get User Balance
app.get("/api/v1/user/:userId/balance", (req, res) => {
    try {
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
        
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Failed to get balance",
            error: error.message
        });
    }
});

// 4. Device Energy Report
app.post("/api/v1/device/report", (req, res) => {
    try {
        const { deviceId, value_kWh, userId, timestamp, location } = req.body;
        
        if (!deviceId || !value_kWh || !userId) {
            return res.status(400).json({
                status: "error",
                message: "Missing required fields: deviceId, value_kWh, userId"
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
                message: "Only prosumers can report energy"
            });
        }
        
        const energyValue = parseFloat(value_kWh);
        user.energy.available += energyValue;
        
        res.json({
            status: "success",
            data: {
                deviceId,
                energyGenerated: energyValue,
                userId,
                newBalance: user.energy.available,
                timestamp: timestamp || new Date().toISOString()
            }
        });
        
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Failed to record energy generation",
            error: error.message
        });
    }
});

// 5. Create Offer
app.post("/api/v1/market/create-offer", (req, res) => {
    try {
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
        const expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000));
        
        const offer = {
            offerId,
            userId,
            amount,
            price: parseFloat(price_ZMW_per_kWh),
            expiresAt,
            status: "active",
            createdAt: new Date()
        };
        
        offers.set(offerId, offer);
        
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
        
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Failed to create offer",
            error: error.message
        });
    }
});

// 6. Buy Energy
app.post("/api/v1/market/buy", (req, res) => {
    try {
        const { buyerPhoneNumber, offerId, amount_kWh } = req.body;
        
        // Find buyer by phone
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
                message: "Buyer not found. Please register first."
            });
        }
        
        // Find offer
        const offer = offers.get(offerId);
        if (!offer) {
            return res.status(404).json({
                status: "error",
                message: "Offer not found"
            });
        }
        
        if (offer.status !== "active") {
            return res.status(400).json({
                status: "error",
                message: "Offer is no longer active"
            });
        }
        
        if (new Date() > new Date(offer.expiresAt)) {
            offer.status = "expired";
            return res.status(400).json({
                status: "error",
                message: "Offer has expired"
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
        
        // Check buyer balance
        if (buyer.money.available < totalPrice) {
            return res.status(400).json({
                status: "error",
                message: "Insufficient funds"
            });
        }
        
        // ===== EXECUTE THE TRADE =====
        // 1. Transfer energy
        seller.energy.locked -= amount;
        buyer.energy.available += amount;
        
        // 2. Transfer money
        buyer.money.available -= totalPrice;
        seller.money.available += totalPrice;
        
        // 3. Update offer
        offer.amount -= amount;
        if (offer.amount <= 0) {
            offers.delete(offerId);
        }
        
        const tradeId = "TRADE#" + Date.now().toString(36).toUpperCase();
        const carbonSaved = amount * 0.8; // kg CO2 saved
        
        res.json({
            status: "success",
            data: {
                tradeId,
                details: {
                    energyTransferred: amount,
                    totalPrice: totalPrice.toFixed(2),
                    pricePerUnit: offer.price,
                    carbonSaved: carbonSaved.toFixed(2),
                    sellerId: seller.userId,
                    buyerId: buyer.userId,
                    timestamp: new Date().toISOString()
                }
            }
        });
        
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Trade failed",
            error: error.message
        });
    }
});

// 7. List Offers
app.get("/api/v1/market/offers", (req, res) => {
    try {
        const activeOffers = Array.from(offers.values())
            .filter(offer => offer.status === "active" && new Date(offer.expiresAt) > new Date())
            .map(offer => ({
                offerId: offer.offerId,
                sellerId: offer.userId,
                amount: offer.amount,
                pricePerUnit: offer.price,
                expiresAt: offer.expiresAt.toISOString()
            }));
        
        res.json({
            status: "success",
            data: {
                offers: activeOffers
            }
        });
        
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Failed to fetch offers",
            error: error.message
        });
    }
});

// 8. Test Endpoint
app.get("/api/v1/test", (req, res) => {
    res.json({
        status: "success",
        message: "Test endpoint working",
        serverTime: new Date().toISOString(),
        totalUsers: users.size,
        totalOffers: offers.size
    });
});

// ============ START SERVER ============
// Bind to 0.0.0.0 to accept connections from any interface
const server = app.listen(PORT, "0.0.0.0", () => {
    console.log("=".repeat(60));
    console.log("🚀 ENERGY TRADING PLATFORM - WORKING SERVER");
    console.log("=".repeat(60));
    console.log(`📡 Server running at:`);
    console.log(`   Local:  http://localhost:${PORT}`);
    console.log(`   Network: http://${require('os').networkInterfaces().eth0?.[0]?.address || '127.0.0.1'}:${PORT}`);
    console.log(`   Any:    http://0.0.0.0:${PORT}`);
    console.log("=".repeat(60));
    console.log("ENDPOINTS:");
    console.log("  GET    /api/v1/health");
    console.log("  POST   /api/v1/auth/register");
    console.log("  GET    /api/v1/user/:userId/balance");
    console.log("  POST   /api/v1/device/report");
    console.log("  POST   /api/v1/market/create-offer");
    console.log("  POST   /api/v1/market/buy");
    console.log("  GET    /api/v1/market/offers");
    console.log("=".repeat(60));
    console.log(`📊 Pre-loaded users: ${users.size}`);
    console.log(`💰 Test User Balances:`);
    for (const [id, user] of users.entries()) {
        console.log(`  ${id}: ${user.energy.available}kWh energy, ${user.money.available}ZMW money`);
    }
    console.log("=".repeat(60));
});

// Handle server errors
server.on("error", (error) => {
    console.error("❌ Server error:", error.message);
    if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Try a different port.`);
    }
});
