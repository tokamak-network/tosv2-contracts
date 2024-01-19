// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./StakingV2Storage.sol";
import "./common/ProxyAccessCommon.sol";

import "./libraries/SafeERC20.sol";
import {DSMath} from "./libraries/DSMath.sol";

import "./libraries/LibTreasury.sol";

import "./interfaces/IStakingV2_1.sol";
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
    // function increaseAmountByStaker(address user, uint256 _lockId, uint256 _value) external;
    // function increaseAmountUnlockTimeByStaker(address user, uint256 _lockId, uint256 _value, uint256 _unlockWeeks) external;
    function withdrawByStaker(address user, uint256 _lockId) external;
    function epochUnit() external view returns(uint256);
}

interface IITreasury {

    function enableStaking() external view returns (uint256);
    function requestTransfer(address _recipient, uint256 _amount)  external;
    function hasPermission(uint role, address account) external view returns (bool);
}

contract StakingV2_1 is
    StakingV2Storage,
    ProxyAccessCommon,
    DSMath,
    IStakingV2_1,
    IStakingEvent
{
    /* ========== DEPENDENCIES ========== */
    using SafeERC20 for IERC20;


    /// @dev Check if a function is used or not
    modifier onlyBonder() {
        require(IITreasury(treasury).hasPermission(uint(LibTreasury.STATUS.BONDER), msg.sender), "sender is not a bonder");
        _;
    }

    modifier nonBasicBond(uint256 stakeId) {
        require(!(connectId[stakeId] == 0 && allStakings[stakeId].marketId > 0), "basicBond");
        _;
    }

    /* ========== CONSTRUCTOR ========== */
    constructor() {
    }


    /* ========== onlyPolicyOwner ========== */

    /// @inheritdoc IStakingV2_1
    function setEpochInfo(
        uint256 _length,
        uint256 _end
    )
        external override onlyProxyOwner
        nonZero(_length)
        nonZero(_end)
    {
        epoch.length_ = _length;
        epoch.end = _end;

        emit SetEpochInfo(_length, _end);
    }

    /// @inheritdoc IStakingV2_1
    function setAddressInfos(
        address _tos,
        address _lockTOS,
        address _treasury
    )
        external override onlyProxyOwner
        nonZeroAddress(_tos)
        nonZeroAddress(_lockTOS)
        nonZeroAddress(_treasury)
    {
        require(address(tos) != _tos || lockTOS != _lockTOS || treasury != _treasury, "same address");
        tos = IERC20(_tos);
        lockTOS = _lockTOS;
        treasury = _treasury;

        emit SetAddressInfos(_tos, _lockTOS, _treasury);
    }

    /// @inheritdoc IStakingV2_1
    function setRebasePerEpoch(uint256 _rebasePerEpoch) external override onlyProxyOwner {
        rebasePerEpoch = _rebasePerEpoch;

        emit SetRebasePerEpoch(_rebasePerEpoch);
    }


    /// @inheritdoc IStakingV2_1
    function setBasicBondPeriod(uint256 _period)
        external override onlyProxyOwner
        nonZero(_period)
    {
        require(basicBondPeriod != _period,"same period");
        basicBondPeriod = _period;

        emit SetBasicBondPeriod(_period);
    }

    /* ========== onlyBonder ========== */

    /// @inheritdoc IStakingV2_1
    function generateMarketId() public override onlyBonder returns (uint256) {
        return ++marketIdCounter;
    }

    /// @inheritdoc IStakingV2_1
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

    /// @inheritdoc IStakingV2_1
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

        (, uint256 unlockTime) = getUnlockTime(lockTOS, block.timestamp, _periodWeeks) ;

        _checkStakeId(_to);
        stakeId = _addStakeId();
        _addUserStakeId(_to, stakeId);

        rebaseIndex();

        uint256 ltos = _createStakeInfo(_to, stakeId, _amount, unlockTime, _marketId);

        // uint256 stosPrincipal = LibStaking.compound(_amount, rebasePerEpoch, (unlockTime - block.timestamp) / epoch.length_);
        // uint256 stosId = ILockTosV2(lockTOS).createLockByStaker(_to, stosPrincipal, _periodWeeks);
        // require(stosId > 0, "zero stosId");

        // connectId[stakeId] = stosId;

        // emit StakedGetStosByBond(_to, _amount, ltos, _periodWeeks, _marketId, stakeId, stosId, tosPrice, stosPrincipal);
        emit StakedGetStosByBond(_to, _amount, ltos, _periodWeeks, _marketId, stakeId, 0, tosPrice, 0);
    }

    /* ========== Anyone can execute ========== */

    /// @inheritdoc IStakingV2_1
    function stake(
        uint256 _amount
    )   external override
        nonZero(_amount)
        returns (uint256 stakeId)
    {
        _checkStakeId(msg.sender);
        stakeId = userStakings[msg.sender][1]; // 0번은 더미, 1번은 기간없는 순수 스테이킹

        rebaseIndex();

        tos.safeTransferFrom(msg.sender, treasury, _amount);

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

    /// @inheritdoc IStakingV2_1
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

    /// @inheritdoc IStakingV2_1
    function increaseBeforeEndOrNonEnd(
        uint256 _stakeId,
        uint256 _amount
    )
        external override
        nonZero(_stakeId)
        nonZero(_amount)
        nonBasicBond(_stakeId)
    {
        LibStaking.UserBalance storage _stakeInfo = allStakings[_stakeId];

        require(_stakeInfo.staker == msg.sender, "caller is not staker");

        rebaseIndex();

        tos.safeTransferFrom(msg.sender, treasury, _amount);

        uint256 ltos = getTosToLtos(_amount);
        _stakeInfo.deposit += _amount;
        _stakeInfo.ltos += ltos;
        stakingPrincipal += _amount;
        totalLtos += ltos;

        uint256 lockId = connectId[_stakeId];
        uint256 amountCompound = 0;

        emit IncreasedBeforeEndOrNonEnd(msg.sender, _amount, 0, _stakeId, lockId, amountCompound);
    }

    /// @inheritdoc IStakingV2_1
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
        if (stakedAmount > _stakeInfo.deposit) profit = stakedAmount - _stakeInfo.deposit;
        else if (stakedAmount < _stakeInfo.deposit && _stakeInfo.ltos == claimLtos) _claimAmount = _stakeInfo.deposit;

        _stakeInfo.ltos -= claimLtos;
        totalLtos -= claimLtos;
        _stakeInfo.deposit = _stakeInfo.deposit + profit - _claimAmount;
        stakingPrincipal = stakingPrincipal + profit - _claimAmount;

        IITreasury(treasury).requestTransfer(msg.sender, _claimAmount);

        emit ClaimedForNonLock(msg.sender, _claimAmount, _stakeId);
    }


    /// @inheritdoc IStakingV2_1
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

        if (amount < _stakeInfo.deposit) amount = _stakeInfo.deposit;

        stakingPrincipal -= _stakeInfo.deposit;
        totalLtos -= _stakeInfo.ltos;

        uint256 _userStakeIdIndex  = _deleteUserStakeId(msg.sender, _stakeId);
        _deleteStakeId(_stakeId, _userStakeIdIndex) ;

        // if (connectId[_stakeId] > 0) {
        //     ILockTosV2(lockTOS).withdrawByStaker(msg.sender, connectId[_stakeId]);
        //     delete connectId[_stakeId];
        // }

        IITreasury(treasury).requestTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount, _stakeId);
    }

    /// @inheritdoc IStakingV2_1
    function multiUnstake(
        uint256[] calldata _stakeIds
    ) external override {
        require(_stakeIds.length > 0, "no stakeIds");

        uint256 len = _stakeIds.length;
        for(uint256 i = 0; i < len; i++) {
            unstake(_stakeIds[i]);
        }
    }

    /// @inheritdoc IStakingV2_1
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

    /// @inheritdoc IStakingV2_1
    function remainedLtos(uint256 _stakeId) public override view returns (uint256) {
         return allStakings[_stakeId].ltos  ;
    }

    /// @inheritdoc IStakingV2_1
    function claimableLtos(
        uint256 _stakeId
    )
        external view override nonZero(_stakeId) returns (uint256)
    {
        if (allStakings[_stakeId].endTime < block.timestamp)
            return remainedLtos(_stakeId);
        else return 0;
    }


    /// @inheritdoc IStakingV2_1
    function getIndex() public view override returns(uint256){
        return index_;
    }

    /// @inheritdoc IStakingV2_1
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

    /// @inheritdoc IStakingV2_1
    function stakingOf(address _addr)
        public
        override
        view
        returns (uint256[] memory)
    {
        return userStakings[_addr];
    }

    /// @inheritdoc IStakingV2_1
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


    /// @inheritdoc IStakingV2_1
    function secondsToNextEpoch() external override view returns (uint256) {
        if (epoch.end < block.timestamp) return 0;
        else return (epoch.end - block.timestamp);
    }

    /// @inheritdoc IStakingV2_1
    function runwayTosPossibleIndex() external override view returns (uint256) {
        uint256 treasuryAmount = IITreasury(treasury).enableStaking() ;
        uint256 debtTos =  getLtosToTosPossibleIndex(totalLtos);

        if (treasuryAmount < debtTos) return 0;
        else return (treasuryAmount - debtTos);
    }


    /// @inheritdoc IStakingV2_1
    function getTosToLtos(uint256 amount) public override view returns (uint256) {
        return (amount * 1e18) / index_;
    }

    /// @inheritdoc IStakingV2_1
    function getLtosToTos(uint256 ltos) public override view returns (uint256) {
        return (ltos * index_) / 1e18;
    }

    function getTosToLtosPossibleIndex(uint256 amount) public override view returns (uint256) {
        return (amount * 1e18) / possibleIndex();
    }

    /// @inheritdoc IStakingV2_1
    function getLtosToTosPossibleIndex(uint256 ltos) public override view returns (uint256) {
        return (ltos * possibleIndex()) / 1e18;
    }

    /// @inheritdoc IStakingV2_1
    function stakedOf(uint256 stakeId) external override view returns (uint256) {
        return getLtosToTosPossibleIndex(allStakings[stakeId].ltos);
    }

    /// @inheritdoc IStakingV2_1
    function stakedOfAll() external override view returns (uint256) {
        return getLtosToTosPossibleIndex(totalLtos);
    }

    /// @inheritdoc IStakingV2_1
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

        if (treasuryAmount < debtTos) return 0;
        else return (treasuryAmount - debtTos);
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

    function _deleteStakeId(uint256 _stakeId, uint256 _userStakeIdIndex) internal {
        if (_userStakeIdIndex > 1)  delete allStakings[_stakeId];
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


    function getUnlockTime(address lockTos, uint256 start, uint256 _periodWeeks)
        public pure returns (uint256 stosEpochUnit, uint256 unlockTime)
    {
        // stosEpochUnit = ILockTosV2(lockTos).epochUnit();
        stosEpochUnit = 604800;

        if (_periodWeeks > 0) {
            unlockTime = start + (_periodWeeks * stosEpochUnit);
            unlockTime = unlockTime / stosEpochUnit * stosEpochUnit;
        }
    }
}
