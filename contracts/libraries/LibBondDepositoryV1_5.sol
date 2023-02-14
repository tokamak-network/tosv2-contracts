// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

/// @title LibBondDepositoryV1_5
library LibBondDepositoryV1_5
{

    enum BOND_TYPE {
        MINTING_V1,
        MINTING_V1_5,
        LIQUIDITY_V1_5
    }

    enum PRICING_TYPE {
        MAX,
        MIN,
        AVERAGE
    }

    // market market info
    struct MarketInfo {
        uint8 bondType;
        uint32 startTime;
        bool closed;
        uint256 initialMaxPayout;
        uint256 capacityUpdatePeriod;
        uint256 totalSold;
    }

    struct DiscountRateInfo {
        address discountRatesAddress;
        uint256 discountRatesId;
    }
}