// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import "./libraries/SafeMath.sol";
import "./libraries/SafeERC20.sol";

import "./StakingV2Storage.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/ILockTOSv2Action0.sol";
import "./interfaces/ITreasury.sol";

import "./interfaces/IStaking.sol";

import "./common/ProxyAccessCommon.sol";

import "hardhat/console.sol"; 

contract StakingV2 is 
    StakingV2Storage, 
    ProxyAccessCommon 
{
    /* ========== DEPENDENCIES ========== */

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /* ========== EVENTS ========== */

    event WarmupSet(uint256 warmup);

    /* ========== CONSTRUCTOR ========== */
    constructor() {
    }

    /* ========== SET VALUE ========== */

    //epochRebase 
    //If input the 0.9 -> 900000000000000000
    function setRebasePerepoch(uint256 _rebasePerEpoch) external onlyPolicyOwner {
        rebasePerEpoch = _rebasePerEpoch;
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

    function nextIndex() public view returns (uint256) {
        uint256 newindex = (index_*(1 ether+rebasePerEpoch) / 1e18);
        return newindex;
    }

    //모지랄때 owner가 정해서 늘리는게 맞는가? index는 ether단위이다.
    function setindex(uint256 _index) external onlyPolicyOwner {
        index_ = _index;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @notice stake OHM to enter warmup
     * @param _to address
     * @param _amount uint tosAmount
     * @param _periodWeeks uint lockup하는 기간
     * @param _exist uint256 sTOS 아이디
     * @param _lockTOS bool
     * @return stakeId uint256
     */
    //그냥 staking을 할때는 lockup 기간이 없는 걸로
    //마이그레이션 할때 index가 설정되야함 rebaseIndex를 0으로 해줘야함
    //lockPeriod가 없는 Staking은 따로 관리 -> 1 tokenID -> 1 token increase (용량만) , period (기간만)
    //기간 늘리는거, 양 늘리는거, 기간,양 같이 늘리는거 3개 function 추가
    function stake(
        address _to,
        uint256 _amount,
        uint256 _periodWeeks,
        uint256 _exist,
        bool _lockTOS
    ) 
        external 
        returns (uint256 stakeId) 
    {
        require(_amount > 0, "amount should be non-zero");
        TOS.safeTransferFrom(msg.sender, address(this), _amount);

        uint256 unlockTime = block.timestamp.add(_periodWeeks.mul(epochUnit));
        
        //만약 LTOS 스테이킹은 처음이고 sTOS물량은 같이 늘리고 싶을때 _exist에 lockTOS id를 입력한다. (기간은 그대로고 물량만 늘림) (sTOS기간과 같이 LTOS기간도 스테이킹됨)
        if(_exist > 0) {
            lockTOS.depositFor(_to,_exist,_amount);
            (, unlockTime, ) = lockTOS.locksInfo(_exist);
        }

        stakingIdCounter = stakingIdCounter + 1;
        stakeId = stakingIdCounter;
        userStakings[_to].push(stakeId);

        _stake(_to,stakeId,_amount,unlockTime);

        rebaseIndex();

        //sTOS와 id같이 쓸려면 id별 mapping 따로 만들어서 관리해야함 (이 경우는 sTOS스테이킹하면서 동시에 LTOS를 구매할때)
        uint256 sTOSid;
        if(_lockTOS == true) {
            sTOSid = lockTOS.createLockByStaker(_to,_amount,_periodWeeks);
            connectId[stakeId] = sTOSid;
            // sTOSid = lockTOS.createLock(_amount,_periodWeeks);
        }
    }

    function _stake(
        address _addr,
        uint256 _stakeId,
        uint256 _amount,
        uint256 _period
    ) internal ifFree {
        UserBalance memory userOld = stakingBalances[_addr][_stakeId];
        
        //그냥 스테이킹할때
        uint256 getEndTime = _period;
        //이전에 스테이킹한적이 있으면
        if(userOld.deposit > 0) {
            //기간을 늘릴때 -> 현재기준으로 늘릴지 아니면 최종 타임 기준으로 늘릴지 결정해야함
            if(_period > 0) {
                getEndTime = userOld.endTime + _period;
            } else {
                //기간을 늘리지않고 수량만 늘릴때
                getEndTime = userOld.endTime;
            }
        }

        uint256 LTOSamount = (_amount*1e18)/index_;

        UserBalance memory userNew = UserBalance({
            deposit: userOld.deposit + _amount,
            LTOS: userOld.LTOS + LTOSamount,
            startTime: block.timestamp,
            endTime: getEndTime,
            getLTOS: userOld.getLTOS,
            rewardTOS: userOld.rewardTOS
        });

        stakingBalances[_addr][_stakeId] = userNew;
        allStakings[_stakeId] = userNew;

        totalLTOS = totalLTOS + userOld.LTOS;
        totaldeposit = totaldeposit + userOld.deposit;
    }

    /**
     * @notice redeem LTOS -> TOS
     * @param _to address
     * @param _stakeId uint unstake할 LTOS ID를 받음
     * @param _amount uint LTOS양을 받음
     * @return amount_ uint
     */
    //모든 LTOS를 unstaking하면 tokenId 삭제
    //unstakingALL 만들기
    function unstake(
        address _to,
        uint256 _stakeId,
        uint256 _amount
    ) external returns (uint256 amount_) {
        UserBalance storage stakeInfo = stakingBalances[_to][_stakeId];

        require(block.timestamp > stakeInfo.endTime, "need the endPeriod");

        // epoNumber = epoch.number - info.epoNum;
        uint256 remainLTOS = stakeInfo.LTOS - stakeInfo.getLTOS;

        require(remainLTOS >= _amount, "lack the LTOS amount");

        amount_ = ((_amount*index_)/1e18);

        // 내가 스테이킹 한양보다 많이 받으면 그만큼 TOS를 treasury contract에서 가져와서 준다.
        if(amount_ > stakeInfo.deposit) {
            TOS.safeTransferFrom(address(ITreasury(treasury)),address(this),(amount_-stakeInfo.deposit));
        }
        
        //TokenID <-> TokenId 연동하는 struct 이용해서 id찾아서 호출 sTOStokenId
        lockTOS.withdrawByStaker(_to,_stakeId);

        stakeInfo.getLTOS = stakeInfo.getLTOS + _amount;          //쓴 LTOS 기록
        stakeInfo.rewardTOS = stakeInfo.rewardTOS + amount_;      //LTOS -> TOS로 바꾼 양 기록

        require(amount_ <= TOS.balanceOf(address(this)), "Insufficient TOS balance in contract");
        TOS.safeTransfer(_to, amount_);
    }

    function rebaseIndex() public {
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
        view
        returns (uint256[] memory)
    {
        return userStakings[_addr];
    }

    //stakeId가 가지고 있는 남은 LTOS를 리턴
    function balanceOfId(uint256 _stakeId)
        public
        view
        returns (uint256)
    {
        UserBalance memory stakeInfo = allStakings[_stakeId];
        return stakeInfo.LTOS - stakeInfo.getLTOS;
    }

    //유저가 가진 총 LTOS 리턴
    //유저별 
    function balanceOf(address _addr)
        public
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
    function secondsToNextEpoch() external view returns (uint256) {
        return epoch.end.sub(block.timestamp);
    }


    // LTOS를 TOS로 보상해주고 남은 TOS 물량
    function circulatingSupply() public view returns (uint256) {
        //treasury가지고 있는 TOS  - staking 이자 빼기
        // uint256 amount = treasury.enableStaking() - ((totalLTOS * index_) - totaldeposit);
        uint256 amount = treasury.enableStaking() - LTOSinterest();
        return amount;
    }

    // LTOS에 대한 이자 (LTOS -> TOS로 환산 후 staking된 TOS를 뺴줌)
    function LTOSinterest() public view returns (uint256) {
        return ((totalLTOS * index_)/1e18) - totaldeposit;
    }

    // 다음 TOS이자 (다음 index를 구한뒤 -> LTOS -> TOS로 변경 여기서 staking 된 TOS를 뺴줌)
    function nextLTOSinterest() public view returns (uint256) {
        return ((totalLTOS * nextIndex())/1e18) - totaldeposit;
    }

    //sTOS 마이그레이션 sTOS에 있는 TOS를 가져오고 여기에 등록시켜준다
    //TOS는 어떻게 가져올 것인가?
    //기존 정보는 있으니까 그냥 TOS만 가지고오고 여기에 sTOS 정보만 저장?
    //accounts = msg.sender, balances = TOS 원금, period = 끝나는 시간, tokenid = sTOS tokenId
    function syncSTOS(
        address[] memory accounts,
        uint256[] memory balances,
        uint256[] memory period,
        uint256[] memory tokenId
    )
        external
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
        
            _stake(accounts[i],stakeId,balances[i],period[i]);
        }

        return true;
    }
    
}
