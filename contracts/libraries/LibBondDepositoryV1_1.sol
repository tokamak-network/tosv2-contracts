// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

/// @title LibBondDepositoryV1_1
library LibBondDepositoryV1_1
{
    // market capacity info
    struct CapacityInfo {
        uint256 startTime;
        uint256 initialMaxPayout;
        uint256 capacityUpdatePeriod;
        uint256 totalSold;
        bool availableBasicBond;
        bool availableStosBond;
        bool closed;
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