// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity > 0.8.0;

/// @title LibDTOS
library LibDTOS
{

    struct Balance {
        uint256 balance;
        uint256 refactoredCount;
        uint256 remain;
    }

    struct Rebase {
        uint256 start;
        uint256 factor;
        uint256 refactorCount;
    }

}
