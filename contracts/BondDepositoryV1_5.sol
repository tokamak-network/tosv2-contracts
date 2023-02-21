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

interface IIOracleLibrary {
    function getOutAmountsCurTick(address factory, bytes memory _path, uint256 _amountIn)
        external view returns (uint256 amountOut);
}

interface IIBonusRateLockUpMap {
    function getRatesByWeeks(uint256 id, uint8 _weeks) external view returns (uint16 rates) ;
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

    modifier nonZeroUint32(uint32 value) {
        require(
            value != 0,
            "zero value"
        );
        _;
    }

    constructor() {
        remainingTosTolerance = 100 ether;
    }

    /// @inheritdoc IBondDepositoryV1_5
    function create(
        address _token,
        uint256[4] calldata _marketInfos,
        address _bonusRatesAddress,
        uint256 _bonusRatesId,
        uint32 _startTime,
        uint32 _endTime,
        bytes[] calldata _pathes
    )
        external override
        onlyPolicyOwner
        nonZero(_marketInfos[1])
        nonZero(_marketInfos[3])
        nonZeroUint32(_startTime)
        nonZeroUint32(_endTime)
        returns (uint256 id_)
    {
        //0. uint256 _capacity,
        //1. uint256 _lowerPriceLimit,
        //2. uint256 _initialMaxPayout,
        //3. uint256 _capacityUpdatePeriod,
        require(_marketInfos[0] > remainingTosTolerance, "totalSaleAmount is too small.");
        require(_endTime > _startTime && _endTime > uint16(block.timestamp), "invalid _startTime or endSaleTime");

        id_ = staking.generateMarketId();

        markets[id_] = LibBondDepository.Market({
                            quoteToken: _token,
                            capacity: _marketInfos[0],
                            endSaleTime: uint256(_endTime),
                            maxPayout: 0,
                            tosPrice: _marketInfos[1]
                        });

        marketList.push(id_);

        /// add v1.5
        // Market.capacity change the total capacity
        marketInfos[id_] = LibBondDepositoryV1_5.MarketInfo(
            {
                bondType: uint8(LibBondDepositoryV1_5.BOND_TYPE.MINTING_V1_5),
                startTime: _startTime,
                closed: false,
                initialMaxPayout: _marketInfos[2],
                capacityUpdatePeriod: _marketInfos[3],
                totalSold: 0
            }
        );

        if (_bonusRatesAddress != address(0) && _bonusRatesId != 0) {
            bonusRateInfos[id_] = LibBondDepositoryV1_5.BonusRateInfo(
                {
                    bonusRatesAddress: _bonusRatesAddress,
                    bonusRatesId: _bonusRatesId
                }
            );
        }

        if (_pathes.length != 0) {
            pricePathInfos[id_] = new bytes[](_pathes.length);
            for (uint256 i = 0; i < _pathes.length; i++){
                pricePathInfos[id_][i] = _pathes[i];
            }
        }

        if (_token != address(0)) IITreasury(treasury).addBondAsset(_token);

        emit CreatedMarket(
            id_,
            _token,
            _marketInfos,
            _bonusRatesAddress,
            _bonusRatesId,
            _startTime,
            _endTime,
            _pathes
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
    function changeLowerPriceLimit(
        uint256 _marketId,
        uint256 _tosPrice
    )   external override onlyPolicyOwner
        nonEndMarket(_marketId)
        nonZero(_tosPrice)
    {
        LibBondDepository.Market storage _info = markets[_marketId];
        _info.tosPrice = _tosPrice;

        emit ChangedLowerPriceLimit(_marketId, _tosPrice);
    }

    /// @inheritdoc IBondDepositoryV1_5
    function changeOracleLibrary(
        address _oralceLibrary,
        address _uniswapFactory
    )   external override onlyPolicyOwner
        nonZeroAddress(_oralceLibrary)
    {
        require(oracleLibrary != _oralceLibrary || uniswapFactory != _uniswapFactory, "same address");
        oracleLibrary = _oralceLibrary;
        uniswapFactory = _uniswapFactory;

        emit ChangedOracleLibrary(_oralceLibrary, _uniswapFactory);
    }

    /// @inheritdoc IBondDepositoryV1_5
    function changeBonusRateInfo(
        uint256 _marketId,
        address _bonusRatesAddress,
        uint256 _bonusRatesId
    )   external override onlyPolicyOwner
        nonEndMarket(_marketId)
        nonZeroAddress(_bonusRatesAddress)
        nonZero(_bonusRatesId)
    {

        require(
            !(bonusRateInfos[_marketId].bonusRatesAddress == _bonusRatesAddress
            && bonusRateInfos[_marketId].bonusRatesId == _bonusRatesId),
            "same info");

        bonusRateInfos[_marketId] = LibBondDepositoryV1_5.BonusRateInfo(
            {
                bonusRatesAddress: _bonusRatesAddress,
                bonusRatesId: _bonusRatesId
            }
        );

        emit ChangedBonusRateInfo(_marketId, _bonusRatesAddress, _bonusRatesId);
    }


    /// @inheritdoc IBondDepositoryV1_5
    function changePricePathInfo(
        uint256 _marketId,
        bytes[] memory pathes
    )   external override onlyPolicyOwner
        nonEndMarket(_marketId)
    {
        if (pricePathInfos[_marketId].length != 0) {
            for (uint256 i = (pricePathInfos[_marketId].length-1); i > 0 ; i--){
                pricePathInfos[_marketId].pop();
            }
            pricePathInfos[_marketId].pop();
            delete pricePathInfos[_marketId];
        }

        if (pathes.length != 0) {
            pricePathInfos[_marketId] = new bytes[](pathes.length);
            for (uint256 i = 0; i < pathes.length; i++){
                pricePathInfos[_marketId][i] = pathes[i];
            }
        }

        emit ChangedPricePathInfo(_marketId, pathes);
    }

    /// @inheritdoc IBondDepositoryV1_5
    function close(uint256 _id) public override onlyPolicyOwner existedMarket(_id) {
        // require(markets[_id].endSaleTime > 0, "empty market");
        require(
            markets[_id].endSaleTime > block.timestamp
            || markets[_id].capacity <= remainingTosTolerance
            || marketInfos[_id].closed, "already closed");

        LibBondDepositoryV1_5.MarketInfo storage _marketInfo = marketInfos[_id];
        _marketInfo.closed = true;
        emit ClosedMarket(_id);
    }

    /// @inheritdoc IBondDepositoryV1_5
    function changeRemainingTosTolerance(uint256 _amount) external override onlyPolicyOwner {
        require(remainingTosTolerance != _amount, "same amount");
        remainingTosTolerance = _amount;
        emit ChangedRemainingTosTolerance(_amount);
    }

    ///////////////////////////////////////
    /// Anyone can use.
    //////////////////////////////////////

    /// @inheritdoc IBondDepositoryV1_5
    function ETHDeposit(
        uint256 _id,
        uint256 _amount,
        uint256 _minimumTosPrice
    )
        external payable override
        nonEndMarket(_id)
        isEthMarket(_id)
        nonZero(_amount)
        returns (uint256 payout_)
    {
        require(msg.value == _amount, "Depository: ETH amounts do not match");

        uint256 _tosPrice = 0;

        (payout_, _tosPrice) = _deposit(msg.sender, _amount, _minimumTosPrice, _id, 0);

        uint256 stakeId = staking.stakeByBond(
            msg.sender,
            payout_,
            _id,
            _tosPrice
        );

        payable(treasury).transfer(msg.value);

        emit ETHDeposited(msg.sender, _id, stakeId, _amount, _minimumTosPrice, payout_);
    }


    /// @inheritdoc IBondDepositoryV1_5
    function ETHDepositWithSTOS(
        uint256 _id,
        uint256 _amount,
        uint256 _minimumTosPrice,
        uint8 _lockWeeks
    )
        external payable override
        nonEndMarket(_id)
        isEthMarket(_id)
        nonZero(_amount)
        returns (uint256 payout_)
    {
        require(msg.value == _amount, "Depository: ETH amounts do not match");

        require(_lockWeeks > 1, "_lockWeeks must be greater than 1 week.");
        uint256 _tosPrice = 0;
        (payout_, _tosPrice) = _deposit(msg.sender, _amount, _minimumTosPrice, _id, _lockWeeks);

        uint256 stakeId = staking.stakeGetStosByBond(msg.sender, payout_, _id, uint256(_lockWeeks), _tosPrice);

        payable(treasury).transfer(msg.value);

        emit ETHDepositedWithSTOS(msg.sender, _id, stakeId, _amount, _minimumTosPrice, _lockWeeks, payout_);
    }


    function _deposit(
        address user,
        uint256 _amount,
        uint256 _minimumTosPrice,
        uint256 _marketId,
        uint8 _lockWeeks
    ) internal nonReentrant returns (uint256 _payout, uint256 bondingPrice) {

        LibBondDepository.Market memory market = markets[_marketId];

        // 이더당 tos 양
        (uint256 basePrice, , ) = getBasePrice(_marketId);

        // 이더당 토스양 , 락업을 많이 할 수록 토스를 더 많이 받을 수 있다.
        bondingPrice = getBondingPrice(_marketId, _lockWeeks, basePrice);

        require(bondingPrice >= _minimumTosPrice, "The bonding amount is less than the minimum amount.");

        _payout = (_amount * bondingPrice / 1e18);
        require(_payout + marketInfos[_marketId].totalSold <= market.capacity, "sales volume is lacking");

        (, uint256 currentCapacity) = possibleMaxCapacity(_marketId);

        require(_payout <= currentCapacity, "exceed currentCapacityLimit");

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
            LibBondDepository.Market[] memory,
            LibBondDepositoryV1_5.MarketInfo[] memory,
            LibBondDepositoryV1_5.BonusRateInfo[] memory
        )
    {
        uint256 len = marketList.length;

        uint256[] memory _marketIds = new uint256[](len);
        LibBondDepository.Market[] memory _markets = new LibBondDepository.Market[](len);
        LibBondDepositoryV1_5.BonusRateInfo[] memory _bonusInfo = new LibBondDepositoryV1_5.BonusRateInfo[](len);
        LibBondDepositoryV1_5.MarketInfo[] memory _marketInfo = new LibBondDepositoryV1_5.MarketInfo[](len);

        for (uint256 i = 0; i < len; i++){
            uint256 id = marketList[i];
            _marketIds[i] = id;
            _markets[i] = markets[id];
            _marketInfo[i] = marketInfos[id];
            _bonusInfo[i] = bonusRateInfos[id];
        }
        return (_marketIds, _markets, _marketInfo, _bonusInfo);
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
            LibBondDepository.Market memory market,
            LibBondDepositoryV1_5.MarketInfo memory marketInfo,
            LibBondDepositoryV1_5.BonusRateInfo memory bonusInfo,
            bytes[] memory pricePathes
            )
    {
        return (
            markets[_marketId],
            marketInfos[_marketId],
            bonusRateInfos[_marketId],
            pricePathInfos[_marketId]
        );
    }

    /// @inheritdoc IBondDepositoryV1_5
    function isOpened(uint256 _marketId) external override view returns (bool closedBool)
    {
        return
            (block.timestamp < markets[_marketId].endSaleTime
            && markets[_marketId].capacity > (marketInfos[_marketId].totalSold + remainingTosTolerance));
    }


    function getBondingPrice(uint256 _marketId, uint8 _lockWeeks, uint256 basePrice)
        public override view
        returns (uint256 bondingPrice)
    {
        (basePrice,,) = getBasePrice(_marketId);

        if (basePrice > 0 && _lockWeeks > 0) {
            LibBondDepositoryV1_5.BonusRateInfo memory bonusInfo = bonusRateInfos[_marketId];
            if (bonusInfo.bonusRatesAddress != address(0) && bonusInfo.bonusRatesId != 0) {
                uint16 rates = IIBonusRateLockUpMap(bonusInfo.bonusRatesAddress).getRatesByWeeks(bonusInfo.bonusRatesId, _lockWeeks);
                if (rates > 0) {
                    bondingPrice = basePrice + (basePrice * uint256(rates) / 10000) ;
                }
            }
        }

        if (bondingPrice == 0) bondingPrice = basePrice;
    }

    function getBasePrice(uint256 _marketId)
        public override view
        returns (uint256 basePrice, uint256 lowerPriceLimit, uint256 uniswapPrice)
    {
        lowerPriceLimit = markets[_marketId].tosPrice;
        uniswapPrice = getUniswapPrice(_marketId);
        basePrice = Math.max(lowerPriceLimit, uniswapPrice);
    }

    function getUniswapPrice(uint256 _marketId)
        public override view
        returns (uint256 uniswapPrice)
    {
        bytes[] memory pathes = pricePathInfos[_marketId];
        if (pathes.length > 0){
            uint256 prices = 0;
            for (uint256 i = 0; i < pathes.length; i++){

                prices = IIOracleLibrary(oracleLibrary).getOutAmountsCurTick(uniswapFactory, pathes[i], 1 ether);

                if (i == 0) uniswapPrice = prices;
                else uniswapPrice = Math.min(uniswapPrice, prices);
            }
        }
    }

    /// @inheritdoc IBondDepositoryV1_5
    function possibleMaxCapacity (
        uint256 _marketId
    )
        public override view returns (uint256 periodicCapacity, uint256 currentCapacity)
    {
        (uint256 _numberOfPeriods, uint256 _numberOfPeriodsPassed) = salePeriod(_marketId);

        LibBondDepository.Market memory market = markets[_marketId];
        LibBondDepositoryV1_5.MarketInfo memory capacityInfo = marketInfos[_marketId];

        if (_numberOfPeriods > 0)
            periodicCapacity = market.capacity / _numberOfPeriods;

        if (_numberOfPeriodsPassed > 0 && periodicCapacity * _numberOfPeriodsPassed > capacityInfo.totalSold)
                currentCapacity = periodicCapacity * _numberOfPeriodsPassed - capacityInfo.totalSold;
    }

    /// @inheritdoc IBondDepositoryV1_5
    function salePeriod(uint256 _marketId) public override view returns (uint256 numberOfPeriods, uint256 numberOfPeriodsPassed) {

        LibBondDepositoryV1_5.MarketInfo memory capacityInfo = marketInfos[_marketId];

        if (capacityInfo.startTime > 0){
            LibBondDepository.Market memory market = markets[_marketId];

            if (market.endSaleTime > capacityInfo.startTime){
                uint256 periodSeconds = market.endSaleTime - capacityInfo.startTime;
                numberOfPeriods = periodSeconds /  capacityInfo.capacityUpdatePeriod;
                if (capacityInfo.capacityUpdatePeriod > 1 && periodSeconds % capacityInfo.capacityUpdatePeriod > 0)
                    numberOfPeriods++;

                if (block.timestamp > capacityInfo.startTime && block.timestamp < market.endSaleTime ) {
                    numberOfPeriodsPassed = (block.timestamp - capacityInfo.startTime) / capacityInfo.capacityUpdatePeriod;

                    uint256 passedTime = (block.timestamp - capacityInfo.startTime) % capacityInfo.capacityUpdatePeriod ;
                    if (capacityInfo.capacityUpdatePeriod > 1 && passedTime > 0) numberOfPeriodsPassed++;
                }
            }
        }
    }

}
