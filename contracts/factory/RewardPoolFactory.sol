// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./VaultFactory.sol";
import "../reward/RewardPoolProxy.sol";

import "../interfaces/IRewardPoolFactory.sol";
import "../interfaces/IUniswapV3Pool.sol";

contract RewardPoolFactory is VaultFactory, IRewardPoolFactory
{
    address public uniswapV3Factory;
    address public nonfungiblePositionManager;
    address public rewardLPTokenManager;
    address public tosAddress;

    constructor() {}


    function setAddresses(
        address _factory,
        address _npm,
        address _rLPM,
        address _tos
        )
        external onlyOwner
        nonZeroAddress(_factory)
        nonZeroAddress(_npm)
        nonZeroAddress(_rLPM)
        nonZeroAddress(_tos)
    {
        uniswapV3Factory = _factory;
        nonfungiblePositionManager =_npm;
        rewardLPTokenManager = _rLPM;
        tosAddress = _tos;
    }


    /// @inheritdoc IRewardPoolFactory
    function create(
        string calldata _name,
        address poolAddress,
        address projectAdmin
    )
        external override
        nonZeroAddress(vaultLogic)
        nonZeroAddress(upgradeAdmin)
        nonZeroAddress(uniswapV3Factory)
        nonZeroAddress(nonfungiblePositionManager)
        nonZeroAddress(rewardLPTokenManager)
        nonZeroAddress(tosAddress)
        returns (address)
    {
        require(bytes(_name).length > 0,"name is empty");

        require(
            IUniswapV3Pool(poolAddress).token0() != address(0) &&
            IUniswapV3Pool(poolAddress).token1() != address(0),
            "pool's token is zero"
        );

        RewardPoolProxy _proxy = new RewardPoolProxy();

        require(
            address(_proxy) != address(0),
            "RewardPoolProxy zero"
        );

        _proxy.addAdmin(upgradeAdmin);
        _proxy.setImplementation2(vaultLogic, 0, true);

        _proxy.initializeProxy(
            poolAddress,
            projectAdmin,
            uniswapV3Factory,
            nonfungiblePositionManager,
            rewardLPTokenManager,
            tosAddress
        );

        _proxy.removeAdmin(address(this));

        createdContracts[totalCreatedContracts] = ContractInfo(address(_proxy), _name);
        totalCreatedContracts++;

        emit CreatedRewardPool(address(_proxy), _name);

        return address(_proxy);
    }
}