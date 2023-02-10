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
    // market market info
    struct MarketInfo {
        uint8 bondType;
        uint32 startTime;
        bool closed;
        uint256 initialMaxPayout;
        uint256 capacityUpdatePeriod;
        uint256 totalSold;
        address[] pools;
    }

    struct DiscountRateInfo {
        address discountRatesAddress;
        uint256 discountRatesId;
    }

    function calculateTosAmountForAsset(
        uint256 _tosPrice,
        uint256 _amount,
        uint256 _erc20Decimal
    )
        public
        pure
        returns (uint256 payout)
    {
        return (_amount * _tosPrice / (10 ** _erc20Decimal));
    }

    function purchasableAssetAmountAtOneTime(
        uint256 _tosPrice,
        uint256 _maxPayout
    )
        public pure returns (uint256 maxPayout_)
    {
        return ( _maxPayout * 1e18 / _tosPrice );
    }



}