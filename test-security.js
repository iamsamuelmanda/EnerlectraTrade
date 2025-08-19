#!/usr/bin/env node

/**
 * Enerlectra Security System Test Runner
 * 
 * This script tests all security components to ensure they're working correctly.
 * Run with: node test-security.js
 */

const { spawn } = require('child_process');
const path = require('path');

// Check if TypeScript is available
function checkTypeScript() {
  return new Promise((resolve) => {
    const tsNodeCheck = spawn('ts-node', ['--version'], { stdio: 'pipe' });
    
    tsNodeCheck.on('error', () => {
      console.log('❌ ts-node not found, attempting to install...');
      resolve(false);
    });
    
    tsNodeCheck.on('close', (code) => {
      if (code === 0) {
        console.log('✅ ts-node is available');
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

// Run security tests
function runSecurityTests() {
  return new Promise((resolve, reject) => {
    const testPath = path.join(__dirname, 'src', 'security', 'securityTest.ts');
    
    console.log('🔐 Running security tests from:', testPath);
    
    const testProcess = spawn('ts-node', [testPath], { 
      stdio: 'inherit',
      cwd: __dirname
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ All security tests completed successfully!');
        resolve();
      } else {
        console.log(`❌ Security tests failed with exit code: ${code}`);
        reject(new Error(`Tests failed with exit code: ${code}`));
      }
    });
    
    testProcess.on('error', (error) => {
      console.error('❌ Failed to run security tests:', error.message);
      reject(error);
    });
  });
}

// Main function
async function main() {
  try {
    console.log('🚀 ENERLECTRA MILITARY-GRADE SECURITY SYSTEM TEST');
    console.log('==================================================\n');
    
    const hasTypeScript = await checkTypeScript();
    
    if (!hasTypeScript) {
      console.log('📦 Installing TypeScript dependencies...');
      const installProcess = spawn('npm', ['install', 'ts-node', 'typescript'], { 
        stdio: 'inherit',
        cwd: __dirname
      });
      
      await new Promise((resolve, reject) => {
        installProcess.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Dependencies installed successfully');
            resolve();
          } else {
            reject(new Error(`Installation failed with exit code: ${code}`));
          }
        });
      });
    }
    
    console.log('\n🔒 Starting comprehensive security tests...\n');
    await runSecurityTests();
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the tests
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
}); 