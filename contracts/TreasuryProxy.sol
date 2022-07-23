// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./TreasuryStorage.sol";
import "./proxy/TreasuryVaultProxy.sol";

contract TreasuryProxy is
    TreasuryStorage,
    TreasuryVaultProxy
{
    function initialize(
        address _tos,
        address _calculator,
        address _wethAddress,
        address _uniswapV3Factory
    )
        nonZeroAddress(_tos)
        nonZeroAddress(_calculator)
        nonZeroAddress(_wethAddress)
        nonZeroAddress(_uniswapV3Factory)
        external onlyProxyOwner
    {
        require(address(TOS) == address(0), "already initialized");

        TOS = IERC20(_tos);
        calculator = _calculator;
        wethAddress = _wethAddress;
        uniswapV3Factory = _uniswapV3Factory;
        mintRateDenominator = 1;
    }

}