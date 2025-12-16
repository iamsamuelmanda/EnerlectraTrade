/**
 * Enerlectra PCEI MVP: DynamoDB Seeder and Initialization Script
 * This script creates the EnerlectraPCEI_MVP table and loads initial seed data
 * for the Kabwe pilot test (100 users, 10 clusters, 30 devices).
 * 
 * Dependencies: aws-sdk, uuid
 * NOTE: Ensure your AWS credentials are configured (e.g., via environment variables or AWS CLI).
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the schema from the local file
const schema = JSON.parse(readFileSync(join(__dirname, './dynamodb_schema.json'), 'utf-8'));

// --- Configuration ---
const TABLE_NAME = schema.TableName;
const NUM_USERS = 100;
const NUM_CLUSTERS = 10;
const NUM_DEVICES = 30; // 30 Prosumers (Users with devices)

// Configure AWS to connect to DynamoDB (e.g., in a local or dev region)
// NOTE: Change 'eu-west-1' to your desired AWS Region if necessary.
AWS.config.update({ region: 'eu-west-1' }); 
const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

// --- Utility Functions ---

/** Creates the DynamoDB table based on the schema definition. */
async function createTable() {
    console.log(`Checking for table: ${TABLE_NAME}...`);
    try {
        await dynamodb.describeTable({ TableName: TABLE_NAME }).promise();
        console.log(`Table ${TABLE_NAME} already exists.`);
    } catch (error) {
        if (error.code === 'ResourceNotFoundException') {
            console.log(`Table ${TABLE_NAME} not found. Creating table...`);
            await dynamodb.createTable(schema).promise();
            await dynamodb.waitFor('tableExists', { TableName: TABLE_NAME }).promise();
            console.log(`Table ${TABLE_NAME} created successfully.`);
        } else {
            throw error;
        }
    }
}

