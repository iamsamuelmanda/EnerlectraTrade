const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("🚀 EnerlectraTrade FREE Services Setup");
console.log("=====================================\n");

const services = {};

async function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

async function setupServices() {
    console.log("📋 I'll help you set up all FREE service accounts step by step.\n");
    console.log("⏱️ This will take about 10 minutes total.\n");
    
    // 1. Polygon Mumbai Testnet
    console.log("🔗 1. POLYGON MUMBAI TESTNET (FREE)");
    console.log("   Visit: https://faucet.polygon.technology/");
    console.log("   Get FREE MATIC tokens daily!\n");
    
    services.privateKey = await askQuestion("   Enter your MetaMask private key (starts with 0x): ");
    
    if (!services.privateKey.startsWith('0x')) {
        services.privateKey = '0x' + services.privateKey;
    }
    
    console.log("   ✅ Private key saved\n");
    
    // 2. Infura
    console.log("🌐 2. INFURA RPC (FREE 100k requests/day)");
    console.log("   Visit: https://infura.io → Create Project → Copy Project ID\n");
    
    services.infuraProjectId = await askQuestion("   Enter Infura Project ID (or press Enter to skip): ");
    
    if (services.infuraProjectId) {
        console.log("   ✅ Infura configured\n");
    } else {
        console.log("   ⏭️ Skipped Infura (you can add later)\n");
    }
    
    // 3. Alchemy (alternative)
    console.log("⚡ 3. ALCHEMY (FREE 300M compute units/month)");
    console.log("   Visit: https://alchemy.com → Create App → Copy API Key\n");
    
    services.alchemyApiKey = await askQuestion("   Enter Alchemy API Key (or press Enter to skip): ");
    
    if (services.alchemyApiKey) {
        console.log("   ✅ Alchemy configured\n");
    } else {
        console.log("   ⏭️ Skipped Alchemy (you can add later)\n");
    }
    
    // 4. MTN Mobile Money
    console.log("📱 4. MTN MOBILE MONEY (FREE Sandbox)");
    console.log("   Visit: https://momodeveloper.mtn.com → Subscribe to Collections\n");
    
    const setupMTN = await askQuestion("   Do you want to set up MTN Mobile Money now? (y/n): ");
    
    if (setupMTN.toLowerCase() === 'y') {
        services.mtnApiKey = await askQuestion("   Enter MTN API Key: ");
        services.mtnApiSecret = await askQuestion("   Enter MTN API Secret: ");
        services.mtnSubscriptionKey = await askQuestion("   Enter MTN Subscription Key: ");
        console.log("   ✅ MTN Mobile Money configured\n");
    } else {
        console.log("   ⏭️ Skipped MTN (you can add later)\n");
    }
    
    // 5. Africa's Talking
    console.log("📞 5. AFRICA'S TALKING (FREE USSD/SMS)");
    console.log("   Visit: https://africastalking.com → Create App → Copy API Key\n");
    
    const setupAT = await askQuestion("   Do you want to set up Africa's Talking now? (y/n): ");
    
    if (setupAT.toLowerCase() === 'y') {
        services.atUsername = await askQuestion("   Enter Username (usually 'sandbox'): ");
        services.atApiKey = await askQuestion("   Enter API Key: ");
        services.atSenderId = await askQuestion("   Enter Sender ID (or press Enter for default): ");
        console.log("   ✅ Africa's Talking configured\n");
    } else {
        console.log("   ⏭️ Skipped Africa's Talking (you can add later)\n");
    }
    
    // 6. Generate additional settings
    console.log("🔐 6. GENERATING SECURITY SETTINGS");
    
    // Generate JWT secret
    services.jwtSecret = generateRandomString(64);
    services.encryptionKey = generateRandomString(32);
    
    console.log("   ✅ JWT Secret generated");
    console.log("   ✅ Encryption Key generated\n");
    
    // 7. Create .env.production file
    createEnvFile();
    
    // 8. Show deployment instructions
    showDeploymentInstructions();
    
    rl.close();
}

