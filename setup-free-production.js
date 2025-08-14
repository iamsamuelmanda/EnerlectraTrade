// setup-free-production.js
// Run this script to set up your FREE production-ready environment

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up FREE Production-Ready EnerlectraTrade...\n');

// 1. Create proper .gitignore
const gitignore = `# Dependencies
node_modules/
client/node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.production
.env.development

# Build outputs
dist/
build/
client/dist/
client/build/

# Database
data/*.db
*.sqlite
*.sqlite3

# Blockchain artifacts
artifacts/
cache/
typechain/

# Logs
logs/
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Hardhat
coverage/
coverage.json
gasReporterOutput.json

# Temporary files
*.tmp
*.temp`;

fs.writeFileSync('.gitignore', gitignore);
console.log('✅ Created comprehensive .gitignore');

// 2. Create FREE production environment
const freeProductionEnv = `# FREE PRODUCTION ENVIRONMENT
NODE_ENV=production
PORT=5000

# Database (SQLite - FREE)
DATABASE_TYPE=sqlite
DATABASE_URL=./data/enerlectra_prod.db

# Blockchain (Polygon Mumbai Testnet - FREE)
POLYGON_NETWORK=mumbai
POLYGON_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_ALCHEMY_KEY_HERE
MUMBAI_RPC_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_ALCHEMY_KEY_HERE

# Testnet Wallet (FREE - get MATIC from faucet)
# Generate a new wallet and paste private key here
TESTNET_PRIVATE_KEY=

# Security (generate these)
JWT_SECRET=${require('crypto').randomBytes(32).toString('hex')}
API_KEY=${require('crypto').randomBytes(24).toString('hex')}
SESSION_SECRET=${require('crypto').randomBytes(32).toString('hex')}

# Application Settings
KWH_TO_ZMW_RATE=1.2
CARBON_SAVINGS_PER_KWH=0.8

# INSTRUCTIONS:
# 1. Replace YOUR_ALCHEMY_KEY_HERE with your actual Alchemy API key
# 2. Generate a new wallet and paste the private key for TESTNET_PRIVATE_KEY
# 3. Get free MATIC from: https://faucet.polygon.technology/`;

fs.writeFileSync('.env.production', freeProductionEnv);
console.log('✅ Created FREE production environment template');

// 3. Update package.json with proper scripts
const packageJsonPath = 'package.json';
let packageJson;

try {
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
} catch (error) {
  console.log('❌ Could not read package.json');
  process.exit(1);
}

// Update scripts
packageJson.scripts = {
  ...packageJson.scripts,
  "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\" \"npm run dev:blockchain\"",
  "dev:backend": "nodemon --exec ts-node src/index.ts",
  "dev:frontend": "cd client && npm run dev",
  "dev:blockchain": "npx hardhat node",
  "build": "tsc && cd client && npm run build",
  "build:frontend": "cd client && npm run build",
  "build:backend": "tsc",
  "start": "node dist/index.js",
  "start:dev": "node start-dev.js",
  "blockchain:local": "npx hardhat node",
  "blockchain:deploy:local": "npx hardhat run scripts/deploy.js --network localhost",
  "blockchain:deploy:testnet": "npx hardhat run scripts/deploy.js --network mumbai",
  "blockchain:compile": "npx hardhat compile",
  "test": "npx hardhat test",
  "test:frontend": "cd client && npm run test",
  "docker:dev": "docker-compose up --build",
  "setup:free-prod": "node setup-free-production.js",
  "deploy:free": "npm run build && echo 'Ready for FREE deployment to Vercel/Railway!'",
  "faucet:info": "echo 'Get FREE testnet MATIC: https://faucet.polygon.technology/'"
};

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('✅ Updated package.json with development and FREE production scripts');

