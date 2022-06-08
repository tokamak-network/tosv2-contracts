//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./DTOSSnapshotStorage.sol";
import "../proxy/BaseProxy.sol";

import {Address} from "@openzeppelin/contracts/utils/Address.sol";

import "../interfaces/IProxyEvent.sol";
import "../interfaces/IProxyAction.sol";

// import "hardhat/console.sol";

contract DTOSSnapshotProxy is
    DTOSSnapshotStorage,
    BaseProxy
{


    function initialize(string memory _name, string memory _symbol)
        external onlyOwner
    {
        require(bytes(_name).length > 0 && bytes(_symbol).length > 0, "name or symbol is empty.");
        require(bytes(name).length == 0, "already set");

        name = _name;
        symbol = _symbol;

        currentSnapshotId++;
        factorSnapshots.ids.push(currentSnapshotId);
        factorSnapshots.factors.push(10**18);
        factorSnapshots.refactorCounts.push(0);

    }


}