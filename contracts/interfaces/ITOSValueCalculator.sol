// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

interface ITOSValueCalculator {

    function initialize(
        address _tos,
        address _weth,
        address _npm,
        address _basicpool,
        address _uniswapV3factory
    )
        external;

    function getWETHPoolTOSPrice() external view returns (uint256 price);


    function getTOStoken0(address _erc20Addresss, uint24 _fee) external view returns (uint);

    function getTOStoken(address _poolAddress) external view returns (uint);


    function getPriceToken0(address poolAddress) external view returns (uint256 priceX96);
    function getPriceToken1(address poolAddress) external view returns(uint256 priceX96);

    function getTOSPricePerETH() external view returns (uint256 price);

    function getETHPricePerTOS() external view returns (uint256 price);

    function getTOSPricePerAsset(address _asset) external view returns (uint256 price);

    function getAssetPricePerTOS(address _asset) external view returns (uint256 price);

    function existPool(address tokenA, address tokenB, uint24 _fee)
        external view returns (bool isWeth, bool isTos, address pool, address token0, address token1);

    function computePoolAddress(address tokenA, address tokenB, uint24 _fee)
        external view returns (address pool, address token0, address token1);

    function convertAssetBalanceToWethOrTos(address _asset, uint256 _amount)
        external view
        returns (bool existedWethPool, bool existedTosPool,  uint256 priceWethOrTosPerAsset, uint256 convertedAmmount);

}
