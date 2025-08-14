const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying EnerlectraTrade Smart Contracts...");
    
    // Get signers
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    // Deploy Energy Token
    console.log("\n📱 Deploying Energy Token...");
    const EnergyToken = await hre.ethers.getContractFactory("EnergyToken");
    const energyToken = await EnergyToken.deploy();
    await energyToken.waitForDeployment();
    const energyTokenAddress = await energyToken.getAddress();
    console.log("✅ Energy Token deployed to:", energyTokenAddress);
    
    // Deploy Energy Trading
    console.log("\n⚡ Deploying Energy Trading Contract...");
    const EnergyTrading = await hre.ethers.getContractFactory("EnergyTrading");
    const energyTrading = await EnergyTrading.deploy(energyTokenAddress);
    await energyTrading.waitForDeployment();
    const energyTradingAddress = await energyTrading.getAddress();
    console.log("✅ Energy Trading deployed to:", energyTradingAddress);
    
    // Deploy USSD Gateway
    console.log("\n📞 Deploying USSD Gateway...");
    const USSDGateway = await hre.ethers.getContractFactory("USSDGateway");
    const ussdGateway = await USSDGateway.deploy(energyTradingAddress);
    await ussdGateway.waitForDeployment();
    const ussdGatewayAddress = await ussdGateway.getAddress();
    console.log("✅ USSD Gateway deployed to:", ussdGatewayAddress);
    
    // Save deployment addresses
    const deployments = {
        energyToken: energyTokenAddress,
        energyTrading: energyTradingAddress,
        ussdGateway: ussdGatewayAddress,
        network: hre.network.name,
        deployer: deployer.address
    };
    
    console.log("\n📋 Deployment Summary:");
    console.log("======================");
    Object.entries(deployments).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
    });
    
    // Save to file
    const fs = require('fs');
    fs.writeFileSync(
        './deployments.json',
        JSON.stringify(deployments, null, 2)
    );
    
    console.log("\n✅ Deployment completed and saved to deployments.json");
    
    // Initialize with some test data
    console.log("\n🌟 Setting up initial data...");
    
    // Mint some tokens to deployer
    await energyToken.mint(deployer.address, hre.ethers.parseEther("1000"));
    console.log("✅ Minted 1000 tokens to deployer");
    
    // Approve trading contract
    await energyToken.approve(energyTradingAddress, hre.ethers.parseEther("1000"));
    console.log("✅ Approved trading contract");
    
    // Create a sample energy listing
    await energyTrading.createEnergyListing(
        hre.ethers.parseEther("100"), // 100 kWh
        hre.ethers.parseEther("0.1"),  // 0.1 ETH per kWh
        "Solar energy from rooftop panels"
    );
    console.log("✅ Created sample energy listing");
    
    return deployments;
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("❌ Deployment failed:", error);
            process.exit(1);
        });
}

module.exports = main;