//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./StakingV2Storage.sol";
import "./proxy/VaultProxy.sol";

import {Address} from "@openzeppelin/contracts/utils/Address.sol";


contract StakingV2Proxy is
    StakingV2Storage,
    VaultProxy
{

     /* ========== CONSTRUCTOR ========== */

    //addr[0] = tos, addr[1] = lockTOS
    //_epoch[0] = _epochLength, _epoch[1] = _firstEpochNumber, _epoch[2] =  _firstEpochTime, _epoch[3] = _epochUnit
    function initialize(
        address _tos,
        uint256[4] memory _epoch,
        address _lockTOS,
        ITreasury _treasury
    )
        external onlyProxyOwner
    {
        require(_tos != address(0), "Zero address : TOS");
        require(_lockTOS != address(0), "Zero address : lockTOS");
        
        TOS = IERC20(_tos);
        lockTOS = ILockTOSv2Action0(_lockTOS);
        treasury = _treasury;

        epoch = Epoch({length_: _epoch[0], number: _epoch[1], end: _epoch[2]});
        epochUnit = _epoch[3];
    }

}