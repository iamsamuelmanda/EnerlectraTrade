// hardhat.config.cjs
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type {import('hardhat/config').HardhatUserConfig} */
const config = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            },
        }
    },
    networks: {
        polygonAmoy: {
            url: process.env.BLOCKCHAIN_NODE_URL_AMOY || "https://rpc-amoy.polygon.technology",
            accounts: process.env.BLOCKCHAIN_PRIVATE_KEY_AMOY ? [process.env.BLOCKCHAIN_PRIVATE_KEY_AMOY] : [],
            chainId: 80002,
            gas: "auto",
            gasPrice: "auto",
            timeout: 60000
        },
        hardhat: {
            chainId: 1337,
        }
    },
    etherscan: {
        apiKey: process.env.POLYGONSCAN_API_KEY,
        customChains: [
            {
                network: "polygon-amoy",
                chainId: 80002,
                urls: {
                    apiURL: "https://api-amoy.polygonscan.com/api",
                    browserURL: "https://amoy.polygonscan.com"
                }
            }
        ]
    }
};

module.exports = config;