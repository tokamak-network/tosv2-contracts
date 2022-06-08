// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./RewardPoolStorage.sol";
import "../proxy/BaseProxy.sol";


contract RewardPoolProxy is
    RewardPoolStorage,
    BaseProxy
{

    function initializeProxy(
        address poolAddress,
        address projectAdmin,
        address factory,
        address npm,
        address rlpm,
        address tos
    )   external onlyOwner
    {
        require(address(pool) == address(0), "already initialized pool");
        require(
            poolAddress != address(0) && projectAdmin != address(0),
            "RewardPoolProxy: poolAddress or projectAdmin zero"
        );

        // require(
        //     IUniswapV3Pool(poolAddress).token0() != address(0) &&
        //     IUniswapV3Pool(poolAddress).token1() != address(0),
        //     "pool's token is zero"
        // );

        if(!isAdmin(projectAdmin)){
            _setupRole(PROJECT_ADMIN_ROLE, projectAdmin);
        }

        pool = IUniswapV3Pool(poolAddress);
        uniswapV3Factory = IUniswapV3Factory(factory);
        nonfungiblePositionManager = INonfungiblePositionManager(npm);
        rewardLPTokenManager = IRewardLPTokenManagerAction(rlpm);
        tosAddress = tos;
        availableDTOS = true;
    }
}