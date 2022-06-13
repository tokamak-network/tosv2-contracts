//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./DTOSStorage.sol";
import "../proxy/BaseProxy.sol";

import {Address} from "@openzeppelin/contracts/utils/Address.sol";


contract DTOSProxy is
    DTOSStorage,
    BaseProxy
{

    function initialize(string memory _name, string memory _symbol)
        external onlyOwner
    {
        require(bytes(_name).length > 0 && bytes(_symbol).length > 0, "name or symbol is empty.");
        require(bytes(name).length == 0, "already set");

        name = _name;
        symbol = _symbol;
        _factor = DEFAULT_FACTOR;
    }

    function addPool(address _pool) public
    {
        require(
            msg.sender == rewardPoolFactory
            || isAdmin(msg.sender)
            , "sender is not RewardPoolFactory or Admin");

        if (poolIndex[_pool] == 0) {
            poolIndex[_pool] = pools.length;
            pools.push(_pool);
        }
    }

    function deletePool(address _pool) public  onlyOwner
    {
        uint256 _index = poolIndex[_pool];
        if (_index > 0 && _index < pools.length) {
            if (_index < pools.length-1) pools[_index] = pools[pools.length-1];
            pools.pop();
            poolIndex[_pool] = 0;
            poolDtosBaseRate[_pool] = 0;
        }
    }

}