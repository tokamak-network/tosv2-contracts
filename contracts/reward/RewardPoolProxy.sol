// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "./RewardPoolStorage.sol";
import "../proxy/VaultProxy.sol";

contract RewardPoolProxy is RewardPoolStorage, VaultProxy
{
    function initializeProxy(
        address poolAddress,
        address projectAdmin
    )   external onlyOwner
    {
        require(pool == address(0), "already initialized pool");
        require(
            poolAddress != address(0) && projectAdmin != address(0),
            "RewardPoolProxy: poolAddress or projectAdmin zero"
        );

        if(!isAdmin(projectAdmin)){
            _setupRole(PROJECT_ADMIN_ROLE, projectAdmin);
        }
        pool = poolAddress;
    }
}