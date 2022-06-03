// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity > 0.8.0;

/// @title LibDTOS
library LibDTOS
{
    struct BalanceSnapshots {
        uint256[] ids;
        uint256[] balances;
    }

    struct FactorSnapshots {
        uint256[] ids;
        uint256[] factors;
        uint256[] refactorCounts;
    }
}
