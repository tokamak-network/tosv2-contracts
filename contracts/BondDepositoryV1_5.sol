// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./BondDepositoryStorage.sol";
import "./common/ProxyAccessCommon.sol";
import "./BondDepositoryStorageV1_5.sol";

import "./libraries/SafeERC20.sol";

import "./interfaces/IBondDepositoryV1_5.sol";
import "./interfaces/IBondDepositoryEventV1_5.sol";

import "@openzeppelin/contracts/utils/math/Math.sol";
// import "hardhat/console.sol";

interface IITreasury {
    function getMintRate() external view returns (uint256);
    function requestMint(uint256 _mintAmount, uint256 _payout, bool _distribute) external ;
    function addBondAsset(address _address) external;
}

interface IIStakingV2_V1_5 {

    function stakeByBondWithoutStos(
        address to,
        uint256 _amount,
        uint256 _marketId,
        uint256 tosPrice,
        uint256 _periodWeeks
    )
        external
        returns (uint256 stakeId);
}

interface IIOracleLibrary {
    function consult(address pool, uint32 period) external view returns (int24 timeWeightedAverageTick) ;
    function getQuoteAtTick(
        int24 tick,
        uint128 baseAmount,
        address baseToken,
        address quoteToken
    ) external pure returns (uint256 quoteAmount);
}

interface IIIUniswapV3Pool {
    function token0() external view returns (address);
    function token1() external view returns (address);

    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        );
}

