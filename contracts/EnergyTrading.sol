// contracts/EnergyTrading.sol (UPDATED FOR OPENZEPPELIN V5)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Updated imports for OpenZeppelin v5.x (no more Counters!)
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// Chainlink Price Feed Interface (included directly to avoid import issues)
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function version() external view returns (uint256);
    function getRoundData(uint80 _roundId) external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

// Interface to interact with EnergyToken custom functions
interface IEnergyToken is IERC20 {
    function lockTokens(uint256 amount) external;
    function unlockTokens(uint256 amount) external;
}

contract EnergyTrading is AccessControl, ReentrancyGuard, Pausable {
    
    // REPLACED: Using uint256 instead of Counters (more gas efficient in v5)
    uint256 private _offerIdCounter;
    uint256 private _tradeIdCounter;

    // GOVERNANCE ROLE definition for Multi-Sig control
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    // Token contracts
    IEnergyToken public energyToken;
    IERC20 public paymentToken;
    AggregatorV3Interface public priceFeed;

    // Trading structures
    struct EnergyOffer {
        uint256 offerId;
        address seller;
        uint256 energyAmount;
        uint256 pricePerKwh;
        uint256 totalPrice;
        uint256 expiresAt;
        bool isActive;
        bool isHybrid;
        string mobileMoneyReference;
    }

    struct Trade {
        uint256 tradeId;
        uint256 offerId;
        address buyer;
        address seller;
        uint256 energyAmount;
        uint256 totalPrice;
        uint256 timestamp;
        TradeStatus status;
        string mobileMoneyReference;
    }

    struct UserProfile {
        uint256 totalEnergyTraded;
        uint256 totalSpent;
        uint256 totalEarned;
        uint256 successfulTrades;
        uint256 reputationScore;
    }

    enum TradeStatus { Pending, Completed, Cancelled, Disputed }

    // State variables
    mapping(uint256 => EnergyOffer) public offers;
    mapping(uint256 => Trade) public trades;
    mapping(address => UserProfile) public userProfiles;
    mapping(address => uint256[]) public userOffers;
    mapping(address => uint256[]) public userTrades;

    // Fee structure
    uint256 public platformFeePercent = 2; // 2% platform fee
    uint256 public constant FEE_DENOMINATOR = 100;
    address public feeCollector;

    // Events
    event OfferCreated(uint256 indexed offerId, address indexed seller, uint256 energyAmount, uint256 pricePerKwh);
    event OfferCancelled(uint256 indexed offerId, address indexed seller);
    event TradeExecuted(uint256 indexed tradeId, uint256 indexed offerId, address indexed buyer, address seller, uint256 energyAmount, uint256 totalPrice);
    event TradeCompleted(uint256 indexed tradeId);
    event TradeCancelled(uint256 indexed tradeId);
    event FeeUpdated(uint256 newFeePercent);

    constructor(
        address _energyToken,
        address _paymentToken,
        address _priceFeed,
        address _feeCollector,
        address _governanceAddress
    ) {
        require(_energyToken != address(0), "Invalid energy token");
        require(_paymentToken != address(0), "Invalid payment token");
        require(_priceFeed != address(0), "Invalid price feed");
        require(_feeCollector != address(0), "Invalid fee collector");
        require(_governanceAddress != address(0), "Invalid governance address");

        energyToken = IEnergyToken(_energyToken);
        paymentToken = IERC20(_paymentToken);
        priceFeed = AggregatorV3Interface(_priceFeed);
        feeCollector = _feeCollector;

        _grantRole(DEFAULT_ADMIN_ROLE, _governanceAddress);
        _grantRole(GOVERNANCE_ROLE, _governanceAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // --- GOVERNANCE FUNCTIONS ---
    function pause() external onlyRole(GOVERNANCE_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(GOVERNANCE_ROLE) {
        _unpause();
    }

    function updateFee(uint256 _newFeePercent) external onlyRole(GOVERNANCE_ROLE) {
        require(_newFeePercent <= 10, "Fee too high"); // Max 10%
        platformFeePercent = _newFeePercent;
        emit FeeUpdated(_newFeePercent);
    }

    // --- CORE TRADING FUNCTIONS ---
    
    function createOffer(
        uint256 _energyAmount,
        uint256 _pricePerKwh,
        uint256 _expiresAt,
        bool _isHybrid,
        string memory _mobileMoneyReference
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(_energyAmount > 0, "Invalid energy amount");
        require(_pricePerKwh > 0, "Invalid price");
        require(_expiresAt > block.timestamp, "Invalid expiry");

        // Lock seller's energy tokens
        energyToken.lockTokens(_energyAmount);

        uint256 offerId = ++_offerIdCounter;
        uint256 totalPrice = (_energyAmount * _pricePerKwh) / 1e18;

        offers[offerId] = EnergyOffer({
            offerId: offerId,
            seller: msg.sender,
            energyAmount: _energyAmount,
            pricePerKwh: _pricePerKwh,
            totalPrice: totalPrice,
            expiresAt: _expiresAt,
            isActive: true,
            isHybrid: _isHybrid,
            mobileMoneyReference: _mobileMoneyReference
        });

        userOffers[msg.sender].push(offerId);

        emit OfferCreated(offerId, msg.sender, _energyAmount, _pricePerKwh);
        return offerId;
    }

    function cancelOffer(uint256 _offerId) external nonReentrant {
        EnergyOffer storage offer = offers[_offerId];
        require(offer.seller == msg.sender, "Not offer owner");
        require(offer.isActive, "Offer not active");

        offer.isActive = false;
        
        // Unlock seller's tokens
        energyToken.unlockTokens(offer.energyAmount);

        emit OfferCancelled(_offerId, msg.sender);
    }

    function acceptOffer(uint256 _offerId) external whenNotPaused nonReentrant returns (uint256) {
        EnergyOffer storage offer = offers[_offerId];
        require(offer.isActive, "Offer not active");
        require(block.timestamp < offer.expiresAt, "Offer expired");
        require(msg.sender != offer.seller, "Cannot buy own offer");

        // Calculate fees
        uint256 platformFee = (offer.totalPrice * platformFeePercent) / FEE_DENOMINATOR;
        uint256 sellerAmount = offer.totalPrice - platformFee;

        // Transfer payment from buyer to seller and fee collector
        require(paymentToken.transferFrom(msg.sender, offer.seller, sellerAmount), "Payment failed");
        require(paymentToken.transferFrom(msg.sender, feeCollector, platformFee), "Fee transfer failed");

        // Transfer energy tokens from seller to buyer
        energyToken.unlockTokens(offer.energyAmount);
        require(energyToken.transferFrom(offer.seller, msg.sender, offer.energyAmount), "Energy transfer failed");

        // Create trade record
        uint256 tradeId = ++_tradeIdCounter;
        trades[tradeId] = Trade({
            tradeId: tradeId,
            offerId: _offerId,
            buyer: msg.sender,
            seller: offer.seller,
            energyAmount: offer.energyAmount,
            totalPrice: offer.totalPrice,
            timestamp: block.timestamp,
            status: TradeStatus.Completed,
            mobileMoneyReference: offer.mobileMoneyReference
        });

        // Update user profiles
        userProfiles[msg.sender].totalEnergyTraded += offer.energyAmount;
        userProfiles[msg.sender].totalSpent += offer.totalPrice;
        userProfiles[msg.sender].successfulTrades++;

        userProfiles[offer.seller].totalEnergyTraded += offer.energyAmount;
        userProfiles[offer.seller].totalEarned += sellerAmount;
        userProfiles[offer.seller].successfulTrades++;

        userTrades[msg.sender].push(tradeId);
        userTrades[offer.seller].push(tradeId);

        // Deactivate offer
        offer.isActive = false;

        emit TradeExecuted(tradeId, _offerId, msg.sender, offer.seller, offer.energyAmount, offer.totalPrice);
        emit TradeCompleted(tradeId);

        return tradeId;
    }

    // --- VIEW FUNCTIONS ---
    
    function getOffer(uint256 _offerId) external view returns (EnergyOffer memory) {
        return offers[_offerId];
    }

    function getTrade(uint256 _tradeId) external view returns (Trade memory) {
        return trades[_tradeId];
    }

    function getUserProfile(address _user) external view returns (UserProfile memory) {
        return userProfiles[_user];
    }

    function getUserOffers(address _user) external view returns (uint256[] memory) {
        return userOffers[_user];
    }

    function getUserTrades(address _user) external view returns (uint256[] memory) {
        return userTrades[_user];
    }

    function getCurrentOfferId() external view returns (uint256) {
        return _offerIdCounter;
    }

    function getCurrentTradeId() external view returns (uint256) {
        return _tradeIdCounter;
    }

    // Get latest price from Chainlink
    function getLatestPrice() public view returns (int) {
        (, int price, , , ) = priceFeed.latestRoundData();
        return price;
    }
}