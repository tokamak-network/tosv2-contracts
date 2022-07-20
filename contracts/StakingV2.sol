// SPDX-License-Identifier: AGPL-3.0
pragma solidity > 0.8.4;

import "./common/StakeProxyAccess.sol";

import "./libraries/SafeMath.sol";
import "./libraries/SafeERC20.sol";
import "./libraries/ABDKMath64x64.sol";
import {DSMath} from "./libraries/DSMath.sol";

import "./StakingV2Storage.sol";

import "./interfaces/IStaking.sol";
import "./interfaces/IStakingEvent.sol";

import "hardhat/console.sol";

contract StakingV2 is
    StakingV2Storage,
    StakeProxyAccess,
    DSMath,
    IStaking,
    IStakingEvent
{
    /* ========== DEPENDENCIES ========== */
    //using SafeMath for uint256;
    using SafeERC20 for IERC20;

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
        require(address(TOS) != _tos || address(lockTOS) != _lockTOS || address(treasury) != _treasury, "same address");
        TOS = IERC20(_tos);
        lockTOS = ILockTOSv2Action0(_lockTOS);
        treasury = ITreasury(_treasury);
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
    function setBasicBondPeriod(uint256 _period) external override onlyPolicyOwner nonZero(_value) {
        require(basicBondPeriod != _period,"same period");
        basicBondPeriod = _period;
    }


    /* ========== onlyBonder ========== */

    /// @inheritdoc IStaking
    function marketId() public override onlyBonder returns (uint256) {
        return marketIdCounter++;
    }

    function stakeByBond(
        address to,
        uint256 _amount,
        uint256 _marketId
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

        _createStakeInfo(to, stakeId, _amount, block.timestamp + basicBondPeriod, _marketId);
    }

    function stakeGetStosByBond(
        address _to,
        uint256 _amount,
        uint256 _marketId,
        uint256 _periodWeeks
    )
        public override onlyBonder
        nonZeroAddress(_to)
        nonZero(_amount)
        nonZero(_periodWeeks)
        nonZero(_marketId)
        returns (uint256 stakeId)
    {
        uint256 sTosEpochUnit = lockTOS.epochUnit();
        require (sTosEpochUnit > 0, "zero sTosEpochUnit");

        uint256 unlockTime = _getUnlockTime(block.timestamp, _periodWeeks) ;

        require (unlockTime > 0, "zero unlockTime");

        _checkStakeId(to);
        stakeId = _addStakeId();
        _addUserStakeId(to, stakeId);

        _createStakeInfo(to, stakeId, _amount, unlockTime, _marketId);

        uint256 sTOSid = _createStos(_to, _amount, _periodWeeks, sTosEpochUnit);
        connectId[stakeId] = sTOSid;
        lockTOSId[sTOSid] = stakeId;
    }

    /* ========== Anyone can execute ========== */

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
        // 질문, 기본 스테이킹에 기본 락업기간이 반드시 존재 해야 하는가?
        _createStakeInfo(to, stakeId, _amount, block.timestamp + basicBondPeriod, 0);

    }

    function stakeGetStos(
        uint256 _amount,
        uint256 _periodWeeks
    )   public override
        nonZero(_amount)
        nonZero(_periodWeeks)
        nonZero(rebasePerEpoch)
        nonZero(epochUnit)
        returns (uint256 stakeId)
    {
        require (TOS.allowance(msg.sender, address(this)) >= _amount, "allowance is insufficient.");

        uint256 sTosEpochUnit = lockTOS.epochUnit();
        require (sTosEpochUnit > 0, "zero sTosEpochUnit");

        uint256 unlockTime = _getUnlockTime(block.timestamp, _periodWeeks) ;

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
    }

    //락업기간이 없는 경우,
    function increaseAmountSimpleStake(
        uint256 _stakeId,
        uint256 _amount
    )   external override
        nonZero(_stakeId)
        nonZero(_amount)
    {
        require(staker == msg.sender, "caller is not staker");
        require(userStakingIndex[staker][_stakeId] == 1, "it's not simple staking product");

        _increaseAmountAndPeriodStake(staker, _stakeId, _amount, 0);
    }


    // 락업 기간이 끝나서, 락토스를 모두 언스테이킹하고, 일부는 클래임하고, 일부는 다시 스테이킹을 하려고 한다.
    // 다시 스테이킹할 때, 락업이 없을 수 있는가, 락업이 없다면 스테이크 아이디 1번에 다시 옮겨놓아야 하는가.
    function resetStakeGetStos(
        uint256 _stakeId,
        uint256 _addAmount,
        uint256 _claimAmount,
        uint256 _periodWeeks
    )
        public override
        nonZero(_periodWeeks)
    {
        uint256 lockId = connectId[_stakeId];
        require(lockId > 0, "zero lockId");

        LibStaking.UserBalance storage stakeInfo = allStakings[_stakeId];
        address staker = stakeInfo.staker;
        require(staker == msg.sender, "caller is not staker");

        (uint256 start, uint256 end, uint256 amount) = lockTOS.locksInfo(lockId);
        require(end < block.timestamp && stakeInfo.endTime < block.timestamp, "lock end time has not passed");

        uint256 depositPlusAmount = getLtoToTos(stakeInfo.LTOS);
        require(_claimAmount <= depositPlusAmount, "depositPlusAmount is insufficient");

        lockTOS.withdrawByStaker(staker, lockId);
        delete connectId[_stakeId];
        delete lockTOSId[lockId];

        if (_addAmount > 0) {
            cummulatedStakingPrincipal += _addAmount;
            cummulatedLTOS += getTosToLtos(_addAmount);
            totalLTOS += getTosToLtos(_addAmount);

            require (TOS.allowance(msg.sender, address(this)) >= _addAmount, "allowance is insufficient.");
            TOS.safeTransferFrom(msg.sender, address(this), _addAmount);
        }

        if (_claimAmount > 0) {
            cummulatedStakingPrincipal -= _claimAmount;
            cummulatedLTOS -= getTosToLtos(_claimAmount);
            totalLTOS -= getTosToLtos(_claimAmount);

            TOS.safeTransferFrom(address(this), msg.sender, _claimAmount);
            depositPlusAmount -= _claimAmount;
        }

        depositPlusAmount += _addAmount;

        uint256 sTosEpochUnit = lockTOS.epochUnit();
        uint256 unlockTime = 0;
        if (_periodWeeks == 0) {
            unlockTime = _getUnlockTime(block.timestamp, _periodWeeks) ;
        } else {
            unlockTime = block.timestamp + basicBondPeriod
        }
        require(unlockTime > 0, "zero unlockTime");
        _checkStakeId(to);
        rebaseIndex();

        _updateStakeInfo(to, stakeId, depositPlusAmount, unlockTime);

        if (_periodWeeks > 0) {
            uint256 sTOSid = _createStos(to, depositPlusAmount, _periodWeeks, sTosEpochUnit);
            connectId[stakeId] = sTOSid;
            lockTOSId[sTOSid] = stakeId;
        }

    }


    // 락업 기간이 끝나기 전에 수정 또는 락업기간이 없는경우,
    function increaseAmountAndPeriodStake(
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

        // stake 반영
        _increaseAmountAndPeriodStake(staker, _stakeId, _amount, _unlockWeeks);
        uint256 sTosEpochUnit = lockTOS.epochUnit();
        uint256 lockId = connectId[_stakeId];

        if(userStakingIndex[staker][_stakeId] > 1 && lockId == 0 && _unlockWeeks > 0) {
            // 마켓 상품이지만 락은 없었던 것. 락이 생길경우. amount 는 기존에 있던 금액에 추가되는 금액까지 고려해야 하는지.
            uint256 remainLTOS = allStakings[_stakeId].LTOS - allStakings[_stakeId].getLTOS;
            uint256 addAmount = _amount + getLtosToTos(remainLTOS);
            uint256 sTOSid = _createStos(staker, addAmount, _unlockWeeks, sTosEpochUnit);
            connectId[stakeId] = sTOSid;
            lockTOSId[sTOSid] = stakeId;

        } else if(userStakingIndex[staker][_stakeId] > 1 && lockId > 0) {
            (uint256 start, uint256 end, uint256 amount) = lockTOS.locksInfo(lockId);
            require(end > block.timestamp && allStakings[_stakeId].endTime > block.timestamp, "lock end time has passed");

            if (_unlockWeeks == 0) { // 물량만 늘릴때 이자도 같이 늘린다.
                uint256 n = (allStakings[_stakeId].endTime - block.timestamp) / epochUnit;
                uint256 amountCompound = compound(_amount, rebasePerEpoch, n);
                require (amountCompound > 0, "zero compounded amount");
                lockTOS.increaseAmountByStaker(staker, lockId, amountCompound);

            } else if(_unlockWeeks > 0) { // 기간만 들어날때는 물량도 같이 늘어난다고 본다. 이자때문에 .
                uint256 amountCompound1 = 0; // 기간종료후 이자부분
                uint256 amountCompound2 = 0; // 추가금액이 있을경우, 늘어나는 부분

                uint256 n1 = (_unlockWeeks * sTosEpochUnit) / epochUnit;
                amountCompound1 = compound(amount, rebasePerEpoch, n1);
                amountCompound1 = amountCompound1 - amount;

                if (_amount > 0) {
                    uint256 n2 = (end - block.timestamp  + (_unlockWeeks * sTosEpochUnit)) / epochUnit;
                    amountCompound2 = compound(_amount, rebasePerEpoch, n2);
                }

                lockTOS.increaseAmountUnlockTimeByStaker(staker, lockId, amountCompound1 + amountCompound2, _unlockWeeks);
            }
        }
    }


    /* ========== internal ========== */

    function _getUnlockTime(uint256 start, uint256 _periodWeeks) internal returns (uint256 unlockTime) {
        uint256 sTosEpochUnit = lockTOS.epochUnit();
        unlockTime = start + (_periodWeeks * sTosEpochUnit);
        unlockTime = unlockTime / sTosEpochUnit * sTosEpochUnit ;
    }


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
        if (_unlockWeeks > 0) {
            uint256 sTosEpochUnit = lockTOS.epochUnit();
            require (sTosEpochUnit > 0, "zero sTosEpochUnit");

            _periodSeconds = (_unlockWeeks * sTosEpochUnit);
            _periodSeconds = _periodSeconds / sTosEpochUnit * sTosEpochUnit ;
            require (_periodSeconds > 0, "zero unlockTime");
        }
         _addStakeInfo(stakeId, _amount, _periodSeconds);
    }


    function _createStos(_to, _amount, _periodWeeks, sTosEpochUnit) internal ifFree returns (uint256 sTOSid)  {
        uint256 amountCompound = compound(_amount, rebasePerEpoch, (_periodWeeks * sTosEpochUnit / epochUnit));
        require (amountCompound > 0, "zero compounded amount");

        sTOSid = lockTOS.createLockByStaker(_to, amountCompound, _periodWeeks);
        require(sTOSid > 0, "zero sTOSid");
    }

    function _createStakeInfo(
        address _addr,
        uint256 _stakeId,
        uint256 _amount,
        uint256 _unlockTime,
        uint256 _marketId
    ) internal ifFree {

        require(allStakings[_stakeId].staker == address(0), "non-empty stakeInfo");

        LibStaking.UserBalance storage stakeInfo = allStakings[_stakeId];

        uint256 ltos = getTosToLtos(_amount);

        stakeInfo = LibStaking.UserBalance({
                staker: _addr,
                deposit: _amount,
                LTOS: ltos,
                endTime: _unlockTime,
                getLTOS: 0,
                rewardTOS: 0,
                marketId: _marketId,
                withdraw: false
            });

        cummulatedStakingPrincipal += _amount;
        cummulatedLTOS += ltos;
        totalLTOS += ltos;
    }

    function _addStakeInfo(
        uint256 _stakeId,
        uint256 _amount,
        uint256 _increaseSeconds
    ) internal ifFree {
        require(allStakings[_stakeId].staker == address(0), "non-empty stakeInfo");
        require(_amount > 0 || _increaseSeconds > 0, "zero amount and _increaseSeconds");

        LibStaking.UserBalance storage stakeInfo = allStakings[_stakeId];

        if(_amount > 0) {
            uint256 ltos = getTosToLtos(_amount);
            stakeInfo.deposit += _amount;
            stakeInfo.LTOS += ltos;

            cummulatedStakingPrincipal += _amount;
            cummulatedLTOS += ltos;
            totalLTOS += ltos;
        }

        if(_increaseSeconds > 0) {
            stakeInfo.endTime += _increaseSeconds;
        }

    }

    function _addUserStakeId(address to, uint256 _id) internal {
        userStakingIndex[to][_id] = userStakings[to].length;
        userStakings[to].push(_id);
    }


    /**
     * @notice returns the sOHM index, which tracks rebase growth
     * @return uint
     */
    //index는 ether단위이다.
    function index() internal returns (uint256) {
        index_ = (index_*(1 ether+rebasePerEpoch) / 1e18);
        return index_;
    }

    function _checkStakeId(address to) internal {
         if(userStakings[to].length == 0) {
            stakingIdCounter++;
            userStakings[to].push(0); // 0번때는 더미

            userStakingIndex[to][stakingIdCounter] = 1; // 첫번째가 기간없는 순수 스테이킹용 .
            userStakings[to].push(stakingIdCounter);
        }
    }

    function _addStakeId() internal returns(uint256) {
        return stakingIdCounter++;
    }

    /* ========== view ========== */

    /// @inheritdoc IStaking
    function nextIndex() public view override returns (uint256) {
        uint256 newindex = (index_*(1 ether+rebasePerEpoch) / 1e18);
        return newindex;
    }

    /**
     * @notice input the endTime get the exponent
     * @param _endTime endTime
     * @return maxindex uint256
     */
    // ((스테이킹 끝나는 시간 - 다음 인덱스 증가 시간)/인덱스 rebase 시간) = 몇번 rebase가 일어나는지 나옴
    function maxIndex(uint256 _endTime) public view override returns (uint256 maxindex) {
        uint256 exponent = (_endTime - epoch.end) / epoch.length_ ;
        maxindex = index_;
        for (uint256 i = 0; i < exponent; i++) {
            maxindex = (maxindex *(1 ether+rebasePerEpoch)/ 1e18);
        }
        return maxindex;
    }


    /* ========== Anyone can execute ========== */


    //amount, period 둘다 늘릴때
    //LTOS의 기간,물량을 늘림
    //sTOS가 없을 경우 호출 하지 않음
    function increaseAmountAndPeriodStake(
        address _to,
        uint256 _stakeId,
        uint256 _amount,
        uint256 _unlockWeeks
    )
        external
    {
        require(_stakeId != 0, "need the tokenId");
        require(_unlockWeeks > 0, "period should be non-zero");
        require(_amount > 0, "amount should be non-zero");
        uint256 sTOSid = connectId[_stakeId];
        require(sTOSid != 0, "need the have sTOS");

        TOS.safeTransferFrom(msg.sender, address(this), _amount);
        UserBalance memory userOld = stakingBalances[_to][_stakeId];

        uint256 unlockTime;
        uint256 maxProfit;
        console.log("increaseAmountPeriod1");

        rebaseIndex();

        if(block.timestamp < userOld.endTime) {
            //기간이 끝나기전 증가 시킴
            console.log("increaseAmountPeriod2");
            unlockTime = userOld.endTime.add(_unlockWeeks.mul(epochUnit));
            maxProfit = maxIndexProfit(_amount,unlockTime);
            lockTOS.increaseAmountUnlockTimeByStaker(_to,sTOSid,maxProfit,_unlockWeeks);
        } else {
            //시간이 끝나고 증가 시킴
            //기존 sTOS unstaking
            console.log("increaseAmountPeriod3");
            uint256 amount = userOld.deposit + _amount;
            lockTOS.withdrawByStaker(msg.sender,sTOSid);
            delete connectId[_stakeId];
            delete lockTOSId[sTOSid];

            unlockTime = block.timestamp.add(_unlockWeeks.mul(epochUnit));
            unlockTime = unlockTime.div(epochUnit).mul(epochUnit);
            maxProfit = maxIndexProfit(amount,unlockTime);
            sTOSid = lockTOS.createLockByStaker(_to,maxProfit,_unlockWeeks);
            connectId[_stakeId] = sTOSid;
            lockTOSId[sTOSid] = _stakeId;
        }
        console.log("increaseAmountPeriod4");

        if(userOld.marketId == 0){
            _stake(_to,_stakeId,_amount,unlockTime,0);
        } else {
            _stake(_to,_stakeId,_amount,unlockTime,userOld.marketId);
        }
    }

    /**
     * @notice redeem LTOS -> TOS
     * @param _stakeId uint unstake할 LTOS ID를 받음
     * @param _amount uint TOS로 전환할 LTOS양
     * @return amount_ uint
     */
    //모든 LTOS를 unstaking하면 tokenId 삭제 -> 불가능.. delete는 길이를 줄여주지않는다. pop을 이용해야하는데 pop을 이용하기 힘든 구조임 -> mapping이라서 delete하면 됨
    //배열일때는 마지막 데이터를 현재 데이터에 넣고 마지막 데이터를 Pop 시킴
    //일부분 unstaking한후 다시 추가 staking했을경우
    function unstake(
        uint256 _stakeId,
        uint256 _amount
    )
        external
        override
        returns (uint256 amount_)
    {
        UserBalance storage stakeInfo = stakingBalances[msg.sender][_stakeId];
        require(block.timestamp > stakeInfo.endTime, "need the endPeriod");

        rebaseIndex();

        // epoNumber = epoch.number - info.epoNum;
        uint256 remainLTOS = stakeInfo.LTOS - stakeInfo.getLTOS;

        require(remainLTOS >= _amount, "lack the LTOS amount");

        amount_ = ((_amount*index_)/1e18);

        // 내가 스테이킹 한양보다 많이 받으면 그만큼 TOS를 treasury contract에서 가져와서 준다.
        if(amount_ > stakeInfo.deposit) {
            TOS.safeTransferFrom(address(ITreasury(treasury)),address(this),(amount_-stakeInfo.deposit));
        }

        uint256 sTOSid = connectId[_stakeId];
        console.log("sTOSid : %s",sTOSid);
        if(stakeInfo.withdraw == false) {
            if(sTOSid != 0) {
                lockTOS.withdrawByStaker(msg.sender,sTOSid);
            }
            stakeInfo.withdraw == true;
        }

        UserBalance storage allstake = allStakings[_stakeId];

        stakeInfo.getLTOS = stakeInfo.getLTOS + _amount;          //쓴 LTOS 기록
        stakeInfo.rewardTOS = stakeInfo.rewardTOS + amount_;      //LTOS -> TOS로 바꾼 양 기록

        allstake.getLTOS = allstake.getLTOS + _amount;
        allstake.rewardTOS = allstake.rewardTOS + amount_;

        if(balanceOfId(_stakeId) == 0) {
            delete connectId[_stakeId];
            delete lockTOSId[sTOSid];
            delete stakingBalances[msg.sender][_stakeId];
            delete allStakings[_stakeId];
        }

        require(amount_ <= TOS.balanceOf(address(this)), "Insufficient TOS balance in contract");
        TOS.safeTransfer(msg.sender, amount_);
    }

    function unstakeId(
        uint256 _stakeId
    )
        public
        override
        returns (uint256 amount_)
    {
        console.log("msg.sender2 : %s",msg.sender);
        UserBalance storage stakeInfo = stakingBalances[msg.sender][_stakeId];
        if(block.timestamp < stakeInfo.endTime) {
            return amount_ = 0;
        } else {
            rebaseIndex();

            uint256 remainLTOS = stakeInfo.LTOS - stakeInfo.getLTOS;
            console.log("remainLTOS : %s",remainLTOS);

            amount_ = ((remainLTOS*index_)/1e18);

            if(amount_ > stakeInfo.deposit) {
                TOS.safeTransferFrom(address(ITreasury(treasury)),address(this),(amount_-stakeInfo.deposit));
            }

            uint256 sTOSid = connectId[_stakeId];
            if(stakeInfo.withdraw == false) {
                if(sTOSid != 0) {
                    lockTOS.withdrawByStaker(msg.sender,sTOSid);
                }
                stakeInfo.withdraw == true;
            }

            stakeInfo.getLTOS = stakeInfo.getLTOS + remainLTOS;       //쓴 LTOS 기록
            console.log("stakeInfo.getLTOS : %s",stakeInfo.getLTOS);
            stakeInfo.rewardTOS = stakeInfo.rewardTOS + amount_;      //LTOS -> TOS로 바꾼 양 기록
            console.log("stakeInfo.rewardTOS : %s",stakeInfo.rewardTOS);

            delete stakingBalances[msg.sender][_stakeId];
            delete connectId[_stakeId];
            delete lockTOSId[sTOSid];
            delete allStakings[_stakeId];

            require(amount_ <= TOS.balanceOf(address(this)), "Insufficient TOS balance in contract");
            TOS.safeTransfer(msg.sender, amount_);
        }
    }

    function arrayUnstakeId(
        uint256[] calldata _stakeIds
    )
        public
    {
        console.log("msg.sender1 : %s",msg.sender);
        for(uint256 i = 0; i < _stakeIds.length; i++) {
            unstakeId(_stakeIds[i]);
        }
    }

    function allunStaking() external override {
        console.log("msg.sender1 : %s", msg.sender);
        uint256[] memory stakingId = stakinOf(msg.sender);
        for (uint256 i = 0; i < stakingId.length; i++) {
            if(i == 0 && stakingId[0] == 0){
            } else {
                unstakeId(stakingId[i]);
            }
        }
    }

    function rebaseIndex() public override {
        if(epoch.end <= block.timestamp) {
            uint256 epochNumber = (block.timestamp - epoch.end) / epoch.length_ ;
            console.log("epochNumber : %s", epochNumber);
            epoch.end = epoch.end + (epoch.length_ * (epochNumber + 1));
            console.log("epoch.end : %s", epoch.end);
            epoch.number = epoch.number + (epochNumber + 1);
            console.log("epoch.number : %s", epoch.number);

            //index를 epochNumber만큼 시킴
            //만약 treasury에 있는 TOS물량이 다음 index를 지원하면 index를 증가 시킨다.
            for(uint256 i = 0; i < (epochNumber + 1); i++) {
                console.log("rebaseIndex() : %s", i);
                if(treasury.enableStaking() > nextLTOSinterest()) {
                    index();
                }
            }
        }
    }

    /* ========== VIEW FUNCTIONS ========== */
    //유저가 스테이킹한 id 리턴
    function stakinOf(address _addr)
        public
        override
        view
        returns (uint256[] memory)
    {
        return userStakings[_addr];
    }

    //stakeId가 가지고 있는 남은 LTOS를 리턴
    function balanceOfId(uint256 _stakeId)
        public
        override
        view
        returns (uint256)
    {
        UserBalance memory stakeInfo = allStakings[_stakeId];
        return (stakeInfo.LTOS - stakeInfo.getLTOS);
    }

    //유저가 가진 총 LTOS 리턴
    function balanceOf(address _addr)
        public
        override
        view
        returns (uint256 balance)
    {
        uint256[] memory stakings = userStakings[_addr];
        if (stakings.length == 0) return 0;
        for (uint256 i = 0; i < stakings.length; ++i) {
            balance = balance + balanceOfId(stakings[i]);
        }
    }


    /**
     * @notice seconds until the next epoch begins
     */
    function secondsToNextEpoch() external override view returns (uint256) {
        return epoch.end.sub(block.timestamp);
    }


    // LTOS를 TOS로 보상해주고 남은 TOS 물량
    function circulatingSupply() public override view returns (uint256) {
        //treasury가지고 있는 TOS  - staking 이자 빼기
        // uint256 amount = treasury.enableStaking() - ((totalLTOS * index_) - totalDepositTOS());
        uint256 amount = treasury.enableStaking() - LTOSinterest();
        return amount;
    }

    // LTOS에 대한 현재 이자 (LTOS -> TOS로 환산 후 staking된 TOS를 뺴줌)
    function LTOSinterest() public override view returns (uint256) {
        return ((totalLTOS * index_)/1e18) - totalDepositTOS();
    }

    // 다음 TOS이자 (다음 index를 구한뒤 -> LTOS -> TOS로 변경 여기서 staking 된 TOS를 뺴줌)
    function nextLTOSinterest() public override view returns (uint256) {
        if( ((totalLTOS * nextIndex())/1e18) < totalDepositTOS()) {
            return 0;
        } else {
            return ((totalLTOS * nextIndex())/1e18) - totalDepositTOS();
        }
    }

    function totalDepositTOS() public override view returns (uint256) {
        return TOS.balanceOf(address(this));
    }

    //sTOS 마이그레이션 sTOS에 있는 TOS를 가져오고 여기에 등록시켜준다
    //TOS는 어떻게 가져올 것인가? -> TOS는 옮김
    //기존 정보는 있으니까 그냥 TOS만 가지고오고 여기에 sTOS 정보만 저장? -> 기존 컨트랙에 정보는 있으니까 여기 정보 저장하면됨 -> 추가로 미리 index 최대치 계산해서 sTOS를 그만큼 더 줘야함
    //accounts = msg.sender, balances = TOS 원금, period = 끝나는 시간, tokenid = sTOS tokenId
    function syncSTOS(
        address[] memory accounts,
        uint256[] memory balances,
        uint256[] memory period,
        uint256[] memory tokenId
    )
        external
        override
        onlyOwner
        returns (bool)
    {
        require(accounts.length == balances.length, "No balances same length");

        uint256 stakeId;

        for (uint256 i = 0; i < accounts.length; i++ ) {
            stakingIdCounter = stakingIdCounter + 1;
            stakeId = stakingIdCounter;
            userStakings[accounts[i]].push(stakeId);

            connectId[stakeId] = tokenId[i];
            lockTOSId[tokenId[i]] = stakeId;

            _stake(accounts[i],stakeId,balances[i],period[i],0);
        }

        return true;
    }



    function pow (int128 x, uint n) public pure returns (int128 r) {
        r = ABDKMath64x64.fromUInt (1);
        while (n > 0) {
            if (n % 2 == 1) {
                r = ABDKMath64x64.mul (r, x);
                n -= 1;
            } else {
                x = ABDKMath64x64.mul (x, x);
                n /= 2;
            }
        }
    }

    function compound (uint principal, uint ratio, uint n) public pure returns (uint) {
        return ABDKMath64x64.mulu (
                pow (
                ABDKMath64x64.add (
                    ABDKMath64x64.fromUInt (1),
                    ABDKMath64x64.divu (
                    ratio,
                    10**18)),
                n),
                principal);
    }

    function getTosToLtos(uint256 amount) public view returns (uint256) {
        return (_amount * 1e18) / index_;
    }

    function getLtosToTos(uint256 ltos) public view returns (uint256) {
        return (ltos * index_) / 1e18;
    }

}
