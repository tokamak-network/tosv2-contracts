// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "./RewardPoolManagerStorage.sol";

import "../common/AccessibleCommon.sol";

interface IIRewardPool{
    function changeDtosBaseRate(uint256 tokenId) external view returns (address owner);
}


contract RewardPoolManager is RewardPoolManagerStorage, AccessibleCommon {

    function setDtosBaseRates(address _rewardPool, uint256 _baseRate)
        external
        nonZeroAddress(_rewardPool) onlyOwner
    {
        IIRewardPool(_rewardPool).setDtosBaseRates(_baseRate);
    }
}
