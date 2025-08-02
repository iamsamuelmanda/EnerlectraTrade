"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserByPhone = exports.createTransaction = exports.updateUserBalance = exports.KWH_TO_ZMW_RATE = exports.calculateCarbonSaved = exports.validateBalance = exports.generateId = exports.writeJsonFile = exports.readJsonFile = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const DATA_DIR = path.join(__dirname, 'db');
const readJsonFile = (filename) => {
    try {
        const filePath = path.join(DATA_DIR, filename);
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    }
    catch (error) {
        console.error(`Error reading ${filename}:`, error);
        return [];
    }
};
exports.readJsonFile = readJsonFile;
const writeJsonFile = (filename, data) => {
    try {
        const filePath = path.join(DATA_DIR, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }
    catch (error) {
        console.error(`Error writing ${filename}:`, error);
        throw new Error(`Failed to save data to ${filename}`);
    }
};
exports.writeJsonFile = writeJsonFile;
const generateId = () => {
    return Math.random().toString(36).substr(2, 9);
};
exports.generateId = generateId;
const validateBalance = (user, amountZMW, kWh = 0) => {
    return user.balanceZMW >= amountZMW && user.balanceKWh >= kWh;
};
exports.validateBalance = validateBalance;
const calculateCarbonSaved = (kWh) => {
    return kWh * 0.8; // 0.8kg CO2 saved per kWh
};
exports.calculateCarbonSaved = calculateCarbonSaved;
exports.KWH_TO_ZMW_RATE = 1.2; // 1 kWh = 1.2 ZMW
const updateUserBalance = (users, userId, deltaZMW, deltaKWh) => {
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1)
        return null;
    users[userIndex].balanceZMW += deltaZMW;
    users[userIndex].balanceKWh += deltaKWh;
    return users[userIndex];
};
exports.updateUserBalance = updateUserBalance;
const createTransaction = (type, data) => {
    return {
        id: (0, exports.generateId)(),
        type,
        timestamp: new Date().toISOString(),
        carbonSaved: (0, exports.calculateCarbonSaved)(data.kWh || 0),
        ...data
    };
};
exports.createTransaction = createTransaction;
const findUserByPhone = (users, phoneNumber) => {
    return users.find(u => u.phoneNumber === phoneNumber) || null;
};
exports.findUserByPhone = findUserByPhone;
