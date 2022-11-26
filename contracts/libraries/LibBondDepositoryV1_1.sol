// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

/// @title LibBondDepositoryV1_1
library LibBondDepositoryV1_1
{
    // market capacity info
    struct CapacityInfo {
        uint256 startTime;
        uint256 initialCapacity;
        uint256 initialMaxPayout;
        uint256 capacityUpdatePeriod;
        uint256 totalSold;
        bool availableBasicBond;
        bool availableLockupBond;
        bool closed;
    }
}