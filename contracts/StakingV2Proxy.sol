// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./StakingV2Storage.sol";
import "./proxy/StakeBaseProxy.sol";

contract StakingV2Proxy is
    StakingV2Storage,
    StakeBaseProxy
{

     /* ========== CONSTRUCTOR ========== */

    //addr[0] = tos, addr[1] = lockTOS
    //_epoch[0] = _epochLength, _epoch[1] = _firstEpochNumber, _epoch[2] =  _firstEpochTime
    function initialize(
        address _tos,
        uint256[3] memory _epoch,
        address _lockTOS,
        address _treasury,
        uint256 _basicBondPeriod
    )
        external onlyProxyOwner
        nonZeroAddress(_tos)
        nonZeroAddress(_lockTOS)
        nonZeroAddress(_treasury)
        nonZero(_basicBondPeriod)
    {
        require(_epoch[0] > 0 && _epoch[2] > 0, "zero epoch value");
        require(address(TOS) == address(0), "already initialized.");

        TOS = IERC20(_tos);
        lockTOS = _lockTOS;
        treasury = _treasury;

        epoch = LibStaking.Epoch({length_: _epoch[0], number: _epoch[1], end: _epoch[2]});

        basicBondPeriod = _basicBondPeriod;
    }

}