// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EnergyToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract EnergyTrading {
    EnergyToken public energyToken;
    address public owner;
    
    struct Trade {
        address seller;
        address buyer;
        uint256 kWh;
        uint256 pricePerkWh;
        bool completed;
    }
    
    mapping(uint256 => Trade) public trades;
    uint256 public tradeCounter;
    
    event TradeCreated(uint256 tradeId, address seller, uint256 kWh, uint256 pricePerkWh);
    event TradeCompleted(uint256 tradeId, address buyer);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    constructor(address _energyTokenAddress) {
        energyToken = EnergyToken(_energyTokenAddress);
        owner = msg.sender;
        tradeCounter = 1;
    }
    
    function createTrade(uint256 kWh, uint256 pricePerkWh) external {
        require(kWh > 0, "Energy amount must be positive");
        require(pricePerkWh > 0, "Price must be positive");
        
        // Transfer tokens to escrow
        uint256 tokenAmount = kWh * (10 ** energyToken.decimals());
        require(
            energyToken.transferFrom(msg.sender, address(this), tokenAmount),
            "Token transfer failed"
        );
        
        trades[tradeCounter] = Trade({
            seller: msg.sender,
            buyer: address(0),
            kWh: kWh,
            pricePerkWh: pricePerkWh,
            completed: false
        });
        
        emit TradeCreated(tradeCounter, msg.sender, kWh, pricePerkWh);
        tradeCounter++;
    }
    
    function executeTrade(uint256 tradeId) external payable {
        Trade storage trade = trades[tradeId];
        require(!trade.completed, "Trade already completed");
        require(trade.buyer == address(0), "Trade already has a buyer");
        
        uint256 totalPrice = trade.kWh * trade.pricePerkWh;
        require(msg.value == totalPrice, "Incorrect payment amount");
        
        // Transfer payment to seller
        payable(trade.seller).transfer(totalPrice);
        
        // Transfer tokens to buyer
        uint256 tokenAmount = trade.kWh * (10 ** energyToken.decimals());
        require(
            energyToken.transfer(msg.sender, tokenAmount),
            "Token transfer to buyer failed"
        );
        
        trade.buyer = msg.sender;
        trade.completed = true;
        
        emit TradeCompleted(tradeId, msg.sender);
    }
    
    // Admin function to handle disputes
    function resolveDispute(uint256 tradeId, address resolutionTo) external onlyOwner {
        Trade storage trade = trades[tradeId];
        require(!trade.completed, "Trade already completed");
        
        uint256 tokenAmount = trade.kWh * (10 ** energyToken.decimals());
        require(
            energyToken.transfer(resolutionTo, tokenAmount),
            "Dispute resolution transfer failed"
        );
        trade.completed = true;
    }
    
    // Emergency withdrawal function
    function withdrawStuckTokens(address tokenAddress) external onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        token.transfer(owner, balance);
    }
}