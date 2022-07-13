// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

// import "./libraries/FullMath.sol";
// import "./libraries/FixedPoint96.sol";

import "./libraries/TickMath.sol";
import "./libraries/LiquidityAmounts.sol";
import "./libraries/OracleLibrary.sol";
import "./libraries/FixedPoint128.sol";
import "./libraries/PositionKey.sol";
import "./libraries/SafeMath512.sol";

import "./interfaces/ITOSValueCalculator.sol";

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

    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external view returns (address pool);
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

contract TOSValueCalculator is ITOSValueCalculator {

    // IUniswapV3Pool public pool;
    IIUniswapV3Pool public UniswapV3Factory;

    address public tos;
    address public weth;
    address public npm_;
    address public ethTosPool;

    function initialize(
        address _tos,
        address _weth,
        address _npm,
        address _basicpool,
        address _uniswapV3factory
    ) 
        external
        override 
    {
        tos = _tos;
        weth = _weth;
        npm_ = _npm;
        ethTosPool = _basicpool;
        UniswapV3Factory = IIUniswapV3Pool(_uniswapV3factory);
    }


    //WETH-TOS Pool에서 1TOS = ? ETH를 반환한다 (ether단위로 반환) -> ? ETH/1TOS
    function getWETHPoolTOSPrice() public override view returns (uint256 price) {
        uint tosOrder = getTOStoken0(weth,3000);
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

    //1TOS = ? ERC20 -> ?ERC20/1TOS 
    //TOS와 비율을 알고 싶은 erc20주소와 TOS-ERC20_Pool주소 fee를 입력함 -> 1TOS = ? Token에서 ? 비율
    function getTOSERC20PoolTOSPrice(address _erc20address, address _tosERC20Pool, uint24 fee) public override view returns (uint256 price) {
        uint tosOrder = getTOStoken0(_erc20address,fee);
        uint decimalCalcul;
        if(tosOrder == 2 && tosOrder == 3) {
            return price = 0;
        }
        (uint256 token0Decimal, uint256 token1Decimal) = getDecimals(tos,_erc20address);
        if(token0Decimal >= token1Decimal){
            decimalCalcul = 0;
        } else if (token0Decimal < token1Decimal) {
            decimalCalcul = token1Decimal - token0Decimal;
        }

        if(tosOrder == 0) {
            return price = getPriceToken0(_tosERC20Pool)/(10 ** decimalCalcul);
        } else if (tosOrder == 1) {
            return price = getPriceToken1(_tosERC20Pool)/(10 ** decimalCalcul);
        } else {
            return price = 0;
        }
    }

    // 1ERC20 = ?TOS -> ?TOS/1ERC20
    // TOS와 비율을 알고 싶은 erc20주소와 TOS-ERC20_Pool주소 fee를 입력함 -> 1token = ? TOS에서 ? 비율
    function getTOSERC20PoolERC20Price(address _erc20address, address _tosERC20Pool, uint24 fee) public override view returns (uint256 price) {
        uint tosOrder = getTOStoken0(_erc20address,fee);
        uint decimalCalcul;
        if(tosOrder == 2 && tosOrder == 3) {
            return price = 0;
        }
        (uint256 token0Decimal, uint256 token1Decimal) = getDecimals(tos,_erc20address);
        if(token0Decimal <= token1Decimal){
            decimalCalcul = 0;
        } else if (token0Decimal > token1Decimal) {
            decimalCalcul = token0Decimal - token1Decimal;
        }
        if(tosOrder == 0) {
            return price = getPriceToken1(_tosERC20Pool)/(10 ** decimalCalcul);
        } else if (tosOrder == 1) {
            return price = getPriceToken0(_tosERC20Pool)/(10 ** decimalCalcul);
        } else {
            return price = 0;
        }
    }

    //1ETH = ? ERC20 -> ?ERC20/1ETH
    //ETH와 비율을 알고 싶은 erc20주소와 eth-ERC20_pool주소, fee를 입력함 1ETH = ? ERC20
    function getETHERC20PoolETHPrice(address _erc20address, address _ethERC20Pool, uint24 fee) public view returns (uint256 price) {
        uint ethOrder = getETHtoken0(_erc20address,fee);
        uint decimalCalcul;
        if(ethOrder == 2 && ethOrder == 3) {
            return price = 0;
        }
        (uint256 token0Decimal, uint256 token1Decimal) = getDecimals(weth,_erc20address);
        if(token0Decimal >= token1Decimal){
            decimalCalcul = 0;
        } else if (token0Decimal < token1Decimal) {
            decimalCalcul = token1Decimal - token0Decimal;
        }

        if(ethOrder == 0) {
            return price = getPriceToken0(_ethERC20Pool)/(10 ** decimalCalcul);
        } else if (ethOrder == 1) {
            return price = getPriceToken1(_ethERC20Pool)/(10 ** decimalCalcul);
        } else {
            return price = 0;
        }
    }

    // 1ERC20 = ?ETH -> ?ETH/1ERC20
    //ETH와 비율을 알고 싶은 erc20주소와 ETH-ERC20_Pool주소와 fee를 입력함 1ERC20 = ? ETH
    function getETHERC20PoolERC20Price(address _erc20address, address _ethERC20Pool, uint24 fee) public view returns (uint256 price) {
        uint ethOrder = getETHtoken0(_erc20address,fee);
        uint decimalCalcul;
        if(ethOrder == 2 && ethOrder == 3) {
            return price = 0;
        }
        (uint256 token0Decimal, uint256 token1Decimal) = getDecimals(weth,_erc20address);
        if(token0Decimal <= token1Decimal){
            decimalCalcul = 0;
        } else if (token0Decimal > token1Decimal) {
            decimalCalcul = token0Decimal - token1Decimal;
        }
        if(ethOrder == 0) {
            return price = getPriceToken1(_ethERC20Pool)/(10 ** decimalCalcul);
        } else if (ethOrder == 1) {
            return price = getPriceToken0(_ethERC20Pool)/(10 ** decimalCalcul);
        } else {
            return price = 0;
        }
    }

    //token0이 TOS면 0을 리턴, token1이 TOS면 1을 리턴, tokenPool 이없으면 2를 리턴, 3은 리턴하면 안됨.
    //_fee is 500, 3000, 10000
    // tos와 pool인데 pool주소는 모르고 erc20주소 넣고 싶을때
    function getTOStoken0(address _erc20Addresss, uint24 _fee) public override view returns (uint) {
        address getPool = UniswapV3Factory.getPool(address(tos), address(_erc20Addresss), _fee);
        if(getPool == address(0)) {
            return 2;
        }
        // pool = IUniswapV3Pool(getPool);
        address token0Address = IIUniswapV3Pool(getPool).token0();
        address token1Address = IIUniswapV3Pool(getPool).token1();
        if(token0Address == address(tos)) {
           return 0;
        } else if(token1Address == address(tos)) {
            return 1;
        } else {
            return 3;
        }
    }

    //token0이 tos면 0을 리턴, token1이 tos면 1을 리턴, tos주소가 없으면 3을 리턴
    //tos와 pool인데 Pool주소를 알때
    function getTOStoken(address _poolAddress) public view returns (uint) {
        address token0Address = IIUniswapV3Pool(_poolAddress).token0();
        address token1Address = IIUniswapV3Pool(_poolAddress).token1();
        if(token0Address == address(tos)) {
           return 0;
        } else if(token1Address == address(tos)) {
            return 1;
        } else {
            return 3;
        }
    }

    //token0이 Weth면 0을 리턴, token1이 weth면 1을 리턴, tokenPool 이없으면 2를 리턴, 3은 리턴하면 안됨.
    function getETHtoken0(address _erc20Address, uint24 _fee) public view returns (uint){
        address getPool = UniswapV3Factory.getPool(address(weth), address(_erc20Address), _fee);
        if(getPool == address(0)) {
            return 2;
        }

        address token0Address = IIUniswapV3Pool(getPool).token0();
        address token1Address = IIUniswapV3Pool(getPool).token1();
        if(token0Address == address(weth)) {
           return 0;
        } else if(token1Address == address(weth)) {
            return 1;
        } else {
            return 3;
        }
    }

    //token0이 weth면 0을 리턴, token1이 weth면 1을 리턴, weth주소가 없으면 3을 리턴
    function getETHtoken(address _poolAddress) public view returns (uint) {
        address token0Address = IIUniswapV3Pool(_poolAddress).token0();
        address token1Address = IIUniswapV3Pool(_poolAddress).token1();
        if(token0Address == address(weth)) {
           return 0;
        } else if(token1Address == address(weth)) {
            return 1;
        } else {
            return 3;
        }
    }

    //tokenID의 amount0이랑 amount1의 갯수를 리턴한다.
    function getTokenIdAmount(address _poolAddress, uint256 _tokenId)
        public
        view
        returns (uint256 amount0, uint256 amount1) 
    {
        (amount0, amount1) = getAmounts(npm_,_poolAddress,_tokenId);
        return (amount0,amount1);
    }  

    //tokenId의 ETHValue를 리턴
    //poolAddress는 tos - ? Pool 만 지원
    //tosNum == 0이면 amount0 이 tos양을 나타냄 tos * (?ETH/1TOS), amount1은 다른 토큰 token * (ETH/1TOS * TOS/1ERC20)
    //tosNum == 1이면 amount0 이 token양을 나타냄  token * (ETH/1TOS * TOS/1ERC20), amoun1은 tos * (?ETH/1TOS)
    function getTokenIdETHValue(address _poolAddress, uint256 _tokenId)
        public
        view
        returns (uint256 ethValue)
    {   
        ( 
            , ,
            address token0,
            address token1,
            uint24 fee, 
            , , , , , ,
        ) = IINonfungiblePositionManager(npm_).positions(_tokenId);

        uint tosNum;
        tosNum = getTOStoken(_poolAddress);
        (uint256 amount0,uint256 amount1) = getTokenIdAmount(_poolAddress,_tokenId);
        if(tosNum == 0){
            ethValue = (amount0*getWETHPoolTOSPrice())/1e18;
            console.log("ethValue1 : %s",ethValue);
            ethValue = ethValue + (amount1*getWETHPoolTOSPrice()*getTOSERC20PoolERC20Price(token1,_poolAddress,fee)/1e18/1e18);
            console.log("ethValue2 : %s",ethValue);
        } else if (tosNum == 1){
            ethValue = (amount1*getWETHPoolTOSPrice());
            ethValue = ethValue + (amount0*getWETHPoolTOSPrice()*getTOSERC20PoolERC20Price(token0,_poolAddress,fee));
        }
    }

    function tickCheck(uint256 _tokenId)
        public
        view
        returns (int24 tickLower, int24 tickUpper, uint128 liquidity)
    {
         ( , , , , ,
            tickLower,
            tickUpper,
            liquidity, , , ,
        ) = IINonfungiblePositionManager(npm_).positions(_tokenId);
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