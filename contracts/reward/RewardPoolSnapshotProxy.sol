// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./RewardPoolSnapshotStorage.sol";
import "../proxy/BaseProxy.sol";


contract RewardPoolSnapshotProxy is
    RewardPoolSnapshotStorage,
    BaseProxy
{

    function initializeProxy(
        address poolAddress,
        address factory,
        address npm,
        address rlpm,
        address tos,
        address dtos,
        address policy
    )   external
        nonZeroAddress(factory)
        nonZeroAddress(npm)
        nonZeroAddress(rlpm)
        nonZeroAddress(tos)
        nonZeroAddress(dtos)
        nonZeroAddress(policy)
        onlyOwner
    {
        require(address(pool) == address(0), "already initialized pool");
        require(
            poolAddress != address(0) ,
            "RewardPoolSnapshotProxy: poolAddress zero"
        );

        pool = IUniswapV3Pool(poolAddress);
        uniswapV3Factory = IUniswapV3Factory(factory);
        nonfungiblePositionManager = INonfungiblePositionManager(npm);
        rewardLPTokenManager = IRewardLPTokenManagerAction(rlpm);
        tosAddress = tos;
        dtosManagerAddress = dtos;
        dtosPolicy = policy;
    }



}