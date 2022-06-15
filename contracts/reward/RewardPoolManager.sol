// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "./RewardPoolManagerStorage.sol";

import "../common/AccessibleCommon.sol";

interface IIRewardPool{
    function setDtosBaseRates(uint256 baseRates) external;
}


contract RewardPoolManager is RewardPoolManagerStorage, AccessibleCommon {

    function setDtosBaseRates(address _rewardPool, uint256 _baseRate)
        external onlyOwner
    {
        require(_rewardPool != address(0), "zero address");
        IIRewardPool(_rewardPool).setDtosBaseRates(_baseRate);
    }
}
