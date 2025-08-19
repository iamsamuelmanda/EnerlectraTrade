// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title EnergyTrading
 * @dev Hybrid energy trading platform that bridges mobile money and blockchain
 * Users can trade energy without knowing they're using blockchain
 */
contract EnergyTrading is Ownable, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;

    // Token contracts
    IERC20 public energyToken;
    IERC20 public paymentToken; // USDC or stablecoin

    // Trading structures
    struct EnergyOffer {
        uint256 offerId;
        address seller;
        uint256 energyAmount; // in kWh
        uint256 pricePerKwh; // in wei
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
    enum TradeStatus { PENDING, COMPLETED, CANCELLED, DISPUTED }

    // State variables
    Counters.Counter private _offerIds;
    Counters.Counter private _tradeIds;
    
    mapping(uint256 => EnergyOffer) public offers;
    mapping(uint256 => Trade) public trades;
    mapping(address => UserProfile) public userProfiles;
    mapping(address => uint256) public userEnergyBalances;
    mapping(address => uint256) public userPaymentBalances;
    
    // Mobile money integration
    mapping(string => bool) public mobileMoneyReferences;
    mapping(address => string[]) public userMobileMoneyHistory;
    
    // Fees and limits
    uint256 public tradingFee = 25; // 0.25% (basis points)
    uint256 public minEnergyAmount = 1; // 1 kWh
    uint256 public maxEnergyAmount = 10000; // 10,000 kWh
    
    // Events
    event EnergyOfferCreated(
        uint256 indexed offerId,
        address indexed seller,
        uint256 energyAmount,
        uint256 pricePerKwh,
        bool isHybrid
    );
    
    event EnergyOfferUpdated(
        uint256 indexed offerId,
        uint256 newPrice,
        uint256 newAmount
    );
    
    event EnergyOfferCancelled(uint256 indexed offerId);
    
    event TradeExecuted(
        uint256 indexed tradeId,
        uint256 indexed offerId,
        address indexed buyer,
        address seller,
        uint256 energyAmount,
        uint256 totalPrice,
        PaymentMethod paymentMethod
    );
    
    event MobileMoneyPaymentReceived(
        address indexed user,
        string reference,
        uint256 amount,
        uint256 energyCredits
    );
    
    event UserProfileUpdated(
        address indexed user,
        string phoneNumber,
        bool isVerified
    );

    constructor(
        address _energyToken,
        address _paymentToken
    ) Ownable(msg.sender) {
        energyToken = IERC20(_energyToken);
        paymentToken = IERC20(_paymentToken);
    }

    /**
     * @dev Create an energy trading offer
     * @param energyAmount Amount of energy in kWh
     * @param pricePerKwh Price per kWh in wei
     * @param expiresAt Expiration timestamp
     * @param acceptMobileMoney Whether to accept mobile money payments
     */
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
        require(
            energyToken.balanceOf(msg.sender) >= energyAmount * 1e18,
            "Insufficient energy balance"
        );

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
        energyToken.transferFrom(msg.sender, address(this), energyAmount * 1e18);

        emit EnergyOfferCreated(
            offerId,
            msg.sender,
            energyAmount,
            pricePerKwh,
            acceptMobileMoney
        );

        return offerId;
    }

    /**
     * @dev Execute a trade using blockchain payment
     * @param offerId ID of the offer to accept
     */
    function executeTradeWithBlockchain(
        uint256 offerId
    ) external whenNotPaused nonReentrant returns (uint256) {
        EnergyOffer storage offer = offers[offerId];
        require(offer.isActive, "Offer not active");
        require(offer.expiresAt > block.timestamp, "Offer expired");
        require(msg.sender != offer.seller, "Cannot buy from yourself");
        require(
            paymentToken.balanceOf(msg.sender) >= offer.totalPrice,
            "Insufficient payment balance"
        );

        uint256 tradeId = _tradeIds.current();
        _tradeIds.increment();

        // Calculate fees
        uint256 feeAmount = (offer.totalPrice * tradingFee) / 10000;
        uint256 sellerAmount = offer.totalPrice - feeAmount;

        // Transfer payment
        paymentToken.transferFrom(msg.sender, address(this), offer.totalPrice);
        paymentToken.transfer(offer.seller, sellerAmount);
        paymentToken.transfer(owner(), feeAmount);

        // Transfer energy
        energyToken.transfer(msg.sender, offer.energyAmount * 1e18);

        // Create trade record
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

        // Update offer status
        offer.isActive = false;

        // Update user stats
        _updateUserStats(msg.sender, offer.seller, offer.energyAmount, offer.totalPrice);

        emit TradeExecuted(
            tradeId,
            offerId,
            msg.sender,
            offer.seller,
            offer.energyAmount,
            offer.totalPrice,
            PaymentMethod.BLOCKCHAIN
        );

        return tradeId;
    }

    /**
     * @dev Execute a trade using mobile money (called by backend)
     * @param offerId ID of the offer to accept
     * @param buyer Phone number of the buyer
     * @param mobileMoneyRef Mobile money reference
     */
    function executeTradeWithMobileMoney(
        uint256 offerId,
        string calldata buyer,
        string calldata mobileMoneyRef
    ) external onlyOwner whenNotPaused nonReentrant returns (uint256) {
        EnergyOffer storage offer = offers[offerId];
        require(offer.isActive, "Offer not active");
        require(offer.expiresAt > block.timestamp, "Offer expired");
        require(offer.isHybrid, "Offer doesn't accept mobile money");
        require(!mobileMoneyReferences[mobileMoneyRef], "Reference already used");

        uint256 tradeId = _tradeIds.current();
        _tradeIds.increment();

        // Mark mobile money reference as used
        mobileMoneyReferences[mobileMoneyRef] = true;

        // Transfer energy to the platform (will be distributed by backend)
        energyToken.transfer(owner(), offer.energyAmount * 1e18);

        // Create trade record
        trades[tradeId] = Trade({
            tradeId: tradeId,
            offerId: offerId,
            buyer: address(0), // Will be updated when user connects wallet
            seller: offer.seller,
            energyAmount: offer.energyAmount,
            totalPrice: offer.totalPrice,
            timestamp: block.timestamp,
            paymentMethod: PaymentMethod.MOBILE_MONEY,
            mobileMoneyReference: mobileMoneyRef,
            status: TradeStatus.COMPLETED
        });

        // Update offer status
        offer.isActive = false;
        offer.mobileMoneyReference = mobileMoneyRef;

        emit TradeExecuted(
            tradeId,
            offerId,
            address(0),
            offer.seller,
            offer.energyAmount,
            offer.totalPrice,
            PaymentMethod.MOBILE_MONEY
        );

        return tradeId;
    }

    /**
     * @dev Process mobile money payment and credit user's energy balance
     * @param user User's wallet address
     * @param mobileMoneyRef Mobile money reference
     * @param energyAmount Amount of energy to credit
     */
    function processMobileMoneyPayment(
        address user,
        string calldata mobileMoneyRef,
        uint256 energyAmount
    ) external onlyOwner whenNotPaused {
        require(!mobileMoneyReferences[mobileMoneyRef], "Reference already used");
        require(energyAmount > 0, "Invalid energy amount");
        require(user != address(0), "Invalid user address");

        // Mark reference as used
        mobileMoneyReferences[mobileMoneyRef] = true;

        // Credit user's energy balance
        userEnergyBalances[user] += energyAmount;
        energyToken.transfer(user, energyAmount * 1e18);

        // Add to user's mobile money history
        userMobileMoneyHistory[user].push(mobileMoneyRef);

        emit MobileMoneyPaymentReceived(
            user,
            mobileMoneyRef,
            0, // Amount not relevant for energy credits
            energyAmount
        );
    }

    /**
     * @dev Update or create user profile
     * @param phoneNumber User's phone number
     * @param isVerified Whether the user is verified
     */
    function updateUserProfile(
        string calldata phoneNumber,
        bool isVerified
    ) external {
        UserProfile storage profile = userProfiles[msg.sender];
        
        if (profile.userAddress == address(0)) {
            // Create new profile
            profile.userAddress = msg.sender;
            profile.phoneNumber = phoneNumber;
            profile.energyBalance = 0;
            profile.paymentBalance = 0;
            profile.isVerified = isVerified;
            profile.reputation = 100; // Base reputation
            profile.totalTrades = 0;
            profile.createdAt = block.timestamp;
        } else {
            // Update existing profile
            profile.phoneNumber = phoneNumber;
            profile.isVerified = isVerified;
        }

        emit UserProfileUpdated(msg.sender, phoneNumber, isVerified);
    }

    /**
     * @dev Cancel an energy offer
     * @param offerId ID of the offer to cancel
     */
    function cancelOffer(uint256 offerId) external whenNotPaused {
        EnergyOffer storage offer = offers[offerId];
        require(offer.seller == msg.sender, "Not your offer");
        require(offer.isActive, "Offer not active");

        offer.isActive = false;

        // Return locked energy to seller
        energyToken.transfer(msg.sender, offer.energyAmount * 1e18);

        emit EnergyOfferCancelled(offerId);
    }

    /**
     * @dev Update offer price and amount
     * @param offerId ID of the offer to update
     * @param newPrice New price per kWh
     * @param newAmount New energy amount
     */
    function updateOffer(
        uint256 offerId,
        uint256 newPrice,
        uint256 newAmount
    ) external whenNotPaused {
        EnergyOffer storage offer = offers[offerId];
        require(offer.seller == msg.sender, "Not your offer");
        require(offer.isActive, "Offer not active");
        require(newAmount >= minEnergyAmount, "Amount too low");
        require(newAmount <= maxEnergyAmount, "Amount too high");
        require(newPrice > 0, "Invalid price");

        uint256 oldAmount = offer.energyAmount;
        offer.energyAmount = newAmount;
        offer.pricePerKwh = newPrice;
        offer.totalPrice = newAmount * newPrice;

        // Adjust locked energy
        if (newAmount > oldAmount) {
            energyToken.transferFrom(msg.sender, address(this), (newAmount - oldAmount) * 1e18);
        } else if (newAmount < oldAmount) {
            energyToken.transfer(msg.sender, (oldAmount - newAmount) * 1e18);
        }

        emit EnergyOfferUpdated(offerId, newPrice, newAmount);
    }

    /**
     * @dev Get user's energy balance
     * @param user User's address
     */
    function getEnergyBalance(address user) external view returns (uint256) {
        return userEnergyBalances[user];
    }

    /**
     * @dev Get user's payment balance
     * @param user User's address
     */
    function getPaymentBalance(address user) external view returns (uint256) {
        return userPaymentBalances[user];
    }

    /**
     * @dev Get active offers
     */
    function getActiveOffers() external view returns (EnergyOffer[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < _offerIds.current(); i++) {
            if (offers[i].isActive) activeCount++;
        }

        EnergyOffer[] memory activeOffers = new EnergyOffer[](activeCount);
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < _offerIds.current(); i++) {
            if (offers[i].isActive) {
                activeOffers[currentIndex] = offers[i];
                currentIndex++;
            }
        }

        return activeOffers;
    }

    /**
     * @dev Get user's trade history
     * @param user User's address
     */
    function getUserTrades(address user) external view returns (Trade[] memory) {
        uint256 userTradeCount = 0;
        for (uint256 i = 0; i < _tradeIds.current(); i++) {
            if (trades[i].buyer == user || trades[i].seller == user) {
                userTradeCount++;
            }
        }

        Trade[] memory userTrades = new Trade[](userTradeCount);
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < _tradeIds.current(); i++) {
            if (trades[i].buyer == user || trades[i].seller == user) {
                userTrades[currentIndex] = trades[i];
                currentIndex++;
            }
        }

        return userTrades;
    }

    /**
     * @dev Update user statistics after trade
     */
    function _updateUserStats(
        address buyer,
        address seller,
        uint256 energyAmount,
        uint256 totalPrice
    ) internal {
        UserProfile storage buyerProfile = userProfiles[buyer];
        UserProfile storage sellerProfile = userProfiles[seller];

        if (buyerProfile.userAddress != address(0)) {
            buyerProfile.totalTrades++;
            buyerProfile.reputation = _calculateNewReputation(buyerProfile.reputation, true);
        }

        if (sellerProfile.userAddress != address(0)) {
            sellerProfile.totalTrades++;
            sellerProfile.reputation = _calculateNewReputation(sellerProfile.reputation, true);
        }
    }

    /**
     * @dev Calculate new reputation score
     */
    function _calculateNewReputation(uint256 currentRep, bool success) internal pure returns (uint256) {
        if (success) {
            return currentRep + 1;
        } else {
            return currentRep > 0 ? currentRep - 1 : 0;
        }
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Update trading fee
     */
    function updateTradingFee(uint256 newFee) external onlyOwner {
        require(newFee <= 100, "Fee too high"); // Max 1%
        tradingFee = newFee;
    }

    /**
     * @dev Withdraw accumulated fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = paymentToken.balanceOf(address(this));
        paymentToken.transfer(owner(), balance);
    }

    /**
     * @dev Emergency withdrawal of stuck tokens
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
}