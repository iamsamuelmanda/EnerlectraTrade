#!/usr/bin/env node

/**
 * 🚀 EnerlectraTrade - Render Deployment Automation Script
 * 
 * This script helps automate the deployment process to Render.com
 * Run this script to get step-by-step deployment instructions
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 EnerlectraTrade - Render Deployment Automation');
console.log('================================================\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
    console.error('❌ Error: package.json not found. Please run this script from the project root.');
    process.exit(1);
}

// Check if dist directory exists and is built
if (!fs.existsSync('dist/clean-index.js')) {
    console.log('📦 Building backend...');
    const { execSync } = require('child_process');
    try {
        execSync('npm run build:backend', { stdio: 'inherit' });
        console.log('✅ Backend built successfully!\n');
    } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
    }
}

// Check git status
try {
    const { execSync } = require('child_process');
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    
    if (gitStatus.trim()) {
        console.log('⚠️  Warning: You have uncommitted changes:');
        console.log(gitStatus);
        console.log('Please commit your changes before deploying.\n');
    } else {
        console.log('✅ Git repository is clean\n');
    }
} catch (error) {
    console.log('⚠️  Could not check git status\n');
}

// Display deployment instructions
console.log('🎯 DEPLOYMENT INSTRUCTIONS:');
console.log('===========================\n');

console.log('1️⃣  Go to Render Dashboard:');
console.log('   https://dashboard.render.com\n');

console.log('2️⃣  Create New Web Service:');
console.log('   - Click "New +" → "Web Service"');
console.log('   - Connect to GitHub repository: iamsamuelmanda/EnerlectraTrade');
console.log('   - Branch: main\n');

console.log('3️⃣  Configure Service:');
console.log('   - Name: enerlectra-backend');
console.log('   - Environment: Node');
console.log('   - Build Command: npm install && npm run build:backend');
console.log('   - Start Command: npm start\n');

console.log('4️⃣  Set Environment Variables:');
console.log('   NODE_ENV=production');
console.log('   PORT=10000');
console.log('   JWT_SECRET=[Render will auto-generate]');
console.log('   CORS_ORIGINS=https://enerlectra-frontend-c406365od-samuel-mandas-projects.vercel.app,http://localhost:3000\n');

console.log('5️⃣  Deploy:');
console.log('   - Click "Create Web Service"');
console.log('   - Wait 5-10 minutes for build');
console.log('   - Copy the generated URL\n');

console.log('6️⃣  Update Frontend Environment Variables:');
console.log('   - Go to Vercel Dashboard');
console.log('   - Settings → Environment Variables');
console.log('   - Add VITE_API_URL with your Render backend URL');
console.log('   - Redeploy frontend\n');

console.log('7️⃣  Test Production:');
console.log('   - Test backend health: curl https://your-backend-url.onrender.com/health');
console.log('   - Test frontend: https://enerlectra-frontend-c406365od-samuel-mandas-projects.vercel.app\n');

console.log('🎉 SUCCESS! Your EnerlectraTrade app will be live!');
console.log('⚡ Powering Africa\'s energy future together! 🚀\n');

// Check if render.yaml exists
if (fs.existsSync('render.yaml')) {
    console.log('✅ render.yaml configuration file found');
    console.log('   This will help with automatic deployment configuration\n');
} else {
    console.log('⚠️  render.yaml not found - you may need to configure manually\n');
}

// Display current project info
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log('📋 Project Information:');
console.log(`   Name: ${packageJson.name}`);
console.log(`   Version: ${packageJson.version}`);
console.log(`   Description: ${packageJson.description}`);
console.log(`   Repository: ${packageJson.repository?.url || 'Not specified'}\n`);

console.log('🔗 Quick Links:');
console.log('   Frontend: https://enerlectra-frontend-c406365od-samuel-mandas-projects.vercel.app');
console.log('   GitHub: https://github.com/iamsamuelmanda/EnerlectraTrade');
console.log('   Vercel: https://vercel.com/dashboard');
console.log('   Render: https://dashboard.render.com\n');

console.log('📞 Need help? Check the DEPLOY_NOW.md file for detailed instructions!');