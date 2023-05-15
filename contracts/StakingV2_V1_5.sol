// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./StakingV2Storage.sol";
import "./common/ProxyAccessCommon.sol";

import "./libraries/SafeERC20.sol";
import {DSMath} from "./libraries/DSMath.sol";

import "./libraries/LibTreasury.sol";

import "./interfaces/IStakingEvent_V1_5.sol";
import "hardhat/console.sol";

// interface ILockTosV2 {
//     function locksInfo(uint256 _lockId)
//         external
//         view
//         returns (
//             uint256,
//             uint256,
//             uint256
//         );
//     function createLockByStaker(address user, uint256 _value, uint256 _unlockWeeks) external returns (uint256 lockId);
//     function increaseAmountByStaker(address user, uint256 _lockId, uint256 _value) external;
//     function increaseAmountUnlockTimeByStaker(address user, uint256 _lockId, uint256 _value, uint256 _unlockWeeks) external;
//     function withdrawByStaker(address user, uint256 _lockId) external;
//     function epochUnit() external view returns(uint256);
// }

interface IITreasury {

    // function enableStaking() external view returns (uint256);
    // function requestTransfer(address _recipient, uint256 _amount)  external;
    function hasPermission(uint role, address account) external view returns (bool);
}

interface IIStakingV2 {

    function rebaseIndex() external;
}

contract StakingV2_V1_5 is
    StakingV2Storage,
    ProxyAccessCommon,
    DSMath,
    IStakingEvent_V1_5
{
    /* ========== DEPENDENCIES ========== */
    using SafeERC20 for IERC20;


    /// @dev Check if a function is used or not
    modifier onlyBonder() {
        require(IITreasury(treasury).hasPermission(uint(LibTreasury.STATUS.BONDER), msg.sender), "sender is not a bonder");
        _;
    }

    /* ========== CONSTRUCTOR ========== */
    constructor() {
    }


    /* ========== onlyPolicyOwner ========== */

    /* ========== onlyBonder ========== */

    function stakeByBondWithoutStos(
        address to,
        uint256 _amount,
        uint256 _marketId,
        uint256 tosPrice,
        uint8 _periodWeeks
    )
        external onlyBonder
        nonZeroAddress(to)
        nonZero(_amount)
        nonZero(_marketId)
        returns (uint256 stakeId)
    {
        _checkStakeId(to);

        stakeId = _addStakeId();
        _addUserStakeId(to, stakeId);

        IIStakingV2(address(this)).rebaseIndex();

        uint256 endTime = block.timestamp + basicBondPeriod;
        if (_periodWeeks > 0) endTime = block.timestamp + (_periodWeeks * 1 weeks);

        uint256 ltos = _createStakeInfo(to, stakeId, _amount, endTime, _marketId);

        emit StakedByBondWithoutStos(to, _amount, ltos, _marketId, stakeId, tosPrice, _periodWeeks);
    }


    /* ========== Anyone can execute ========== */

    /* ========== VIEW ========== */

    function getTosToLtos(uint256 amount) public view returns (uint256) {
        return (amount * 1e18) / index_;
    }

    /* ========== internal ========== */

    function _createStakeInfo(
        address _addr,
        uint256 _stakeId,
        uint256 _amount,
        uint256 _unlockTime,
        uint256 _marketId
    ) internal ifFree returns (uint256){

        uint256 ltos = getTosToLtos(_amount);

        allStakings[_stakeId] = LibStaking.UserBalance({
                staker: _addr,
                deposit: _amount,
                ltos: ltos,
                endTime: _unlockTime,
                marketId: _marketId
            });

        stakingPrincipal += _amount;
        totalLtos += ltos;

        return ltos;
    }

    function _addUserStakeId(address to, uint256 _id) internal {
        userStakingIndex[to][_id] = userStakings[to].length;
        userStakings[to].push(_id);
    }

    function _checkStakeId(address to) internal {
         if (userStakings[to].length == 0) {
            userStakings[to].push(0); // 0번때는 더미
            stakingIdCounter++;
            userStakingIndex[to][stakingIdCounter] = 1; // 첫번째가 기간없는 순수 스테이킹용 .
            userStakings[to].push(stakingIdCounter);
        }
    }

    function _addStakeId() internal returns(uint256) {
        return ++stakingIdCounter;
    }

    /* ========== onlyOwner ========== */

}
