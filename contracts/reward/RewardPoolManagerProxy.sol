// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./RewardPoolManagerStorage.sol";
import "../proxy/BaseProxy.sol";


contract RewardPoolManagerProxy is
    RewardPoolManagerStorage,
    BaseProxy
{
}