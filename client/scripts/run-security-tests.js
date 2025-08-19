#!/usr/bin/env node

/**
 * Script to run backend security tests from the frontend
 * This ensures our frontend authentication works with the secure backend
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🔐 Running Enerlectra Security Tests...\n');

// Run the main security test
const securityTest = spawn('node', ['../test-security.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

securityTest.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Security tests passed! Backend is secure.');
    
    // Run API tests to ensure authentication endpoints work
    console.log('\n🧪 Running API authentication tests...');
    
    const apiTest = spawn('node', ['../test/api-tests.js'], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    apiTest.on('close', (apiCode) => {
      if (apiCode === 0) {
        console.log('\n🎉 All tests passed! Authentication system is working correctly.');
        process.exit(0);
      } else {
        console.log('\n❌ API tests failed. Check authentication endpoints.');
        process.exit(1);
      }
    });
    
  } else {
    console.log('\n❌ Security tests failed. Backend security needs attention.');
    process.exit(1);
  }
});

securityTest.on('error', (error) => {
  console.error('❌ Failed to run security tests:', error.message);
  process.exit(1);
}); 