function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function createEnvFile() {
    console.log("📝 CREATING ENVIRONMENT FILE");
    
    const envContent = `# EnerlectraTrade FREE Production Environment
# Generated: ${new Date().toISOString()}

NODE_ENV=production
PORT=3001

# Polygon Mumbai Testnet (FREE)
POLYGON_RPC_URL=https://rpc-mumbai.maticvigil.com
POLYGON_CHAIN_ID=80001
PRIVATE_KEY=${services.privateKey}

# RPC Services (FREE tiers)
${services.infuraProjectId ? `INFURA_PROJECT_ID=${services.infuraProjectId}` : '# INFURA_PROJECT_ID=your_infura_project_id'}
${services.infuraProjectId ? `INFURA_RPC_URL=https://polygon-mumbai.infura.io/v3/${services.infuraProjectId}` : '# INFURA_RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_PROJECT_ID'}
${services.alchemyApiKey ? `ALCHEMY_API_KEY=${services.alchemyApiKey}` : '# ALCHEMY_API_KEY=your_alchemy_api_key'}
${services.alchemyApiKey ? `ALCHEMY_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/${services.alchemyApiKey}` : '# ALCHEMY_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_API_KEY'}

# Database (SQLite - FREE)
DATABASE_URL=./data/production.db

# Mobile Money (MTN Sandbox - FREE)
${services.mtnApiKey ? `MTN_MOMO_API_KEY=${services.mtnApiKey}` : '# MTN_MOMO_API_KEY=your_mtn_api_key'}
${services.mtnApiSecret ? `MTN_MOMO_API_SECRET=${services.mtnApiSecret}` : '# MTN_MOMO_API_SECRET=your_mtn_api_secret'}
${services.mtnSubscriptionKey ? `MTN_MOMO_SUBSCRIPTION_KEY=${services.mtnSubscriptionKey}` : '# MTN_MOMO_SUBSCRIPTION_KEY=your_mtn_subscription_key'}
MTN_MOMO_ENVIRONMENT=sandbox
MTN_MOMO_BASE_URL=https://sandbox.momodeveloper.mtn.com

# USSD Gateway (Africa's Talking - FREE tier)
${services.atUsername ? `AFRICAS_TALKING_USERNAME=${services.atUsername}` : '# AFRICAS_TALKING_USERNAME=sandbox'}
${services.atApiKey ? `AFRICAS_TALKING_API_KEY=${services.atApiKey}` : '# AFRICAS_TALKING_API_KEY=your_api_key'}
${services.atSenderId ? `AFRICAS_TALKING_SENDER_ID=${services.atSenderId}` : '# AFRICAS_TALKING_SENDER_ID=your_sender_id'}

# Security
JWT_SECRET=${services.jwtSecret}
ENCRYPTION_KEY=${services.encryptionKey}

# Monitoring (FREE tiers - add when ready)
# SENTRY_DSN=your_sentry_dsn
# LOGTAIL_TOKEN=your_logtail_token

# Analytics (FREE - add when ready)  
# GOOGLE_ANALYTICS_ID=your_ga_id
# MIXPANEL_TOKEN=your_mixpanel_token

# Feature Flags
ENABLE_MOBILE_MONEY=true
ENABLE_USSD=true
ENABLE_ANALYTICS=false
ENABLE_MONITORING=false
`;

    fs.writeFileSync('.env.production', envContent);
    console.log("   ✅ Created .env.production file\n");
}

function showDeploymentInstructions() {
    console.log("🚀 DEPLOYMENT READY!");
    console.log("====================\n");
    
    console.log("📋 What's been set up:");
    console.log(`   ✅ Private key: ${services.privateKey ? 'Configured' : 'Missing'}`);
    console.log(`   ✅ Infura: ${services.infuraProjectId ? 'Configured' : 'Skipped'}`);
    console.log(`   ✅ Alchemy: ${services.alchemyApiKey ? 'Configured' : 'Skipped'}`);
    console.log(`   ✅ MTN MoMo: ${services.mtnApiKey ? 'Configured' : 'Skipped'}`);
    console.log(`   ✅ Africa's Talking: ${services.atApiKey ? 'Configured' : 'Skipped'}`);
    console.log("   ✅ Security keys: Generated");
    console.log("   ✅ Environment file: Created\n");
    
    console.log("🌟 Next Steps:");
    console.log("1. Get FREE MATIC tokens:");
    console.log("   https://faucet.polygon.technology/\n");
    
    console.log("2. Deploy to Vercel (100% FREE):");
    console.log("   npm install -g vercel");
    console.log("   vercel --prod\n");
    
    console.log("3. Test your deployment:");
    console.log("   curl https://your-app.vercel.app/api/health\n");
    
    console.log("4. Set up remaining services:");
    if (!services.infuraProjectId && !services.alchemyApiKey) {
        console.log("   - Infura: https://infura.io");
    }
    if (!services.mtnApiKey) {
        console.log("   - MTN Mobile Money: https://momodeveloper.mtn.com");
    }
    if (!services.atApiKey) {
        console.log("   - Africa's Talking: https://africastalking.com");
    }
    
    console.log("\n💰 Monthly Cost: $0 (FREE tier limits apply)");
    console.log("🎯 Your app is ready for Africa! 🌍");
    
    console.log("\n⚠️ SECURITY WARNING:");
    console.log("   - NEVER commit .env.production to GitHub");
    console.log("   - Add it to your .gitignore file");
    console.log("   - Use GitHub Secrets for CI/CD");
}

// Create .gitignore if it doesn't exist
function ensureGitignore() {
    let gitignoreContent = '';
    
    if (fs.existsSync('.gitignore')) {
        gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
    }
    
    const linesToAdd = [
        '.env.production',
        '.env.local',
        '.env.*.local',
        'data/',
        'logs/',
        '*.log'
    ];
    
    let modified = false;
    linesToAdd.forEach(line => {
        if (!gitignoreContent.includes(line)) {
            gitignoreContent += '\n' + line;
            modified = true;
        }
    });
    
    if (modified) {
        fs.writeFileSync('.gitignore', gitignoreContent.trim() + '\n');
        console.log("   ✅ Updated .gitignore\n");
    }
}

// Start the setup process
console.log("Welcome to EnerlectraTrade FREE Services Setup! 🚀\n");
console.log("I'll help you get:");
console.log("✅ FREE blockchain access (Polygon Mumbai)");
console.log("✅ FREE RPC services (Infura/Alchemy)");
console.log("✅ FREE Mobile Money (MTN sandbox)");
console.log("✅ FREE USSD gateway (Africa's Talking)");
console.log("✅ FREE deployment (Vercel)");
console.log("✅ Production-ready environment\n");

ensureGitignore();
setupServices().catch(console.error);