// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.4;

import "./libraries/FullMath.sol";
import "./libraries/TickMath.sol";
import "./libraries/LiquidityAmounts.sol";
import "./libraries/OracleLibrary.sol";
import "./libraries/FixedPoint128.sol";
import "./libraries/FixedPoint96.sol";
import "./libraries/PositionKey.sol";
import "./libraries/SafeMath512.sol";

import "hardhat/console.sol";

interface IERC20 {
    function decimals() external  view returns (uint256);
}

interface IIUniswapV3Pool {
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

    function positions(bytes32 key)
        external
        view
        returns (
            uint128 _liquidity,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        );

    function observe(uint32[] calldata secondsAgos)
        external
        view
        returns (int56[] memory tickCumulatives, uint160[] memory secondsPerLiquidityCumulativeX128s);
}

interface IINonfungiblePositionManager {
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
}

contract TOSValueCalculator {

    // IUniswapV3Pool public pool;
    IUniswapV3Factory public UniswapV3Factory;

    address public tos;
    address public npm;
    address public ethTosPool;

    function initialize(
        address _tos,
        address _npm,
        address _basicpool,
        address _uniswapV3factory
    ) 
        external 
    {
        tos = _tos;
        npm = _npm;
        ethTosPool = _basicpool;
        UniswapV3Factory = IUniswapV3Factory(poolfactory);
    }

    function getTOSPrice() public view returns (uint256 price) {
        uint tosOrder = getTOStoken0(ethTosPool);
        if(tosOrder == 2 && tosOrder == 3) {
            return price = 0;
        }
        if(tosOrder == 0) {
            return price = getPriceToken0(ethTosPool);
        } else if (tosOrder == 1) {
            return price = getPriceToken1(ethTosPool);
        } else {
            return price = 0;
        }
    }

    function getTOSPoolTOSPrice(address _tosERC20Pool) public view returns (uint256 price) {
        uint tosOrder = getTOStoken0(_tosERC20Pool);
        if(tosOrder == 2 && tosOrder == 3) {
            return price = 0;
        }
        if(tosOrder == 0) {
            return price = getPriceToken0(_tosERC20Pool);
        } else if (tosOrder == 1) {
            return price = getPriceToken1(_tosERC20Pool);
        } else {
            return price = 0;
        }

    }


    //token0이면 0을 리턴, token1이면 1을 리턴, tokenPool 이없으면 2를 리턴, 3은 리턴하면 안됨.
    function getTOStoken0(address _erc20Addresss) public view returns (uint) {
        address getPool = UniswapV3Factory.getPool(address(TOS), address(token), fee);
        if(getPool == address(0)) {
            return 2;
        }
        // pool = IUniswapV3Pool(getPool);
        address token0Address = IUniswapV3Pool(getPool).token0();
        address token1Address = IUniswapV3Pool(getPool).token1();
        if(token0Address == address(tos)) {
           return 0;
        } else if(token1Address == address(tos)) {
            return 1;
        } else {
            return 3;
        }
    }

    function getAmounts(address npm, address poolAddress, uint256 tokenId)
        public view returns (uint256 amount0, uint256 amount1) {

        (
            uint160 sqrtPriceX96, , , , , ,
        ) = IIUniswapV3Pool(poolAddress).slot0();

        ( , , , , ,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity, , , ,
        ) = IINonfungiblePositionManager(npm).positions(tokenId);

        uint160 sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(tickLower);
        uint160 sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(tickUpper);

        (amount0, amount1) = LiquidityAmounts.getAmountsForLiquidity(sqrtPriceX96, sqrtRatioAX96, sqrtRatioBX96, liquidity);
        console.log('amount0 %s ', amount0);
        console.log('amount1 %s ', amount1);
    }

    function getDecimals(address token0, address token1) public view returns(uint256 token0Decimals, uint256 token1Decimals) {
        return (IERC20(token0).decimals(), IERC20(token1).decimals());
    }

    function getPriceToken0(address poolAddress) public view returns (uint256 priceX96) {

        (, int24 tick, , , , ,) = IIUniswapV3Pool(poolAddress).slot0();
        (uint256 token0Decimals, ) = getDecimals(
            IIUniswapV3Pool(poolAddress).token0(),
            IIUniswapV3Pool(poolAddress).token1()
            );

        priceX96 = OracleLibrary.getQuoteAtTick(
             tick,
             uint128(10**token0Decimals),
             IIUniswapV3Pool(poolAddress).token0(),
             IIUniswapV3Pool(poolAddress).token1()
             );
    }

    function getPriceToken1(address poolAddress) public view returns(uint256 priceX96) {

        (, int24 tick, , , , ,) = IIUniswapV3Pool(poolAddress).slot0();
        (, uint256 token1Decimals) = getDecimals(
            IIUniswapV3Pool(poolAddress).token0(),
            IIUniswapV3Pool(poolAddress).token1()
            );

        priceX96 = OracleLibrary.getQuoteAtTick(
             tick,
             uint128(10**token1Decimals),
             IIUniswapV3Pool(poolAddress).token1(),
             IIUniswapV3Pool(poolAddress).token0()
             );
    }


    function getSqrtTwapX96(address poolAddress, uint32 twapInterval) public view returns (uint160 sqrtPriceX96) {
        if (twapInterval == 0) {
            // return the current price if twapInterval == 0
            (sqrtPriceX96, , , , , , ) = IIUniswapV3Pool(poolAddress).slot0();
        } else {
            uint32[] memory secondsAgos = new uint32[](2);
            secondsAgos[0] = twapInterval; // from (before)
            secondsAgos[1] = 0; // to (now)

            (int56[] memory tickCumulatives, ) = IIUniswapV3Pool(poolAddress).observe(secondsAgos);

            // tick(imprecise as it's an integer) to price
            sqrtPriceX96 = TickMath.getSqrtRatioAtTick(
                int24((tickCumulatives[1] - tickCumulatives[0]) / int56( int32(twapInterval)))
            );
        }
    }

}