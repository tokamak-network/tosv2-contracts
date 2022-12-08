// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./BondDepositoryStorage.sol";
import "./common/ProxyAccessCommon.sol";
import "./BondDepositoryStorageV1_1.sol";
import "./BondDepositoryStorageV1_2.sol";

import "./libraries/SafeERC20.sol";

import "./interfaces/IBondDepositoryV1_2.sol";
import "./interfaces/IBondDepositoryEventV1_2.sol";

import "@openzeppelin/contracts/utils/math/Math.sol";
// import "hardhat/console.sol";


interface IITreasury {
    function getMintRate() external view returns (uint256);
    function requestMint(uint256 _mintAmount, uint256 _payout, bool _distribute) external ;
    function addBondAsset(address _address) external;
}

interface IINonfungiblePositionManager {
    function ownerOf(uint256 tokenId) external returns (address);

    /// @notice Returns the position information associated with a given token ID.
    /// @dev Throws if the token ID is not valid.
    /// @param tokenId The ID of the token that represents the position
    /// @return nonce The nonce for permits
    /// @return operator The address that is approved for spending
    /// @return token0 The address of the token0 for a specific pool
    /// @return token1 The address of the token1 for a specific pool
    /// @return fee The fee associated with the pool
    /// @return tickLower The lower end of the tick range for the position
    /// @return tickUpper The higher end of the tick range for the position
    /// @return liquidity The liquidity of the position
    /// @return feeGrowthInside0LastX128 The fee growth of token0 as of the last action on the individual position
    /// @return feeGrowthInside1LastX128 The fee growth of token1 as of the last action on the individual position
    /// @return tokensOwed0 The uncollected amount of token0 owed to the position as of the last computation
    /// @return tokensOwed1 The uncollected amount of token1 owed to the position as of the last computation
    function positions(uint256 tokenId)
        external
        view
        returns (
            uint96 nonce,
            address operator,
            address token0,
            address token1,
            uint24 fee,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        );

    /// @notice Increases the amount of liquidity in a position, with tokens paid by the `msg.sender`
    /// @param params tokenId The ID of the token for which liquidity is being increased,
    /// amount0Desired The desired amount of token0 to be spent,
    /// amount1Desired The desired amount of token1 to be spent,
    /// amount0Min The minimum amount of token0 to spend, which serves as a slippage check,
    /// amount1Min The minimum amount of token1 to spend, which serves as a slippage check,
    /// deadline The time by which the transaction must be included to effect the change
    /// @return liquidity The new liquidity amount as a result of the increase
    /// @return amount0 The amount of token0 to acheive resulting liquidity
    /// @return amount1 The amount of token1 to acheive resulting liquidity
    function increaseLiquidity(LibBondDepositoryV1_2.IncreaseLiquidityParams calldata params)
        external
        payable
        returns (
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        );

}

