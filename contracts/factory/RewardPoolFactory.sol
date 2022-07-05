// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./VaultFactory.sol";
import "../reward/RewardPoolSnapshotProxy.sol";

import "../interfaces/IRewardPoolFactory.sol";
import "../interfaces/IUniswapV3Pool.sol";

interface IIDTOS_RPF {
    function addPoolAndInitialize(address pool) external ;

}

interface IIPolicy {
    function wethAddress() external view returns(address);

}
contract RewardPoolFactory is VaultFactory, IRewardPoolFactory
{
    address public uniswapV3Factory;
    address public nonfungiblePositionManager;
    address public rewardLPTokenManager;
    address public tosAddress;
    address public dtos;
    address public dtosPolicy;

    constructor() {}


    function setAddresses(
        address _factory,
        address _npm,
        address _rLPM,
        address _tos,
        address _dtos,
        address _dtosPolicy
        )
        external onlyOwner
        nonZeroAddress(_factory)
        nonZeroAddress(_npm)
        nonZeroAddress(_rLPM)
        nonZeroAddress(_tos)
        nonZeroAddress(_dtos)
        nonZeroAddress(_dtosPolicy)
    {
        uniswapV3Factory = _factory;
        nonfungiblePositionManager =_npm;
        rewardLPTokenManager = _rLPM;
        tosAddress = _tos;
        dtos = _dtos;
        dtosPolicy = _dtosPolicy;
    }


    /// @inheritdoc IRewardPoolFactory
    function create(
        string calldata _name,
        address poolAddress
    )
        external override onlyOwner
        nonZeroAddress(vaultLogic)
        nonZeroAddress(upgradeAdmin)
        nonZeroAddress(uniswapV3Factory)
        nonZeroAddress(nonfungiblePositionManager)
        nonZeroAddress(rewardLPTokenManager)
        nonZeroAddress(tosAddress)
        nonZeroAddress(dtos)
        nonZeroAddress(dtosPolicy)
        returns (address)
    {
        require(bytes(_name).length > 0,"name is empty");

        require(
            IUniswapV3Pool(poolAddress).token0() != address(0) &&
            IUniswapV3Pool(poolAddress).token1() != address(0),
            "pool's token is zero"
        );

        require(
           (IUniswapV3Pool(poolAddress).token0() == tosAddress ||  IUniswapV3Pool(poolAddress).token0() == IIPolicy(dtosPolicy).wethAddress())
           || (IUniswapV3Pool(poolAddress).token1() == tosAddress ||  IUniswapV3Pool(poolAddress).token1() == IIPolicy(dtosPolicy).wethAddress()),
            "pool's token is not tos ot weth"
        );

        RewardPoolSnapshotProxy _proxy = new RewardPoolSnapshotProxy();

        require(
            address(_proxy) != address(0),
            "RewardPoolSnapshotProxy zero"
        );

        _proxy.addAdmin(upgradeAdmin);
        _proxy.setImplementation2(vaultLogic, 0, true);

        _proxy.initializeProxy(
            poolAddress,
            uniswapV3Factory,
            nonfungiblePositionManager,
            rewardLPTokenManager,
            tosAddress,
            dtos,
            dtosPolicy
        );

        // _proxy.removeAdmin(address(this));

        createdContracts[totalCreatedContracts] = ContractInfo(address(_proxy), _name);
        totalCreatedContracts++;

        IIDTOS_RPF(dtos).addPoolAndInitialize(address(_proxy));

        emit CreatedRewardPool(address(_proxy), _name, poolAddress);

        return address(_proxy);
    }
}