#!/usr/bin/env node

/**
 * 🔍 EnerlectraTrade - Deployment Status Checker
 * 
 * This script checks the current deployment status and provides
 * real-time information about your deployed services
 */

const https = require('https');
const http = require('http');

// Configuration - Update these with your actual URLs
const CONFIG = {
    BACKEND_URL: 'https://enerlectra-backend.onrender.com',
    FRONTEND_URL: 'https://enerlectra-frontend-c406365od-samuel-mandas-projects.vercel.app',
    TIMEOUT: 5000
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
                    data: data,
                    url: url
                });
            });
        });

        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Request timeout')));
        req.end();
    });
}

async function checkBackendStatus() {
    try {
        log('🔍 Checking backend status...', 'blue');
        const response = await makeRequest(`${CONFIG.BACKEND_URL}/health`);
        
        if (response.statusCode === 200) {
            const healthData = JSON.parse(response.data);
            log('✅ Backend is ONLINE', 'green');
            log(`   Status: ${healthData.status}`, 'cyan');
            log(`   Service: ${healthData.service}`, 'cyan');
            log(`   Version: ${healthData.version}`, 'cyan');
            
            if (healthData.security) {
                log(`   Security: ${healthData.security.status}`, 'cyan');
                log(`   Features: ${healthData.security.features.join(', ')}`, 'cyan');
            }
            
            return { status: 'online', data: healthData };
        } else {
            log(`❌ Backend returned status ${response.statusCode}`, 'red');
            return { status: 'error', code: response.statusCode };
        }
    } catch (error) {
        log(`❌ Backend is OFFLINE: ${error.message}`, 'red');
        return { status: 'offline', error: error.message };
    }
}

async function checkFrontendStatus() {
    try {
        log('🔍 Checking frontend status...', 'blue');
        const response = await makeRequest(CONFIG.FRONTEND_URL);
        
        if (response.statusCode === 200) {
            log('✅ Frontend is ONLINE', 'green');
            
            // Check for expected content
            const hasEnerlectra = response.data.includes('Enerlectra');
            const hasEnergyInternet = response.data.includes('Energy Internet');
            
            if (hasEnerlectra || hasEnergyInternet) {
                log('   ✅ Branding content found', 'green');
            } else {
                log('   ⚠️  Branding content not found', 'yellow');
            }
            
            return { status: 'online', branding: hasEnerlectra || hasEnergyInternet };
        } else {
            log(`❌ Frontend returned status ${response.statusCode}`, 'red');
            return { status: 'error', code: response.statusCode };
        }
    } catch (error) {
        log(`❌ Frontend is OFFLINE: ${error.message}`, 'red');
        return { status: 'offline', error: error.message };
    }
}

