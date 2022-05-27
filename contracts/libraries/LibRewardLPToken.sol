// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity > 0.8.0;

/// @title LibRewardLPToken
library LibRewardLPToken
{
    struct RewardTokenInfo {
        address pool;
        address owner;
        uint256 poolTokenId;
        uint256 tosAmount;
        uint256 usedAmount;
        uint256 stakedTime;
        uint128 liquidity;
    }

}
