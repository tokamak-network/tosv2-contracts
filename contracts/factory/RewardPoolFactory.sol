// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./VaultFactory.sol";
import "../reward/RewardPoolProxy.sol";

import "../interfaces/IRewardPoolFactory.sol";

contract RewardPoolFactory is VaultFactory, IRewardPoolFactory
{
    constructor() {}

    /// @inheritdoc IRewardPoolFactory
    function create(
        string calldata _name,
        address poolAddress,
        address projectAdmin
    )
        external override
        nonZeroAddress(poolAddress)
        nonZeroAddress(poolAddress)
        nonZeroAddress(vaultLogic)
        nonZeroAddress(upgradeAdmin)
        returns (address)
    {
        require(bytes(_name).length > 0,"name is empty");

        RewardPoolProxy _proxy = new RewardPoolProxy();

        require(
            address(_proxy) != address(0),
            "RewardPoolProxy zero"
        );

        _proxy.addProxyAdmin(upgradeAdmin);
        _proxy.addAdmin(upgradeAdmin);
        _proxy.setImplementation2(vaultLogic, 0, true);

        _proxy.initializeProxy(poolAddress, projectAdmin);
        _proxy.removeAdmin();
        // _proxy.removeProxyAdmin();

        createdContracts[totalCreatedContracts] = ContractInfo(address(_proxy), _name);
        totalCreatedContracts++;

        emit CreatedRewardPool(address(_proxy), _name);

        return address(_proxy);
    }
}