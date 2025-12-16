const express = require("express");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { fromNodeProviderChain } = require("@aws-sdk/credential-providers");
const app = express();
require("dotenv").config();

// FIXED AWS CLIENT CONFIGURATION
const dynamoClient = new DynamoDBClient({
    region: process.env.AWS_REGION || "eu-west-1",
    credentials: fromNodeProviderChain(),
    // DNS and network fixes
    maxAttempts: 3,
    retryMode: "standard",
    requestHandler: {
        httpOptions: {
            timeout: 10000,
            connectTimeout: 10000
        }
    }
});

// Health endpoint
app.get("/api/v1/health", (req, res) => {
    res.json({
        status: "OK",
        message: "Energy Trading Platform",
        database: "AWS DynamoDB",
        timestamp: new Date().toISOString()
    });
});

// Test AWS connection endpoint
app.get("/api/v1/test-aws", async (req, res) => {
    try {
        const { ListTablesCommand } = require("@aws-sdk/client-dynamodb");
        const command = new ListTablesCommand({});
        const response = await dynamoClient.send(command);
        
        res.json({
            status: "success",
            message: "AWS DynamoDB connection successful",
            tables: response.TableNames,
            region: process.env.AWS_REGION
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "AWS DynamoDB connection failed",
            error: error.message
        });
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(\`✅ Energy Trading API running on http://localhost:\${PORT}\`);
    console.log(\`🌍 AWS Region: \${process.env.AWS_REGION || "eu-west-1"}\`);
});
