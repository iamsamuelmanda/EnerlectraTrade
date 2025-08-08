// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EnergyToken is ERC20, Ownable {
    constructor() ERC20("Enerlectra Energy Token", "kWh") Ownable(msg.sender) {
        // Initial supply: 1 million tokens
        _mint(msg.sender, 1_000_000 * (10 ** decimals()));
    }

    function mint(address to, uint256 kWh) external onlyOwner {
        _mint(to, kWh * (10 ** decimals()));
    }
}