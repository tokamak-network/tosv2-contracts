// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./BondDepositoryStorage.sol";
import "./common/ProxyAccessCommon.sol";
import "./BondDepositoryStorageV1_1.sol";

import "./libraries/SafeERC20.sol";

import "./interfaces/IBondDepositoryV1_1.sol";
import "./interfaces/IBondDepositoryEventV1_1.sol";

import "@openzeppelin/contracts/utils/math/Math.sol";
import "hardhat/console.sol";


interface IITreasury {
    function getMintRate() external view returns (uint256);
    function requestMint(uint256 _mintAmount, uint256 _payout, bool _distribute) external ;
    function addBondAsset(address _address) external;
}

contract BondDepositoryV1_1 is
    BondDepositoryStorage,
    ProxyAccessCommon,
    IBondDepositoryV1_1,
    IBondDepositoryEventV1_1,
    BondDepositoryStorageV1_1
{
    using SafeERC20 for IERC20;

    modifier nonEndMarket(uint256 id_) {
        require(marketCapacityInfos[id_].startTime < block.timestamp, "no start time yet");
        require(!marketCapacityInfos[id_].closed, "closed market");
        require(markets[id_].endSaleTime > block.timestamp, "BondDepository: closed market");
        require(markets[id_].capacity > marketCapacityInfos[id_].totalSold, "BondDepository: zero capacity" );
        _;
    }

    modifier isEthMarket(uint256 id_) {
        require(markets[id_].quoteToken == address(0) && markets[id_].endSaleTime > 0,
            "BondDepository: not ETH market"
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

    /// @inheritdoc IBondDepositoryV1_1
    function create(
        address _token,
        uint256[4] calldata _market,
        uint256 _startTime,
        uint256 _initialCapacity,
        uint256 _initialMaxPayout,
        uint256 _capacityUpdatePeriod,
        bool _availableBasicBond,
        bool _availableStosBond
    )
        external override
        onlyPolicyOwner
        nonZero(_market[0])
        nonZero(_market[2])
        nonZero(_market[3])
        nonZero(_startTime)
        returns (uint256 id_)
    {
        require(_capacityUpdatePeriod > 0 &&
            (_capacityUpdatePeriod == 1 || _capacityUpdatePeriod == 3600 ||  _capacityUpdatePeriod == 21600 ||
                _capacityUpdatePeriod == 43200 || (_capacityUpdatePeriod % 86400 == 0)
            ), "invalid capacityUpdatePeriod");
        require(_availableBasicBond || _availableStosBond, "both false _availableBasicBond & _availableStosBond");

        require(_market[0] > 100 ether, "need the totalSaleAmount > 100");
        require(_market[1] > _startTime && _market[1] > block.timestamp, "invalid endSaleTime");

        id_ = staking.generateMarketId();

        markets[id_] = LibBondDepository.Market({
                            quoteToken: _token,
                            capacity: _market[0],
                            endSaleTime: _market[1],
                            maxPayout: _market[3],
                            tosPrice: _market[2]
                        });

        marketList.push(id_);

        /// add v1.1
        // Market.capacity change the total capacity
        marketCapacityInfos[id_] = LibBondDepositoryV1_1.CapacityInfo(
            {
                startTime: _startTime,
                initialCapacity: _initialCapacity,
                initialMaxPayout: _initialMaxPayout,
                capacityUpdatePeriod: _capacityUpdatePeriod,
                totalSold: 0,
                availableBasicBond: _availableBasicBond,
                availableStosBond: _availableStosBond,
                closed: false
            }
        );

        if (_token != address(0)) IITreasury(treasury).addBondAsset(_token);

        emit CreatedMarket(
            id_,
            _token,
            _market,
            _startTime,
            _initialCapacity,
            _initialMaxPayout,
            _capacityUpdatePeriod,
            _availableBasicBond,
            _availableStosBond
            );
    }

     /// @inheritdoc IBondDepositoryV1_1
    function changeCapacity(
        uint256 _marketId,
        bool _increaseFlag,
        uint256 _increaseAmount
    )   external override onlyPolicyOwner
        nonZero(_increaseAmount)
        nonZeroPayout(_marketId)
    {
        LibBondDepository.Market storage _info = markets[_marketId];
        LibBondDepositoryV1_1.CapacityInfo storage _capacityInfo = marketCapacityInfos[_marketId];

        if (_increaseFlag) _info.capacity += _increaseAmount;
        else {
            if (_increaseAmount <= (_info.capacity - _capacityInfo.totalSold) ) _info.capacity -= _increaseAmount;
            else _info.capacity -= (_info.capacity - _capacityInfo.totalSold);
        }

        if ( (_info.capacity - _capacityInfo.totalSold) <= 100 ether ) {
            _capacityInfo.closed = true;
            emit ClosedMarket(_marketId);
        }

        emit ChangedCapacity(_marketId, _increaseFlag, _increaseAmount);
    }

    /// @inheritdoc IBondDepositoryV1_1
    function changeCloseTime(
        uint256 _marketId,
        uint256 closeTime
    )   external override onlyPolicyOwner
        //nonEndMarket(_marketId)
        //nonZero(closeTime)
        nonZeroPayout(_marketId)
    {
        require(closeTime > block.timestamp, "past closeTime");

        LibBondDepository.Market storage _info = markets[_marketId];
        _info.endSaleTime = closeTime;

        emit ChangedCloseTime(_marketId, closeTime);
    }

    /// @inheritdoc IBondDepositoryV1_1
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

    /// @inheritdoc IBondDepositoryV1_1
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

    /// @inheritdoc IBondDepositoryV1_1
    function close(uint256 _id) public override onlyPolicyOwner {
        require(markets[_id].endSaleTime > 0, "empty market");
        require(markets[_id].endSaleTime > block.timestamp || markets[_id].capacity == 0, "already closed");

        LibBondDepositoryV1_1.CapacityInfo storage _capacityInfo = marketCapacityInfos[_id];
        _capacityInfo.closed = true;
        emit ClosedMarket(_id);
    }

    ///////////////////////////////////////
    /// Anyone can use.
    //////////////////////////////////////

    /// @inheritdoc IBondDepositoryV1_1
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

        require(marketCapacityInfos[_id].availableBasicBond, "unavailable in basic bond");

        uint256 _tosPrice = 0;

        (payout_, _tosPrice) = _deposit(msg.sender, _amount, _id, 0);

        uint256 stakeId = staking.stakeByBond(msg.sender, payout_, _id, _tosPrice);

        payable(treasury).transfer(msg.value);

        emit ETHDeposited(msg.sender, _id, stakeId, _amount, payout_);
    }


    /// @inheritdoc IBondDepositoryV1_1
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
        require(marketCapacityInfos[_id].availableStosBond, "unavailable in lockup bond");

        require(_lockWeeks > 1, "_lockWeeks must be greater than 1 week.");
        uint256 _tosPrice = 0;
        (payout_, _tosPrice) = _deposit(msg.sender, _amount, _id, _lockWeeks);

        uint256 stakeId = staking.stakeGetStosByBond(msg.sender, payout_, _id, _lockWeeks, _tosPrice);

        payable(treasury).transfer(msg.value);

        emit ETHDepositedWithSTOS(msg.sender, _id, stakeId, _amount, _lockWeeks, payout_);
    }


    function _deposit(
        address user,
        uint256 _amount,
        uint256 _marketId,
        uint256 _lockWeeks
    ) internal nonReentrant returns (uint256 _payout, uint256 _tosPrice) {
        LibBondDepository.Market memory market = markets[_marketId];
        _tosPrice = market.tosPrice;

        _payout = LibBondDepositoryV1_1.calculateTosAmountForAsset(_tosPrice, _amount, 18);
        require(_payout > 0, "zero staking amount");

        //-------------------------
        // v1.1
        require(_payout <= maximumPurchasableAmountAtOneTime(_marketId, _lockWeeks), "exceed currentCapacityLimit");
        //-------------------------

        uint256 mrAmount = _amount * IITreasury(treasury).getMintRate() / 1e18;
        require(mrAmount >= _payout, "mintableAmount is less than staking amount.");
        require(_payout <= (market.capacity - marketCapacityInfos[_marketId].totalSold), "Depository: sold out");

        LibBondDepositoryV1_1.CapacityInfo storage capacityInfo = marketCapacityInfos[_marketId];
        capacityInfo.totalSold += _payout;

        //check closing
        if (market.capacity - capacityInfo.totalSold <= 100 ether) {
           capacityInfo.closed = true;
           emit ClosedMarket(_marketId);
        }

        IITreasury(treasury).requestMint(mrAmount, _payout, true);

        emit Deposited(user, _marketId, _amount, _payout, true, mrAmount);
    }

    ///////////////////////////////////////
    /// VIEW
    //////////////////////////////////////

    /// @inheritdoc IBondDepositoryV1_1
    function getBonds() external override view
        returns (
            uint256[] memory,
            address[] memory,
            uint256[] memory,
            uint256[] memory,
            uint256[] memory,
            LibBondDepositoryV1_1.CapacityInfo[] memory
        )
    {
        uint256 len = marketList.length;
        uint256[] memory _marketIds = new uint256[](len);
        address[] memory _quoteTokens = new address[](len);
        uint256[] memory _capacities = new uint256[](len);
        uint256[] memory _endSaleTimes = new uint256[](len);
        uint256[] memory _pricesTos = new uint256[](len);
        LibBondDepositoryV1_1.CapacityInfo[] memory _capacityInfos = new LibBondDepositoryV1_1.CapacityInfo[](len);

        for (uint256 i = 0; i < len; i++){
            _marketIds[i] = marketList[i];
            _quoteTokens[i] = markets[_marketIds[i]].quoteToken;
            _capacities[i] = markets[_marketIds[i]].capacity;
            _endSaleTimes[i] = markets[_marketIds[i]].endSaleTime;
            _pricesTos[i] = markets[_marketIds[i]].tosPrice;
            _capacityInfos[i] = marketCapacityInfos[i];
        }
        return (_marketIds, _quoteTokens, _capacities, _endSaleTimes, _pricesTos, _capacityInfos);
    }

    /// @inheritdoc IBondDepositoryV1_1
    function getMarketList() external override view returns (uint256[] memory) {
        return marketList;
    }

    /// @inheritdoc IBondDepositoryV1_1
    function totalMarketCount() external override view returns (uint256) {
        return marketList.length;
    }

    /// @inheritdoc IBondDepositoryV1_1
    function viewMarket(uint256 _marketId) external override view
        returns (
            address quoteToken,
            uint256 capacity,
            uint256 endSaleTime,
            uint256 maxPayout,
            uint256 tosPrice,
            LibBondDepositoryV1_1.CapacityInfo memory capacityInfo
            )
    {
        return (
            markets[_marketId].quoteToken,
            markets[_marketId].capacity,
            markets[_marketId].endSaleTime,
            markets[_marketId].maxPayout,
            markets[_marketId].tosPrice,
            marketCapacityInfos[_marketId]
        );
    }

    /// @inheritdoc IBondDepositoryV1_1
    function isOpened(uint256 _marketId) external override view returns (bool closedBool)
    {
        return block.timestamp < markets[_marketId].endSaleTime && markets[_marketId].capacity > 0;
    }

    /// @inheritdoc IBondDepositoryV1_1
    function maximumPurchasableAmountAtOneTime(
        uint256 _marketId,
        uint256 _periodWeeks
    )
        public override view returns (uint256 maximumAmount_)
    {
        if (block.timestamp > marketCapacityInfos[_marketId].startTime && block.timestamp < markets[_marketId].endSaleTime) {
            (, uint256 currentCapacity) = possibleMaxCapacity(_marketId);
            uint256 _maxPayoutPerLockUpPeriod = maxPayoutPerLockUpPeriod(_marketId, _periodWeeks);
            maximumAmount_ = Math.max(currentCapacity, _maxPayoutPerLockUpPeriod);
        }
    }

    /// @inheritdoc IBondDepositoryV1_1
    function maxPayoutPerLockUpPeriod (
        uint256 _marketId,
        uint256 _periodWeeks
    )
        public override view returns (uint256 _maxPayoutPerLockUpPeriod)
    {
        LibBondDepository.Market memory market = markets[_marketId];
        LibBondDepositoryV1_1.CapacityInfo memory capacityInfo = marketCapacityInfos[_marketId];

        if (_periodWeeks == 0) {
            _maxPayoutPerLockUpPeriod = market.maxPayout;
        } else {
            if(_periodWeeks > 156) _periodWeeks = 156;
            _maxPayoutPerLockUpPeriod = capacityInfo.initialMaxPayout + market.maxPayout * (_periodWeeks-1) / 155;
        }
    }

    /// @inheritdoc IBondDepositoryV1_1
    function possibleMaxCapacity (
        uint256 _marketId
    )
        public override view returns (uint256 dailyCapacity, uint256 currentCapacity)
    {
        (uint256 _totalSaleDays, uint256 _curWhatDays) = saleDays(_marketId);

        LibBondDepository.Market memory market = markets[_marketId];
        LibBondDepositoryV1_1.CapacityInfo memory capacityInfo = marketCapacityInfos[_marketId];

        if (_totalSaleDays > 0)
            dailyCapacity = capacityInfo.initialCapacity + (market.capacity / (_totalSaleDays-1));

        if (_curWhatDays > 0)
            currentCapacity = capacityInfo.initialCapacity + (market.capacity * (_curWhatDays-1) / (_totalSaleDays-1)) - capacityInfo.totalSold;

    }

    /// @inheritdoc IBondDepositoryV1_1
    function saleDays(uint256 _marketId) public override view returns (uint256 totalSaleDays, uint256 curWhatDays) {

        LibBondDepositoryV1_1.CapacityInfo memory capacityInfo = marketCapacityInfos[_marketId];

        if (capacityInfo.startTime > 0){
            LibBondDepository.Market memory market = markets[_marketId];

            if (market.endSaleTime > capacityInfo.startTime){
                uint256 periodSeconds = market.endSaleTime - capacityInfo.startTime;
                totalSaleDays = periodSeconds /  capacityInfo.capacityUpdatePeriod;
                if (capacityInfo.capacityUpdatePeriod > 1 && periodSeconds % capacityInfo.capacityUpdatePeriod > 0)
                    totalSaleDays++;

                if (block.timestamp > capacityInfo.startTime && block.timestamp < market.endSaleTime ) {
                    curWhatDays = (block.timestamp - capacityInfo.startTime) / capacityInfo.capacityUpdatePeriod;

                    uint256 passedTime = (block.timestamp - capacityInfo.startTime) % capacityInfo.capacityUpdatePeriod ;
                    if (capacityInfo.capacityUpdatePeriod > 1 && passedTime > 0) curWhatDays++;
                }
            }
        }
    }

}
