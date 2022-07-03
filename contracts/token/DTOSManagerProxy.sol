//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./DTOSManagerStorage.sol";
import "../proxy/BaseProxy.sol";

import {Address} from "@openzeppelin/contracts/utils/Address.sol";


contract DTOSManagerProxy is
    DTOSManagerStorage,
    BaseProxy
{

    function initialize(
            string memory _name,
            string memory _symbol,
            address _tos
        )
        external onlyOwner
    {
        require(bytes(_name).length > 0 && bytes(_symbol).length > 0, "name or symbol is empty.");
        require(bytes(name).length == 0, "already set");

        name = _name;
        symbol = _symbol;
        tosAddress = _tos;
    }

}