contract BondDepositoryV1_2 is
    BondDepositoryStorage,
    ProxyAccessCommon,
    BondDepositoryStorageV1_1,
    BondDepositoryStorageV1_2,
    IBondDepositoryV1_2,
    IBondDepositoryEventV1_2
{
    using SafeERC20 for IERC20;

    modifier nonEndMarket(uint256 id_) {
        require(marketCapacityInfos[id_].startTime < block.timestamp, "Market is not opened yet");
        require(!marketCapacityInfos[id_].closed, "closed market");
        require(markets[id_].endSaleTime > block.timestamp, "BondDepository: closed market");
        require(markets[id_].capacity > marketCapacityInfos[id_].totalSold, "BondDepository: zero capacity" );
        _;
    }

    modifier isLpMarket(uint256 id_) {
        require(markets[id_].quoteToken == address(1) && markets[id_].endSaleTime > 0,
            "BondDepository: not ETH market"
        );
        _;
    }

    modifier nonZeroPayout(uint256 id_) {
        require(
            markets[id_].maxPayout > 0,
            "BondDepository: payout has to be greater than 0"
        );
        _;
    }

    constructor() {
    }

    /// @inheritdoc IBondDepositoryV1_2
    function setNonfungiblePositionManager(
        address _npm
    )   external override onlyPolicyOwner
        nonZeroAddress(_npm)
    {
        require(_npm != npm, "same account");
        npm = _npm;

        emit SetNonfungiblePositionManager(_npm);
    }

    /// @inheritdoc IBondDepositoryV1_2
    function createLpMarket(
        address _token,
        uint256[4] calldata _market,
        uint256 _startTime,
        uint256 _initialMaxPayout,
        uint256 _capacityUpdatePeriod,
        bool _availableBasicBond,
        bool _availableStosBond,
        uint256 _lpTokenId
    )
        external override
        onlyPolicyOwner
        nonZero(_market[2])
        nonZero(_market[3])
        nonZero(_startTime)
        nonZero(_lpTokenId)
        returns (uint256 id_)
    {
        // 토큰 주소는 풀주소 또는 1번등으로 lp마켓임을 인지해야 한다.
        // 토큰 주소영역에 0 이 들어오면 스토리지에 기존의 마켓과 혼동할 수 있다.
        require(_token == address(1), "need the totalSaleAmount > 100");

        // 질문 1
        // _market[2] 토스 프라이스를 어떻게 입력받을지 확인,
        // 토큰이 2개 있는데, 각 토스프라이스를 별도로 입력받는것인지.
        require(_capacityUpdatePeriod > 0 &&
            (_capacityUpdatePeriod == 1 || _capacityUpdatePeriod == 3600 ||  _capacityUpdatePeriod == 21600 ||
                _capacityUpdatePeriod == 43200 || (_capacityUpdatePeriod % 86400 == 0)
            ), "invalid capacityUpdatePeriod");
        require(_availableBasicBond || _availableStosBond, "both false _availableBasicBond & _availableStosBond");

        require(_market[0] > 100 ether, "need the totalSaleAmount > 100");
        require(_market[1] > _startTime && _market[1] > block.timestamp, "invalid endSaleTime");
        require(IINonfungiblePositionManager(npm).ownerOf(_lpTokenId) == treasury, "lp's owner is not tresury");

        require(_market[0] > 100 ether, "need the totalSaleAmount > 100");

        (   ,
            address operator,
            address token0,
            address token1,
            uint24 fee,
            int24 tickLower,
            int24 tickUpper,
            ,
            ,
            ,
            ,
        ) = IINonfungiblePositionManager(npm).positions(_lpTokenId);

        // 질문 2 , 토큰-토스 풀이 존재하지 않아도 받을 것인지 확인
        if (token0 != address(tos) && token1 != address(tos)) {
            // token0 - tos 풀이 존재하는지 확인. 없어도 받을 수 있는 토큰인지 확인

            // token1 - tos 풀이 존재하는지 확인. 없어도 받을 수 있는 토큰인지 확인

        } else if (token0 != address(tos)) {
            // token0 - tos 풀이 존재하는지 확인. 없어도 받을 수 있는 토큰인지 확인

        } else {
            // token1 - tos 풀이 존재하는지 확인. 없어도 받을 수 있는 토큰인지 확인

        }

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
                initialMaxPayout: _initialMaxPayout,
                capacityUpdatePeriod: _capacityUpdatePeriod,
                totalSold: 0,
                availableBasicBond: _availableBasicBond,
                availableStosBond: _availableStosBond,
                closed: false
            }
        );

        marketLps[id_] = _lpTokenId;
        marketLpInfos[id_] = LibBondDepositoryV1_2.LiquidityTokenInfo({
            token0: token0,
            token1: token1,
            fee: fee,
            tickLower: tickLower,
            tickUpper: tickUpper
        });

        if (_token != address(0)) IITreasury(treasury).addBondAsset(_token);

        emit CreatedLpMarket(
            id_,
            _token,
            _market,
            _startTime,
            _initialMaxPayout,
            _capacityUpdatePeriod,
            _availableBasicBond,
            _availableStosBond,
            _lpTokenId
            );
    }

    ///////////////////////////////////////
    /// Anyone can use.
    //////////////////////////////////////
    /*
    /// @inheritdoc IBondDepositoryV1_2
    function LPDeposit(
        uint256 _id,
        uint256[2] _amountDesired,
        bool[2] _isEther
    )
        external payable override
        nonEndMarket(_id)
        isLpMarket(_id)
        returns (uint256 payout_)
    {
        require(_amountDesired[0] > 0 || _amountDesired[1] > 0, "zero amount");
        require(marketCapacityInfos[_id].availableBasicBond, "unavailable in basic bond");

        LibBondDepositoryV1_2.LiquidityTokenInfo memory lpInfo = marketLpInfos[_id];
        //marketLps[_id];
        // weth 풀인경우, 이더로 직접 낼수있다.
        // 이더로 직접 내는 경우도 확인


        if (lpInfo.token0 == address(weth) || lpInfo.token1 == address(weth)) {

        }

        require(msg.value == _amount, "Depository: ETH amounts do not match");

        uint256 _tosPrice = 0;

        (payout_, _tosPrice) = _deposit(msg.sender, _amount, _id, 0);

        uint256 stakeId = staking.stakeByBond(msg.sender, payout_, _id, _tosPrice);

        payable(treasury).transfer(msg.value);

        emit LPDeposited(msg.sender, _id, stakeId, _amount, payout_);

    }


    /// @inheritdoc IBondDepositoryV1_2
    function LPDepositWithSTOS(
        uint256 _id,
        uint256 _amount,
        uint256 _lockWeeks
    )
        external payable override
        nonEndMarket(_id)
        isLpMarket(_id)
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

        emit LPDepositedWithSTOS(msg.sender, _id, stakeId, _amount, _lockWeeks, payout_);
    }


    function _deposit(
        address user,
        uint256 _amountToken0,
        uint256 _amountToken1,
        uint256 _marketId,
        uint256 _lockWeeks
    ) internal nonReentrant returns (uint256 _payout, uint256 _tosPrice) {
        LibBondDepository.Market memory market = markets[_marketId];

        // 질문 3, 가격을 풀에서 가져올것인지.
        // 토스 프라이스는 각 풀에서 환산 ..
        _tosPrice = market.tosPrice;

        // 질문 4, 유동성을 추가할때, amount0Min 을 계산할때, 값을 어떻게 넣을지 ,
        (
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        ) = IINonfungiblePositionManager(npm).increaseLiquidity(LibBondDepositoryV1_2.IncreaseLiquidityParams({
            tokenId: marketLps[_marketId],
            amount0Desired: _amountToken0,
            amount1Desired: _amountToken1,
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp
        }));



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
    */
    ///////////////////////////////////////
    /// VIEW
    //////////////////////////////////////

    /// @inheritdoc IBondDepositoryV1_2
    function getBonds2() external override view
        returns (
            uint256[] memory,
            address[] memory,
            uint256[] memory,
            uint256[] memory,
            uint256[] memory,
            LibBondDepositoryV1_1.CapacityInfo[] memory,
            uint256[] memory
        )
    {
        uint256 len = marketList.length;
        uint256[] memory _marketIds = new uint256[](len);
        address[] memory _quoteTokens = new address[](len);
        uint256[] memory _capacities = new uint256[](len);
        uint256[] memory _endSaleTimes = new uint256[](len);
        uint256[] memory _pricesTos = new uint256[](len);
        LibBondDepositoryV1_1.CapacityInfo[] memory _capacityInfos = new LibBondDepositoryV1_1.CapacityInfo[](len);
        uint256[] memory _lpTokens = new uint256[](len);

        for (uint256 i = 0; i < len; i++){
            _marketIds[i] = marketList[i];
            _quoteTokens[i] = markets[_marketIds[i]].quoteToken;
            _capacities[i] = markets[_marketIds[i]].capacity;
            _endSaleTimes[i] = markets[_marketIds[i]].endSaleTime;
            _pricesTos[i] = markets[_marketIds[i]].tosPrice;
            _capacityInfos[i] = marketCapacityInfos[_marketIds[i]];
            _lpTokens[i] = marketLps[_marketIds[i]];
        }
        return (_marketIds, _quoteTokens, _capacities, _endSaleTimes, _pricesTos, _capacityInfos, _lpTokens);
    }


    /// @inheritdoc IBondDepositoryV1_2
    function viewMarket2(uint256 _marketId) external override view
        returns (
            address quoteToken,
            uint256 capacity,
            uint256 endSaleTime,
            uint256 maxPayout,
            uint256 tosPrice,
            LibBondDepositoryV1_1.CapacityInfo memory capacityInfo,
            uint256 lpToken
            )
    {
        return (
            markets[_marketId].quoteToken,
            markets[_marketId].capacity,
            markets[_marketId].endSaleTime,
            markets[_marketId].maxPayout,
            markets[_marketId].tosPrice,
            marketCapacityInfos[_marketId],
            marketLps[_marketId]
        );
    }
}
