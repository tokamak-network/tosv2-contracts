// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./StakingV2Storage.sol";
import "./common/StakeProxyAccess.sol";

import "./libraries/SafeERC20.sol";
// import "./libraries/ABDKMath64x64.sol";
import {DSMath} from "./libraries/DSMath.sol";

import "./libraries/LibTreasury.sol";

import "./interfaces/IStaking.sol";
import "./interfaces/IStakingEvent.sol";

import "hardhat/console.sol";

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
    function requestTrasfer(address _recipient, uint256 _amount)  external;
    function hasPermission(uint role, address account) external view returns (bool);
}

contract StakingV2 is
    StakingV2Storage,
    StakeProxyAccess,
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
        require(address(TOS) != _tos || lockTOS != _lockTOS || treasury != _treasury, "same address");
        TOS = IERC20(_tos);
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


    /* ========== onlyOwner ========== */
    /*
    /// @inheritdoc IStaking
    function syncSTOS(
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
    */
    /* ========== onlyBonder ========== */

    /// @inheritdoc IStaking
    function generateMarketId() public override onlyBonder returns (uint256) {
        return marketIdCounter++;
    }

    /// @inheritdoc IStaking
    function stakeByBond(
        address to,
        uint256 _amount,
        uint256 _marketId,
        uint256 tosPrice
    )
        public override onlyBonder
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
        public override onlyBonder
        nonZeroAddress(_to)
        returns (uint256 stakeId)
    {
        require(_amount > 0 && _periodWeeks > 0 && _marketId > 0, "zero input");

        (uint256 sTosEpochUnit, uint256 unlockTime) = LibStaking.getUnlockTime(lockTOS, block.timestamp, _periodWeeks) ;
        require (sTosEpochUnit > 0, "zero sTosEpochUnit");
        require (unlockTime > 0, "zero unlockTime");

        _checkStakeId(_to);
        stakeId = _addStakeId();
        _addUserStakeId(_to, stakeId);

        rebaseIndex();

        uint256 ltos = _createStakeInfo(_to, stakeId, _amount, unlockTime, _marketId);

        uint256 sTOSid = _createStos(_to, _amount, _periodWeeks, sTosEpochUnit);
        connectId[stakeId] = sTOSid;
        lockTOSId[sTOSid] = stakeId;

        emit StakedGetStosByBond(_to, _amount, ltos, _periodWeeks, _marketId, stakeId, sTOSid, tosPrice);
    }

    /* ========== Anyone can execute ========== */

    /// @inheritdoc IStaking
    function stake(
        uint256 _amount
    )   public override
        nonZero(_amount)
        returns (uint256 stakeId)
    {
        require (TOS.allowance(msg.sender, address(this)) >= _amount, "allowance is insufficient.");

        TOS.safeTransferFrom(msg.sender, address(this), _amount);
        address to = msg.sender;

        _checkStakeId(to);
        stakeId = userStakings[to][1]; // 0번은 더미, 1번은 기간없는 순수 스테이킹

        rebaseIndex();

        _createStakeInfo(to, stakeId, _amount, block.timestamp + 1, 0);

        emit Staked(to, _amount, stakeId);
    }

    /// @inheritdoc IStaking
    function stakeGetStos(
        uint256 _amount,
        uint256 _periodWeeks
    )
        public override
        nonZero(_amount)
        nonZero(_periodWeeks)
        nonZero(rebasePerEpoch)
        returns (uint256 stakeId)
    {
        require (TOS.allowance(msg.sender, address(this)) >= _amount, "allowance is insufficient.");

        // uint256 sTosEpochUnit = ILockTosV2(lockTOS).epochUnit();

        (uint256 sTosEpochUnit, uint256 unlockTime) = LibStaking.getUnlockTime(lockTOS, block.timestamp, _periodWeeks) ;
        require (sTosEpochUnit > 0, "zero sTosEpochUnit");
        require(unlockTime > 0, "zero unlockTime");

        TOS.safeTransferFrom(msg.sender, address(this), _amount);

        address to = msg.sender;
        _checkStakeId(to);
        stakeId = _addStakeId();
        _addUserStakeId(to, stakeId);

        rebaseIndex();
        _createStakeInfo(to, stakeId, _amount, unlockTime, 0);

        uint256 sTOSid = _createStos(to, _amount, _periodWeeks, sTosEpochUnit);
        connectId[stakeId] = sTOSid;
        lockTOSId[sTOSid] = stakeId;

        emit StakedGetStos(to, _amount, _periodWeeks, stakeId, sTOSid);
    }


    /// @inheritdoc IStaking
    function increaseAmountForSimpleStake(
        uint256 _stakeId,
        uint256 _amount
    )   external override
        nonZero(_stakeId)
        nonZero(_amount)
    {
        address staker = allStakings[_stakeId].staker;
        require(staker == msg.sender, "caller is not staker");
        require(userStakingIndex[staker][_stakeId] == 1, "it's not simple staking product");
        rebaseIndex();
        _increaseAmountAndPeriodStake(staker, _stakeId, _amount, 0);

        emit IncreasedAmountForSimpleStake(staker, _amount, _stakeId);
    }


    /// @inheritdoc IStaking
    function resetStakeGetStosAfterLock(
        uint256 _stakeId,
        uint256 _addAmount,
        uint256 _claimAmount,
        uint256 _periodWeeks
    )
        public override
    {
        require(_addAmount > 0 || _claimAmount > 0 ||  _periodWeeks > 0, "all zero input");

        uint256 lockId = connectId[_stakeId];
        //require(lockId > 0, "zero lockId");

        LibStaking.UserBalance storage _stakeInfo = allStakings[_stakeId];
        address staker = _stakeInfo.staker;
        require(staker == msg.sender, "caller is not staker");
        require(userStakingIndex[staker][_stakeId] > 1, "it's not for simple stake or empty.");

        uint256 depositPlusAmount = getLtosToTos(_stakeInfo.LTOS);
        require(_claimAmount <= depositPlusAmount, "remainedTos is insufficient");

        if(lockId > 0){
            (, uint256 end, ) = ILockTosV2(lockTOS).locksInfo(lockId);
            require(end < block.timestamp && _stakeInfo.endTime < block.timestamp, "lock end time has not passed");

            ILockTosV2(lockTOS).withdrawByStaker(staker, lockId);
            delete connectId[_stakeId];
            delete lockTOSId[lockId];
        } else {
            require(_stakeInfo.endTime < block.timestamp, "lock end time has not passed");
        }

        if (_addAmount > 0) {
            require (TOS.allowance(msg.sender, address(this)) >= _addAmount, "allowance is insufficient.");
            TOS.safeTransferFrom(msg.sender, address(this), _addAmount);
        }

        // uint256 sTosEpochUnit = ILockTosV2(lockTOS).epochUnit();
        uint256 sTosEpochUnit = 0;
        uint256 unlockTime = 0;
        if (_periodWeeks > 0) {
            // unlockTime = _getUnlockTime(block.timestamp, _periodWeeks) ;
            (sTosEpochUnit, unlockTime) = LibStaking.getUnlockTime(lockTOS, block.timestamp, _periodWeeks) ;
        } else {
            sTosEpochUnit = ILockTosV2(lockTOS).epochUnit();
            unlockTime = _stakeInfo.endTime;
        }

        // require(unlockTime > 0, "zero unlockTime");
        _checkStakeId(staker);
        rebaseIndex();

        _updateStakeInfo(_stakeId, unlockTime, _addAmount, _claimAmount);

        uint256 sTOSid = 0;
        uint256 stakeId = _stakeId;
        if (_periodWeeks > 0) {
            depositPlusAmount += _addAmount;
            depositPlusAmount -= _claimAmount;
            sTOSid = _createStos(staker, depositPlusAmount, _periodWeeks, sTosEpochUnit);
            connectId[stakeId] = sTOSid;
            lockTOSId[sTOSid] = stakeId;
        }

        if (_claimAmount > 0) {
            TOS.safeTransfer(msg.sender, _claimAmount);
        }

        emit ResetStakedGetStosAfterLock(staker, _addAmount, _claimAmount, _periodWeeks, stakeId, sTOSid);
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
        address staker = allStakings[_stakeId].staker;
        require(staker == msg.sender, "caller is not staker");

        if(_unlockWeeks > 0) require(userStakingIndex[staker][_stakeId] > 1, "it's simple staking product, can't lock.");
        rebaseIndex();
        // stake 반영
        _increaseAmountAndPeriodStake(staker, _stakeId, _amount, _unlockWeeks);
        uint256 sTosEpochUnit = ILockTosV2(lockTOS).epochUnit();
        uint256 lockId = connectId[_stakeId];

        if(userStakingIndex[staker][_stakeId] > 1 && lockId == 0 && _unlockWeeks > 0) {
            // 마켓 상품이지만 락은 없었던 것. 락이 생길경우. amount 는 기존에 있던 금액에 추가되는 금액까지 고려해야 하는지.

            uint256 addAmount = _amount + getLtosToTos(remainedLTOS(_stakeId));
            uint256 sTOSid = _createStos(staker, addAmount, _unlockWeeks, sTosEpochUnit);
            connectId[_stakeId] = sTOSid;
            lockTOSId[sTOSid] = _stakeId;

        } else if(userStakingIndex[staker][_stakeId] > 1 && lockId > 0) {
            (, uint256 end, uint256 principalsAmount) = ILockTosV2(lockTOS).locksInfo(lockId);
            require(end > block.timestamp && allStakings[_stakeId].endTime > block.timestamp, "lock end time has passed");

            if (_unlockWeeks == 0) { // 물량만 늘릴때 이자도 같이 늘린다.
                uint256 n = (allStakings[_stakeId].endTime - block.timestamp) / epoch.length_;
                uint256 amountCompound = LibStaking.compound(_amount, rebasePerEpoch, n);
                require (amountCompound > 0, "zero compounded amount");
                ILockTosV2(lockTOS).increaseAmountByStaker(staker, lockId, amountCompound);

            } else if(_unlockWeeks > 0) { // 기간만 들어날때는 물량도 같이 늘어난다고 본다. 이자때문에 .
                uint256 amountCompound1 = 0; // 기간종료후 이자부분
                uint256 amountCompound2 = 0; // 추가금액이 있을경우, 늘어나는 부분

                uint256 n1 = (_unlockWeeks * sTosEpochUnit) / epoch.length_;
                amountCompound1 = LibStaking.compound(principalsAmount, rebasePerEpoch, n1);
                amountCompound1 = amountCompound1 - principalsAmount;

                if (_amount > 0) {
                    uint256 n2 = (end - block.timestamp  + (_unlockWeeks * sTosEpochUnit)) / epoch.length_;
                    amountCompound2 = LibStaking.compound(_amount, rebasePerEpoch, n2);
                }

                ILockTosV2(lockTOS).increaseAmountUnlockTimeByStaker(staker, lockId, amountCompound1 + amountCompound2, _unlockWeeks);
            }
        }

        emit IncreasedBeforeEndOrNonEnd(staker, _amount, _unlockWeeks, _stakeId, lockId);
    }

    /// @inheritdoc IStaking
    function claimForSimpleType(
        uint256 _stakeId,
        uint256 _claimAmount
    )
        public override
        nonZero(_stakeId)
        nonZero(_claimAmount)
    {
        require(connectId[_stakeId] == 0, "this is for non-lock product.");
        console.log("claimForSimpleType %s %s",_stakeId, _claimAmount);

        address staker = allStakings[_stakeId].staker;
        require(staker == msg.sender, "caller is not staker");

        console.log("claimForSimpleType LTOS  %s", allStakings[_stakeId].LTOS );
        console.log("claimForSimpleType deposit  %s", allStakings[_stakeId].deposit);
        console.log("claimForSimpleType getLtosToTos  %s",getLtosToTos(allStakings[_stakeId].LTOS));

        require(_claimAmount <= getLtosToTos(allStakings[_stakeId].LTOS), "remainedTos is insufficient");

        require(allStakings[_stakeId].endTime < block.timestamp, "end time has not passed.");
        rebaseIndex();

        _updateStakeInfo(_stakeId, 0, 0, _claimAmount);


        // 아래 확인 필요
        // uint256 _tosBalance = TOS.balanceOf(address(this));
        // if (_tosBalance < _claimAmount){
        //     IITreasury(treasury).requestTrasfer(address(this), _claimAmount - _tosBalance);
        // }

        TOS.safeTransfer(staker, _claimAmount);

        emit ClaimdForNonLock(staker, _claimAmount, _stakeId);
    }


    /// @inheritdoc IStaking
    function unstake(
        uint256 _stakeId
    )   public override
        nonZero(_stakeId)
    {
        LibStaking.UserBalance storage _stakeInfo = allStakings[_stakeId];
        address staker = _stakeInfo.staker;
        require(staker == msg.sender, "caller is not staker.");
        require(_stakeInfo.endTime < block.timestamp, "end time hasn't passed.");
        rebaseIndex();

        // 모두 클래임한다. 스토리지를 모두 지운다.
        uint256 amount = claimableTos(_stakeId);
        require(amount > 0, "zero claimable amount");

        uint256 addProfitRemainedTos = getLtosToTos(remainedLTOS(_stakeId));
        uint256 principal = _stakeInfo.deposit;
        // uint256 profit = addProfitRemainedTos - principal;
        uint256 sTOSid = connectId[_stakeId];

        console.log("unstake _stakeId %s", _stakeId);
        console.log("unstake amount %s", amount);
        console.log("unstake _stakeInfo.deposit  %s", _stakeInfo.deposit);
        console.log("unstake _stakeInfo.LTOS  %s", _stakeInfo.LTOS);
        console.log("unstake stakingPrincipal  %s", stakingPrincipal);
        console.log("unstake totalLTOS  %s", totalLTOS);

        if (stakingPrincipal >= principal) stakingPrincipal -= principal;
        else stakingPrincipal = 0;

        if (totalLTOS >= _stakeInfo.LTOS) totalLTOS -= _stakeInfo.LTOS;
        else totalLTOS = 0;
        console.log("unstake sTOSid  %s", sTOSid);

        if (sTOSid > 0) {
            console.log("unstake withdrawByStaker go ");

            ILockTosV2(lockTOS).withdrawByStaker(staker, sTOSid);
            console.log("unstake withdrawByStaker end ");

            delete connectId[_stakeId];
            delete lockTOSId[sTOSid];
        }

        uint256 _userStakeIdIndex  = _deleteUserStakeId(staker, _stakeId);
        console.log("unstake _userStakeIdIndex   %s", _userStakeIdIndex);
        _deleteStakeId(_stakeId, _userStakeIdIndex) ;

        if (addProfitRemainedTos > principal) {
            IITreasury(treasury).requestTrasfer(address(this), addProfitRemainedTos - principal);
        }

        TOS.safeTransfer(staker, amount);

        emit Unstaked(staker, amount, _stakeId);
    }

    /// @inheritdoc IStaking
    function multiUnstake(
        uint256[] calldata _stakeIds
    ) public override {
        require(_stakeIds.length > 0, "no stakeIds");

        uint256 len = _stakeIds.length;
        for(uint256 i = 0; i < len; i++) {
            unstake(_stakeIds[i]);
        }
    }


    /// @inheritdoc IStaking
    function rebaseIndex() public override {
        console.log("rebaseIndex epoch.end : %s", epoch.end);
        console.log("rebaseIndex block.timestamp : %s", block.timestamp);
        console.log("rebaseIndex epoch.length_ : %s", epoch.length_);
        console.log("rebaseIndex index_ : %s", index_);
        console.log("rebaseIndex epoch.number : %s", epoch.number);

        if(epoch.end <= block.timestamp  ) {

            uint256 epochNumber = 0;

            if ((block.timestamp - epoch.end) > epoch.length_){
                epochNumber = (block.timestamp - epoch.end) / epoch.length_ ;
            }

            console.log("rebaseIndex epochNumber : %s", epochNumber);
            epoch.end += (epoch.length_ * (1 + epochNumber));
            epochNumber++;
            console.log("rebaseIndex epochNumber : %s", epochNumber);
            console.log("rebaseIndex epoch.end : %s", epoch.end);

            uint256 newIndex = index_;
            if(epochNumber > 1) newIndex = LibStaking.compound(index_, rebasePerEpoch, epochNumber) ;
            else if(epochNumber == 1)  newIndex = nextIndex();
            console.log("rebaseIndex newIndex : %s", newIndex);

            console.log("rebaseIndex totalLTOS : %s", totalLTOS);

            uint256 _runawayTOS = runwayTOS();

            console.log("rebaseIndex runwayTOS() : %s", _runawayTOS);

            if (_runawayTOS == 0) return;

            uint256 oldIndex = index_;

            uint256 needTos = totalLTOS * (newIndex-index_) / 1e18;

            console.log("rebaseIndex needTos : %s", needTos);

            if (needTos < _runawayTOS) {
                index_ = newIndex;
                epoch.number += epochNumber;
                emit Rebased(oldIndex, newIndex, totalLTOS);

            } else if (epochNumber > 1) {

                uint256 _possibleEpochNumber = LibStaking.possibleEpochNumber(runwayTOS(), getLtosToTos(totalLTOS), rebasePerEpoch);
                console.log("rebaseIndex _possibleEpochNumber : %s", _possibleEpochNumber);

                if (_possibleEpochNumber < epochNumber) {
                    newIndex = LibStaking.compound(index_, rebasePerEpoch, _possibleEpochNumber);
                    console.log("rebaseIndex compound newIndex : %s", newIndex);

                    needTos = totalLTOS * (newIndex-index_) / 1e18;
                    console.log("rebaseIndex newIndex -> needTos : %s", needTos);

                    if (needTos < _runawayTOS) {
                        index_ =  newIndex;
                        epoch.number += _possibleEpochNumber;
                        emit Rebased(oldIndex, newIndex, totalLTOS);
                    }
                }
            }
            console.log("rebaseIndex epoch.number : %s", epoch.number);
            console.log("rebaseIndex index_ : %s", index_);
        }
    }

    /* ========== VIEW ========== */


    // /// @inheritdoc IStaking
    // function remainedLTOSToTos(uint256 _stakeId) public override  view returns (uint256) {
    //      return getLtosToTos(remainedLTOS(_stakeId)) ;
    // }

    /// @inheritdoc IStaking
    function remainedLTOS(uint256 _stakeId) public override view returns (uint256) {
         return allStakings[_stakeId].LTOS  ;
    }

    /// @inheritdoc IStaking
    function claimableLtos(
        uint256 _stakeId
    )
        public view override nonZero(_stakeId) returns (uint256)
    {
        if (allStakings[_stakeId].endTime < block.timestamp)
            return remainedLTOS(_stakeId);
        else return 0;
    }

    /// @inheritdoc IStaking
    function claimableTos(
        uint256 _stakeId
    )
        public view override nonZero(_stakeId) returns (uint256)
    {
        if (allStakings[_stakeId].endTime < block.timestamp){
            return getLtosToTos(remainedLTOS(_stakeId));
        }
        else return 0;
    }

    /// @inheritdoc IStaking
    function nextIndex() public view override returns (uint256) {
        return (index_*(1 ether+rebasePerEpoch) / 1e18);
    }

    /// @inheritdoc IStaking
    function getIndex() public view override returns(uint256){
        return index_;
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
    function balanceOfId(uint256 _stakeId)
        public
        override
        view
        returns (uint256)
    {
        return remainedLTOS(_stakeId);
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
            balance += balanceOfId(stakings[i]);
        }
    }


    /// @inheritdoc IStaking
    function secondsToNextEpoch() external override view returns (uint256) {
        if (epoch.end < block.timestamp) return 0;
        else return (epoch.end - block.timestamp);
    }

    /// @inheritdoc IStaking
    function runwayTOS() public override view returns (uint256) {
        uint256 treasuryAmount = IITreasury(treasury).enableStaking() ;
        uint256 balanceTos =  totalDepositTOS();
        uint256 debtTos =  getLtosToTos(totalLTOS);

        if( treasuryAmount + balanceTos < debtTos ) return 0;
        else return (treasuryAmount + balanceTos - debtTos);
    }


    /// @inheritdoc IStaking
    function totalDepositTOS() public override view returns (uint256) {
        return TOS.balanceOf(address(this));
    }

    /// @inheritdoc IStaking
    function getTosToLtos(uint256 amount) public override view returns (uint256) {
        return (amount * 1e18) / index_;
    }

    /// @inheritdoc IStaking
    function getLtosToTos(uint256 ltos) public override view returns (uint256) {
        return (ltos * index_) / 1e18;
    }

    /// @inheritdoc IStaking
    function stakedOf(uint256 stakeId) public override view returns (uint256) {
        return getLtosToTos(allStakings[stakeId].LTOS);
    }

    /// @inheritdoc IStaking
    function stakedOfAll() public override view returns (uint256) {
        return getLtosToTos(totalLTOS);
    }

    /// @inheritdoc IStaking
    function stakeInfo(uint256 stakeId) public override view returns (
        address staker,
        uint256 deposit,
        uint256 LTOS,
        uint256 startTime,
        uint256 endTime,
        uint256 marketId
    ) {
        LibStaking.UserBalance memory _stakeInfo = allStakings[stakeId];
        return (
            _stakeInfo.staker,
            _stakeInfo.deposit,
            _stakeInfo.LTOS,
            _stakeInfo.startTime,
            _stakeInfo.endTime,
            _stakeInfo.marketId
        );
    }

     /* ========== internal ========== */
    /*
    function _stakeForSync(
        address to,
        uint256 amount,
        uint256 endTime,
        uint256 sTOSid
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
        connectId[stakeId] = sTOSid;
        lockTOSId[sTOSid] = stakeId;
    }

    */
    function _increaseAmountAndPeriodStake(
        address sender,
        uint256 _stakeId,
        uint256 _amount,
        uint256 _unlockWeeks
    )
        internal
    {
        if (_amount > 0) {
           require (TOS.allowance(sender, address(this)) >= _amount, "allowance is insufficient.");
           TOS.safeTransferFrom(sender, address(this), _amount);
        }

        uint256 _periodSeconds = 0;
        uint256 sTosEpochUnit = 0;
        if (_unlockWeeks > 0) ( sTosEpochUnit, _periodSeconds ) = LibStaking.getUnlockTime(lockTOS, 0, _unlockWeeks);

        _increaseStakeInfo(_stakeId, _amount, _periodSeconds);
    }


    function _createStos(address _to, uint256 _amount, uint256 _periodWeeks, uint256 sTosEpochUnit)
         internal ifFree returns (uint256 sTOSid)
    {
        uint256 amountCompound = LibStaking.compound(_amount, rebasePerEpoch, (_periodWeeks * sTosEpochUnit / epoch.length_));
        require (amountCompound > 0, "zero compounded amount");

        sTOSid = ILockTosV2(lockTOS).createLockByStaker(_to, amountCompound, _periodWeeks);
        require(sTOSid > 0, "zero sTOSid");
    }

    function _createStakeInfo(
        address _addr,
        uint256 _stakeId,
        uint256 _amount,
        uint256 _unlockTime,
        uint256 _marketId
    ) internal ifFree returns (uint256){

        require(allStakings[_stakeId].staker == address(0), "non-empty stakeInfo");

        // LibStaking.UserBalance storage stakeInfo = allStakings[_stakeId];

        uint256 ltos = getTosToLtos(_amount);

        allStakings[_stakeId] = LibStaking.UserBalance({
                staker: _addr,
                deposit: _amount,
                LTOS: ltos,
                startTime: block.timestamp,
                endTime: _unlockTime,
                marketId: _marketId
            });

        // console.log("_createStakeInfo _stakeId %s", _stakeId);
        // console.log("_createStakeInfo deposit %s", _amount);
        // console.log("_createStakeInfo LTOS %s", allStakings[_stakeId].LTOS);

        stakingPrincipal += _amount;
        // cummulatedLTOS += ltos;
        totalLTOS += ltos;

        // console.log("_createStakeInfo stakingPrincipal %s", stakingPrincipal);
        // console.log("_createStakeInfo totalLTOS %s", totalLTOS);

        return ltos;
    }

    function _deleteStakeId(uint256 _stakeId, uint256 _userStakeIdIndex) internal {
        if(_userStakeIdIndex > 1)  delete allStakings[_stakeId];
        else if (_userStakeIdIndex == 1) {
            // 초기화
            LibStaking.UserBalance storage _stakeInfo = allStakings[_stakeId];
            _stakeInfo.staker = address(0);
            _stakeInfo.deposit = 0;
            _stakeInfo.LTOS = 0;
            _stakeInfo.startTime = 0;
            _stakeInfo.endTime = 0;
            _stakeInfo.marketId = 0;
        }
    }

    function _increaseStakeInfo(
        uint256 _stakeId,
        uint256 _amount,
        uint256 _increaseSeconds
    ) internal ifFree {
        require(allStakings[_stakeId].staker != address(0), "non-empty stakeInfo");
        require(_amount > 0 || _increaseSeconds > 0, "zero amount and _increaseSeconds");

        LibStaking.UserBalance storage _stakeInfo = allStakings[_stakeId];

        if(_amount > 0) {
            uint256 ltos = getTosToLtos(_amount);
            _stakeInfo.deposit += _amount;
            _stakeInfo.LTOS += ltos;
            stakingPrincipal += _amount;
            totalLTOS += ltos;
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

        console.log("_updateStakeInfo start %s", _stakeId);
        console.log("_updateStakeInfo _unlockTime %s", _unlockTime);
        console.log("_updateStakeInfo _addAmount %s", _addAmount);
        console.log("_updateStakeInfo _claimAmount %s", _claimAmount);

        require(allStakings[_stakeId].staker != address(0), "non-exist stakeInfo");
        require(_addAmount > 0 || _claimAmount > 0 || _unlockTime > 0, "zero Amounts");

        require(allStakings[_stakeId].LTOS > 0, "zero LTOS");
        uint256 stakedAmount = getLtosToTos(allStakings[_stakeId].LTOS);

        console.log("_updateStakeInfo allStakings[_stakeId].deposit %s", allStakings[_stakeId].deposit);
        console.log("_updateStakeInfo allStakings[_stakeId].LTOS %s", allStakings[_stakeId].LTOS);
        console.log("_updateStakeInfo stakedAmount %s", stakedAmount);

        require(_claimAmount <= stakedAmount, "stake amount is insufficient");

        uint256 addLtos = 0;
        uint256 claimLtos = 0;

        LibStaking.UserBalance storage _stakeInfo = allStakings[_stakeId];
        if (_addAmount > 0)  addLtos = getTosToLtos(_addAmount);
        if (_claimAmount > 0) claimLtos = getTosToLtos(_claimAmount);

        _stakeInfo.startTime = block.timestamp;
        _stakeInfo.endTime = _unlockTime;
        console.log("_updateStakeInfo _stakeInfo.endTime : %s", _stakeInfo.endTime);
        console.log("_updateStakeInfo stakedAmount %s", stakedAmount);
        console.log("_updateStakeInfo _stakeInfo.deposit %s", _stakeInfo.deposit);

        uint256 profit = 0;
        if(stakedAmount > _stakeInfo.deposit) profit = stakedAmount - _stakeInfo.deposit;

        console.log("_updateStakeInfo 3");
        if (addLtos > 0){
            _stakeInfo.LTOS += addLtos;
            totalLTOS += addLtos;
        }
        if (claimLtos > 0) {
            _stakeInfo.LTOS -= claimLtos;
            totalLTOS -= claimLtos;
        }
        if (_addAmount > 0 || profit > 0 || _claimAmount > 0) {
            _stakeInfo.deposit = _stakeInfo.deposit + _addAmount + profit - _claimAmount;
            stakingPrincipal = stakingPrincipal + _addAmount + profit - _claimAmount;
        }

        console.log("-----------_updateStakeInfo ------------------");
        console.log("_updateStakeInfo profit %s", profit);
        console.log("_updateStakeInfo stakingPrincipal %s", stakingPrincipal);
        console.log("_updateStakeInfo claimLtos %s", claimLtos);
        console.log("_updateStakeInfo totalLTOS %s", totalLTOS);

        if (profit > 0) {
            IITreasury(treasury).requestTrasfer(address(this), profit);
        }
    }


    function _addUserStakeId(address to, uint256 _id) internal {
        userStakingIndex[to][_id] = userStakings[to].length;
        userStakings[to].push(_id);
    }


    function _deleteUserStakeId(address to, uint256 _id) internal  returns (uint256 curIndex){
        console.log("_deleteUserStakeId %s %s", to, _id);
        curIndex = userStakingIndex[to][_id];
        console.log("_deleteUserStakeId  curIndex %s", curIndex);
        if (curIndex < userStakings[to].length) {

            if (curIndex > 1 ) {
                console.log("_deleteUserStakeId  userStakings[to].length %s", userStakings[to].length);
                if (curIndex < userStakings[to].length-1){
                    uint256 lastId = userStakings[to][userStakings[to].length-1];
                    console.log("_deleteUserStakeId  lastId %s", lastId);

                    userStakings[to][curIndex] = lastId;
                    userStakingIndex[to][lastId] = curIndex;
                }
                userStakingIndex[to][_id] = 0;
                userStakings[to].pop();
            }
        } else {
            console.log("_deleteUserStakeId curIndex > %s", userStakings[to].length);
        }
    }

    //index는 ether단위이다.
    function index() internal returns (uint256) {
        index_ = (index_*(1 ether+rebasePerEpoch) / 1e18);
        return index_;
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

}
