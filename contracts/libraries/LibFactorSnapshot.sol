// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity > 0.8.0;

/// @title LibFactorSnapshot
library LibFactorSnapshot
{
    struct Snapshots {
        uint256[] ids;
        uint256[] values;
        uint256[] factoredAmounts;
    }

    struct FactorSnapshots {
        uint256[] ids;
        uint256[] factors;
    }

}