// 4. Create start-dev.js script
const startDevScript = `const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting EnerlectraTrade FREE Development Environment...\\n');

let processes = [];

// Function to create a process
function createProcess(name, command, args, options = {}) {
  console.log(\`📦 Starting \${name}...\`);
  const proc = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    ...options
  });
  
  proc.on('error', (error) => {
    console.log(\`❌ \${name} failed to start:\`, error.message);
  });
  
  processes.push({ name, process: proc });
  return proc;
}

// Start services
setTimeout(() => {
  // Start Hardhat node
  createProcess('Hardhat Blockchain', 'npx', ['hardhat', 'node']);
  
  // Wait a bit, then deploy contracts
  setTimeout(() => {
    console.log('🔗 Deploying smart contracts...');
    const deploy = spawn('npx', ['hardhat', 'run', 'scripts/deploy.js', '--network', 'localhost'], {
      stdio: 'inherit',
      shell: true
    });
    
    deploy.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Contracts deployed successfully!');
        
        // Start backend and frontend
        createProcess('Backend Server', 'npm', ['run', 'dev:backend']);
        createProcess('Frontend Server', 'npm', ['run', 'dev:frontend'], {
          cwd: path.join(__dirname, 'client')
        });
        
        setTimeout(() => {
          console.log('\\n✨ FREE Development Environment Ready!');
          console.log('🌐 Frontend: http://localhost:3000');
          console.log('🔧 Backend: http://localhost:5000');
          console.log('⛓️  Blockchain: http://localhost:8545');
          console.log('💰 Cost: $0 (completely FREE!)\\n');
          console.log('Press Ctrl+C to stop all services');
        }, 2000);
      }
    });
  }, 3000);
}, 1000);

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down all services...');
  processes.forEach(({ name, process }) => {
    console.log(\`Stopping \${name}...\`);
    process.kill('SIGTERM');
  });
  
  setTimeout(() => {
    processes.forEach(({ process }) => {
      try {
        process.kill('SIGKILL');
      } catch (e) {
        // Process already dead
      }
    });
    console.log('✅ All services stopped. Goodbye!');
    process.exit(0);
  }, 2000);
});

// Keep the script running
process.stdin.resume();`;

fs.writeFileSync('start-dev.js', startDevScript);
console.log('✅ Created start-dev.js for one-command development');

// 5. Create deployment-ready configuration
const deploymentConfig = {
  vercel: {
    name: "enerlectra-frontend",
    version: 2,
    builds: [
      {
        src: "client/dist/**",
        use: "@vercel/static"
      }
    ],
    routes: [
      {
        src: "/(.*)",
        dest: "/client/dist/$1"
      }
    ]
  },
  railway: {
    deploy: {
      startCommand: "npm run start",
      buildCommand: "npm run build"
    }
  }
};

fs.writeFileSync('vercel.json', JSON.stringify(deploymentConfig.vercel, null, 2));
console.log('✅ Created Vercel deployment configuration');

// 6. Create README for FREE setup
const freeSetupReadme = `# EnerlectraTrade - FREE Production Setup

## 🆓 COMPLETELY FREE DEPLOYMENT

This setup gives you a production-ready environment for $0/month!

### Quick Start (FREE)
\`\`\`bash
# 1. Setup FREE production environment
npm run setup:free-prod

# 2. Start development (all services)
npm run start:dev

# 3. Get FREE testnet MATIC
npm run faucet:info
\`\`\`

### Deployment (FREE)
1. **Frontend**: Deploy to Vercel (free)
2. **Backend**: Deploy to Railway (free tier)
3. **Database**: SQLite file (free)
4. **Blockchain**: Mumbai testnet (free)

### Upgrade Path (When Ready)
- Switch Mumbai → Polygon Mainnet (~$1)
- SQLite → PostgreSQL (~$10/month)
- Free tiers → Pro plans (~$15/month)

### Development URLs
- Frontend: http://localhost:3000
- Backend: http://localhost:5000  
- Blockchain: http://localhost:8545

### FREE Production URLs (after deployment)
- Frontend: https://enerlectra.vercel.app
- Backend: https://enerlectra-api.railway.app
- Blockchain: Mumbai testnet (same contracts as mainnet!)
`;

fs.writeFileSync('FREE_SETUP.md', freeSetupReadme);
console.log('✅ Created FREE_SETUP.md guide');

console.log('\n🎉 FREE Production Setup Complete!');
console.log('\n📋 NEXT STEPS:');
console.log('1. Wait for git add to complete');
console.log('2. Run: git commit -m "Setup FREE production environment"');
console.log('3. Run: git push origin main');
console.log('4. Run: npm run start:dev');
console.log('5. Visit https://faucet.polygon.technology/ for FREE testnet MATIC');
console.log('\n💡 Total monthly cost: $0 until you want to upgrade!');