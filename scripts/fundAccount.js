const { ethers } = require("hardhat");

// Test account with funds on Amoy (only for testing)
const FUNDED_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

async function main() {
  // Get network provider
  const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
  
  // Create wallet from private key
  const fundedWallet = new ethers.Wallet(FUNDED_PRIVATE_KEY, provider);
  
  // Your address
  const yourAddress = "0x6A6Ffcdae63E3aFb0298D390B02f5C0f5b761e8d";
  
  // Send 1 MATIC
  const tx = await fundedWallet.sendTransaction({
    to: yourAddress,
    value: ethers.parseEther("1.0")
  });
  
  console.log(`Transaction sent: https://amoy.polygonscan.com/tx/${tx.hash}`);
  await tx.wait();
  console.log("Transaction confirmed. You should have 1 MATIC now!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});