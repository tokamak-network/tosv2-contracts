// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

interface ITOSValueCalculator {

    /// @dev  initialize function
    /// @param _tos the address of TOS
    /// @param _weth the address of WETH
    /// @param _npm the address of NonFungibleManager of UniswapV3
    /// @param _basicpool the address of WETH-TOS pool
    /// @param _uniswapV3factory the address of UniswapV3Factory
    function initialize(
        address _tos,
        address _weth,
        address _npm,
        address _basicpool,
        address _uniswapV3factory
    ) external;

    /// @dev Get the TOS price from the WETH-TOS pool.
    /// @return price  The price of TOS
    function getWETHPoolTOSPrice() external view returns (uint256 price);

    /// @dev It tells that _erc20Addresss-TOS pool is existed, and if it is TOS pool, It tells that the TOS token is which token among first ot second.
    /// @param _erc20Addresss  The address of pool
    /// @param _fee  The fee of pool
    /// @return if 0 , token0 is TOS. if 1, token1 is TOS. if 2, it is not existed pool. if 3, it is not TOS pool.
    function getTOStoken0(address _erc20Addresss, uint24 _fee) external view returns (uint);

    /// @dev It tells that _poolAddress is TOS pool or not, and if it is TOS pool, It tells that the TOS token is which token among first ot second.
    /// @param _poolAddress  The address of pool
    /// @return if 0 , token0 is TOS. if 1, token1 is TOS. if 3, it is not TOS pool.
    function getTOStoken(address _poolAddress) external view returns (uint);

    /// @dev It tells the price of token0 in the pool.
    /// @param poolAddress The address of pool
    /// @return priceX96 The token0's price of pool
    function getPriceToken0(address poolAddress) external view returns (uint256 priceX96);

    /// @dev It tells the price of token1 in the pool.
    /// @param poolAddress The address of pool
    /// @return priceX96 The token1's price of pool
    function getPriceToken1(address poolAddress) external view returns(uint256 priceX96);

    /// @dev It tells the TOS price per ETH token
    /// @return price The TOS price per ETH token
    function getTOSPricePerETH() external view returns (uint256 price);

    /// @dev It tells the ETH price per TOS token
    /// @return price The ETH price per TOS token
    function getETHPricePerTOS() external view returns (uint256 price);

    /// @dev It tells you how many TOS tokens are equal to each _asset token.
    /// @param _asset The token address
    /// @return price The TOS price per _asset token
    function getTOSPricePerAsset(address _asset) external view returns (uint256 price);

    /// @dev It tells you how many tokens are equal to each TOS.
    /// @param _asset The token address
    /// @return price The _asset price per TOS
    function getAssetPricePerTOS(address _asset) external view returns (uint256 price);

    /// @dev
    /// @param tokenA The first token used to create the pool
    /// @param tokenB  The second token used to create the pool
    /// @param _fee  the fee used to create the pool
    /// @return isWeth  true if WETH pool
    /// @return isTos  true if it is a TOS pool
    /// @return pool  the address of pool
    /// @return token0  the address of token0
    /// @return token1  the address of token1
    function existPool(address tokenA, address tokenB, uint24 _fee)
        external view returns (bool isWeth, bool isTos, address pool, address token0, address token1);

    /// @dev When you create a pool with two tokens, you can know the address of the pool that is created.
    /// @param tokenA The first token used to create the pool
    /// @param tokenB  The second token used to create the pool
    /// @param _fee  the fee used to create the pool
    /// @return pool  the address of pool
    /// @return token0  the address of token0
    /// @return token1  the address of token1
    function computePoolAddress(address tokenA, address tokenB, uint24 _fee)
        external view returns (address pool, address token0, address token1);

    /// @dev It tells you how much Ether or TOS a certain amount of tokens can be exchanged for.
    /// @param _asset the token address
    /// @param _amount  the amount of token
    /// @return  existedWethPool True is assigned when an Ether-specific token pool exists, which will indicate the amount in Ether basis.
    /// @return  existedTosPool True is assigned when an TOS-specific token pool exists, which will indicate the amount in TOS basis.
    /// @return  priceWethOrTosPerAsset Ether price per token or TOS price per token
    /// @return  convertedAmount amount of ether or TOS
    function convertAssetBalanceToWethOrTos(address _asset, uint256 _amount)
        external view
        returns (bool existedWethPool, bool existedTosPool,  uint256 priceWethOrTosPerAsset, uint256 convertedAmount);

}
