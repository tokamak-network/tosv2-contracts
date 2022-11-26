// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./libraries/LibBondDepositoryV1_1.sol";

contract BondDepositoryStorageV1_1 {

    /// marketId - CapacityInfo
    mapping(uint256 => LibBondDepositoryV1_1.CapacityInfo) marketCapacityInfos;

}
