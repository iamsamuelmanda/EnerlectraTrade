// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EnergyToken is ERC20, Ownable {
    mapping(address => uint256) private _lockedTokens;

    constructor() ERC20("Enerlectra Energy Token", "kWh") Ownable(msg.sender) {
        // Initial supply: 1 million tokens (18 decimals)
        _mint(msg.sender, 1_000_000 * 10**decimals());
    }

    function mint(address to, uint256 kWh) external onlyOwner {
        _mint(to, kWh * 10**decimals()); // Assumes 18 decimals for precision
    }

    function burn(uint256 kWh) external {
        _burn(msg.sender, kWh * 10**decimals());
    }

    function lockTokens(uint256 kWh) external {
        uint256 amount = kWh * 10**decimals();
        require(balanceOf(msg.sender) >= amount + _lockedTokens[msg.sender], "Insufficient balance");
        _lockedTokens[msg.sender] += amount;
    }

    function unlockTokens(uint256 kWh) external {
        uint256 amount = kWh * 10**decimals();
        require(_lockedTokens[msg.sender] >= amount, "Insufficient locked tokens");
        _lockedTokens[msg.sender] -= amount;
    }

    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        require(amount <= balanceOf(msg.sender) - _lockedTokens[msg.sender], "Locked tokens cannot be transferred");
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        require(amount <= balanceOf(from) - _lockedTokens[from], "Locked tokens cannot be transferred");
        return super.transferFrom(from, to, amount);
    }

    function getLockedTokens(address user) external view returns (uint256) {
        return _lockedTokens[user];
    }
}