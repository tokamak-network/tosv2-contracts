//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./TreasuryStorage.sol";
import "./proxy/VaultProxy.sol";

import {Address} from "@openzeppelin/contracts/utils/Address.sol";


contract TreasuryProxy is
    TreasuryStorage,
    VaultProxy
{

     /* ========== CONSTRUCTOR ========== */
    function initialize(
        address _tos,
        address _calculator
    )
        external onlyProxyOwner
    {
        require(_tos != address(0), "Zero address: TOS");

        TOS = IERC20(_tos);
        calculator = _calculator;
    }

}