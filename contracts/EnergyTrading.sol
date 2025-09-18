// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract EnergyTrading is Ownable, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;

    // Token contracts
    IERC20 public energyToken;
    IERC20 public paymentToken; // USDC or stablecoin
    AggregatorV3Interface public priceFeed; // Chainlink price feed for energy pricing

    // Trading structures
    struct EnergyOffer {
        uint256 offerId;
        address seller;
        uint256 energyAmount; // in kWh (18 decimals)
        uint256 pricePerKwh; // in wei (dynamic via oracle)
        uint256 totalPrice;
        uint256 expiresAt;
        bool isActive;
        bool isHybrid; // true if mobile money payment accepted
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
        PaymentMethod paymentMethod;
        string mobileMoneyReference;
        TradeStatus status;
    }

    struct UserProfile {
        address userAddress;
        string phoneNumber;
        uint256 energyBalance;
        uint256 paymentBalance;
        bool isVerified;
        uint256 reputation;
        uint256 totalTrades;
        uint256 createdAt;
    }

    enum PaymentMethod { BLOCKCHAIN, MOBILE_MONEY, HYBRID }
    enum TradeStatus { PENDING, COMPLETED, CANCELLED, DISPUTED, RESOLVED }

    // State variables
    Counters.Counter private _offerIds;
    Counters.Counter private _tradeIds;
    mapping(uint256 => EnergyOffer) public offers;
    mapping(uint256 => Trade) public trades;
    mapping(address => UserProfile) public userProfiles;
    mapping(address => uint256) public userEnergyBalances;
    mapping(address => uint256) public userPaymentBalances;
    mapping(string => bool) public mobileMoneyReferences;
    mapping(address => string[]) public userMobileMoneyHistory;

    // Fees and limits
    uint256 public tradingFee = 25; // 0.25% (basis points)
    uint256 public minEnergyAmount = 1 * 10**18; // 1 kWh
    uint256 public maxEnergyAmount = 10000 * 10**18; // 10,000 kWh
    uint256 public timelockPeriod = 24 hours; // Timelock for critical updates
    uint256 public lastFeeUpdate;

    // Events
    event EnergyOfferCreated(uint256 indexed offerId, address indexed seller, uint256 energyAmount, uint256 pricePerKwh, bool isHybrid);
    event EnergyOfferUpdated(uint256 indexed offerId, uint256 newPrice, uint256 newAmount);
    event EnergyOfferCancelled(uint256 indexed offerId);
    event TradeExecuted(uint256 indexed tradeId, uint256 indexed offerId, address indexed buyer, address seller, uint256 energyAmount, uint256 totalPrice, PaymentMethod paymentMethod);
    event MobileMoneyPaymentReceived(address indexed user, string reference, uint256 amount, uint256 energyCredits);
    event UserProfileUpdated(address indexed user, string phoneNumber, bool isVerified);
    event DisputeRaised(uint256 indexed tradeId, address indexed by, string reason);
    event DisputeResolved(uint256 indexed tradeId, address resolver, bool inFavorOfBuyer);

    constructor(
        address _energyToken,
        address _paymentToken,
        address _priceFeed
    ) Ownable(msg.sender) {
        energyToken = IERC20(_energyToken);
        paymentToken = IERC20(_paymentToken);
        priceFeed = AggregatorV3Interface(_priceFeed); // e.g., ETH/USD feed, adapt for energy
    }

    function createEnergyOffer(
        uint256 energyAmount,
        uint256 pricePerKwh,
        uint256 expiresAt,
        bool acceptMobileMoney
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(energyAmount >= minEnergyAmount, "Amount too low");
        require(energyAmount <= maxEnergyAmount, "Amount too high");
        require(pricePerKwh > 0, "Invalid price");
        require(expiresAt > block.timestamp, "Invalid expiration");
        require(energyToken.balanceOf(msg.sender) >= energyAmount, "Insufficient energy balance");

        uint256 offerId = _offerIds.current();
        _offerIds.increment();

        offers[offerId] = EnergyOffer({
            offerId: offerId,
            seller: msg.sender,
            energyAmount: energyAmount,
            pricePerKwh: pricePerKwh,
            totalPrice: energyAmount * pricePerKwh,
            expiresAt: expiresAt,
            isActive: true,
            isHybrid: acceptMobileMoney,
            mobileMoneyReference: ""
        });

        // Lock seller's energy
        EnergyToken(address(energyToken)).lockTokens(energyAmount / 10**18); // Convert to kWh
        energyToken.transferFrom(msg.sender, address(this), energyAmount);

        emit EnergyOfferCreated(offerId, msg.sender, energyAmount, pricePerKwh, acceptMobileMoney);
        return offerId;
    }

    function executeTradeWithBlockchain(uint256 offerId) external whenNotPaused nonReentrant returns (uint256) {
        EnergyOffer storage offer = offers[offerId];
        require(offer.isActive, "Offer not active");
        require(offer.expiresAt > block.timestamp, "Offer expired");
        require(msg.sender != offer.seller, "Cannot buy from yourself");
        require(paymentToken.balanceOf(msg.sender) >= offer.totalPrice, "Insufficient payment balance");

        uint256 tradeId = _tradeIds.current();
        _tradeIds.increment();

        uint256 feeAmount = (offer.totalPrice * tradingFee) / 10000;
        uint256 sellerAmount = offer.totalPrice - feeAmount;

        paymentToken.transferFrom(msg.sender, address(this), offer.totalPrice);
        paymentToken.transfer(offer.seller, sellerAmount);
        paymentToken.transfer(owner(), feeAmount);

        EnergyToken(address(energyToken)).unlockTokens(offer.energyAmount / 10**18);
        energyToken.transfer(msg.sender, offer.energyAmount);

        trades[tradeId] = Trade({
            tradeId: tradeId,
            offerId: offerId,
            buyer: msg.sender,
            seller: offer.seller,
            energyAmount: offer.energyAmount,
            totalPrice: offer.totalPrice,
            timestamp: block.timestamp,
            paymentMethod: PaymentMethod.BLOCKCHAIN,
            mobileMoneyReference: "",
            status: TradeStatus.COMPLETED
        });

        offer.isActive = false;
        _updateUserStats(msg.sender, offer.seller, offer.energyAmount, offer.totalPrice);

        emit TradeExecuted(tradeId, offerId, msg.sender, offer.seller, offer.energyAmount, offer.totalPrice, PaymentMethod.BLOCKCHAIN);
        return tradeId;
    }

    function executeTradeWithMobileMoney(
        uint256 offerId,
        string calldata mobileMoneyRef
    ) external onlyOwner whenNotPaused nonReentrant returns (uint256) {
        EnergyOffer storage offer = offers[offerId];
        require(offer.isActive, "Offer not active");
        require(offer.expiresAt > block.timestamp, "Offer expired");
        require(offer.isHybrid, "Offer doesn't accept mobile money");
        require(!mobileMoneyReferences[mobileMoneyRef