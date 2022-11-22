// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./libraries/LibBondDepositoryV1.sol";

contract BondDepositoryStorageV1 {

    /// marketId - CapacityInfo
    mapping(uint256 => LibBondDepositoryV1.CapacityInfo) marketCapacityInfos;

}
