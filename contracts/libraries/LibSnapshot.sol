// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity > 0.8.0;

/// @title LibSnapshot
library LibSnapshot
{
    struct Snapshots {
        uint256[] ids;
        uint256[] values;
    }
}
