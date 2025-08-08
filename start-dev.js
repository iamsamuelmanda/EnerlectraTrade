const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting EnerlectraTrade Development Environment...\n');

// Start Hardhat node
console.log('📦 Starting Hardhat blockchain node...');
const hardhatNode = spawn('npx', ['hardhat', 'node'], {
  stdio: 'pipe'
});

// Wait for hardhat to start, then deploy contracts
setTimeout(() => {
  console.log('🔗 Deploying smart contracts...');
  const deploy = spawn('npx', ['hardhat', 'run', 'scripts/deploy.js', '--network', 'localhost'], {
    stdio: 'inherit'
  });
  
  deploy.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Contracts deployed successfully!');
      
      // Start backend
      console.log('🔧 Starting backend server...');
      const backend = spawn('npm', ['run', 'dev:backend'], {
        stdio: 'inherit'
      });
      
      // Start frontend
      console.log('🎨 Starting frontend server...');
      const frontend = spawn('npm', ['run', 'dev:frontend'], {
        stdio: 'inherit',
        cwd: path.join(__dirname, 'client')
      });
      
      console.log('\n✨ Development environment ready!');
      console.log('🌐 Frontend: http://localhost:3000');
      console.log('🔧 Backend: http://localhost:5000');
      console.log('⛓️  Blockchain: http://localhost:8545');
      
      // Cleanup on exit
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down services...');
        hardhatNode.kill();
        backend.kill();
        frontend.kill();
        process.exit();
      });
    }
  });
}, 3000);