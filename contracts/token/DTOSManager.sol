// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./DTOSManagerStorage.sol";
import "../common/AccessibleCommon.sol";
import {IDTOSManager} from "../interfaces/IDTOSManager.sol";

import {DSMath} from "../libraries/DSMath.sol";
import "../libraries/SArrays.sol";
import "../libraries/ABDKMath64x64.sol";

import "hardhat/console.sol";

interface IIRewardPool {
    function dtosBalanceOf(address account) external view  returns (uint256 amount);
    function dtosTotalSupply() external view  returns (uint256 amount);
}

contract DTOSManager is
    DTOSManagerStorage,
    AccessibleCommon,
    DSMath,
    IDTOSManager
{
    using SArrays for uint256[];

    modifier onlyRewardLPTokenManager() {
        require(
            rewardLPTokenManager == msg.sender,
            "DTOS:sender is not rewardLPTokenManager"
        );
        _;
    }

    constructor() {

    }


    /// Only Admin

    function setRewardLPTokenManager(address _addr)
        external
        nonZeroAddress(_addr) onlyOwner
    {
        require(rewardLPTokenManager != _addr, "same address");
        rewardLPTokenManager = _addr;
    }

    function setRewardPoolFactory(address _addr)
        external
        nonZeroAddress(_addr) onlyOwner
    {
        require(rewardPoolFactory != _addr, "same address");
        rewardPoolFactory = _addr;
    }

    function setInitialDtosBaseRate(uint256 _rate)
        external onlyOwner
    {
        require(initialDtosBaseRate != _rate, "same value");
        initialDtosBaseRate = _rate;
    }

    function setDtosBaseRate(address _pool, uint256 _rate)
        external nonZeroAddress(_pool) onlyOwner
    {
        require(poolIndex[_pool] > 0, "zero pool index");

        if (_rate > 0) {
            poolDtosBaseRate[_pool] = _rate;
        } else {
            deletePool(_pool);
        }
    }


    function addPool(address _pool) public nonZeroAddress(_pool)
    {
        require(
            msg.sender == rewardPoolFactory
            || isAdmin(msg.sender)
            , "sender is not RewardPoolFactory or Admin");

        if(pools.length == 0) pools.push(address(0));

        if (poolIndex[_pool] == 0) {
            poolIndex[_pool] = pools.length;
            poolDtosBaseRate[_pool] = initialDtosBaseRate;
            pools.push(_pool);
        }
    }

    function deletePool(address _pool) public nonZeroAddress(_pool) onlyOwner
    {
        uint256 _index = poolIndex[_pool];
        if (_index > 0 && _index < pools.length) {
            if (_index < pools.length-1) pools[_index] = pools[pools.length-1];
            pools.pop();
            poolIndex[_pool] = 0;
            poolDtosBaseRate[_pool] = 0;
        }
    }

    /// Can Anybody

    function balanceOf(address account) public view override returns (uint256 amount)
    {
        uint256 len = pools.length;
        for (uint256 i = 1; i < len; i++) {
            if (pools[i] != address(0)) amount += IIRewardPool(pools[i]).dtosBalanceOf(account);
        }
    }

    function totalSupply() public view override returns (uint256 amount) {
        uint256 len = pools.length;
        for (uint256 i = 1; i < len; i++) {
            if (pools[i] != address(0)) amount += IIRewardPool(pools[i]).dtosTotalSupply();
        }
    }

}
