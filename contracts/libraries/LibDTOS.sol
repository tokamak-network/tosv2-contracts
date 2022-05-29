// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity > 0.8.0;

/// @title LibDTOS
library LibDTOS
{
    // epochNumber - Rebase
    struct Rebase {
        uint256 end;
        uint256 distributedAmount;
        uint256 totalSupply;
        // uint256 apyForEpochDurationSecond;
        uint256 rebaseCount;
    }
}
