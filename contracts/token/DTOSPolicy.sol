// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../common/AccessibleCommon.sol";

interface IPausableContract {
    function execPauseFlag() external view returns (bool);
    function execPause(bool pauseFlag) external ;
}

contract dTOSPolicy is AccessibleCommon {

    uint256 public minDtosBaseRate;
    uint256 public maxDtosBaseRate;
    uint256 public initialDtosBaseRate;
    uint256 public initialInterestRatePerRebase;
    uint256 public initialRebaseIntervalSecond;

    constructor(
        uint256 _min,
        uint256 _max,
        uint256 _initBaseRate,
        uint256 _initRebaseInterest,
        uint256 _initRebaseInterval
        ) {
            _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);
            _setupRole(ADMIN_ROLE, msg.sender);
            _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

            minDtosBaseRate = _min;
            maxDtosBaseRate = _max;
            initialDtosBaseRate = _initBaseRate;
            initialInterestRatePerRebase = _initRebaseInterest;
            initialRebaseIntervalSecond = _initRebaseInterval;
    }

    /// Only Admin
    function setMinMaxBaseRate(uint256 minValue, uint256 maxValue) external onlyOwner
    {
        require(minDtosBaseRate != minValue || maxDtosBaseRate != maxValue, "same value");
        minDtosBaseRate = minValue;
        maxDtosBaseRate = maxValue;
    }

    function setInitialDtosBaseInfo(uint256 baserate) external onlyOwner
    {
        require(initialDtosBaseRate != baserate, "same value");
        require(baserate >= minDtosBaseRate && baserate <= maxDtosBaseRate, "non-acceptable rate");

        initialDtosBaseRate = baserate;
    }

    function setInitialReabseInfo(uint256 period, uint256 interest) external onlyOwner
    {
        require(
            initialRebaseIntervalSecond != period ||
            initialInterestRatePerRebase != interest
            , "same value");
        initialRebaseIntervalSecond = period;
        initialInterestRatePerRebase = interest;
    }

    function execPause(address pool, bool _pauseFlag) external onlyOwner
    {
        require(IPausableContract(pool).execPauseFlag() != _pauseFlag, "same pause flag");
        IPausableContract(pool).execPause(_pauseFlag);
    }


    function getPauseFlag(address pool) external view returns (bool)
    {
        return IPausableContract(pool).execPauseFlag();
    }
}