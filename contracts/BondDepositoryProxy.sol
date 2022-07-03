//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./BondDepositoryStorage.sol";
import "./proxy/VaultProxy.sol";

import {Address} from "@openzeppelin/contracts/utils/Address.sol";


contract BondDepositoryProxy is
    BondDepositoryStorage,
    VaultProxy
{

    function initialize(
        IERC20 _tos,
        IdTOS _dtos,
        IStaking _staking,
        ITreasury _treasury,
        address _calculator
    )
        external onlyOwner
    {
        tos = _tos;
        dTOS = _dtos;
        staking = _staking;
        treasury = _treasury;
        calculator = _calculator;
        tos.approve(address(_staking), 1e45);
    }

}