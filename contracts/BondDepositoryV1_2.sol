// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./BondDepositoryStorage.sol";
import "./common/ProxyAccessCommon.sol";
import "./BondDepositoryStorageV1_1.sol";

import "./libraries/SafeERC20.sol";

import "./interfaces/IBondDepositoryV1_2.sol";
import "./interfaces/IBondDepositoryEventV1_2.sol";

import "@openzeppelin/contracts/utils/math/Math.sol";
import "hardhat/console.sol";

interface IIIERC20 {
    function decimals() external view returns (uint256);
}

interface IIBondDepositoryV1_1 {
    function maximumPurchasableAmountAtOneTime(
        uint256 _marketId,
        uint256 _periodWeeks
    ) external view returns (uint256 maximumAmount_);

}


interface IUniswapV3Pool {
    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface IITOSValueCalculator {
    function weth() external view returns (address);
    function existPool(address tokenA, address tokenB, uint24 _fee)
        external view returns (bool isWeth, bool isTos, address pool, address token0, address token1);

    function getPriceToken1(address poolAddress) external view returns(uint256 priceX96);
    function getPriceToken0(address poolAddress) external view returns (uint256 priceX96);

    function convertAssetBalanceToWethOrTos(address _asset, uint256 _amount)
        external view
        returns (bool existedWethPool, bool existedTosPool,  uint256 priceWethOrTosPerAsset, uint256 convertedAmount);
}

interface IITreasury {
    function getMintRate() external view returns (uint256);
    function requestMint(uint256 _mintAmount, uint256 _payout, bool _distribute) external ;
}

contract BondDepositoryV1_2 is
    BondDepositoryStorage,
    ProxyAccessCommon,
    BondDepositoryStorageV1_1,
    IBondDepositoryV1_2,
    IBondDepositoryEventV1_2
{
    using SafeERC20 for IERC20;

    modifier nonEndMarket(uint256 id_) {
        require(marketCapacityInfos[id_].startTime < block.timestamp, "no start time yet");
        require(!marketCapacityInfos[id_].closed, "closed market");
        require(markets[id_].endSaleTime > block.timestamp, "BondDepository: closed market");
        // require(markets[id_].capacity > 0 , "BondDepository: zero capacity" );
        require(markets[id_].capacity > marketCapacityInfos[id_].totalSold, "BondDepository: zero capacity" );
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
    /// Anyone can use.
    //////////////////////////////////////

    /// @inheritdoc IBondDepositoryV1_2
    function ERC20Deposit(
        uint256 _id,
        uint256 _amount
    )
        external override
        nonEndMarket(_id)
        nonEthMarket(_id)
        nonZero(_amount)
        returns (uint256 payout_)
    {
        require(marketCapacityInfos[_id].availableBasicBond, "unavailable in basic bond");

        uint256 _tosPrice = 0;

        (payout_, _tosPrice) = _deposit(msg.sender, _amount, _id, 0);

        uint256 stakeId = staking.stakeByBond(msg.sender, payout_, _id, _tosPrice);


        // payable(treasury).transfer(msg.value);

        emit ERC20Deposited(msg.sender, _id, stakeId, _amount, payout_);
    }


    /// @inheritdoc IBondDepositoryV1_2
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
        returns (uint256 payout_)
    {
        require(marketCapacityInfos[_id].availableLockupBond, "unavailable in lockup bond");

        require(_lockWeeks > 1, "_lockWeeks must be greater than 1 week.");
        uint256 _tosPrice = 0;
        (payout_, _tosPrice) = _deposit(msg.sender, _amount, _id, _lockWeeks);

        uint256 stakeId = staking.stakeGetStosByBond(msg.sender, payout_, _id, _lockWeeks, _tosPrice);

        // payable(treasury).transfer(msg.value);

        emit ERC20DepositedWithSTOS(msg.sender, _id, stakeId, _amount, _lockWeeks, payout_);
    }


    function _deposit(
        address user,
        uint256 _amount,
        uint256 _marketId,
        uint256 _lockWeeks
    ) internal nonReentrant returns (uint256 _payout, uint256 _tosPrice) {

        LibBondDepository.Market memory market = markets[_marketId];
        _tosPrice = market.tosPrice;

        ///////////////////////////
        // V1_2
        // 오라클 가격의 변동 폭을 얼마의 기간 동안 어느정도 허용할지에 대한 체크


        ///
        (bool isWeth, , address pool, address token0,) = IITOSValueCalculator(calculator).existPool(market.quoteToken, IITOSValueCalculator(calculator).weth(), 3000);
        require(isWeth, "non exist WETH pool");

        uint256 exchangeEthPerErc20 = 0;
        if (token0 == market.quoteToken) exchangeEthPerErc20 = IITOSValueCalculator(calculator).getPriceToken0(pool);
        else exchangeEthPerErc20 = IITOSValueCalculator(calculator).getPriceToken1(pool);

        console.log("exchangeEthPerErc20", exchangeEthPerErc20);

        // 받은 erc20 이 몇 이더인지 확인
        uint256 ethAmount = exchangeEthPerErc20 * _amount / (10**IIIERC20(market.quoteToken).decimals());
        _payout = LibBondDepositoryV1_1.calculateTosAmountForAsset(_tosPrice, ethAmount, 18);
        require(_payout > 0, "zero staking amount");

        //-------------------------
        // v1.1
        require(_payout <= IIBondDepositoryV1_1(address(this)).maximumPurchasableAmountAtOneTime(_marketId, _lockWeeks), "exceed currentCapacityLimit");
        //-------------------------

        uint256 mrAmount = _amount * IITreasury(treasury).getMintRate() / 1e18;
        require(mrAmount >= _payout, "mintableAmount is less than staking amount.");
        require(_payout <= (market.capacity - marketCapacityInfos[_marketId].totalSold), "Depository: sold out");

        LibBondDepositoryV1_1.CapacityInfo storage capacityInfo = marketCapacityInfos[_marketId];
        capacityInfo.totalSold += _payout;

        //check closing
        if (market.capacity - capacityInfo.totalSold <= 100 ether) {
           capacityInfo.closed = true;
        //    emit ClosedMarket(_marketId);
        }

        IITreasury(treasury).requestMint(mrAmount, _payout, true);

        // emit Deposited(user, _marketId, _amount, _payout, true, mrAmount);
    }

    ///////////////////////////////////////
    /// VIEW
    //////////////////////////////////////


}