async function checkAPIConnectivity() {
    try {
        log('🔍 Testing API connectivity...', 'blue');
        
        // Test authentication endpoint
        const authResponse = await makeRequest(`${CONFIG.BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (authResponse.statusCode === 400) { // Expected for missing phone
            log('✅ Authentication endpoint responding correctly', 'green');
        } else {
            log(`⚠️  Authentication endpoint returned ${authResponse.statusCode}`, 'yellow');
        }
        
        // Test trading endpoint
        const tradingResponse = await makeRequest(`${CONFIG.BACKEND_URL}/api/trading/offers`);
        
        if (tradingResponse.statusCode === 401) { // Expected for unauthorized
            log('✅ Trading endpoint responding correctly', 'green');
        } else {
            log(`⚠️  Trading endpoint returned ${tradingResponse.statusCode}`, 'yellow');
        }
        
        return { auth: authResponse.statusCode, trading: tradingResponse.statusCode };
    } catch (error) {
        log(`❌ API connectivity test failed: ${error.message}`, 'red');
        return { error: error.message };
    }
}

async function checkSecurityHeaders() {
    try {
        log('🔍 Checking security headers...', 'blue');
        const response = await makeRequest(`${CONFIG.BACKEND_URL}/health`);
        const headers = response.headers;
        
        const securityHeaders = {
            'x-frame-options': 'X-Frame-Options',
            'x-content-type-options': 'X-Content-Type-Options',
            'x-xss-protection': 'X-XSS-Protection',
            'strict-transport-security': 'Strict-Transport-Security',
            'content-security-policy': 'Content-Security-Policy'
        };
        
        let securityScore = 0;
        const totalHeaders = Object.keys(securityHeaders).length;
        
        for (const [header, name] of Object.entries(securityHeaders)) {
            if (headers[header]) {
                log(`   ✅ ${name}: ${headers[header]}`, 'green');
                securityScore++;
            } else {
                log(`   ❌ ${name}: Missing`, 'red');
            }
        }
        
        const score = (securityScore / totalHeaders) * 100;
        log(`   Security Score: ${score.toFixed(1)}%`, score >= 80 ? 'green' : 'yellow');
        
        return { score, headers: securityHeaders };
    } catch (error) {
        log(`❌ Security headers check failed: ${error.message}`, 'red');
        return { error: error.message };
    }
}

async function checkCORSConfiguration() {
    try {
        log('🔍 Checking CORS configuration...', 'blue');
        const response = await makeRequest(`${CONFIG.BACKEND_URL}/health`, {
            headers: {
                'Origin': CONFIG.FRONTEND_URL,
                'Access-Control-Request-Method': 'GET'
            }
        });
        
        const corsOrigin = response.headers['access-control-allow-origin'];
        const corsMethods = response.headers['access-control-allow-methods'];
        const corsCredentials = response.headers['access-control-allow-credentials'];
        
        if (corsOrigin) {
            log(`   ✅ CORS Origin: ${corsOrigin}`, 'green');
        } else {
            log('   ❌ CORS Origin: Missing', 'red');
        }
        
        if (corsMethods) {
            log(`   ✅ CORS Methods: ${corsMethods}`, 'green');
        } else {
            log('   ⚠️  CORS Methods: Not specified', 'yellow');
        }
        
        if (corsCredentials) {
            log(`   ✅ CORS Credentials: ${corsCredentials}`, 'green');
        } else {
            log('   ⚠️  CORS Credentials: Not specified', 'yellow');
        }
        
        return { origin: corsOrigin, methods: corsMethods, credentials: corsCredentials };
    } catch (error) {
        log(`❌ CORS configuration check failed: ${error.message}`, 'red');
        return { error: error.message };
    }
}

async function main() {
    log('🔍 EnerlectraTrade - Deployment Status Checker', 'bright');
    log('===============================================', 'bright');
    log('');
    
    const startTime = Date.now();
    
    // Run all checks
    const backendStatus = await checkBackendStatus();
    log('');
    
    const frontendStatus = await checkFrontendStatus();
    log('');
    
    const apiConnectivity = await checkAPIConnectivity();
    log('');
    
    const securityHeaders = await checkSecurityHeaders();
    log('');
    
    const corsConfig = await checkCORSConfiguration();
    log('');
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Summary
    log('📊 DEPLOYMENT STATUS SUMMARY', 'bright');
    log('=============================', 'bright');
    
    const backendOnline = backendStatus.status === 'online';
    const frontendOnline = frontendStatus.status === 'online';
    
    log(`Backend: ${backendOnline ? '✅ ONLINE' : '❌ OFFLINE'}`, backendOnline ? 'green' : 'red');
    log(`Frontend: ${frontendOnline ? '✅ ONLINE' : '❌ OFFLINE'}`, frontendOnline ? 'green' : 'red');
    log(`API Connectivity: ${apiConnectivity.error ? '❌ FAILED' : '✅ WORKING'}`, apiConnectivity.error ? 'red' : 'green');
    log(`Security Headers: ${securityHeaders.score >= 80 ? '✅ GOOD' : '⚠️  NEEDS IMPROVEMENT'}`, securityHeaders.score >= 80 ? 'green' : 'yellow');
    log(`CORS Configuration: ${corsConfig.origin ? '✅ CONFIGURED' : '❌ MISSING'}`, corsConfig.origin ? 'green' : 'red');
    
    log('');
    log(`⏱️  Check completed in ${duration}ms`, 'cyan');
    
    // Overall status
    const allOnline = backendOnline && frontendOnline && !apiConnectivity.error && corsConfig.origin;
    
    log('');
    if (allOnline) {
        log('🎉 DEPLOYMENT STATUS: FULLY OPERATIONAL', 'green');
        log('⚡ Your EnerlectraTrade app is ready for users! 🚀', 'bright');
    } else {
        log('⚠️  DEPLOYMENT STATUS: ISSUES DETECTED', 'yellow');
        log('Please check the errors above and resolve them.', 'yellow');
    }
    
    log('');
    log('🔗 Service URLs:', 'bright');
    log(`   Backend: ${CONFIG.BACKEND_URL}`, 'blue');
    log(`   Frontend: ${CONFIG.FRONTEND_URL}`, 'blue');
    log(`   Health Check: ${CONFIG.BACKEND_URL}/health`, 'blue');
    
    log('');
    log('📞 Need help? Check the DEPLOY_NOW.md file for troubleshooting!', 'cyan');
}

// Handle errors
process.on('uncaughtException', (error) => {
    log(`💥 Uncaught Exception: ${error.message}`, 'red');
    process.exit(1);
});

// Run the status check
if (require.main === module) {
    main().catch(error => {
        log(`💥 Status check failed: ${error.message}`, 'red');
        process.exit(1);
    });
}

module.exports = { main, CONFIG };