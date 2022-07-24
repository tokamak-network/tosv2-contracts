// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./BondDepositoryStorage.sol";
import "./common/ProxyAccessCommon.sol";

import "./libraries/SafeERC20.sol";

import "./interfaces/IBondDepository.sol";
import "./interfaces/IBondDepositoryEvent.sol";
import "./interfaces/ITOSValueCalculator.sol";

import "@openzeppelin/contracts/utils/math/Math.sol";
import "hardhat/console.sol";

interface IIIERC20 {
    function decimals() external view returns (uint256);
}

interface IUniswapV3Pool {
    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface IITreasury {
    function getMintRate(address _asset) external view returns (uint256);
    function mintRateDenominator() external view returns (uint256);
    function isTreasuryHealthyAfterTOSMint (uint256 _checkMintRate, uint256 amount) external view returns (bool);
    function requestMintAndTransfer(
        uint256 _mintAmount, address _recipient, uint256 _transferAmount, bool _distribute) external ;
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

    function setDtos(address _dtos)
        external onlyPolicyOwner
        nonZeroAddress(_dtos)
    {
        require(dTOS != _dtos, "same address");
        dTOS = _dtos;
    }

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
        id_ = staking.marketId();  // BondDepository는 staking의 오너로 등록이 되어야 함.

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

        emit CreatedMarket(id_, _check, _token, _poolAddress, _fee, _market);
    }

    /// @inheritdoc IBondDepository
    function close(uint256 _id) external override onlyPolicyOwner {
        require(markets[_id].endSaleTime > 0, "empty market");
        require(markets[_id].endSaleTime > block.timestamp , "already closed");
        markets[_id].endSaleTime = block.timestamp;
        markets[_id].capacity = 0;
        emit ClosedMarket(_id);
    }

    ///////////////////////////////////////
    /// Anyone can use.
    //////////////////////////////////////

    /// @inheritdoc IBondDepository
    function ERC20Deposit(
        uint256 _id,
        uint256 _amount
    )
        external override
        nonEndMarket(_id)
        nonEthMarket(_id)
        nonZero(_amount)
        returns (
            uint256 payout_,
            uint256 index_
        )
    {
        address _token = markets[_id].quoteToken;
        require(IERC20(_token).allowance(msg.sender, address(this)) >= _amount, "Depository : allowance is insufficient");
        IERC20(_token).transferFrom(msg.sender, address(treasury), _amount);

        (payout_) = _deposit(msg.sender, _amount, _id, false);

        uint256 stakeId = staking.stakeByBond(msg.sender, payout_, _id);

        index_ = deposits[msg.sender].length;

        deposits[msg.sender].push(LibBondDepository.Deposit(_id, stakeId));

        emit ERC20Deposited(msg.sender, _id, stakeId, _token, _amount, payout_);
    }

    /// @inheritdoc IBondDepository
    function ERC20DepositWithSTOS(
        uint256 _id,
        uint256 _amount,
        uint256 _lockWeeks
    )
        external override
        nonEndMarket(_id)
        nonEthMarket(_id)
        nonZero(_amount)
        nonZero(_lockWeeks)
        returns (
            uint256 payout_,
            uint256 index_
        )
    {
        address _token = markets[_id].quoteToken;
        require(IERC20(_token).allowance(msg.sender, address(this)) >= _amount, "Depository : allowance is insufficient");
        IERC20(_token).transferFrom(msg.sender, address(treasury), _amount);

        (payout_) = _deposit(msg.sender, _amount, _id, false);

        uint256 stakeId = staking.stakeGetStosByBond(msg.sender, payout_, _id, _lockWeeks);

        index_ = deposits[msg.sender].length;

        deposits[msg.sender].push(LibBondDepository.Deposit(_id, stakeId));

        emit ERC20DepositedWithSTOS(msg.sender, _id, stakeId, _token, _amount, _lockWeeks, payout_);
    }

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

        uint256 stakeId = staking.stakeByBond(msg.sender, payout_, _id);

        index_ = deposits[msg.sender].length;

        deposits[msg.sender].push(LibBondDepository.Deposit(_id, stakeId));

        payable(treasury).transfer(msg.value);

        emit ETHDeposited(msg.sender, _id, stakeId, _amount, payout_);
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

        uint256 stakeId = staking.stakeGetStosByBond(msg.sender, payout_, _id, _lockWeeks);

        index_ = deposits[msg.sender].length;

        deposits[msg.sender].push(LibBondDepository.Deposit(_id, stakeId));

        payable(treasury).transfer(msg.value);

