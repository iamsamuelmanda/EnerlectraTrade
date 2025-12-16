const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting Phase 1 Deployment: Security & Governance...");

  // --- ADDRESS CONFIGURATION (Polygon Amoy Testnet Values) ---
  // Using getAddress() to ensure proper checksum
  const PAYMENT_TOKEN_ADDR = hre.ethers.getAddress("0x5242c2d67b809e8b64e6f987622877e97f1d64e0"); // Mock ERC20 Token (Payment Token)
  const PRICE_FEED_ADDR = hre.ethers.getAddress("0x0715a7794a1dd557bfc2a87fa6cfa9d2ddedf7a0");    // Chainlink MATIC/USD Price Feed
  // -----------------------------------------------------------

  // 1. Get Signers and Addresses
  const signers = await hre.ethers.getSigners();
  
  if (!signers || signers.length === 0) {
    throw new Error("❌ No signers found. Check your hardhat.config.cjs and .env PRIVATE_KEY");
  }
  
  const deployer = signers[0];
  const deployerAddress = await deployer.getAddress();
  
  const GOVERNANCE_ADDRESS = process.env.MULTI_SIG_ADDRESS;
  const BACKEND_WALLET_ADDRESS = process.env.BACKEND_WALLET_ADDRESS;
  
  if (!GOVERNANCE_ADDRESS || !BACKEND_WALLET_ADDRESS) {
    throw new Error("❌ Missing MULTI_SIG_ADDRESS or BACKEND_WALLET_ADDRESS in .env");
  }

  const governanceAddress = GOVERNANCE_ADDRESS;
  const backendWalletAddress = BACKEND_WALLET_ADDRESS;
  // Fee collector can be the deployer initially, or governance
  const feeCollectorAddress = deployerAddress;

  console.log(`Node: Deploying with account: ${deployerAddress}`);
  console.log(`Node: Governance (Multi-Sig) will be: ${governanceAddress}`);
  console.log(`Node: IOT Backend (Minter) will be: ${backendWalletAddress}`);
  console.log(`Node: Fee Collector will be: ${feeCollectorAddress}`);

  // ====================================================
  // STEP 1: DEPLOY ENERGY TOKEN
  // ====================================================
  console.log("\n📦 Deploying EnergyToken...");
  const EnergyToken = await hre.ethers.getContractFactory("EnergyToken");
  const energyToken = await EnergyToken.deploy(governanceAddress);
  await energyToken.waitForDeployment();
  const energyTokenAddress = await energyToken.getAddress();
  console.log(`✅ EnergyToken deployed to: ${energyTokenAddress}`);

  // ====================================================
  // STEP 2: DEPLOY ENERGY TRADING
  // ====================================================
  console.log("\n📦 Deploying EnergyTrading...");
  const EnergyTrading = await hre.ethers.getContractFactory("EnergyTrading");
  // Constructor: _energyToken, _paymentToken, _priceFeed, _feeCollector, _governanceAddress
  const energyTrading = await EnergyTrading.deploy(
    energyTokenAddress,
    PAYMENT_TOKEN_ADDR,
    PRICE_FEED_ADDR,
    feeCollectorAddress,  // Added missing fee collector parameter
    governanceAddress
  );
  await energyTrading.waitForDeployment();
  const energyTradingAddress = await energyTrading.getAddress();
  console.log(`✅ EnergyTrading deployed to: ${energyTradingAddress}`);

  // ====================================================
  // STEP 3: CONFIGURE ROLES (Automation Enablement)
  // ====================================================
  console.log("\n⚙️ Configuring Roles...");

  // 3a. Grant MINTER_ROLE to the Backend Wallet (IOT Processor)
  const MINTER_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("MINTER_ROLE"));
  
  console.log(`   Granting MINTER_ROLE to Backend Wallet (${backendWalletAddress})...`);
  const tx1 = await energyToken.grantRole(MINTER_ROLE, backendWalletAddress);
  await tx1.wait();
  console.log("   ✅ Backend Wallet can now mint tokens from IOT data.");

  // 3b. Verify Governance Roles
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const hasAdmin = await energyToken.hasRole(DEFAULT_ADMIN_ROLE, governanceAddress);
  console.log(`   Verifying Multi-Sig Admin Access: ${hasAdmin ? "✅ Active" : "❌ Failed"}`);

  // ====================================================
  // STEP 4: FINAL SUMMARY
  // ====================================================
  
  console.log("\n" + "=".repeat(60));
  console.log("📜 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`EnergyToken:     ${energyTokenAddress}`);
  console.log(`EnergyTrading:   ${energyTradingAddress}`);
  console.log(`Admin:           ${governanceAddress} (Multi-Sig)`);
  console.log(`Minter:          ${backendWalletAddress} (IOT Backend)`);
  console.log(`Fee Collector:   ${feeCollectorAddress}`);
  console.log("=".repeat(60));
  console.log("\n✅ Phase 1 Deployment Complete!\n");
  
  console.log("📝 Next Steps:");
  console.log("   1. Verify contracts on PolygonScan");
  console.log("   2. Test minting tokens from backend");
  console.log("   3. Create test offers and trades");
  console.log("   4. Transfer admin rights if needed\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });