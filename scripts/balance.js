const { ethers } = require("hardhat");

async function main() {
  // Get provider
  const provider = ethers.provider;
  
  // Get signer
  const signer = (await ethers.getSigners())[0];
  const address = await signer.getAddress();
  
  // Get balance
  const balance = await provider.getBalance(address);
  
  console.log(`Account: ${address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} MATIC`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});