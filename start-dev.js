const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting EnerlectraTrade FREE Development Environment...\n');

let processes = [];

// Function to create a process
function createProcess(name, command, args, options = {}) {
  console.log(`📦 Starting ${name}...`);
  const proc = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    ...options
  });
  
  proc.on('error', (error) => {
    console.log(`❌ ${name} failed to start:`, error.message);
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
          console.log('\n✨ FREE Development Environment Ready!');
          console.log('🌐 Frontend: http://localhost:3000');
          console.log('🔧 Backend: http://localhost:5000');
          console.log('⛓️  Blockchain: http://localhost:8545');
          console.log('💰 Cost: $0 (completely FREE!)\n');
          console.log('Press Ctrl+C to stop all services');
        }, 2000);
      }
    });
  }, 3000);
}, 1000);

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down all services...');
  processes.forEach(({ name, process }) => {
    console.log(`Stopping ${name}...`);
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
process.stdin.resume();