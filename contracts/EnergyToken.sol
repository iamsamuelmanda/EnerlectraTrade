// contracts/EnergyToken.sol (UPDATED FOR OPENZEPPELIN V5)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Updated imports for OpenZeppelin v5.x (using standard import paths)
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract EnergyToken is ERC20, AccessControl {
    
    // Define the Minter Role (controlled by Multi-Sig Governance or Authorized IOT Bridge)
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    mapping(address => uint256) private _lockedTokens;

    event TokensLocked(address indexed account, uint256 amount);
    event TokensUnlocked(address indexed account, uint256 amount);
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);

    constructor(address _governanceAddress) ERC20("Enerlectra Energy Token", "kWh") {
        require(_governanceAddress != address(0), "Governance address cannot be zero");

        // Grant Admin and Minter roles to the Governance Multi-Sig
        _grantRole(DEFAULT_ADMIN_ROLE, _governanceAddress);
        _grantRole(MINTER_ROLE, _governanceAddress);

        // Grant Admin to deployer temporarily for setup (can be renounced later)
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        // Initial supply: 1 million tokens (18 decimals) to the Governance/Deployer
        _mint(msg.sender, 1_000_000 * 10**decimals());
    }

    // Mint new tokens (only authorized minters, e.g., IoT bridge or governance)
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "Cannot mint to zero address");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    // Burn tokens from an account
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    // Lock tokens for trading (called by EnergyTrading contract)
    function lockTokens(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        require(balanceOf(msg.sender) - _lockedTokens[msg.sender] >= amount, "Insufficient unlocked balance");
        
        _lockedTokens[msg.sender] += amount;
        emit TokensLocked(msg.sender, amount);
    }

    // Unlock tokens after trade completion or cancellation
    function unlockTokens(uint256 amount) external {
        require(_lockedTokens[msg.sender] >= amount, "Insufficient locked balance");
        
        _lockedTokens[msg.sender] -= amount;
        emit TokensUnlocked(msg.sender, amount);
    }

    // Override transfer to respect locked tokens
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        require(balanceOf(msg.sender) - _lockedTokens[msg.sender] >= amount, "Transfer amount exceeds unlocked balance");
        return super.transfer(to, amount);
    }

    // Override transferFrom to respect locked tokens
    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        require(balanceOf(from) - _lockedTokens[from] >= amount, "Transfer amount exceeds unlocked balance");
        return super.transferFrom(from, to, amount);
    }

    // View function to get locked token balance
    function getLockedTokens(address account) external view returns (uint256) {
        return _lockedTokens[account];
    }

    // View function to get available (unlocked) balance
    function getAvailableBalance(address account) external view returns (uint256) {
        return balanceOf(account) - _lockedTokens[account];
    }
}