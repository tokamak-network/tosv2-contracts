// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

/// @title LibBondDepositoryV1_2
library LibBondDepositoryV1_2
{

    // market liquidity token info
    struct LiquidityTokenInfo {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
    }

    struct IncreaseLiquidityParams {
        uint256 tokenId;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

}