        emit ETHDepositedWithSTOS(msg.sender, _id, stakeId, _amount, _lockWeeks, payout_);
    }


    function _deposit(
        address user,
        uint256 _amount,
        uint256 _marketId,
        bool _eth
    ) internal nonReentrant returns (uint256 _payout) {

        require(_amount <= purchasableAseetAmountAtOneTime(_marketId), "Depository : over maxPay");

        // _payout = calculPayoutAmount(metadata[_marketId].tokenPrice, metadata[_marketId].tosPrice, _amount);
        _payout = calculateTosAmountForAsset(_marketId, _amount);

        console.log("payoutAmount : %s", _payout);

        require(_payout > 0, "zero staking amount");

        uint256 _mintRate = IITreasury(treasury).getMintRate(markets[_marketId].quoteToken);
        require(_mintRate > 0, "zero mintRate");
        require(IITreasury(treasury).isTreasuryHealthyAfterTOSMint(_mintRate, _amount), "exceeds the reserve amount");

        uint256 mrAmount = _amount * _mintRate / IITreasury(treasury).mintRateDenominator() ;
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

        //index_ = users[user].length;
        if (deposits[user].length == 0) userList.push(user);
        totalDepositCount++;
        /*
        users[user].push(
            LibBondDepository.User({
                tokenAmount: _amount,
                tosAmount: _payout,
                marketID: _marketId,
                endTime: market.endSaleTime,
                dTOSuse: 0
            })
        );
        */

        if(mrAmount > 0 && _payout <= mrAmount) {
            IITreasury(treasury).requestMintAndTransfer(mrAmount, address(staking), _payout, true);
        }

        emit Deposited(user, _marketId, _amount, _payout, _eth);
    }

    ///////////////////////////////////////
    /// VIEW
    //////////////////////////////////////

    //이더리움(가격)을 기준으로만 mintingRate를 정한다. -> MR은 어떻게 정할까? admin이 세팅할 수 있고 비율은 나중에 알려줌 (admin이 정하게하면 됨)
    //admin과 policy가 있었으면 좋겠다. (admin이 하는 역할과 policy가 하는 역할은 다름)
    //dTOS로직
    //총 가지고 있는 ETH기반으로 minting할 수 있는지 없는지 정한다. -> ETH가 아니라 token이 들어왔을떄
    //본딩할때 트레저리에서 TOS를 발행할 수 있는지 물어봐야함

    /// @inheritdoc IBondDepository
    function calculPayoutAmount(
        uint256 _tokenPrice,
        uint256 _tosPrice,
        uint256 _amount
    )
        public
        override
        pure
        returns (
            uint256 payout
        )
    {
        return payout = ((((_tokenPrice * 1e10)/_tosPrice) * _amount) / 1e10);
    }

    //  토큰양_amount에 해당하는 토스의 양을 리턴
    function calculateTosAmountForAsset(
        uint256 _id,
        uint256 _amount
    )
        public override
        view
        returns (uint256 payout)
    {
        // 에셋 금액에 해당하는 토스의 양
        // return payout = ((((_tokenPrice * 1e10)/_tosPrice) * _amount) / 1e10);

        // uint256 decimal = 1e18;
        // if(!markets[_id].method && markets[_id].quoteToken != address(tos)) decimal = 10 ** IIIERC20(markets[_id].quoteToken).decimals();

        uint256 payoutFixed = _amount * metadata[_id].tosPrice / 1e18;
        uint256 payoutDynamic = 0;

        if(!markets[_id].method && markets[_id].quoteToken == address(0)) payoutDynamic = 0;
        else if(!markets[_id].method && markets[_id].quoteToken == address(tos)) payoutDynamic = _amount;
        else {
            if(markets[_id].method)  payoutDynamic = _amount * ITOSValueCalculator(calculator).getTOSPricePerETH() / 1e18;
            else payoutDynamic = _amount * ITOSValueCalculator(calculator).getTOSPricPerAsset(markets[_id].quoteToken) / 1e18;
        }
        console.log("calculateTosAmountForAsset payoutFixed %s", payoutFixed);
        console.log("calculateTosAmountForAsset payoutDynamic %s", payoutDynamic);

        return Math.max(payoutFixed, payoutDynamic);
    }

    /// @inheritdoc IBondDepository
    function purchasableAseetAmountAtOneTime(uint256 _id) public override view returns (uint256 maxpayout_) {
        // 한번에 최대 받을 수 있는 에셋 토큰의 양 .
        //maxpayout_ = (markets[_id].maxPayout * 1e10) / tokenPrice(_id);

        // 고정된 정보로 계산한것과 실시간 가격으로 계산한 것중, 큰 금액으로 지정.(?)
        uint256 maxpayoutFixed = markets[_id].maxPayout * metadata[_id].tokenPrice / 1e18;

        uint256 maxpayoutDynamic = 0;
        if(!markets[_id].method && markets[_id].quoteToken == address(0)) maxpayoutDynamic = 0;
        else if(!markets[_id].method && markets[_id].quoteToken == address(tos)) maxpayoutDynamic = markets[_id].maxPayout;
        else {
             if(markets[_id].method)  maxpayoutDynamic = markets[_id].maxPayout * ITOSValueCalculator(calculator).getETHPricPerTOS() / 1e18;
            else maxpayoutDynamic = markets[_id].maxPayout * ITOSValueCalculator(calculator).getAssetPricPerTOS(markets[_id].quoteToken) / IIIERC20(markets[_id].quoteToken).decimals();
        }
        console.log("purchasableAseetAmountAtOneTime maxpayoutFixed %s", maxpayoutFixed);
        console.log("purchasableAseetAmountAtOneTime maxpayoutDynamic %s", maxpayoutDynamic);

        return Math.max(maxpayoutFixed, maxpayoutDynamic);
    }

    // ?TOS/1ETH -> 나온값에 /1e10 해줘야함

    /// @inheritdoc IBondDepository
    function tokenPrice(uint256 _id) public override view returns (uint256 price) {
        return ((metadata[_id].tokenPrice * 1e10)/metadata[_id].tosPrice);
    }

    //market에서 tos를 최대로 구매할 수 있는 양

    /// @inheritdoc IBondDepository
    function remainingAmount(uint256 _id) external override view returns (uint256 tokenAmount) {

        return ((markets[_id].capacity*1e10)/tokenPrice(_id));
    }




    function getMarketList() public override view returns (uint256[] memory) {
        return marketList;
    }

    function totalMarketCount() public override view returns (uint256) {
        return marketList.length;
    }

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

    function getMetadataList() public override view returns (uint256[] memory) {
        return metadataList;
    }

    function totalMetadataCount() public override view returns (uint256) {
        return metadataList.length;
    }

    function viewMetadata(uint256 _index) public override view
        returns
            (
            address poolAddress,
            uint256 tokenPrice,
            uint256 tosPrice,
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

    function totalDepositCountOfAddress(address account) public override view returns (uint256) {
        return deposits[account].length;
    }

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