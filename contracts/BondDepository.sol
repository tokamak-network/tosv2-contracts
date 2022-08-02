// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./BondDepositoryStorage.sol";
import "./common/ProxyAccessCommon.sol";

import "./libraries/SafeERC20.sol";

import "./interfaces/IBondDepository.sol";
import "./interfaces/IBondDepositoryEvent.sol";

import "@openzeppelin/contracts/utils/math/Math.sol";
import "hardhat/console.sol";

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
        returns (bool existedWethPool, bool existedTosPool,  uint256 priceWethOrTosPerAsset, uint256 convertedAmmount);
}

interface IITreasury {

    function getETHPricePerTOS() external view returns (uint256 price);
    function getMintRate() external view returns (uint256);
    function mintRateDenominator() external view returns (uint256);

    function requestMintAndTransfer(uint256 _mintAmount, address _recipient, uint256 _transferAmount, bool _distribute) external ;
    function addBondAsset(
        address _address,
        address _tosPooladdress,
        uint24 _fee
    ) external;
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
        require(metadata[id_].totalSaleAmount > 0 && metadata[id_].ethMarket,
            "BondDepository: not ETH market"
        );
        _;
    }

    modifier nonEthMarket(uint256 id_) {
        require(
            markets[id_].quoteToken != address(0) && metadata[id_].totalSaleAmount > 0 && !metadata[id_].ethMarket,
            "BondDepository: ETH market"
        );
        _;
    }

    constructor() {

    }

    ///////////////////////////////////////
    /// onlyPolicyOwner
    //////////////////////////////////////

    function tokenInUniswapV3Pool(address pool, address token0) public view returns (bool) {

       if (IUniswapV3Pool(pool).token0() == token0 || IUniswapV3Pool(pool).token1() == token0 ) return true;
       else return false;
    }

    /// @inheritdoc IBondDepository
    function create(
        bool _check,
        address _token,
        address _poolAddress,
        uint24 _fee,
        uint256[5] memory _market
    )
        external
        override
        onlyPolicyOwner
        nonZero(_market[0])
        nonZero(_market[2])
        nonZero(_market[3])
        nonZero(_market[4])
        returns (uint256 id_)
    {
        id_ = staking.generateMarketId();  // BondDepository는 staking의 오너로 등록이 되어야 함.

        if (_check) require(_token == address(0), "when use eth, token must be zero address");
        else require(_token != address(0), "zero address");

        require(_market[1] > block.timestamp, "sale end time has passed.");
        if(!_check) require(_fee > 0, "zero fee");

        require(markets[id_].endSaleTime == 0 && metadata[id_].totalSaleAmount == 0, "already registered market and metadata");

        if(!_check) require(tokenInUniswapV3Pool(_poolAddress, _token), "not token pair pool");

        // 총토스할당량, tosPrice, capacity, totalSaleAmount는 관리자가 변경할 수 있게해야함 (capacity, totalSaleAmount는 한 변수 입력에 변경가능하게)
        markets[id_] = LibBondDepository.Market({
                            method: _check,
                            quoteToken: _token,
                            capacity: _market[0],
                            endSaleTime: _market[1],
                            sold: 0,
                            maxPayout: _market[4]
                        });

        metadata[id_] = LibBondDepository.Metadata({
                    poolAddress: _poolAddress,
                    tokenPrice: _market[2],
                    tosPrice: _market[3],
                    totalSaleAmount: _market[0],
                    fee: _fee,
                    ethMarket: _check
                });

        marketList.push(id_);
        metadataList.push(id_);
        IITreasury(treasury).addBondAsset(_token, _poolAddress, _fee);

        emit CreatedMarket(id_, _check, _token, _poolAddress, _fee, _market);
    }


    function increaseCapacity(
        uint256 _marketId,
        uint256 _amount
    )   external override onlyPolicyOwner
        // nonEndMarket(_marketId)
        nonZero(_amount)
    {
        LibBondDepository.Market storage _info = markets[_marketId];
        _info.capacity += _amount;

        LibBondDepository.Metadata storage _metadata = metadata[_marketId];
        require(_info.maxPayout > 0, "non-exist market");
        _metadata.totalSaleAmount += _amount;

        emit IncreasedCapacity(_marketId, _amount);
    }

    function decreaseCapacity(
        uint256 _marketId,
        uint256 _amount
    ) external override onlyPolicyOwner
        // nonEndMarket(_marketId)
        nonZero(_amount)
    {
        require(markets[_marketId].capacity > _amount, "not enough capacity");
        LibBondDepository.Market storage _info = markets[_marketId];
        require(_info.maxPayout > 0, "non-exist market");

        _info.capacity -= _amount;

        LibBondDepository.Metadata storage _metadata = metadata[_marketId];
        _metadata.totalSaleAmount -= _amount;

        emit DecreasedCapacity(_marketId, _amount);
    }

    function changeCloseTime(
        uint256 _marketId,
        uint256 closeTime
    )   external override onlyPolicyOwner
        //nonEndMarket(_marketId)
        //nonZero(closeTime)
    {
        require(closeTime > block.timestamp, "past closeTime");
        LibBondDepository.Market storage _info = markets[_marketId];
        require(_info.maxPayout > 0, "non-exist market");
        _info.endSaleTime = closeTime;

        emit ChangedCloseTime(_marketId, closeTime);
    }

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

    function changePrice(
        uint256 _marketId,
        uint256 _tokenPrice,
        uint256 _tosPrice
    )   external override onlyPolicyOwner
        nonEndMarket(_marketId)
        nonZero(_tokenPrice)
        nonZero(_tosPrice)
    {
        LibBondDepository.Metadata storage _metadata = metadata[_marketId];
        _metadata.tokenPrice = _tokenPrice;
        _metadata.tosPrice = _tosPrice;

        emit ChangedPrice(_marketId, _tokenPrice, _tosPrice);
    }

    /// @inheritdoc IBondDepository
    function close(uint256 _id) external override onlyPolicyOwner {
        require(markets[_id].endSaleTime > 0, "empty market");
        require(markets[_id].endSaleTime > block.timestamp || markets[_id].capacity == 0, "already closed");
        markets[_id].endSaleTime = block.timestamp;
        markets[_id].capacity = 0;
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
        returns (
            uint256 payout_,
            uint256 index_
        )
    {
        require(msg.value == _amount, "Depository : ETH value not same");

        (payout_) = _deposit(msg.sender, _amount, _id, true);

        uint256 id = _id;
        uint256 stakeId = staking.stakeByBond(msg.sender, payout_, id, metadata[id].tokenPrice, metadata[id].tosPrice);

        index_ = deposits[msg.sender].length;

        deposits[msg.sender].push(LibBondDepository.Deposit(id, stakeId));

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
        returns (
            uint256 payout_,
            uint256 index_
        )
    {
        require(msg.value == _amount, "Depository : ETH value not same");

        (payout_) = _deposit(msg.sender, _amount, _id, true);

        uint256 id = _id;
        uint256 stakeId = staking.stakeGetStosByBond(msg.sender, payout_, id, _lockWeeks, metadata[id].tokenPrice, metadata[id].tosPrice);

        index_ = deposits[msg.sender].length;

        deposits[msg.sender].push(LibBondDepository.Deposit(id, stakeId));

        payable(treasury).transfer(msg.value);

        emit ETHDepositedWithSTOS(msg.sender, id, stakeId, _amount, _lockWeeks, payout_);
    }


    function _deposit(
        address user,
        uint256 _amount,
        uint256 _marketId,
        bool _eth
    ) internal nonReentrant returns (uint256 _payout) {
        console.log("_deposit _amount : %s", _amount);
        require(_amount <= purchasableAseetAmountAtOneTime(_marketId), "Depository : over maxPay");

        _payout = calculateTosAmountForAsset(_marketId, _amount);

        console.log("_deposit payoutAmount : %s", _payout);

        require(_payout > 0, "zero staking amount");
        uint256 _ethValue = 0; // _payout tos 를 이더로 바꿈.

        if(!_eth) {
            (bool existedWethPool, bool existedTosPool, , uint256 convertedAmmount) =
                IITOSValueCalculator(calculator).convertAssetBalanceToWethOrTos(address(tos), _payout);

            if(existedWethPool){
                _ethValue =  convertedAmmount;
                console.log("_deposit existedWethPool : %s", convertedAmmount);
            }
            /*
            else if(existedTosPool) {
                uint256 _price = IITreasury(treasury).getETHPricePerTOS();
                console.log("_deposit getETHPricePerTOS : %s", _price);
                _ethValue =  convertedAmmount * _price / 1e18 ;
                console.log("_deposit existedTosPool : %s", convertedAmmount);
            }
            */
        } else {
            _ethValue = _amount;
        }

        console.log("_deposit _ethValue : %s", _ethValue);

        require(_ethValue > 0, "zero _ethValue");
        uint256 _mintRate = IITreasury(treasury).getMintRate();

        console.log("_deposit _mintRate : %s", _mintRate);
        require(_mintRate > 0, "zero mintRate");

        uint256 mrAmount = _ethValue * _mintRate / IITreasury(treasury).mintRateDenominator() ;
        require(mrAmount >= _payout, "mintableAmount is less than staking amount.");
        require(_payout <= markets[_marketId].capacity, "Depository : sold out");

        LibBondDepository.Market storage market = markets[_marketId];

        market.capacity -= _payout;
        market.sold += _payout;

        //check closing
        if (metadata[_marketId].totalSaleAmount <= market.sold) {
           market.capacity = 0;
           emit ClosedMarket(_marketId);
        }

        if (deposits[user].length == 0) userList.push(user);
        totalDepositCount++;

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
        console.log("calculateTosAmountForAsset metadata[_id].tosPrice : %s", metadata[_id].tosPrice);
        return (_amount * metadata[_id].tosPrice / 1e18);
    }

    /// @inheritdoc IBondDepository
    function purchasableAseetAmountAtOneTime(uint256 _id) public override view returns (uint256 maxpayout_) {
        console.log("purchasableAseetAmountAtOneTime metadata[_id].tokenPrice : %s", metadata[_id].tokenPrice);
        return ( markets[_id].maxPayout * metadata[_id].tokenPrice / 1e18 );
    }

    /// @inheritdoc IBondDepository
    function getBonds() public override view
        returns (
            uint256[] memory,
            address[] memory,
            uint256[] memory,
            uint256[] memory,
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
        uint256[] memory _pricesToken = new uint256[](len);
        uint256[] memory _pricesTos = new uint256[](len);
        //uint256[] memory _maxpayouts = new uint256[](len);
        uint256[] memory _totalSaleAmounts = new uint256[](len);

        for (uint256 i = 0; i< len; i++){
            _marketIds[i] = marketList[i];
            _quoteTokens[i] = markets[i].quoteToken;
            _capacities[i] = markets[i].capacity;
            //_maxpayouts[i] = markets[i].maxPayout;
            _endSaleTimes[i] = markets[i].endSaleTime;
            _pricesToken[i] = metadata[i].tokenPrice;
            _pricesTos[i] = metadata[i].tosPrice;
            _totalSaleAmounts[i] = metadata[i].totalSaleAmount;
        }
        return (_marketIds, _quoteTokens, _capacities, _endSaleTimes, _pricesToken, _pricesTos, _totalSaleAmounts);
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
            bool method,
            address quoteToken,
            uint256 capacity,
            uint256 endSaleTime,
            uint256 sold,
            uint256 maxPayout
            )
    {
        return (
            markets[_index].method,
            markets[_index].quoteToken,
            markets[_index].capacity,
            markets[_index].endSaleTime,
            markets[_index].sold,
            markets[_index].maxPayout
        );
    }

    /// @inheritdoc IBondDepository
    function isOpend(uint256 _index) public override view returns (bool closedBool)
    {
        if (block.timestamp < markets[_index].endSaleTime && markets[_index].capacity > 0) {
            return true;
        } else {
            return false;
        }
    }

    /// @inheritdoc IBondDepository
    function getMetadataList() public override view returns (uint256[] memory) {
        return metadataList;
    }

    /// @inheritdoc IBondDepository
    function totalMetadataCount() public override view returns (uint256) {
        return metadataList.length;
    }

    /// @inheritdoc IBondDepository
    function viewMetadata(uint256 _index) public override view
        returns
            (
            address poolAddress,
            uint256 _tokenPrice,
            uint256 _tosPrice,
            uint256 totalSaleAmount,
            uint24 fee,
            bool ethMarket
            )
    {
        return (
            metadata[_index].poolAddress,
            metadata[_index].tokenPrice,
            metadata[_index].tosPrice,
            metadata[_index].totalSaleAmount,
            metadata[_index].fee,
            metadata[_index].ethMarket
        );
    }

    /// @inheritdoc IBondDepository
    function getDepositList(address account) public override view returns (
        uint256[] memory _marketIds,
        uint256[] memory _stakeIds
    ) {
        uint256 len = deposits[account].length;
        _marketIds = new uint256[](len);
        _stakeIds = new uint256[](len);

        for (uint256 i = 0; i< len; i++){
            _marketIds[i] = deposits[account][i].marketId;
            _stakeIds[i] = deposits[account][i].stakeId;
        }
    }

    /// @inheritdoc IBondDepository
    function totalDepositCountOfAddress(address account) public override view returns (uint256) {
        return deposits[account].length;
    }

    /// @inheritdoc IBondDepository
    function viewDeposit(address account, uint256 _index) public override view
        returns
            (
            uint256 marketId,
            uint256 stakeId
            )
    {
        return (
            deposits[account][_index].marketId,
            deposits[account][_index].stakeId
        );
    }
}