/** Generates all seed data items for the Single-Table Design. */
function generateSeedData() {
    const items = [];
    const clusterIds = [];
    const prosumerIds = [];

    // 1. Generate Clusters (10 Items)
    for (let i = 1; i <= NUM_CLUSTERS; i++) {
        const clusterId = `C${i.toString().padStart(3, '0')}`;
        clusterIds.push(clusterId);
        items.push({
            PK: `CLUSTER#${clusterId}`,
            SK: 'PROFILE',
            EntityType: 'Cluster',
            GSI1PK: `REGION#Kabwe-Constituency`,
            clusterName: `Kabwe Cluster ${i}`,
            mode: 'A',
            ownerID: `USER#P001`, // Assigned to first Prosumer for simplicity
            isFunded: i % 3 === 0, // Mock funding status
            setupFee_ZMW: 250,
            memberCount: 0
        });
    }

    // 2. Generate Users (100 Items: 30 Prosumers, 70 Consumers)
    for (let i = 1; i <= NUM_USERS; i++) {
        const userId = i.toString().padStart(3, '0');
        const isProsumer = i <= NUM_DEVICES;
        const userPrefix = isProsumer ? 'P' : 'C'; // P=Prosumer, C=Consumer
        const fullUserId = `USER#${userPrefix}${userId}`;
        const clusterId = clusterIds[i % NUM_CLUSTERS];

        if (isProsumer) prosumerIds.push(fullUserId);

        // A. User Profile (SK: PROFILE)
        items.push({
            PK: fullUserId,
            SK: 'PROFILE',
            EntityType: 'User',
            GSI1PK: `CLUSTER#${clusterId}`, // Lookup: Find users by Cluster
            name: `${isProsumer ? 'Prosumer' : 'Consumer'} ${i} Family`,
            phoneNumber: `0977${i.toString().padStart(6, '0')}`,
            role: isProsumer ? 'Prosumer' : 'Consumer',
            blockchainAddress: `0x${uuidv4().replace(/-/g, '').substring(0, 40)}`,
            onboardDate: new Date().toISOString(),
            clusterId: clusterId
        });

        // B. User Wallets (SK: WALLET#KWH, WALLET#ZMW)
        items.push({
            PK: fullUserId, SK: 'WALLET#KWH', EntityType: 'Wallet',
            balance_kWh: isProsumer ? (Math.random() * 50).toFixed(2) : (Math.random() * 10).toFixed(2),
            locked_kWh: isProsumer ? (Math.random() * 5).toFixed(2) : '0.00'
        });
        items.push({
            PK: fullUserId, SK: 'WALLET#ZMW', EntityType: 'Wallet',
            balance_ZMW: (Math.random() * 500).toFixed(2)
        });

        // C. Initial Contribution (SK: CONTRIB#<TxID>)
        const contributionAmount = [50, 100, 500][i % 3];
        items.push({
            PK: `CLUSTER#${clusterId}`,
            SK: `CONTRIB#${Date.now() + i}`,
            EntityType: 'Contribution',
            GSI1PK: fullUserId, // Lookup: Find Contributions by User
            userID: fullUserId,
            amount_ZMW: contributionAmount,
            timestamp: Date.now(),
            mobileMoneyRef: `MOMO${i}`
        });
    }

    // 3. Generate Devices (30 Items, one for each Prosumer) and Generation Events
    prosumerIds.forEach((userId, index) => {
        const deviceId = `D${(index + 1).toString().padStart(3, '0')}`;
        // Find the clusterId associated with this user
        const clusterItem = items.find(item => item.PK === userId && item.SK === 'PROFILE');
        const clusterId = clusterItem ? clusterItem.clusterId : clusterIds[0];

        // A. Device Profile (SK: DEVICE#<DeviceID>)
        items.push({
            PK: userId,
            SK: `DEVICE#${deviceId}`,
            EntityType: 'Device',
            GSI1PK: `DEVICE#${deviceId}`, // Lookup: Find Device by ID
            deviceId: deviceId,
            type: 'Solar Panel',
            serialNumber: `SN${deviceId}`,
            capacity_kW: (1 + Math.random()).toFixed(2), // 1.0 kW to 2.0 kW
            installDate: new Date().toISOString()
        });

        // B. Initial Generation Events (SK: GENERATION#<Timestamp>)
        for (let j = 0; j < 5; j++) {
            items.push({
                PK: `DEVICE#${deviceId}`,
                SK: `GENERATION#${Date.now() - (j * 86400000)}`, // 5 days of data
                EntityType: 'GenerationEvent',
                GSI1PK: `CLUSTER#${clusterId}`, // Lookup: Find Events by Cluster
                clusterId: clusterId,
                value_kWh: (Math.random() * 5 + 1).toFixed(2), // 1.0 to 6.0 kWh
                isSimulated: true,
                timestamp: Date.now() - (j * 86400000)
            });
        }
    });

    // 4. Initial Market Offer
    const initialOfferId = uuidv4();
    items.push({
        PK: `OFFER#${initialOfferId}`,
        SK: 'PROFILE',
        EntityType: 'Offer',
        GSI1PK: `CLUSTER#${clusterIds[0]}`, // Offer in first cluster
        offerId: initialOfferId,
        sellerID: prosumerIds[0],
        amount_kWh: 50.00,
        price_ZMW_per_kWh: 1.50,
        totalPrice: 75.00,
        isActive: true,
        expiresAt: Date.now() + 86400000 // 24 hours from now
    });

    return items;
}

/** Batch writes all items to the DynamoDB table. */
async function loadSeedData(items) {
    console.log(`Attempting to load ${items.length} seed items into ${TABLE_NAME}...`);
    
    // DynamoDB batchWriteItem limit is 25 items per request
    const batchSize = 25;
    let successfulWrites = 0;

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const params = {
            RequestItems: {
                [TABLE_NAME]: batch.map(item => ({
                    PutRequest: {
                        Item: item
                    }
                }))
            }
        };

        try {
            await docClient.batchWrite(params).promise();
            successfulWrites += batch.length;
            process.stdout.write('.');
        } catch (error) {
            console.error(`\nError loading batch starting at index ${i}:`, error.message);
            // Non-critical: Continue trying other batches
        }
    }
    console.log(`\nSuccessfully loaded ${successfulWrites} items.`);
}

// --- Main Execution ---
async function main() {
    try {
        await createTable();
        const seedItems = generateSeedData();
        await loadSeedData(seedItems);
        console.log(`\n--- DynamoDB Data Foundation Complete ---`);
        console.log(`Table: ${TABLE_NAME}`);
        console.log(`Total Seed Items Generated: ${seedItems.length}`);
    } catch (error) {
        console.error('\nFATAL ERROR during DynamoDB setup:', error);
    }
}

// Ensure execution is triggered
main();