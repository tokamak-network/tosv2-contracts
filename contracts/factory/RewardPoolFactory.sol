// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./VaultFactory.sol";
import "../reward/RewardPoolProxy.sol";

import "../interfaces/IRewardPoolFactory.sol";
import "../interfaces/IUniswapV3Pool.sol";

interface IIDTOS_RPF {
    function addPool(address pool) external ;

}

contract RewardPoolFactory is VaultFactory, IRewardPoolFactory
{
    address public uniswapV3Factory;
    address public nonfungiblePositionManager;
    address public rewardLPTokenManager;
    address public tosAddress;
    address public dtos;
    address public rewardPoolManager;

    constructor() {}


    function setAddresses(
        address _factory,
        address _npm,
        address _rLPM,
        address _tos,
        address _dtos,
        address _rewardPoolManager
        )
        external onlyOwner
        nonZeroAddress(_factory)
        nonZeroAddress(_npm)
        nonZeroAddress(_rLPM)
        nonZeroAddress(_tos)
        nonZeroAddress(_dtos)
        nonZeroAddress(_rewardPoolManager)
    {
        uniswapV3Factory = _factory;
        nonfungiblePositionManager =_npm;
        rewardLPTokenManager = _rLPM;
        tosAddress = _tos;
        dtos = _dtos;
        rewardPoolManager = _rewardPoolManager;
    }


    /// @inheritdoc IRewardPoolFactory
    function create(
        string calldata _name,
        address poolAddress,
        address projectAdmin
    )
        external override onlyOwner
        nonZeroAddress(vaultLogic)
        nonZeroAddress(upgradeAdmin)
        nonZeroAddress(uniswapV3Factory)
        nonZeroAddress(nonfungiblePositionManager)
        nonZeroAddress(rewardLPTokenManager)
        nonZeroAddress(tosAddress)
        nonZeroAddress(dtos)
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
            tosAddress,
            rewardPoolManager
        );

        _proxy.removeAdmin(address(this));

        createdContracts[totalCreatedContracts] = ContractInfo(address(_proxy), _name);
        totalCreatedContracts++;

        IIDTOS_RPF(dtos).addPool(address(_proxy));

        emit CreatedRewardPool(address(_proxy), _name);

        return address(_proxy);
    }
}