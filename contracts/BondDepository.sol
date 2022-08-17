// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./BondDepositoryStorage.sol";
import "./common/ProxyAccessCommon.sol";

import "./libraries/SafeERC20.sol";

import "./interfaces/IBondDepository.sol";
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

    function requestMintAndTransfer(uint256 _mintAmount, address _recipient, uint256 _transferAmount, bool _distribute) external ;
    function addBondAsset(address _address) external;
}

contract BondDepository is
    BondDepositoryStorage,
    ProxyAccessCommon,
    IBondDepository,
    IBondDepositoryEvent
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

    constructor() {

    }

    ///////////////////////////////////////
    /// onlyPolicyOwner
    //////////////////////////////////////

    /// @inheritdoc IBondDepository
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
        require(_market[0] >= 100 ether, "need the totalSaleAmount > 100");
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
        if (_token != address(0)) IITreasury(treasury).addBondAsset(_token);

        emit CreatedMarket(id_, _token, _market);
    }

    /// @inheritdoc IBondDepository
    function increaseCapacity(
        uint256 _marketId,
        uint256 _amount
    )   external override onlyPolicyOwner
        nonZero(_amount)
    {
        require(markets[_marketId].maxPayout > 0, "non-exist market");

        LibBondDepository.Market storage _info = markets[_marketId];
        _info.capacity += _amount;

        emit IncreasedCapacity(_marketId, _amount);
    }

    /// @inheritdoc IBondDepository
    function decreaseCapacity(
        uint256 _marketId,
        uint256 _amount
    ) external override onlyPolicyOwner
        nonZero(_amount)
    {
        require(markets[_marketId].capacity > _amount, "not enough capacity");
        require(markets[_marketId].maxPayout > 0, "non-exist market");

        LibBondDepository.Market storage _info = markets[_marketId];
        _info.capacity -= _amount;

        emit DecreasedCapacity(_marketId, _amount);
    }

    /// @inheritdoc IBondDepository
    function changeCloseTime(
        uint256 _marketId,
        uint256 closeTime
    )   external override onlyPolicyOwner
        //nonEndMarket(_marketId)
        //nonZero(closeTime)
    {
        require(closeTime > block.timestamp, "past closeTime");
        require(markets[_marketId].maxPayout > 0, "non-exist market");

        LibBondDepository.Market storage _info = markets[_marketId];
        _info.endSaleTime = closeTime;

        emit ChangedCloseTime(_marketId, closeTime);
    }

    /// @inheritdoc IBondDepository
    function changeMaxPayout(
        uint256 _marketId,
        uint256 _amount
    )   external override onlyPolicyOwner
        nonEndMarket(_marketId)
        nonZero(_amount)
    {
        LibBondDepository.Market storage _info = markets[_marketId];
        _info.maxPayout = _amount;

        emit ChangedMaxPayout(_marketId, _amount);
    }

    /// @inheritdoc IBondDepository
    function changePrice(
        uint256 _marketId,
        uint256 _tosPrice
    )   external override onlyPolicyOwner
        nonEndMarket(_marketId)
        nonZero(_tosPrice)
    {
        LibBondDepository.Market storage _info = markets[_marketId];
        _info.tosPrice = _tosPrice;

        emit ChangedPrice(_marketId, _tosPrice);
    }

    /// @inheritdoc IBondDepository
    function close(uint256 _id) external override onlyPolicyOwner {
        require(markets[_id].endSaleTime > 0, "empty market");
        require(markets[_id].endSaleTime > block.timestamp || markets[_id].capacity == 0, "already closed");
        LibBondDepository.Market storage _info = markets[_id];
        _info.endSaleTime = block.timestamp;
        _info.capacity = 0;
        emit ClosedMarket(_id);
    }

    ///////////////////////////////////////
    /// Anyone can use.
    //////////////////////////////////////

    /// @inheritdoc IBondDepository
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

        (payout_) = _deposit(msg.sender, _amount, _id, true);

        uint256 id = _id;
        uint256 stakeId = staking.stakeByBond(msg.sender, payout_, id, markets[id].tosPrice);

        payable(treasury).transfer(msg.value);

        emit ETHDeposited(msg.sender, id, stakeId, _amount, payout_);
    }

    /// @inheritdoc IBondDepository
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

        (payout_) = _deposit(msg.sender, _amount, _id, true);

        uint256 id = _id;
        uint256 stakeId = staking.stakeGetStosByBond(msg.sender, payout_, id, _lockWeeks, markets[id].tosPrice);


        payable(treasury).transfer(msg.value);

        emit ETHDepositedWithSTOS(msg.sender, id, stakeId, _amount, _lockWeeks, payout_);
    }


    function _deposit(
        address user,
        uint256 _amount,
        uint256 _marketId,
        bool _eth
    ) internal nonReentrant returns (uint256 _payout) {

        require(_amount <= purchasableAssetAmountAtOneTime(_marketId), "Depository : over maxPay");

        _payout = calculateTosAmountForAsset(_marketId, _amount);

        require(_payout > 0, "zero staking amount");
        uint256 _ethValue = 0; // _payout tos 를 이더로 바꿈.

        if(!_eth) {
            (bool existedWethPool, , , uint256 convertedAmount) =
                IITOSValueCalculator(calculator).convertAssetBalanceToWethOrTos(address(tos), _payout);

            if(existedWethPool)  _ethValue =  convertedAmount;

        } else {
            _ethValue = _amount;
        }

        require(_ethValue > 0, "zero _ethValue");
        uint256 _mintRate = IITreasury(treasury).getMintRate();

        require(_mintRate > 0, "zero mintRate");

        uint256 mrAmount = _ethValue * _mintRate / IITreasury(treasury).mintRateDenominator() ;
        require(mrAmount >= _payout, "mintableAmount is less than staking amount.");
        require(_payout <= markets[_marketId].capacity, "Depository: sold out");

        LibBondDepository.Market storage market = markets[_marketId];

        market.capacity -= _payout;

        //check closing
        if (market.capacity <= 100 ether ) {
           market.capacity = 0;
           emit ClosedMarket(_marketId);
        }

        if(mrAmount > 0 && _payout <= mrAmount) {
            IITreasury(treasury).requestMintAndTransfer(mrAmount, address(staking), _payout, true);
        }

        emit Deposited(user, _marketId, _amount, _payout, _eth, mrAmount);
    }

    ///////////////////////////////////////
    /// VIEW
    //////////////////////////////////////

    /// @inheritdoc IBondDepository
    function calculateTosAmountForAsset(
        uint256 _id,
        uint256 _amount
    )
        public override
        view
        returns (uint256 payout)
    {
        return (_amount * markets[_id].tosPrice / 1e18);
    }

    /// @inheritdoc IBondDepository
    function purchasableAssetAmountAtOneTime(uint256 _id) public override view returns (uint256 maxpayout_) {

        return ( markets[_id].maxPayout *  1e18 / markets[_id].tosPrice );
    }

    /// @inheritdoc IBondDepository
    function getBonds() public override view
        returns (
            uint256[] memory,
            address[] memory,
            uint256[] memory,
            uint256[] memory,
            uint256[] memory
        )
    {
        uint256 len = marketList.length;
        uint256[] memory _marketIds = new uint256[](len);
        address[] memory _quoteTokens = new address[](len);
        uint256[] memory _capacities = new uint256[](len);
        uint256[] memory _endSaleTimes = new uint256[](len);
        uint256[] memory _pricesTos = new uint256[](len);

        for (uint256 i = 0; i < len; i++){
            _marketIds[i] = marketList[i];
            _quoteTokens[i] = markets[_marketIds[i]].quoteToken;
            _capacities[i] = markets[_marketIds[i]].capacity;
            _endSaleTimes[i] = markets[_marketIds[i]].endSaleTime;
            _pricesTos[i] = markets[_marketIds[i]].tosPrice;
        }
        return (_marketIds, _quoteTokens, _capacities, _endSaleTimes, _pricesTos);
    }

    /// @inheritdoc IBondDepository
    function getMarketList() public override view returns (uint256[] memory) {
        return marketList;
    }

    /// @inheritdoc IBondDepository
    function totalMarketCount() public override view returns (uint256) {
        return marketList.length;
    }

    /// @inheritdoc IBondDepository
    function viewMarket(uint256 _index) public override view
        returns (
            address quoteToken,
            uint256 capacity,
            uint256 endSaleTime,
            uint256 maxPayout,
            uint256 tosPrice
            )
    {
        return (
            markets[_index].quoteToken,
            markets[_index].capacity,
            markets[_index].endSaleTime,
            markets[_index].maxPayout,
            markets[_index].tosPrice
        );
    }

    /// @inheritdoc IBondDepository
    function isOpened(uint256 _index) public override view returns (bool closedBool)
    {
        if (block.timestamp < markets[_index].endSaleTime && markets[_index].capacity > 0) {
            return true;
        } else {
            return false;
        }
    }

}