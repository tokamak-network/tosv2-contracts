// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./BondDepositoryStorage.sol";
import "./common/ProxyAccessCommon.sol";
import "./BondDepositoryStorageV2.sol";

import "./libraries/SafeERC20.sol";

import "./interfaces/IBondDepositoryV2.sol";
import "./interfaces/IBondDepositoryEvent.sol";

import "@openzeppelin/contracts/utils/math/Math.sol";
// import "hardhat/console.sol";

interface IIIERC20 {
    function decimals() external view returns (uint256);
}

interface IUniswapV3Pool {
    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface IITOSValueCalculator {
    function convertAssetBalanceToWethOrTos(address _asset, uint256 _amount)
        external view
        returns (bool existedWethPool, bool existedTosPool,  uint256 priceWethOrTosPerAsset, uint256 convertedAmount);
}

interface IITreasury {

    function getETHPricePerTOS() external view returns (uint256 price);
    function getMintRate() external view returns (uint256);
    function mintRateDenominator() external view returns (uint256);

    function requestMint(uint256 _mintAmount, uint256 _payout, bool _distribute) external ;
    function addBondAsset(address _address) external;
}

contract BondDepository is
    BondDepositoryStorage,
    ProxyAccessCommon,
    IBondDepositoryV2,
    IBondDepositoryEvent,
    BondDepositoryStorageV2
{
    using SafeERC20 for IERC20;

    modifier nonEndMarket(uint256 id_) {
        require(markets[id_].endSaleTime > block.timestamp, "BondDepository: closed market");
        require(markets[id_].capacity > 0 , "BondDepository: zero capacity" );
        _;
    }

    modifier isEthMarket(uint256 id_) {
        require(markets[id_].quoteToken == address(0) && markets[id_].endSaleTime > 0,
            "BondDepository: not ETH market"
        );
        _;
    }

    modifier nonEthMarket(uint256 id_) {
        require(
            markets[id_].quoteToken != address(0) && markets[id_].endSaleTime > 0,
            "BondDepository: ETH market"
        );
        _;
    }

    modifier nonZeroPayout(uint256 id_) {
        require(
            markets[id_].maxPayout > 0,
            "BondDepository: non-exist market"
        );
        _;
    }
    constructor() {

    }

    /// @inheritdoc IBondDepositoryV2
    function create(
        address _token,
        uint256[4] calldata _market
    )
        external
        override
        onlyPolicyOwner
        nonZero(_market[0])
        nonZero(_market[2])
        nonZero(_market[3])
        returns (uint256 id_)
    {
        require(_market[0] > 100 ether, "need the totalSaleAmount > 100");
        id_ = staking.generateMarketId();
        require(markets[id_].endSaleTime == 0, "already registered market");
        require(_market[1] > block.timestamp, "endSaleTime has passed");

        markets[id_] = LibBondDepository.Market({
                            quoteToken: _token,
                            capacity: _market[0],
                            endSaleTime: _market[1],
                            maxPayout: _market[3],
                            tosPrice: _market[2]
                        });

        marketList.push(id_);

        /// add v1.1
        marketStartTimes[id_] = block.timestamp;
        marketTotalCapacity[id_] = _market[0];
        marketUsedCapacity[id_] = 0;

        if (_token != address(0)) IITreasury(treasury).addBondAsset(_token);

        emit CreatedMarket(id_, _token, _market);
    }

    ///////////////////////////////////////
    /// Anyone can use.
    //////////////////////////////////////

    /// @inheritdoc IBondDepositoryV2
    function ETHDeposit(
        uint256 _id,
        uint256 _amount
    )
        external payable override
        nonEndMarket(_id)
        isEthMarket(_id)
        nonZero(_amount)
        returns (uint256 payout_)
    {
        require(msg.value == _amount, "Depository: ETH amounts do not match");

        uint256 _tosPrice = 0;

        (payout_, _tosPrice) = _deposit(msg.sender, _amount, _id);

        uint256 stakeId = staking.stakeByBond(msg.sender, payout_, _id, _tosPrice);

        payable(treasury).transfer(msg.value);

        emit ETHDeposited(msg.sender, _id, stakeId, _amount, payout_);
    }


    /// @inheritdoc IBondDepositoryV2
    function ETHDepositWithSTOS(
        uint256 _id,
        uint256 _amount,
        uint256 _lockWeeks
    )
        external payable override
        nonEndMarket(_id)
        isEthMarket(_id)
        nonZero(_amount)
        nonZero(_lockWeeks)
        returns (uint256 payout_)
    {
        require(msg.value == _amount, "Depository: ETH amounts do not match");
        require(_lockWeeks > 1, "_lockWeeks must be greater than 1 week.");
        uint256 _tosPrice = 0;
        (payout_, _tosPrice) = _deposit(msg.sender, _amount, _id);

        uint256 stakeId = staking.stakeGetStosByBond(msg.sender, payout_, _id, _lockWeeks, _tosPrice);

        payable(treasury).transfer(msg.value);

        emit ETHDepositedWithSTOS(msg.sender, _id, stakeId, _amount, _lockWeeks, payout_);
    }


    function _deposit(
        address user,
        uint256 _amount,
        uint256 _marketId
    ) internal nonReentrant returns (uint256 _payout, uint256 _tosPrice) {
        LibBondDepository.Market storage market = markets[_marketId];
        _tosPrice = market.tosPrice;
        require(_amount <= purchasableAssetAmountAtOneTime(_tosPrice, market.maxPayout), "Depository : over maxPay");

        _payout = calculateTosAmountForAsset(_tosPrice, _amount);
        require(_payout > 0, "zero staking amount");

        //-------------------------
        // v1.1
        (, uint256 currentCapacity) = dailyCapacityLimit(_marketId);
        require(_payout <= currentCapacity, "exceed currentCapacityLimit");
        //-------------------------

        uint256 mrAmount = _amount * IITreasury(treasury).getMintRate() / 1e18;
        require(mrAmount >= _payout, "mintableAmount is less than staking amount.");
        require(_payout <= market.capacity, "Depository: sold out");

        market.capacity -= _payout;

        //-------------------------
        // v1.1
        marketUsedCapacity[_marketId] += _payout;
        //-------------------------

        //check closing
        if (market.capacity <= 100 ether) {
           market.capacity = 0;
           emit ClosedMarket(_marketId);
        }

        IITreasury(treasury).requestMint(mrAmount, _payout, true);

        emit Deposited(user, _marketId, _amount, _payout, true, mrAmount);
    }


    function calculateTosAmountForAsset(
        uint256 _tosPrice,
        uint256 _amount
    )
        public
        pure
        returns (uint256 payout)
    {
        return (_amount * _tosPrice / 1e18);
    }


    function purchasableAssetAmountAtOneTime(
        uint256 _tosPrice,
        uint256 _maxPayout
    )
        public pure returns (uint256 maxPayout_)
    {
        return ( _maxPayout *  1e18 / _tosPrice );
    }


    function maximumPurchasableAmountAtOneTime(
        uint256 _marketId
    )
        public view returns (uint256 maximumAmount_)
    {
        LibBondDepository.Market memory market = markets[_marketId];
        (, uint256 currentCapacity) = dailyCapacityLimit(_marketId);
        maximumAmount_ = Math.min(currentCapacity, market.maxPayout);
    }


    function dailyCapacityLimit(
        uint256 _marketId
    )
        public view returns (uint256 dailyCapacity, uint256 currentCapacity)
    {
        (uint256 _totalSaleDays, uint256 _todayNumber) = saleDays(_marketId);

        dailyCapacity = marketTotalCapacity[_marketId] / _totalSaleDays;
        currentCapacity = 0;
        if (_todayNumber > 0 ) {
            currentCapacity = dailyCapacity * _todayNumber;
            uint256 usedAmount = marketUsedCapacity[_marketId];
            if (usedAmount <= currentCapacity) {
                currentCapacity -= usedAmount;
            } else {
                currentCapacity = 0;
            }
        }
    }

    function saleDays(uint256 _marketId) public view returns (uint256 totalSaleDays, uint256 todayNumber) {

        uint256 start = marketStartTimes[_marketId];
        if (start > 0){
            LibBondDepository.Market memory market = markets[_marketId];

            if (market.endSaleTime > start){
                uint256 periodSeconds = market.endSaleTime - start;
                totalSaleDays = periodSeconds /  1 days;
                if (periodSeconds % 1 days > 0) totalSaleDays++;

                if (block.timestamp > start && block.timestamp < market.endSaleTime ) {
                    todayNumber = (block.timestamp - start) / 1 days;
                    if ((block.timestamp - start) % 1 days > 0) todayNumber++;
                }
            }
        }

    }

}
