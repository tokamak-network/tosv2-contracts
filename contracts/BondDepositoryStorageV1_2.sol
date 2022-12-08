// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./libraries/LibBondDepositoryV1_2.sol";

contract BondDepositoryStorageV1_2 {

    address public npm;
    address public weth;

    /// marketId - LiquidityToken
    mapping(uint256 => uint256) marketLps;
    /// marketId - liquidity pool info
    mapping(uint256 => LibBondDepositoryV1_2.LiquidityTokenInfo) marketLpInfos;
}