contract BondDepositoryV1_5 is
    BondDepositoryStorage,
    ProxyAccessCommon,
    BondDepositoryStorageV1_5,
    IBondDepositoryV1_5,
    IBondDepositoryEventV1_5
{
    using SafeERC20 for IERC20;

    modifier nonEndMarket(uint256 id_) {
        require(marketInfos[id_].startTime < block.timestamp, "no start time yet");
        require(!marketInfos[id_].closed, "closed market");
        require(markets[id_].endSaleTime > block.timestamp, "closed market");
        require(markets[id_].capacity > marketInfos[id_].totalSold, "zero capacity" );
        _;
    }

    modifier isEthMarket(uint256 id_) {
        require(markets[id_].quoteToken == address(0) && markets[id_].endSaleTime > 0,
            "not ETH market"
        );
        _;
    }

    modifier existedMarket(uint256 id_) {
        require(
            markets[id_].endSaleTime != 0,
            "non-exist market"
        );
        _;
    }

    modifier nonZeroUint32(uint16 value) {
        require(
            value != 0,
            "zero value"
        );
        _;
    }

    constructor() {
        remainingTosTolerance = 100 ether;
        bondType = 15;
    }

    /// @inheritdoc IBondDepositoryV1_5
    function create(
        address _token,
        uint256 _capacity,
        uint256 _lowerPriceLimit,
        uint32 _startTime,
        uint32 _endTime,
        address[] calldata pools
    )
        external override
        onlyPolicyOwner
        nonZeroUint32(_startTime)
        nonZeroUint32(_endTime)
        returns (uint256 id_)
    {
        require(_capacity > remainingTosTolerance, "totalSaleAmount is too small.");
        require(_endTime > _startTime && _endTime > uint16(block.timestamp), "invalid _startTime or endSaleTime");

        id_ = staking.generateMarketId();

        markets[id_] = LibBondDepository.Market({
                            quoteToken: _token,
                            capacity: _capacity,
                            endSaleTime: uint256(_endTime),
                            maxPayout: 0,
                            tosPrice: _lowerPriceLimit
                        });

        marketList.push(id_);

        /// add v1.5
        // Market.capacity change the total capacity
        marketInfos[id_] = LibBondDepositoryV1_5.MarketInfo(
            {
                bondType: LibBondDepositoryV1_5.BOND_TYPE.MINTING_V1_5,
                closed: false,
                startTime: _startTime,
                totalSold: 0,
                pools: pools
            }
        );

        if (_token != address(0)) IITreasury(treasury).addBondAsset(_token);

        emit CreatedMarket(
            id_,
            _token,
            _capacity,
            _lowerPriceLimit,
            _startTime,
            _endTime
            );
    }

    /// @inheritdoc IBondDepositoryV1_5
    function changeCapacity(
        uint256 _marketId,
        bool _increaseFlag,
        uint256 _increaseAmount
    )   external override onlyPolicyOwner
        nonZero(_increaseAmount)
        existedMarket(_marketId)
    {
        LibBondDepository.Market storage _info = markets[_marketId];
        LibBondDepositoryV1_5.MarketInfo storage _marketInfo = marketInfos[_marketId];

        if (_increaseFlag) _info.capacity += _increaseAmount;
        else {
            if (_increaseAmount <= (_info.capacity - _marketInfo.totalSold) ) _info.capacity -= _increaseAmount;
            else _info.capacity -= (_info.capacity - _marketInfo.totalSold);
        }

        if ( (_info.capacity - _marketInfo.totalSold) <= remainingTosTolerance ) {
            _marketInfo.closed = true;
            emit ClosedMarket(_marketId);
        }

        emit ChangedCapacity(_marketId, _increaseFlag, _increaseAmount);
    }

    /// @inheritdoc IBondDepositoryV1_5
    function changeCloseTime(
        uint256 _marketId,
        uint256 closeTime
    )   external override onlyPolicyOwner
        existedMarket(_marketId)
    {
        require(closeTime > block.timestamp, "past closeTime");

        LibBondDepository.Market storage _info = markets[_marketId];
        _info.endSaleTime = closeTime;

        emit ChangedCloseTime(_marketId, closeTime);
    }

    /// @inheritdoc IBondDepositoryV1_5
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

    function setOracleLibrary(
        address _oralceLibrary
    )   external override onlyPolicyOwner
        nonZeroAddress(_oralceLibrary)
    {
        require(oracleLibrary != _oralceLibrary, "same address");
        oracleLibrary = _oralceLibrary;

        emit ChangedOracleLibrary(_oralceLibrary);
    }


    /// @inheritdoc IBondDepositoryV1_5
    function changePools(
        uint256 _marketId,
        address[] calldata _pools
    )   external override onlyPolicyOwner
        nonEndMarket(_marketId)
    {
        LibBondDepositoryV1_5.MarketInfo storage _info = marketInfos[_marketId];

        if (_info.pools.length > 0) {
            delete _info.pools;
        }

        if (_pools.length > 0) {
            _info.pools = new address[](_pools.length);
            for (uint256 i = 0; i < _pools.length; i++){
                _info.pools[] = _pools[i];
            }
        }

        emit ChangedPools(_marketId, _pools);
    }

    /// @inheritdoc IBondDepositoryV1_5
    function close(uint256 _id) public override onlyPolicyOwner existedMarket(_marketId) {
        // require(markets[_id].endSaleTime > 0, "empty market");
        require(
            markets[_id].endSaleTime > block.timestamp
            || markets[_id].capacity <= remainingTosTolerance
            || marketInfos[_id].closed, "already closed");

        LibBondDepositoryV1_5.MarketInfo storage _marketInfo = marketInfos[_id];
        _marketInfo.closed = true;
        emit ClosedMarket(_id);
    }

    ///////////////////////////////////////
    /// Anyone can use.
    //////////////////////////////////////

    /// @inheritdoc IBondDepositoryV1_5
    function ETHDepositWithoutStos(
        uint256 _id,
        uint256 _amount,
        uint8 _lockWeeks
    )
        external payable override
        nonEndMarket(_id)
        isEthMarket(_id)
        nonZero(_amount)
        returns (uint256 payout_)
    {
        require(msg.value == _amount, "Depository: ETH amounts do not match");

        uint256 _tosPrice = 0;

        (payout_, _tosPrice) = _deposit(msg.sender, _amount, _id, 0);

        uint256 stakeId = stakeByBondWithoutStos(address(staking)).stakeByBondWithoutStos(
            msg.sender,
            payout_,
            _id,
            _tosPrice,
            _lockWeeks
        );

        payable(treasury).transfer(msg.value);

        emit ETHDepositedWithoutStos(msg.sender, _id, stakeId, _amount, _lockWeeks, payout_);
    }


    /// @inheritdoc IBondDepositoryV1_5
    function ETHDepositWithSTOS(
        uint256 _id,
        uint256 _amount,
        uint8 _lockWeeks
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
        (payout_, _tosPrice) = _deposit(msg.sender, _amount, _id, _lockWeeks);

        uint256 stakeId = staking.stakeGetStosByBond(msg.sender, payout_, _id, uint256(_lockWeeks), _tosPrice);

        payable(treasury).transfer(msg.value);

        emit ETHDepositedWithSTOS(msg.sender, _id, stakeId, _amount, _lockWeeks, payout_);
    }


    function _deposit(
        address user,
        uint256 _amount,
        uint256 _marketId,
        uint8 _lockWeeks
    ) internal nonReentrant returns (uint256 _payout, uint256 bondingPrice) {
        LibBondDepository.Market memory market = markets[_marketId];

        (uint256 basePrice,,) = getBasePrice(_marketId);
        bondingPrice = getBondingPrice(_marketId, basePrice, _lockWeeks);
        _payout = ( _amount *  1e18 / bondingPrice);
        require(_payout + marketInfos[_marketId].totalSold <= market.capacity, "sales volume is lacking");

        uint256 mrAmount = _amount * IITreasury(treasury).getMintRate() / 1e18;
        require(mrAmount >= _payout, "mintableAmount is less than staking amount.");

        LibBondDepositoryV1_5.MarketInfo storage _marketInfo = marketInfos[_marketId];
        _marketInfo.totalSold += _payout;

        //check closing
        if (market.capacity - _marketInfo.totalSold <= remainingTosTolerance) {
           _marketInfo.closed = true;
           emit ClosedMarket(_marketId);
        }

        IITreasury(treasury).requestMint(mrAmount, _payout, true);

        emit Deposited(user, _marketId, _amount, _payout, true, mrAmount);
    }

    ///////////////////////////////////////
    /// VIEW
    //////////////////////////////////////

    /// @inheritdoc IBondDepositoryV1_5
    function getBonds() external override view
        returns (
            uint256[] memory,
            address[] memory,
            uint256[] memory,
            uint256[] memory,
            uint256[] memory,
            LibBondDepositoryV1_5.MarketInfo[] memory
        )
    {
        uint256 len = marketList.length;
        uint256[] memory _marketIds = new uint256[](len);
        address[] memory _quoteTokens = new address[](len);
        uint256[] memory _capacities = new uint256[](len);
        uint256[] memory _endSaleTimes = new uint256[](len);
        uint256[] memory _pricesTos = new uint256[](len);
        LibBondDepositoryV1_5.MarketInfo[] memory _marketInfo = new LibBondDepositoryV1_5.MarketInfo[](len);

        for (uint256 i = 0; i < len; i++){
            _marketIds[i] = marketList[i];
            _quoteTokens[i] = markets[_marketIds[i]].quoteToken;
            _capacities[i] = markets[_marketIds[i]].capacity;
            _endSaleTimes[i] = markets[_marketIds[i]].endSaleTime;
            _pricesTos[i] = markets[_marketIds[i]].tosPrice;
            _marketInfo[i] = marketInfos[_marketIds[i]];
        }
        return (_marketIds, _quoteTokens, _capacities, _endSaleTimes, _pricesTos, _marketInfo);
    }

    /// @inheritdoc IBondDepositoryV1_5
    function getMarketList() external override view returns (uint256[] memory) {
        return marketList;
    }

    /// @inheritdoc IBondDepositoryV1_5
    function totalMarketCount() external override view returns (uint256) {
        return marketList.length;
    }

    /// @inheritdoc IBondDepositoryV1_5
    function viewMarket(uint256 _marketId) external override view
        returns (
            address quoteToken,
            uint256 capacity,
            uint256 endSaleTime,
            uint256 maxPayout,
            uint256 tosPrice,
            LibBondDepositoryV1_5.MarketInfo memory marketInfo
            )
    {
        return (
            markets[_marketId].quoteToken,
            markets[_marketId].capacity,
            markets[_marketId].endSaleTime,
            markets[_marketId].maxPayout,
            markets[_marketId].tosPrice,
            marketInfos[_marketId]
        );
    }

    /// @inheritdoc IBondDepositoryV1_5
    function isOpened(uint256 _marketId) external override view returns (bool closedBool)
    {
        return
            (block.timestamp < markets[_marketId].endSaleTime
            && markets[_marketId].capacity > (marketInfos[_marketId].totalSold + remainingTosTolerance));
    }

    function getBondingPrice(uint256 _marketId, uint8 _lockWeeks)
        public override view
        returns (uint256 bondingPrice, uint256 basePrice, uint256 lowerPriceLimit, uint256 uniswapPrice)
    {
        (basePrice, lowerPriceLimit, uniswapPrice) = getBasePrice(_marketId);

        if (basePrice > 0 && _lockWeeks > 0) {

        }
    }

    function getBasePrice(uint256 _marketId)
        public override view
        returns (uint256 basePrice, uint256 lowerPriceLimit, uint256 uniswapPrice)
    {
        lowerPriceLimit = markets[_marketId].tosPrice;
        address[] memory pools = marketInfos[_marketId].pools;

        if (pools.length == 0){
            basePrice = lowerPriceLimit;
        } else {
            (, uint256 uniswapMaxPrice) = getUniswapPrice(pools);

            basePrice = Math.max(lowerPriceLimit, uniswapMaxPrice);
        }
    }

    function getUniswapPrice(address[] memory pools)
        public override view
        returns (uint256 poolCount, uint256 uniswapMaxPrice)
    {
        if (oracleLibrary != address(0)) {

            if (pools.length > 0) {
                int24 timeWeightedAverageTick = IIOracleLibrary(oracleLibrary).consult(pools[i], oracleConsultPeriod);

                address baseToken = address(0);
                address quoteToken = address(tos);
                if (address(tos) == IIIUniswapV3Pool(pools[i]).token0()) {
                    baseToken = IIIUniswapV3Pool(pools[i]).token1();
                } else if (address(tos) == IIIUniswapV3Pool(pools[i]).token1()) {
                    baseToken = IIIUniswapV3Pool(pools[i]).token0();
                }

                if (baseToken != address(0)) {
                    uint256 price = IIOracleLibrary(oracleLibrary).getQuoteAtTick(
                        IIOracleLibrary(oracleLibrary).consult(pools[i], oracleConsultPeriod),
                        1 ether,
                        baseToken,
                        quoteToken
                    );
                    poolCount++;
                    uniswapMaxPrice = Math.max(uniswapMaxPrice, price);
                }
            }
        }
    }
}
