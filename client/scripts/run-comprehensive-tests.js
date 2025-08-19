#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Enerlectra Authentication System
 * This script runs all tests to ensure everything is working properly
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 ENERLECTRA COMPREHENSIVE TEST SUITE');
console.log('=======================================\n');

// Test results tracking
const testResults = {
  frontend: { passed: 0, failed: 0, total: 0 },
  backend: { passed: 0, failed: 0, total: 0 },
  security: { passed: 0, failed: 0, total: 0 },
  integration: { passed: 0, failed: 0, total: 0 }
};

// Colors for output
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

// Run Jest tests with specific pattern
function runJestTests(pattern, testType) {
  return new Promise((resolve, reject) => {
    log(`🧪 Running ${testType} tests...`, 'blue');
    
    const jestProcess = spawn('npx', ['jest', '--testPathPattern', pattern, '--verbose'], {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    
    let output = '';
    let errorOutput = '';
    
    jestProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    jestProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    jestProcess.on('close', (code) => {
      if (code === 0) {
        // Parse Jest output to count tests
        const passedMatch = output.match(/(\d+) passing/);
        const failedMatch = output.match(/(\d+) failing/);
        
        if (passedMatch) testResults[testType].passed = parseInt(passedMatch[1]);
        if (failedMatch) testResults[testType].failed = parseInt(failedMatch[1]);
        
        testResults[testType].total = testResults[testType].passed + testResults[testType].failed;
        
        log(`✅ ${testType} tests completed successfully!`, 'green');
        log(`   Passed: ${testResults[testType].passed}, Failed: ${testResults[testType].failed}`, 'green');
        resolve();
      } else {
        log(`❌ ${testType} tests failed with exit code: ${code}`, 'red');
        log(`Error output: ${errorOutput}`, 'red');
        reject(new Error(`${testType} tests failed`));
      }
    });
    
    jestProcess.on('error', (error) => {
      log(`❌ Failed to run ${testType} tests: ${error.message}`, 'red');
      reject(error);
    });
  });
}

// Run backend security tests
function runSecurityTests() {
  return new Promise((resolve, reject) => {
    log('🔐 Running backend security tests...', 'magenta');
    
    const securityProcess = spawn('node', ['../test-security.js'], {
      stdio: 'pipe',
      cwd: __dirname
    });
    
    let output = '';
    
    securityProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    securityProcess.on('close', (code) => {
      if (code === 0) {
        log('✅ Backend security tests passed!', 'green');
        testResults.security.passed = 1;
        testResults.security.total = 1;
        resolve();
      } else {
        log('❌ Backend security tests failed!', 'red');
        testResults.security.failed = 1;
        testResults.security.total = 1;
        reject(new Error('Security tests failed'));
      }
    });
    
    securityProcess.on('error', (error) => {
      log(`❌ Failed to run security tests: ${error.message}`, 'red');
      reject(error);
    });
  });
}

// Run API tests
function runAPITests() {
  return new Promise((resolve, reject) => {
    log('🌐 Running API integration tests...', 'cyan');
    
    const apiProcess = spawn('node', ['../test/api-tests.js'], {
      stdio: 'pipe',
      cwd: __dirname
    });
    
    let output = '';
    
    apiProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    apiProcess.on('close', (code) => {
      if (code === 0) {
        log('✅ API tests passed!', 'green');
        testResults.backend.passed = 1;
        testResults.backend.total = 1;
        resolve();
      } else {
        log('❌ API tests failed!', 'red');
        testResults.backend.failed = 1;
        testResults.backend.total = 1;
        reject(new Error('API tests failed'));
      }
    });
    
    apiProcess.on('error', (error) => {
      log(`❌ Failed to run API tests: ${error.message}`, 'red');
      reject(error);
    });
  });
}

// Print test results summary
function printResults() {
  console.log('\n📊 COMPREHENSIVE TEST RESULTS');
  console.log('==============================');
  
  const totalTests = Object.values(testResults).reduce((sum, result) => sum + result.total, 0);
  const totalPassed = Object.values(testResults).reduce((sum, result) => sum + result.passed, 0);
  const totalFailed = Object.values(testResults).reduce((sum, result) => sum + result.failed, 0);
  
  Object.entries(testResults).forEach(([testType, result]) => {
    if (result.total > 0) {
      const status = result.failed === 0 ? '✅ PASS' : '❌ FAIL';
      const color = result.failed === 0 ? 'green' : 'red';
      log(`${status} ${testType.toUpperCase()}: ${result.passed}/${result.total}`, color);
    }
  });
  
  console.log('\n📈 OVERALL RESULTS:');
  log(`Total Tests: ${totalTests}`, 'bright');
  log(`Passed: ${totalPassed}`, 'green');
  log(`Failed: ${totalFailed}`, totalFailed > 0 ? 'red' : 'green');
  
  const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
  log(`Success Rate: ${successRate}%`, successRate >= 90 ? 'green' : 'yellow');
  
  if (totalFailed === 0) {
    log('\n🎉 ALL TESTS PASSED! Enerlectra authentication system is working perfectly!', 'green');
  } else {
    log('\n⚠️ Some tests failed. Please review the issues above.', 'yellow');
  }
}

// Main test execution
async function runAllTests() {
  try {
    // 1. Run frontend authentication tests
    await runJestTests('AuthContext|EnhancedLoginModal', 'frontend');
    
    // 2. Run frontend integration tests
    await runJestTests('App|AuthenticationFlow', 'integration');
    
    // 3. Run backend security tests
    await runSecurityTests();
    
    // 4. Run API integration tests
    await runAPITests();
    
    // 5. Print comprehensive results
    printResults();
    
    // Exit with appropriate code
    const totalFailed = Object.values(testResults).reduce((sum, result) => sum + result.failed, 0);
    process.exit(totalFailed > 0 ? 1 : 0);
    
  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    printResults();
    process.exit(1);
  }
}

// Run the comprehensive test suite
runAllTests(); 