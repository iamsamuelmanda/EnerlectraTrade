const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Get signer from config
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  // Deploy EnergyToken
  const EnergyToken = await hre.ethers.getContractFactory("EnergyToken");
  const energyToken = await EnergyToken.deploy();
  await energyToken.waitForDeployment();
  const tokenAddress = await energyToken.getAddress();
  console.log("EnergyToken deployed to:", tokenAddress);

  // Deploy EnergyTrading
  const EnergyTrading = await hre.ethers.getContractFactory("EnergyTrading");
  const energyTrading = await EnergyTrading.deploy(tokenAddress);
  await energyTrading.waitForDeployment();
  const tradingAddress = await energyTrading.getAddress();
  console.log("EnergyTrading deployed to:", tradingAddress);

  // Update .env file
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  
  // Remove old contract addresses
  envContent = envContent.replace(/ENERGY_TOKEN_CONTRACT=.*\n/g, '');
  envContent = envContent.replace(/TRADING_CONTRACT=.*\n/g, '');
  
  // Add new contract addresses
  envContent += `ENERGY_TOKEN_CONTRACT=${tokenAddress}\n`;
  envContent += `TRADING_CONTRACT=${tradingAddress}\n`;
  
  fs.writeFileSync(envPath, envContent);
  console.log("Contracts addresses saved to .env file");
  
  // Verify deployment
  console.log("Deployment complete!");
  console.log("Token Contract:", tokenAddress);
  console.log("Trading Contract:", tradingAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });