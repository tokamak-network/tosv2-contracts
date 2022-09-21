// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./StakingV2Storage.sol";
import "./common/ProxyAccessCommon.sol";

import "./libraries/SafeERC20.sol";
import {DSMath} from "./libraries/DSMath.sol";

import "./libraries/LibTreasury.sol";

import "./interfaces/IStaking.sol";
import "./interfaces/IStakingEvent.sol";

// import "hardhat/console.sol";

interface ILockTosV2 {

    function locksInfo(uint256 _lockId)
        external
        view
        returns (
            uint256,
            uint256,
            uint256
        );
    function createLockByStaker(address user, uint256 _value, uint256 _unlockWeeks) external returns (uint256 lockId);
    function increaseAmountByStaker(address user, uint256 _lockId, uint256 _value) external;
    function increaseAmountUnlockTimeByStaker(address user, uint256 _lockId, uint256 _value, uint256 _unlockWeeks) external;
    function withdrawByStaker(address user, uint256 _lockId) external;
    function epochUnit() external view returns(uint256);
}

interface IITreasury {

    function enableStaking() external view returns (uint256);
    function requestTransfer(address _recipient, uint256 _amount)  external;
    function hasPermission(uint role, address account) external view returns (bool);
}

contract StakingV2 is
    StakingV2Storage,
    ProxyAccessCommon,
    DSMath,
    IStaking,
    IStakingEvent
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

    /// @inheritdoc IStaking
    function setEpochInfo(
        uint256 _length,
        uint256 _end
    )
        external override onlyPolicyOwner
        nonZero(_length)
        nonZero(_end)
    {
        epoch.length_ = _length;
        epoch.end = _end;
    }

    /// @inheritdoc IStaking
    function setAddressInfos(
        address _tos,
        address _lockTOS,
        address _treasury
    )
        external override onlyPolicyOwner
        nonZeroAddress(_tos)
        nonZeroAddress(_lockTOS)
        nonZeroAddress(_treasury)
    {
        require(address(tos) != _tos || lockTOS != _lockTOS || treasury != _treasury, "same address");
        tos = IERC20(_tos);
        lockTOS = _lockTOS;
        treasury = _treasury;
    }

    /// @inheritdoc IStaking
    function setRebasePerEpoch(uint256 _rebasePerEpoch) external override onlyPolicyOwner {
        rebasePerEpoch = _rebasePerEpoch;
    }

    /// @inheritdoc IStaking
    function setIndex(uint256 _index) external override onlyPolicyOwner {
        index_ = _index;
    }

    /// @inheritdoc IStaking
    function setBasicBondPeriod(uint256 _period)
        external override onlyPolicyOwner
        nonZero(_period)
    {
        require(basicBondPeriod != _period,"same period");
        basicBondPeriod = _period;
    }

    /* ========== onlyBonder ========== */

    /// @inheritdoc IStaking
    function generateMarketId() public override onlyBonder returns (uint256) {
        return ++marketIdCounter;
    }

    /// @inheritdoc IStaking
    function stakeByBond(
        address to,
        uint256 _amount,
        uint256 _marketId,
        uint256 tosPrice
    )
        external override onlyBonder
        nonZeroAddress(to)
        nonZero(_amount)
        nonZero(_marketId)
        returns (uint256 stakeId)
    {
        _checkStakeId(to);

        stakeId = _addStakeId();
        _addUserStakeId(to, stakeId);

        rebaseIndex();

        uint256 ltos = _createStakeInfo(to, stakeId, _amount, block.timestamp + basicBondPeriod, _marketId);

        emit StakedByBond(to, _amount, ltos, _marketId, stakeId, tosPrice);
    }

    /// @inheritdoc IStaking
    function stakeGetStosByBond(
        address _to,
        uint256 _amount,
        uint256 _marketId,
        uint256 _periodWeeks,
        uint256 tosPrice
    )
        external override onlyBonder
        nonZeroAddress(_to)
        returns (uint256 stakeId)
    {
        require(_amount > 0 && _periodWeeks > 0 && _marketId > 0, "zero input");

        (uint256 stosEpochUnit, uint256 unlockTime) = LibStaking.getUnlockTime(lockTOS, block.timestamp, _periodWeeks) ;
        require (stosEpochUnit > 0, "zero stosEpochUnit");
        require (unlockTime > 0, "zero unlockTime");

        _checkStakeId(_to);
        stakeId = _addStakeId();
        _addUserStakeId(_to, stakeId);

        rebaseIndex();

        uint256 ltos = _createStakeInfo(_to, stakeId, _amount, unlockTime, _marketId);

        (uint256 stosId, uint256 stosPrincipal) = _createStos(_to, _amount, _periodWeeks, stosEpochUnit);
        connectId[stakeId] = stosId;

        emit StakedGetStosByBond(_to, _amount, ltos, _periodWeeks, _marketId, stakeId, stosId, tosPrice, stosPrincipal);
    }

    /* ========== Anyone can execute ========== */

    /// @inheritdoc IStaking
    function stake(
        uint256 _amount
    )   external override
        nonZero(_amount)
        returns (uint256 stakeId)
    {
        tos.safeTransferFrom(msg.sender, treasury, _amount);

        _checkStakeId(msg.sender);
        stakeId = userStakings[msg.sender][1]; // 0번은 더미, 1번은 기간없는 순수 스테이킹

        rebaseIndex();

        uint256 ltos = getTosToLtos(_amount);

        if (allStakings[stakeId].staker == msg.sender) {
            LibStaking.UserBalance storage _stakeInfo = allStakings[stakeId];
            _stakeInfo.deposit += _amount;
            _stakeInfo.ltos += ltos;

        } else {
            allStakings[stakeId] = LibStaking.UserBalance({
                staker: msg.sender,
                deposit: _amount,
                ltos: ltos,
                endTime: block.timestamp + 1,
                marketId: 0
            });
        }

        stakingPrincipal += _amount;
        totalLtos += ltos;

        emit Staked(msg.sender, _amount, stakeId);
    }

    /// @inheritdoc IStaking
    function stakeGetStos(
        uint256 _amount,
        uint256 _periodWeeks
    )
        external override
        nonZero(_amount)
        nonZero(_periodWeeks)
        nonZero(rebasePerEpoch)
        returns (uint256 stakeId)
    {
        (uint256 stosEpochUnit, uint256 unlockTime) = LibStaking.getUnlockTime(lockTOS, block.timestamp, _periodWeeks) ;
        // require(stosEpochUnit > 0, "zero stosEpochUnit");
        // require(unlockTime > 0, "zero unlockTime");

        tos.safeTransferFrom(msg.sender, treasury, _amount);

        _checkStakeId(msg.sender);
        stakeId = _addStakeId();
        _addUserStakeId(msg.sender, stakeId);

        rebaseIndex();
        _createStakeInfo(msg.sender, stakeId, _amount, unlockTime, 0);

        (uint256 stosId, uint256 stosPrincipal) = _createStos(msg.sender, _amount, _periodWeeks, stosEpochUnit);
        connectId[stakeId] = stosId;

        emit StakedGetStos(msg.sender, _amount, _periodWeeks, stakeId, stosId, stosPrincipal);
    }


    /// @inheritdoc IStaking
    function increaseAmountForSimpleStake(
        uint256 _stakeId,
        uint256 _amount
    )   external override
        nonZero(_stakeId)
        nonZero(_amount)
    {
        LibStaking.UserBalance storage _stakeInfo = allStakings[_stakeId];

        require(_stakeInfo.staker == msg.sender, "caller is not staker");
        require(userStakingIndex[msg.sender][_stakeId] == 1, "it's not simple staking product");
        rebaseIndex();

        uint256 ltos = getTosToLtos(_amount);
        _stakeInfo.deposit += _amount;
        _stakeInfo.ltos += ltos;
        stakingPrincipal += _amount;
        totalLtos += ltos;

        tos.safeTransferFrom(msg.sender, treasury, _amount);

        emit IncreasedAmountForSimpleStake(msg.sender, _amount, _stakeId);
    }

    function _closeEndTimeOfLockTos(address sender, uint256 _stakeId, uint256 lockId, uint256 _endTime) internal {
        (, uint256 end, ) = ILockTosV2(lockTOS).locksInfo(lockId);
        require(end < block.timestamp && _endTime < block.timestamp, "lock end time has not passed");
        ILockTosV2(lockTOS).withdrawByStaker(sender, lockId);
        delete connectId[_stakeId];
    }

    /// @inheritdoc IStaking
    function resetStakeGetStosAfterLock(
        uint256 _stakeId,
        uint256 _claimAmount
    )
        external override
    {
        require(_claimAmount > 0, "zero input");

        LibStaking.UserBalance storage _stakeInfo = allStakings[_stakeId];

        require(_stakeInfo.staker == msg.sender, "caller is not staker");
        require(userStakingIndex[msg.sender][_stakeId] > 1, "it's not for simple stake or empty.");

        rebaseIndex();
        uint256 stakedAmount = getLtosToTos(_stakeInfo.ltos);
        require(_claimAmount <= stakedAmount, "remainedTos is insufficient");

        uint256 lockId = connectId[_stakeId];
        if (lockId == 0) require(_stakeInfo.endTime < block.timestamp, "lock end time has not passed");
        else  _closeEndTimeOfLockTos(msg.sender, _stakeId, lockId, _stakeInfo.endTime);

        uint256 claimLtos = getTosToLtos(_claimAmount);

        uint256 profit = 0;
        if(stakedAmount > _stakeInfo.deposit) profit = stakedAmount - _stakeInfo.deposit;

        _stakeInfo.ltos -= claimLtos;
        totalLtos -= claimLtos;

        _stakeInfo.deposit = _stakeInfo.deposit + profit - _claimAmount;
        stakingPrincipal = stakingPrincipal + profit - _claimAmount;

        IITreasury(treasury).requestTransfer(msg.sender, _claimAmount);

        emit ResetStakedGetStosAfterLock(msg.sender, 0, _claimAmount, 0, _stakeId, 0, 0);
    }

    /// @inheritdoc IStaking
    function resetStakeGetStosAfterLock(
        uint256 _stakeId,
        uint256 _addAmount,
        uint256 _periodWeeks
    )
        external override
    {
        require(_addAmount > 0 || _periodWeeks > 0, "all zero input");

        LibStaking.UserBalance storage _stakeInfo = allStakings[_stakeId];
        require(_stakeInfo.staker == msg.sender, "caller is not staker");
        require(userStakingIndex[msg.sender][_stakeId] > 1, "it's not for simple stake or empty.");

        uint256 lockId = connectId[_stakeId];
        if (lockId > 0) _closeEndTimeOfLockTos(msg.sender, _stakeId, lockId, _stakeInfo.endTime);
        else  require(_stakeInfo.endTime < block.timestamp, "lock end time has not passed");

        if (_addAmount > 0)  tos.safeTransferFrom(msg.sender, treasury, _addAmount);

        uint256 stosEpochUnit = 0;
        uint256 unlockTime = 0;
        if (_periodWeeks > 0) {
            (stosEpochUnit, unlockTime) = LibStaking.getUnlockTime(lockTOS, block.timestamp, _periodWeeks) ;
        } else {
            stosEpochUnit = ILockTosV2(lockTOS).epochUnit();
            unlockTime = _stakeInfo.endTime;
        }

        rebaseIndex();

        //--
        uint256 stakedAmount = getLtosToTos(_stakeInfo.ltos);
        uint256 addLtos = getTosToLtos(_addAmount);

        uint256 profit = 0;
        if(stakedAmount > _stakeInfo.deposit) profit = stakedAmount - _stakeInfo.deposit;
        _stakeInfo.ltos += addLtos;
        _stakeInfo.endTime = unlockTime;

        _stakeInfo.deposit = _stakeInfo.deposit + _addAmount + profit;
        stakingPrincipal = stakingPrincipal + _addAmount + profit;
        totalLtos += addLtos;
        //----

        uint256 stosId = 0;
        uint256 stosPrincipal = 0;
        uint256 stakeId = _stakeId;

        if (_periodWeeks > 0) {
            (stosId, stosPrincipal) = _createStos(msg.sender, stakedAmount + _addAmount, _periodWeeks, stosEpochUnit);
            connectId[stakeId] = stosId;
        }

        emit ResetStakedGetStosAfterLock(msg.sender, _addAmount, 0, _periodWeeks, stakeId, stosId, stosPrincipal);
    }

    /// @inheritdoc IStaking
    function resetStakeGetStosAfterLock(
        uint256 _stakeId,
        uint256 _addAmount,
        uint256 _claimAmount,
        uint256 _periodWeeks
    )
        external override
    {
        require(_addAmount > 0 || _claimAmount > 0 ||  _periodWeeks > 0, "all zero input");

        uint256 lockId = connectId[_stakeId];

        LibStaking.UserBalance memory _stakeInfo = allStakings[_stakeId];

        require(_stakeInfo.staker == msg.sender, "caller is not staker");
        require(userStakingIndex[msg.sender][_stakeId] > 1, "it's not for simple stake or empty.");

        rebaseIndex();

        uint256 depositPlusAmount = getLtosToTos(_stakeInfo.ltos);
        require(_claimAmount <= depositPlusAmount, "remainedTos is insufficient");

        if(lockId > 0)  _closeEndTimeOfLockTos(msg.sender, _stakeId, lockId, _stakeInfo.endTime);
        else require(_stakeInfo.endTime < block.timestamp, "lock end time has not passed");

        if (_addAmount > 0)  tos.safeTransferFrom(msg.sender, treasury, _addAmount);

        uint256 stosEpochUnit = 0;
        uint256 unlockTime = 0;
        if (_periodWeeks > 0) {
            (stosEpochUnit, unlockTime) = LibStaking.getUnlockTime(lockTOS, block.timestamp, _periodWeeks) ;
        } else {
            stosEpochUnit = ILockTosV2(lockTOS).epochUnit();
            unlockTime = _stakeInfo.endTime;
        }

        _updateStakeInfo(_stakeId, unlockTime, _addAmount, _claimAmount);

        uint256 stosId = 0;
        uint256 stosPrincipal = 0;
        uint256 stakeId = _stakeId;
        if (_periodWeeks > 0) {
            depositPlusAmount += _addAmount;
            depositPlusAmount -= _claimAmount;
            (stosId, stosPrincipal) = _createStos(msg.sender, depositPlusAmount, _periodWeeks, stosEpochUnit);
            connectId[stakeId] = stosId;
        }

        if (_claimAmount > 0) IITreasury(treasury).requestTransfer(msg.sender, _claimAmount);

        emit ResetStakedGetStosAfterLock(msg.sender, _addAmount, _claimAmount, _periodWeeks, stakeId, stosId, stosPrincipal);
    }

    /// @inheritdoc IStaking
    function increaseBeforeEndOrNonEnd(
        uint256 _stakeId,
        uint256 _amount
    )
        external override
        nonZero(_stakeId)
        nonZero(_amount)
    {
        LibStaking.UserBalance storage _stakeInfo = allStakings[_stakeId];

        require(_stakeInfo.staker == msg.sender, "caller is not staker");
        tos.safeTransferFrom(msg.sender, treasury, _amount);

        rebaseIndex();

        uint256 ltos = getTosToLtos(_amount);
        _stakeInfo.deposit += _amount;
        _stakeInfo.ltos += ltos;
        stakingPrincipal += _amount;
        totalLtos += ltos;

        uint256 lockId = connectId[_stakeId];
        uint256 amountCompound = 0;
        if(userStakingIndex[msg.sender][_stakeId] > 1 && lockId > 0) {
            (, uint256 end, uint256 principal) = ILockTosV2(lockTOS).locksInfo(lockId);
            require(end > block.timestamp && _stakeInfo.endTime > block.timestamp, "lock end time has passed");

            uint256 n = (_stakeInfo.endTime - block.timestamp) / epoch.length_;
            if (n == 1) amountCompound = _amount * (1 ether + rebasePerEpoch) / 1e18;
            else if (n > 1) amountCompound = LibStaking.compound(_amount, rebasePerEpoch, n);

            if (amountCompound > 0){
                ILockTosV2(lockTOS).increaseAmountByStaker(msg.sender, lockId, amountCompound);
                amountCompound = principal + amountCompound;
            }
        }
        emit IncreasedBeforeEndOrNonEnd(msg.sender, _amount, 0, _stakeId, lockId, amountCompound);
    }

    /// @inheritdoc IStaking
    function increaseBeforeEndOrNonEnd(
        uint256 _stakeId,
        uint256 _amount,
        uint256 _unlockWeeks
    )
        external override
        nonZero(_stakeId)
    {
        require(_amount > 0 || _unlockWeeks > 0, "zero _amount and _unlockWeeks");

        LibStaking.UserBalance memory _stakeInfo = allStakings[_stakeId];
        require(_stakeInfo.staker == msg.sender, "caller is not staker");

        if(_unlockWeeks > 0) require(userStakingIndex[msg.sender][_stakeId] > 1, "it's simple staking product, can't lock.");
        rebaseIndex();

        // stake 반영
        _increaseAmountAndPeriodStake(msg.sender, _stakeId, _amount, _unlockWeeks);
        uint256 stosEpochUnit = ILockTosV2(lockTOS).epochUnit();
        uint256 lockId = connectId[_stakeId];
        uint256 stosPrincipal = 0;
        if(userStakingIndex[msg.sender][_stakeId] > 1 && lockId == 0 && _unlockWeeks > 0) {

            (connectId[_stakeId], stosPrincipal) = _createStos(msg.sender, _amount + getLtosToTos(remainedLtos(_stakeId)), _unlockWeeks, stosEpochUnit);

        } else if(userStakingIndex[msg.sender][_stakeId] > 1 && lockId > 0) {
            (, uint256 end, uint256 principalAmount) = ILockTosV2(lockTOS).locksInfo(lockId);
            require(end > block.timestamp && _stakeInfo.endTime > block.timestamp, "lock end time has passed");

            if (_unlockWeeks == 0) { // 물량만 늘릴때 이자도 같이 늘린다.
                uint256 n = (_stakeInfo.endTime - block.timestamp) / epoch.length_;
                uint256 amountCompound = LibStaking.compound(_amount, rebasePerEpoch, n);
                // require (amountCompound > 0, "zero compounded amount");
                stosPrincipal = principalAmount + amountCompound;
                ILockTosV2(lockTOS).increaseAmountByStaker(msg.sender, lockId, amountCompound);

            } else if(_unlockWeeks > 0) { // 기간만 들어날때는 물량도 같이 늘어난다고 본다. 이자때문에 .
                uint256 amountCompound1 = 0; // 기간종료후 이자부분
                uint256 amountCompound2 = 0; // 추가금액이 있을경우, 늘어나는 부분

                uint256 n1 = (_unlockWeeks * stosEpochUnit) / epoch.length_;
                amountCompound1 = LibStaking.compound(principalAmount, rebasePerEpoch, n1);
                amountCompound1 = amountCompound1 - principalAmount;

                if (_amount > 0) {
                    uint256 n2 = (end - block.timestamp  + (_unlockWeeks * stosEpochUnit)) / epoch.length_;
                    amountCompound2 = LibStaking.compound(_amount, rebasePerEpoch, n2);
                }
                stosPrincipal = principalAmount + amountCompound1 + amountCompound2;
                ILockTosV2(lockTOS).increaseAmountUnlockTimeByStaker(msg.sender, lockId, amountCompound1 + amountCompound2, _unlockWeeks);
            }
        }
        emit IncreasedBeforeEndOrNonEnd(msg.sender, _amount, _unlockWeeks, _stakeId, lockId, stosPrincipal);
    }

    /// @inheritdoc IStaking
    function claimForSimpleType(
        uint256 _stakeId,
        uint256 claimLtos
    )
        external override
        nonZero(_stakeId)
        nonZero(claimLtos)
    {
        require(connectId[_stakeId] == 0, "this is for non-lock product.");

        LibStaking.UserBalance storage _stakeInfo = allStakings[_stakeId];

        require(_stakeInfo.staker == msg.sender, "caller is not staker");
        require(_stakeInfo.endTime < block.timestamp, "end time has not passed.");
        require(claimLtos <= _stakeInfo.ltos, "ltos is insufficient");

        rebaseIndex();
        uint256 stakedAmount = getLtosToTos(_stakeInfo.ltos);
        uint256 _claimAmount = getLtosToTos(claimLtos);

        uint256 profit = 0;
        if(stakedAmount > _stakeInfo.deposit) profit = stakedAmount - _stakeInfo.deposit;

        _stakeInfo.ltos -= claimLtos;
        totalLtos -= claimLtos;
        _stakeInfo.deposit = _stakeInfo.deposit + profit - _claimAmount;
        stakingPrincipal = stakingPrincipal + profit - _claimAmount;

        IITreasury(treasury).requestTransfer(msg.sender, _claimAmount);

        emit ClaimedForNonLock(msg.sender, _claimAmount, _stakeId);
    }


    /// @inheritdoc IStaking
    function unstake(
        uint256 _stakeId
    )   public override
        nonZero(_stakeId)
    {
        LibStaking.UserBalance storage _stakeInfo = allStakings[_stakeId];

        require(_stakeInfo.staker == msg.sender, "caller is not staker.");
        require(_stakeInfo.endTime < block.timestamp, "end time hasn't passed.");

        rebaseIndex();

        uint256 amount = getLtosToTos(_stakeInfo.ltos);
        require(amount > 0, "zero claimable amount");

        stakingPrincipal -= _stakeInfo.deposit;
        totalLtos -= _stakeInfo.ltos;

        uint256 _userStakeIdIndex  = _deleteUserStakeId(msg.sender, _stakeId);
        _deleteStakeId(_stakeId, _userStakeIdIndex) ;

        if (connectId[_stakeId] > 0) {
            ILockTosV2(lockTOS).withdrawByStaker(msg.sender, connectId[_stakeId]);
            delete connectId[_stakeId];
        }

        IITreasury(treasury).requestTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount, _stakeId);
    }

    /// @inheritdoc IStaking
    function multiUnstake(
        uint256[] calldata _stakeIds
    ) external override {
        require(_stakeIds.length > 0, "no stakeIds");

        uint256 len = _stakeIds.length;
        for(uint256 i = 0; i < len; i++) {
            unstake(_stakeIds[i]);
        }
    }

    /// @inheritdoc IStaking
    function rebaseIndex() public override {

        if(epoch.end <= block.timestamp ) {

            uint256 epochNumber = 1; // if block.timestamp > epoch.end => we have to rebase at least once

            if ((block.timestamp - epoch.end) > epoch.length_){
                epochNumber = (block.timestamp - epoch.end) / epoch.length_ + 1;
            }

            epoch.end += (epoch.length_ * epochNumber);

            uint256 newIndex;

            if (epochNumber == 1)  newIndex = index_ * (1 ether + rebasePerEpoch) / 1e18;
            else newIndex = LibStaking.compound(index_, rebasePerEpoch, epochNumber) ;

            uint256 _runwayTos = runwayTos();

            uint256 oldIndex = index_;
            uint256 needTos = totalLtos * (newIndex - index_) / 1e18;

            if (needTos > _runwayTos) newIndex = oldIndex + (_runwayTos * 1e18 / totalLtos) ;

            if (newIndex > oldIndex){
                index_ = newIndex;
                emit Rebased(oldIndex, newIndex, totalLtos);
            }
        }
    }

    /* ========== VIEW ========== */

    /// @inheritdoc IStaking
    function remainedLtos(uint256 _stakeId) public override view returns (uint256) {
         return allStakings[_stakeId].ltos  ;
    }

    /// @inheritdoc IStaking
    function claimableLtos(
        uint256 _stakeId
    )
        external view override nonZero(_stakeId) returns (uint256)
    {
        if (allStakings[_stakeId].endTime < block.timestamp)
            return remainedLtos(_stakeId);
        else return 0;
    }


    /// @inheritdoc IStaking
    function getIndex() public view override returns(uint256){
        return index_;
    }

    /// @inheritdoc IStaking
    function possibleIndex() public view override returns (uint256) {
        uint256 possibleIndex_ = index_;
        if(epoch.end <= block.timestamp) {
            uint256 epochNumber = 1;
            if((block.timestamp - epoch.end) > epoch.length_) epochNumber = (block.timestamp - epoch.end) / epoch.length_+1;

            if(epochNumber == 1)  possibleIndex_ = possibleIndex_ * (1 ether + rebasePerEpoch) / 1e18;
            else possibleIndex_ = LibStaking.compound(index_, rebasePerEpoch, epochNumber) ;
            uint256 _runwayTos = runwayTos();
            uint256 needTos = totalLtos * (possibleIndex_ - index_) / 1e18;

            if(needTos > _runwayTos) possibleIndex_ = _runwayTos * 1e18 / totalLtos + index_;
        }
        return possibleIndex_;
    }

    /// @inheritdoc IStaking
    function stakingOf(address _addr)
        public
        override
        view
        returns (uint256[] memory)
    {
        return userStakings[_addr];
    }

    /// @inheritdoc IStaking
    function balanceOf(address _addr)
        public
        override
        view
        returns (uint256 balance)
    {
        uint256[] memory stakings = userStakings[_addr];
        if (stakings.length == 0) return 0;
        for (uint256 i = 0; i < stakings.length; ++i) {
            balance += remainedLtos(stakings[i]);
        }
    }


    /// @inheritdoc IStaking
    function secondsToNextEpoch() external override view returns (uint256) {
        if (epoch.end < block.timestamp) return 0;
        else return (epoch.end - block.timestamp);
    }

    /// @inheritdoc IStaking
    function runwayTosPossibleIndex() external override view returns (uint256) {
        uint256 treasuryAmount = IITreasury(treasury).enableStaking() ;
        uint256 debtTos =  getLtosToTosPossibleIndex(totalLtos);

        if( treasuryAmount < debtTos ) return 0;
        else return (treasuryAmount - debtTos);
    }


    /// @inheritdoc IStaking
    function getTosToLtos(uint256 amount) public override view returns (uint256) {
        return (amount * 1e18) / index_;
    }

    /// @inheritdoc IStaking
    function getLtosToTos(uint256 ltos) public override view returns (uint256) {
        return (ltos * index_) / 1e18;
    }

    function getTosToLtosPossibleIndex(uint256 amount) public override view returns (uint256) {
        return (amount * 1e18) / possibleIndex();
    }

    /// @inheritdoc IStaking
    function getLtosToTosPossibleIndex(uint256 ltos) public override view returns (uint256) {
        return (ltos * possibleIndex()) / 1e18;
    }

    /// @inheritdoc IStaking
    function stakedOf(uint256 stakeId) external override view returns (uint256) {
        return getLtosToTosPossibleIndex(allStakings[stakeId].ltos);
    }

    /// @inheritdoc IStaking
    function stakedOfAll() external override view returns (uint256) {
        return getLtosToTosPossibleIndex(totalLtos);
    }

    /// @inheritdoc IStaking
    function stakeInfo(uint256 stakeId) public override view returns (
        address staker,
        uint256 deposit,
        uint256 ltos,
        uint256 endTime,
        uint256 marketId
    ) {
        LibStaking.UserBalance memory _stakeInfo = allStakings[stakeId];
        return (
            _stakeInfo.staker,
            _stakeInfo.deposit,
            _stakeInfo.ltos,
            _stakeInfo.endTime,
            _stakeInfo.marketId
        );
    }

    function runwayTos() public override view returns (uint256) {
        uint256 treasuryAmount = IITreasury(treasury).enableStaking() ;
        uint256 debtTos =  getLtosToTos(totalLtos);

        if( treasuryAmount < debtTos ) return 0;
        else return (treasuryAmount - debtTos);
    }

    /* ========== internal ========== */


    function _stakeForSync(
        address to,
        uint256 amount,
        uint256 endTime,
        uint256 stosId
    )
        internal
        nonZero(amount)
        nonZero(endTime)
        returns (uint256 stakeId)
    {
        _checkStakeId(to);
        stakeId = _addStakeId();
        _addUserStakeId(to, stakeId);
        _createStakeInfo(to, stakeId, amount, endTime, 0);
        connectId[stakeId] = stosId;
    }


    function _increaseAmountAndPeriodStake(
        address sender,
        uint256 _stakeId,
        uint256 _amount,
        uint256 _unlockWeeks
    )
        internal
    {
        if (_amount > 0) tos.safeTransferFrom(sender, treasury, _amount);

        uint256 _periodSeconds = 0;
        uint256 stosEpochUnit = 0;
        if (_unlockWeeks > 0) ( stosEpochUnit, _periodSeconds ) = LibStaking.getUnlockTime(lockTOS, 0, _unlockWeeks);

        _increaseStakeInfo(_stakeId, _amount, _periodSeconds);
    }


    function _createStos(address _to, uint256 _amount, uint256 _periodWeeks, uint256 stosEpochUnit)
         internal ifFree returns (uint256 stosId, uint256 amountCompound)
    {
        amountCompound = LibStaking.compound(_amount, rebasePerEpoch, (_periodWeeks * stosEpochUnit / epoch.length_));
        require (amountCompound > 0, "zero compounded amount");

        stosId = ILockTosV2(lockTOS).createLockByStaker(_to, amountCompound, _periodWeeks);
        require(stosId > 0, "zero stosId");
    }

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

    function _deleteStakeId(uint256 _stakeId, uint256 _userStakeIdIndex) internal {
        if(_userStakeIdIndex > 1)  delete allStakings[_stakeId];
        else if (_userStakeIdIndex == 1) {
            // 초기화
            LibStaking.UserBalance storage _stakeInfo = allStakings[_stakeId];
            _stakeInfo.staker = address(0);
            _stakeInfo.deposit = 0;
            _stakeInfo.ltos = 0;
            _stakeInfo.endTime = 0;
            _stakeInfo.marketId = 0;
        }
    }

    function _increaseStakeInfo(
        uint256 _stakeId,
        uint256 _amount,
        uint256 _increaseSeconds
    ) internal ifFree {
        require(_amount > 0 || _increaseSeconds > 0, "zero amount and _increaseSeconds");

        LibStaking.UserBalance storage _stakeInfo = allStakings[_stakeId];

        if(_amount > 0) {
            uint256 ltos = getTosToLtos(_amount);
            _stakeInfo.deposit += _amount;
            _stakeInfo.ltos += ltos;
            stakingPrincipal += _amount;
            totalLtos += ltos;
        }

        if(_increaseSeconds > 0) {
            _stakeInfo.endTime += _increaseSeconds;
        }
    }

    function _updateStakeInfo(
        uint256 _stakeId,
        uint256 _unlockTime,
        uint256 _addAmount,
        uint256 _claimAmount
    ) internal ifFree {

        LibStaking.UserBalance storage _stakeInfo = allStakings[_stakeId];
        require(_addAmount > 0 || _claimAmount > 0 || _unlockTime > 0, "zero Amounts");
        require(_stakeInfo.ltos > 0, "zero ltos");
        uint256 stakedAmount = getLtosToTos(_stakeInfo.ltos);
        require(_claimAmount <= stakedAmount, "stake amount is insufficient");

        uint256 addLtos = 0;
        uint256 claimLtos = 0;
        if (_addAmount > 0)  addLtos = getTosToLtos(_addAmount);
        if (_claimAmount > 0) claimLtos = getTosToLtos(_claimAmount);

        _stakeInfo.endTime = _unlockTime;

        uint256 profit = 0;
        if(stakedAmount > _stakeInfo.deposit) profit = stakedAmount - _stakeInfo.deposit;

        if (addLtos > 0){
            _stakeInfo.ltos += addLtos;
            totalLtos += addLtos;
        }
        if (claimLtos > 0) {
            _stakeInfo.ltos -= claimLtos;
            totalLtos -= claimLtos;
        }
        if (_addAmount > 0 || profit > 0 || _claimAmount > 0) {
            _stakeInfo.deposit = _stakeInfo.deposit + _addAmount + profit - _claimAmount;
            stakingPrincipal = stakingPrincipal + _addAmount + profit - _claimAmount;
        }
    }


    function _addUserStakeId(address to, uint256 _id) internal {
        userStakingIndex[to][_id] = userStakings[to].length;
        userStakings[to].push(_id);
    }


    function _deleteUserStakeId(address to, uint256 _id) internal  returns (uint256 curIndex){

        curIndex = userStakingIndex[to][_id];

        if (curIndex > 1 && curIndex < userStakings[to].length ) {
            if (curIndex < userStakings[to].length-1){
                uint256 lastId = userStakings[to][userStakings[to].length-1];
                userStakings[to][curIndex] = lastId;
                userStakingIndex[to][lastId] = curIndex;
            }
            userStakingIndex[to][_id] = 0;
            userStakings[to].pop();
        }
    }

    function _checkStakeId(address to) internal {
         if(userStakings[to].length == 0) {
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

    /// @inheritdoc IStaking
    function syncStos(
        address[] calldata accounts,
        uint256[] calldata balances,
        uint256[] calldata period,
        uint256[] calldata tokenId
    )
        external
        override
        onlyOwner
    {
        require(accounts.length > 0, "zero length");
        require(accounts.length == balances.length, "wrong balance length");
        require(accounts.length == period.length, "wrong period length");
        require(accounts.length == tokenId.length, "wrong tokenId length");

        for (uint256 i = 0; i < accounts.length; i++ ) {
            _stakeForSync(accounts[i], balances[i], period[i], tokenId[i]);
        }
    }

}
