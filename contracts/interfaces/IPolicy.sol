//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

/// @title IPolicy
interface IPolicy {

    function setMinMaxBaseRate(uint256 minValue, uint256 maxValue) external;
    function setInitialDtosBaseInfo(uint256 baserate) external;
    function setInitialReabseInfo(uint256 period, uint256 interest) external;

    function minDtosBaseRate() external view returns (uint256);
    function maxDtosBaseRate() external view returns (uint256);
    function initialDtosBaseRate() external view returns (uint256);
    function initialInterestRatePerRebase() external view returns (uint256);
    function initialRebaseIntervalSecond() external view returns (uint256);


}

