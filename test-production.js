#!/usr/bin/env node

/**
 * 🧪 EnerlectraTrade - Production Testing Suite
 * 
 * This script performs comprehensive testing of the deployed application
 * Run this script after deployment to validate everything works correctly
 */

const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    // Update these URLs with your actual deployed URLs
    BACKEND_URL: 'https://enerlectra-backend.onrender.com',
    FRONTEND_URL: 'https://enerlectra-frontend-c406365od-samuel-mandas-projects.vercel.app',
    TIMEOUT: 10000, // 10 seconds
    RETRY_ATTEMPTS: 3
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const isHttps = url.startsWith('https://');
        const client = isHttps ? https : http;
        
        const requestOptions = {
            timeout: CONFIG.TIMEOUT,
            ...options
        };

        const req = client.request(url, requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        });

        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Request timeout')));
        req.end();
    });
}

async function testWithRetry(testName, testFunction, maxRetries = CONFIG.RETRY_ATTEMPTS) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            log(`🔄 ${testName} (Attempt ${attempt}/${maxRetries})`, 'blue');
            const result = await testFunction();
            log(`✅ ${testName} - PASSED`, 'green');
            return result;
        } catch (error) {
            log(`❌ ${testName} - FAILED (Attempt ${attempt}): ${error.message}`, 'red');
            if (attempt === maxRetries) {
                throw error;
            }
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

async function testBackendHealth() {
    const response = await makeRequest(`${CONFIG.BACKEND_URL}/health`);
    
    if (response.statusCode !== 200) {
        throw new Error(`Health check returned status ${response.statusCode}`);
    }

    const healthData = JSON.parse(response.data);
    
    if (healthData.status !== 'healthy') {
        throw new Error(`Health status is not healthy: ${healthData.status}`);
    }

    return healthData;
}

async function testBackendAPI() {
    // Test authentication endpoints
    const loginResponse = await makeRequest(`${CONFIG.BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (loginResponse.statusCode !== 400) { // Expected 400 for missing phone
        throw new Error(`Login endpoint returned unexpected status: ${loginResponse.statusCode}`);
    }

    // Test trading endpoints (should require authentication)
    const offersResponse = await makeRequest(`${CONFIG.BACKEND_URL}/api/trading/offers`);
    
    if (offersResponse.statusCode !== 401) { // Expected 401 for unauthorized
        throw new Error(`Trading offers endpoint returned unexpected status: ${offersResponse.statusCode}`);
    }

    return { login: loginResponse.statusCode, offers: offersResponse.statusCode };
}

async function testFrontendAccessibility() {
    const response = await makeRequest(CONFIG.FRONTEND_URL);
    
    if (response.statusCode !== 200) {
        throw new Error(`Frontend returned status ${response.statusCode}`);
    }

    // Check if the response contains expected content
    if (!response.data.includes('Enerlectra') && !response.data.includes('Energy Internet')) {
        throw new Error('Frontend does not contain expected branding');
    }

    return response.statusCode;
}

async function testWebSocketConnection() {
    return new Promise((resolve, reject) => {
        const WebSocket = require('ws');
        const wsUrl = CONFIG.BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
        
        const ws = new WebSocket(wsUrl);
        
        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('WebSocket connection timeout'));
        }, CONFIG.TIMEOUT);

        ws.on('open', () => {
            clearTimeout(timeout);
            ws.close();
            resolve('WebSocket connection established');
        });

        ws.on('error', (error) => {
            clearTimeout(timeout);
            reject(new Error(`WebSocket connection failed: ${error.message}`));
        });
    });
}

async function testSecurityHeaders() {
    const response = await makeRequest(`${CONFIG.BACKEND_URL}/health`);
    const headers = response.headers;

    const securityHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'strict-transport-security'
    ];

    const missingHeaders = securityHeaders.filter(header => !headers[header]);
    
    if (missingHeaders.length > 0) {
        throw new Error(`Missing security headers: ${missingHeaders.join(', ')}`);
    }

    return headers;
}

async function testCORSConfiguration() {
    const response = await makeRequest(`${CONFIG.BACKEND_URL}/health`, {
        headers: {
            'Origin': CONFIG.FRONTEND_URL,
            'Access-Control-Request-Method': 'GET'
        }
    });

    const corsHeaders = response.headers['access-control-allow-origin'];
    
    if (!corsHeaders) {
        throw new Error('CORS headers not found');
    }

    return corsHeaders;
}

async function runPerformanceTest() {
    const startTime = Date.now();
    
    // Make multiple concurrent requests
    const promises = Array(5).fill().map(() => 
        makeRequest(`${CONFIG.BACKEND_URL}/health`)
    );

    const responses = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    const failedRequests = responses.filter(r => r.statusCode !== 200).length;
    
    if (failedRequests > 0) {
        throw new Error(`${failedRequests} out of 5 requests failed`);
    }

    return {
        duration,
        averageResponseTime: duration / responses.length,
        successRate: ((responses.length - failedRequests) / responses.length) * 100
    };
}

async function main() {
    log('🧪 EnerlectraTrade - Production Testing Suite', 'bright');
    log('=============================================', 'bright');
    log('');

    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };

    const tests = [
        { name: 'Backend Health Check', fn: testBackendHealth },
        { name: 'Backend API Endpoints', fn: testBackendAPI },
        { name: 'Frontend Accessibility', fn: testFrontendAccessibility },
        { name: 'WebSocket Connection', fn: testWebSocketConnection },
        { name: 'Security Headers', fn: testSecurityHeaders },
        { name: 'CORS Configuration', fn: testCORSConfiguration },
        { name: 'Performance Test', fn: runPerformanceTest }
    ];

    for (const test of tests) {
        try {
            const result = await testWithRetry(test.name, test.fn);
            results.passed++;
            results.tests.push({ name: test.name, status: 'PASSED', result });
        } catch (error) {
            results.failed++;
            results.tests.push({ name: test.name, status: 'FAILED', error: error.message });
        }
    }

    // Display results
    log('\n📊 TEST RESULTS SUMMARY', 'bright');
    log('========================', 'bright');
    log(`✅ Passed: ${results.passed}`, 'green');
    log(`❌ Failed: ${results.failed}`, 'red');
    log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`, 'cyan');
    log('');

    // Detailed results
    log('📋 DETAILED RESULTS:', 'bright');
    results.tests.forEach(test => {
        const status = test.status === 'PASSED' ? '✅' : '❌';
        const color = test.status === 'PASSED' ? 'green' : 'red';
        log(`${status} ${test.name}`, color);
        
        if (test.status === 'FAILED') {
            log(`   Error: ${test.error}`, 'red');
        } else if (test.result && typeof test.result === 'object') {
            log(`   Result: ${JSON.stringify(test.result, null, 2)}`, 'cyan');
        }
    });

    log('');
    if (results.failed === 0) {
        log('🎉 ALL TESTS PASSED! Your EnerlectraTrade app is production-ready!', 'green');
        log('⚡ Powering Africa\'s energy future together! 🚀', 'bright');
    } else {
        log('⚠️  Some tests failed. Please check the errors above and fix them.', 'yellow');
    }

    log('');
    log('🔗 Quick Links:', 'bright');
    log(`   Backend: ${CONFIG.BACKEND_URL}`, 'blue');
    log(`   Frontend: ${CONFIG.FRONTEND_URL}`, 'blue');
    log(`   Health Check: ${CONFIG.BACKEND_URL}/health`, 'blue');
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    log(`💥 Uncaught Exception: ${error.message}`, 'red');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log(`💥 Unhandled Rejection at: ${promise}, reason: ${reason}`, 'red');
    process.exit(1);
});

// Run the tests
if (require.main === module) {
    main().catch(error => {
        log(`💥 Test suite failed: ${error.message}`, 'red');
        process.exit(1);
    });
}

module.exports = { main, CONFIG };