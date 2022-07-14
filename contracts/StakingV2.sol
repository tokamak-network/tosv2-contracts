// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import "./libraries/SafeMath.sol";
import "./libraries/SafeERC20.sol";

import "./StakingV2Storage.sol";

import "./interfaces/IStaking.sol";

import "./common/ProxyAccessCommon.sol";

import "hardhat/console.sol"; 

contract StakingV2 is 
    StakingV2Storage, 
    ProxyAccessCommon,
    IStaking 
{
    /* ========== DEPENDENCIES ========== */

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /* ========== CONSTRUCTOR ========== */
    constructor() {
    }

    /* ========== SET VALUE ========== */

    //epochRebase 
    //If input the 0.9 -> 900000000000000000
    function setRebasePerepoch(uint256 _rebasePerEpoch) external override onlyPolicyOwner {
        rebasePerEpoch = _rebasePerEpoch;
    }

    //모지랄때 owner가 정해서 늘리는게 맞는가? index는 ether단위이다.
    function setindex(uint256 _index) external override onlyPolicyOwner {
        index_ = _index;
    }

    function setBasicBondPeriod(uint256 _period) external onlyPolicyOwner {
        require(basicBondPeriod != _period && _period != 0,"period check need");
        basicBondPeriod = _period;
    }

    //index는 ether단위이다. 
    /**
     * @notice returns the sOHM index, which tracks rebase growth
     * @return uint
     */
    function index() internal returns (uint256) {
        index_ = (index_*(1 ether+rebasePerEpoch) / 1e18);
        return index_;
    }

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

    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @notice stake OHM to enter warmup
     * @param _to address
     * @param _amount uint tosAmount
     * @param _periodWeeks uint lockup하는 기간
     * @param _bonding bool bonding으로 들어왔는지 확인
     * @param _lockTOS bool
     * @return stakeId uint256
     */
    //그냥 staking을 할때는 lockup 기간이 없는 걸로 -> periodweeks가 0이면 lockup기간이 없음
    //마이그레이션 할때 index가 설정되야함 rebaseIndex를 0으로 해줘야함 -> 변경됨 index도 설정되야함
    //본딩 락업기간 범위: 5일 또는 1주일 단위(sTOS를 위해 락업할 경우) -> 5일(_periodweeks = 0, _bonding = true), 1주일 단위(_periodweeks > 0, _bonding = true)
    //스테이킹 락업기간 범위: 0일 또는 1주일 단위(sTOS를 위해 락업할 경우) -> 0일인경우 periodWeeks = 0, lockTOS = false로 가능, 1주일 단위 
    function stake(
        address _to,
        uint256 _amount,
        uint256 _periodWeeks,
        bool _bonding,
        bool _lockTOS
    ) 
        external 
        override
        returns (uint256 stakeId) 
    {
        require(_amount > 0, "amount should be non-zero");
        if(_lockTOS == true) {
            require(_periodWeeks > 0, "period should be non-zero");
        }
        TOS.safeTransferFrom(msg.sender, address(this), _amount);

        uint256 unlockTime = block.timestamp.add(_periodWeeks.mul(epochUnit));

        //bonding으로 들어왔는데 기간을 정하지 않은 경우
        if(_bonding == true && _periodWeeks == 0) {
            unlockTime = block.timestamp.add(basicBondPeriod);
        }

        stakingIdCounter = stakingIdCounter + 1;
        stakeId = stakingIdCounter;
        userStakings[_to].push(stakeId);

        rebaseIndex();

        _stake(_to,stakeId,_amount,unlockTime);

        //sTOS와 id같이 쓸려면 id별 mapping 따로 만들어서 관리해야함 (이 경우는 sTOS스테이킹하면서 동시에 LTOS를 구매할때)
        uint256 sTOSid;
        if(_lockTOS == true) {
            uint256 maxProfit = maxIndexProfit(_amount,unlockTime);
            sTOSid = lockTOS.createLockByStaker(_to,maxProfit,_periodWeeks);
            connectId[stakeId] = sTOSid;
            lockTOSId[sTOSid] = stakeId;
        }
    }

    function _stake(
        address _addr,
        uint256 _stakeId,
        uint256 _amount,
        uint256 _period
    ) internal ifFree {
        UserBalance memory userOld = stakingBalances[_addr][_stakeId];
        
        //그냥 스테이킹할때 && 기간을 늘릴때
        uint256 getEndTime = _period;
        //이전에 스테이킹한적이 있으면
        if(userOld.deposit > 0 && _period == 0) {
            //기간을 늘리지않고 수량만 늘릴때
            getEndTime = userOld.endTime;
        }

        uint256 LTOSamount = (_amount*1e18)/index_;

        UserBalance memory userNew = UserBalance({
            deposit: userOld.deposit + _amount,
            LTOS: userOld.LTOS + LTOSamount,
            endTime: getEndTime,
            getLTOS: userOld.getLTOS,
            rewardTOS: userOld.rewardTOS,
            withdraw: false
        });

        stakingBalances[_addr][_stakeId] = userNew;
        allStakings[_stakeId] = userNew;

        totalLTOS = totalLTOS + userOld.LTOS;
    }

    //사전에 TOS approve 필요
    //amount에 해당하는 maxProfit만큼 sTOS는 추가로 staking됨
    //LTOS의 staking물량을 늘림
    //사전에 sTOS를 스테이킹하지않은 경우 sTOS를 추가하지않음
    //기간이 끝나기전에 늘리는 경우 -> sTOS 로직에서 그래도 늘려줌
    //기간이 끝난후 늘리는 경우 -> sTOS 기존 껀 unstaking함 -> 새 staking 불가 (기간이 없어서)
    function increaseAmountStake(
        address _to,
        uint256 _tokenId,
        uint256 _amount
    ) 
        external
        override 
    {
        require(_tokenId != 0, "need the tokenId");
        require(_amount > 0, "amount should be non-zero");
        TOS.safeTransferFrom(_to, address(this), _amount);
        UserBalance memory userOld = stakingBalances[_to][_tokenId];

        rebaseIndex();

        _stake(_to,_tokenId,_amount,0);
         
        uint256 sTOSid = connectId[_tokenId];
        console.log("sTOSid : %s",sTOSid);
        //lockTOS를 같이 스테이킹 하였을 경우 기간이 끝나기전에 수량을 늘릴 수는 있음
        //기간이 끝나면 기간 연장이 아니라서 sTOS관련해서는 아무 작업이 없다.
        if(sTOSid != 0 && block.timestamp < userOld.endTime) {
            uint256 maxProfit = maxIndexProfit(_amount,userOld.endTime);
            lockTOS.increaseAmountByStaker(_to,sTOSid,maxProfit);
        }
    }

    //_unlockWeeks 만큼 더 늘어남
    //LTOS의 기간을 늘림
    //기간이 끝나지 않았을때 늘리는 경우 -> 정상 작동
    //기간이 끝났을때 늘리는 경우 -> unstaking하고 다시 stake해준다. -> 기준 시간을 지금 시간으로 잡고 하면됨
    //unlockTime이 현재 블록시간보다 크면 lockTOS를 늘려주고 아니면 늘리지 못한다.
    //sTOS가 없을 경우 호출 하지 않음
    //블록타임이 endTime보다 크면 increase를 호출 하지 못함
    function increasePeriodStake(
        address _to,
        uint256 _tokenId,
        uint256 _unlockWeeks
    )
        external
        override
    {
        require(_tokenId != 0, "need the tokenId");
        require(_unlockWeeks > 0, "period should be non-zero");
        uint256 sTOSid = connectId[_tokenId];
        require(sTOSid != 0, "need the have sTOS");
        UserBalance memory userOld = stakingBalances[_to][_tokenId];

        uint256 unlockTime = userOld.endTime.add(_unlockWeeks.mul(epochUnit));
        require(block.timestamp < unlockTime, "need the more period");

        rebaseIndex();
        _stake(_to,_tokenId,0,unlockTime);
        
        console.log("sTOSid : %s",sTOSid);
        if(sTOSid != 0){
            lockTOS.increaseUnlockTimeByStaker(_to,sTOSid,_unlockWeeks);
        }
        
    }

    //amount, period 둘다 늘릴때
    //LTOS의 기간,물량을 늘림
    //sTOS가 없을 경우 호출 하지 않음
    function increaseAmountAndPeriodStake(
        address _to,
        uint256 _tokenId,
        uint256 _amount,
        uint256 _unlockWeeks
    ) 
        external
    {
        require(_tokenId != 0, "need the tokenId");
        require(_unlockWeeks > 0, "period should be non-zero");
        require(_amount > 0, "amount should be non-zero");

        TOS.safeTransferFrom(_to, address(this), _amount);
        UserBalance memory userOld = stakingBalances[_to][_tokenId];

        uint256 unlockTime = userOld.endTime.add(_unlockWeeks.mul(epochUnit));

        _stake(_to,_tokenId,_amount,unlockTime);

        uint256 sTOSid = connectId[_tokenId];
        uint256 maxProfit = maxIndexProfit(_amount,userOld.endTime);

        //lockTOS에서 둘다 증가하는 경우 해서 넣어야함

        rebaseIndex();
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

        stakeInfo.getLTOS = stakeInfo.getLTOS + _amount;          //쓴 LTOS 기록
        stakeInfo.rewardTOS = stakeInfo.rewardTOS + amount_;      //LTOS -> TOS로 바꾼 양 기록

        if(balanceOfId(_stakeId) == 0) {
            delete connectId[_stakeId];
            delete lockTOSId[sTOSid];
            delete stakingBalances[msg.sender][_stakeId];
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
            stakeInfo.rewardTOS = stakeInfo.rewardTOS + amount_;      //LTOS -> TOS로 바꾼 양 기록

            delete stakingBalances[msg.sender][_stakeId];
            delete connectId[_stakeId];
            delete lockTOSId[sTOSid];

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
            unstakeId(stakingId[i]);
        }
    }

    function rebaseIndex() public override {
        if(epoch.end <= block.timestamp) {
            uint256 epochNumber = (block.timestamp - epoch.end) / epoch.length_ ;
            epoch.end = epoch.end + (epoch.length_ * (epochNumber + 1));
            epoch.number = epoch.number + epochNumber;

            //index를 epochNumber만큼 시킴
            //만약 treasury에 있는 TOS물량이 다음 index를 지원하면 index를 증가 시킨다.
            for(uint256 i = 0; i < (epochNumber + 1); i++) {
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
        return stakeInfo.LTOS - stakeInfo.getLTOS;
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

    //sTOS의 양은 최대의 index를 계산하여서 LTOS -> TOS로 변경 -> TOS의 최대양을 return함
    // 현재 TOS양과 끝나는 시간 입력 시 모든 경우에 index가 다 증가했을경우 staking이 끝난 후 바로 unstaking하면 최종적으로 받게될 TOS의 양을 return함
    // ((스테이킹 끝나는 시간 - 다음 인덱스 증가 시간)/인덱스 rebase 시간) = 몇번 rebase가 일어나는지 나옴
    // _amount = 현재 TOS 양, _endTime 스테이킹 끝나는 시간
    function maxIndexProfit(
        uint256 _amount,
        uint256 _endTime
    ) 
        public
        override
        view
        returns (uint256 amount_)
    {   
        uint256 nowLTOS = (_amount*1e18)/index_;
        uint256 maxindex_ = maxIndex(_endTime);
        amount_ = ((nowLTOS * maxindex_) / 1e18);
        return amount_;
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
        return ((totalLTOS * nextIndex())/1e18) - totalDepositTOS();
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

            _stake(accounts[i],stakeId,balances[i],period[i]);
        }

        return true;
    }
    
}
