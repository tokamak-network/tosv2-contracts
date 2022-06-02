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

    function getTOSERC20PoolTOSPrice(
        address _erc20address,
        address _tosERC20Pool,
        uint24 fee
    ) 
        external 
        view 
        returns (uint256 price);

    function getTOSERC20PoolERC20Price(
        address _erc20address,
        address _tosERC20Pool, 
        uint24 fee
    ) 
        external 
        view 
        returns (uint256 price);


    function getTOStoken0(address _erc20Addresss, uint24 _fee) external view returns (uint);
}
