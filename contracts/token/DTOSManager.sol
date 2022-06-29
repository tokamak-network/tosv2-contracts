// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./DTOSManagerStorage.sol";
import "../common/AccessibleCommon.sol";
import {DSMath} from "../libraries/DSMath.sol";
import "../libraries/SArrays.sol";
import "../libraries/ABDKMath64x64.sol";

import {IDTOSManager} from "../interfaces/IDTOSManager.sol";
import "../interfaces/IPolicy.sol";

import "hardhat/console.sol";

interface IIRewardLPTokenManager {
    function mint(
        address to,
        address rewardPool,
        uint256 poolTokenId,
        uint256 tosAmount,
        uint256 factoredAmount
    ) external returns (uint256);
}

interface IIRewardPool {
    function tosAddress() external view returns (address);
    function balanceOf(address account) external view  returns (uint256 amount);
    function totalSupply() external view  returns (uint256 amount);
    function currentSnapshotId() external view returns (uint256);

    function dTosBaseRate() external view returns (uint256);
    function rebaseIntervalSecond() external view returns (uint256);
    function interestRatePerRebase() external view returns (uint256);

    function setDtosBaseRate(uint256 _baseRates) external;
    function setRebaseInfo(uint256 _period, uint256 _interest) external;
}

contract DTOSManager is
    DTOSManagerStorage,
    AccessibleCommon,
    DSMath,
    IDTOSManager
{
    using SArrays for uint256[];

    constructor() {
    }

    /// Only Admin

    function setReabseInfo(address _pool, uint256 _period, uint256 _interest)
        external override onlyOwner
    {
        _setReabseInfo(_pool, _period, _interest);
    }

    function _setReabseInfo(address _pool, uint256 _period, uint256 _interest)
        internal
    {
        require(poolIndex[_pool] > 0, "zero pool index");

        if (IIRewardPool(_pool).rebaseIntervalSecond() != _period
            || IIRewardPool(_pool).interestRatePerRebase() != _interest ) {
            IIRewardPool(_pool).setRebaseInfo(_period, _interest);
        }
    }

    function setDtosBaseRate(address _pool, uint256 _baserate)
        external override nonZeroAddress(_pool) onlyOwner
    {
        _setDtosBaseRate(_pool, _baserate);
    }

    function _setDtosBaseRate(address _pool, uint256 _baserate)
        internal
    {
        require(poolIndex[_pool] > 0, "zero pool index");

        if(IIRewardPool(_pool).dTosBaseRate() != _baserate) {
            IIRewardPool(_pool).setDtosBaseRate(_baserate);
        }
    }


    function addPoolAndInitialize(address _pool) public override nonZeroAddress(_pool)
    {
        addPool(_pool);
        _setDtosBaseRate(_pool, initialDtosBaseRate());
        _setReabseInfo(_pool, initialRebaseIntervalSecond(), initialInterestRatePerRebase());
    }

    function addPool(address _pool) public override nonZeroAddress(_pool)
    {
        require(IIRewardPool(_pool).tosAddress() == tosAddress, "different tos");

        require(
            msg.sender == rewardPoolFactory
            || isAdmin(msg.sender)
            , "sender is not RewardPoolFactory or Admin");

        if (poolIndex[_pool] == 0) {
            if(pools.length == 0) pools.push(address(0));
            poolIndex[_pool] = pools.length;
            pools.push(_pool);
        }
    }

    function deletePool(address _pool) public override nonZeroAddress(_pool) onlyOwner
    {
        uint256 _index = poolIndex[_pool];
        if (_index > 0 && _index < pools.length) {
            if (_index < pools.length-1) pools[_index] = pools[pools.length-1];
            pools.pop();
            poolIndex[_pool] = 0;
        }
    }

    function savePoolSnapshots() public override
    {
        curSnapshotId++;

        uint256 len = pools.length;
        for (uint256 i = 1; i < len; i++) {
            address pool = pools[i];
            if (pool != address(0)) {
                uint256 id = IIRewardPool(pool).currentSnapshotId();
                poolSnapshots[curSnapshotId].push(Snapshot(pool, id));
            }
        }
    }

    /// Only RewardPool
    function mintNFT(
        address staker,
        uint256 tokenId,
        uint256 tosAmount,
        uint256 factoredAmount

    ) external onlyRewardPool returns (uint256 rewardLP)
    {
        console.log("mintNFT in %s", tokenId);
        rewardLP = IIRewardLPTokenManager(rewardLPTokenManager).mint(staker, msg.sender, tokenId, tosAmount, factoredAmount);
        console.log("mintNFT out %s", rewardLP);
    }


    /// Can Anybody

    function balanceOf(address account) public view override returns (uint256 amount)
    {
        uint256 len = pools.length;
        for (uint256 i = 1; i < len; i++) {
            if (pools[i] != address(0)) amount += IIRewardPool(pools[i]).balanceOf(account);
        }
    }

    function totalSupply() public view override returns (uint256 amount) {
        uint256 len = pools.length;
        for (uint256 i = 1; i < len; i++) {
            if (pools[i] != address(0)) amount += IIRewardPool(pools[i]).totalSupply();
        }
    }

    function balanceOf(address pool, address account) public view override returns (uint256 amount)
    {
        return IIRewardPool(pool).balanceOf(account);
    }

    function totalSupply(address pool) public view override returns (uint256 amount) {
        return IIRewardPool(pool).totalSupply();
    }

    function balanceOfAt(address account, uint256 snapshotId) public view override returns (uint256 amount)
    {
        Snapshot[] memory snaps = poolSnapshots[snapshotId];
        uint256 len = snaps.length;

        for (uint256 i = 0; i < len; i++) {
            if (snaps[i].poolAddress != address(0)) amount += balanceOf(snaps[i].poolAddress, account);
        }
    }

    function totalSupplyAt(uint256 snapshotId) public view override returns (uint256 amount)
    {
        Snapshot[] memory snaps = poolSnapshots[snapshotId];
        uint256 len = snaps.length;

        for (uint256 i = 0; i < len; i++) {
            if (snaps[i].poolAddress != address(0)) amount += totalSupply(snaps[i].poolAddress);
        }
    }

    function minDtosBaseRate() public view override returns (uint256 amount) {
        return IPolicy(policyAddress).minDtosBaseRate();
    }

    function maxDtosBaseRate() public view override returns (uint256 amount) {
        return IPolicy(policyAddress).maxDtosBaseRate();
    }

    function initialDtosBaseRate() public view override returns (uint256 amount) {
        return IPolicy(policyAddress).initialDtosBaseRate();
    }

    function initialRebaseIntervalSecond() public view override returns (uint256 amount) {
        return IPolicy(policyAddress).initialRebaseIntervalSecond();
    }

    function initialInterestRatePerRebase() public view override returns (uint256 amount) {
        return IPolicy(policyAddress).initialInterestRatePerRebase();
    }

    function dtosBaseRate(address pool) external view returns (uint256 amount)
    {
        return IIRewardPool(pool).dTosBaseRate();
    }
}
