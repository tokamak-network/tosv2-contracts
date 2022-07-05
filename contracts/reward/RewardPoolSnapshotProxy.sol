// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./RewardPoolSnapshotStorage.sol";
import "../proxy/BaseProxy.sol";

interface IIIPolicy {
    function wethAddress() external view returns (address);
}

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
        token0 = pool.token0();
        token1 = pool.token1();
        require(token0 != address(0) && token1 != address(0), "non exist pool");
        require(
            (token0 == tos || token0 == IIIPolicy(policy).wethAddress())
            || (token1 == tos || token1 == IIIPolicy(policy).wethAddress()),
            "non tos or eth pool");

        uniswapV3Factory = IUniswapV3Factory(factory);
        nonfungiblePositionManager = INonfungiblePositionManager(npm);
        rewardLPTokenManager = IRewardLPTokenManagerAction(rlpm);
        tosAddress = tos;
        dtosManagerAddress = dtos;
        dtosPolicy = policy;
    }

}