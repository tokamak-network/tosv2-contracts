//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./BondDepositoryStorage.sol";
import "./proxy/VaultProxy.sol";

//import {Address} from "@openzeppelin/contracts/utils/Address.sol";


contract BondDepositoryProxy is
    BondDepositoryStorage,
    VaultProxy
{

    function initialize(
        address _tos,
        address _dtos,
        address _staking,
        address _treasury,
        address _calculator,
        address _uniswapV3Factory,
        uint256 _defaultLockPeriod
    )
        external onlyProxyOwner
        nonZeroAddress(_tos)
        nonZeroAddress(_dtos)
        nonZeroAddress(_staking)
        nonZeroAddress(_treasury)
        nonZeroAddress(_calculator)
        nonZeroAddress(_uniswapV3Factory)
    {
        tos = IERC20(_tos);
        dTOS = IDTOS(_dtos);
        staking = IStaking(_staking);
        treasury = ITreasury(_treasury);
        calculator = _calculator;
        uniswapV3Factory = _uniswapV3Factory;
        tos.approve(_staking, 1e45);

        defaultLockPeriod = _defaultLockPeriod;
    }

}