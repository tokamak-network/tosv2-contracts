// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import "./libraries/SafeMath.sol";
import "./libraries/SafeERC20.sol";

import "./interfaces/IERC20.sol";
import "./interfaces/ILockTOS.sol";
import "./interfaces/ITreasury.sol";

import "./common/ProxyAccessCommon.sol";

import "hardhat/console.sol"; 

contract StakingV2 is ProxyAccessCommon {
    /* ========== DEPENDENCIES ========== */

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /* ========== EVENTS ========== */

    event WarmupSet(uint256 warmup);

    /* ========== DATA STRUCTURES ========== */

    struct Epoch {
        uint256 length_; // in seconds
        uint256 number; // since inception
        uint256 end; // timestamp
    }

    struct Claim {
        uint256 deposit; // if forfeiting
        uint256 gons; // staked balance
        uint256 expiry; // end of warmup period
        bool lock; // prevents malicious delays for claim
    }

    struct Users {
        uint256 deposit;    // tos staking한 양
        uint256 LTOS;       // LTOS 양
        uint256 startTime;  // 시작 startTime
        uint256 epoEnd;     // lock기간
        uint256 getReward;  // 이미 받아간 claim 양
        bool claim;         // claim 유무          
    }

    struct UserBalance {
        uint256 deposit;    //tos staking 양
        uint256 LTOS;       //변환된 LTOS 양
        uint256 startTime;  //시작 startTime
        uint256 endTime;    //끝나는 endTime
        uint256 getLTOS;    //이미 받아간 LTOS양
    }

    /* ========== STATE VARIABLES ========== */

    IERC20 public immutable TOS;
    ILockTOS public lockTOS;
    ITreasury public treasury;

    Epoch public epoch;

    mapping(address => Claim) public warmupInfo;
    mapping(address => Users) public userInfo;

    uint256 public epochUnit;

    uint256 public index_;

    uint256 internal free = 1;

    uint256 public totaldeposit;
    uint256 public totalLTOS;

    uint256 public rebasePerEpoch;

    uint256 public stakingIdCounter;

    mapping(address => uint256[]) public userStakings;
    mapping(uint256 => UserBalance) public allStakings;
    mapping(address => mapping(uint256 => UserBalance)) public stakingBalances;

    /* ========== CONSTRUCTOR ========== */

    //addr[0] = tos, addr[1] = lockTOS
    //_epoch[0] = _epochLength, _epoch[1] = _firstEpochNumber, _epoch[2] =  _firstEpochTime, _epoch[3] = _epochUnit
    constructor(
        address _tos,
        uint256[4] memory _epoch,
        address _lockTOS,
        ITreasury _treasury
    ) {
        require(_tos != address(0), "Zero address : TOS");
        require(_lockTOS != address(0), "Zero address : lockTOS");

        _setRoleAdmin(PROJECT_ADMIN_ROLE, PROJECT_ADMIN_ROLE);
        _setupRole(PROJECT_ADMIN_ROLE, msg.sender);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        TOS = IERC20(_tos);
        lockTOS = ILockTOS(_lockTOS);
        treasury = _treasury;

        epoch = Epoch({length_: _epoch[0], number: _epoch[1], end: _epoch[2]});
        epochUnit = _epoch[3];
    }

    /// @dev Check if a function is used or not
    modifier ifFree {
        require(free == 1, "LockId is already in use");
        free = 0;
        _;
        free = 1;
    }

    /* ========== SET VALUE ========== */

    //epochRebase 
    //If input the 0.9 -> 900000000000000000
    function setRebasePerepoch(uint256 _rebasePerEpoch) external onlyOwner {
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
    function setindex(uint256 _index) external onlyOwner {
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
    
        //만약 스테이킹은 처음이고 sTOS물량은 같이 늘리고 싶을때 (기간은 그대로고 물량만 늘림) (sTOS기간과 같이 LTOS기간도 스테이킹됨)
        if(_exist > 0) {
            lockTOS.depositFor(msg.sender,_exist,_amount);
            (, unlockTime, ) = lockTOS.locksInfo(_exist);
        }

        stakingIdCounter = stakingIdCounter + 1;
        stakeId = stakingIdCounter;
        userStakings[msg.sender].push(stakeId);

        _stake(_to,stakeId,_amount,unlockTime);

        rebaseIndex();

        //sTOS와 id같이 쓸려면 id별 mapping 따로 만들어서 관리해야함 (이 경우는 sTOS스테이킹하면서 동시에 LTOS를 구매할때)
        uint256 sTOSid;
        if(_lockTOS == true) {
            sTOSid = lockTOS.createLock(_amount,_periodWeeks);
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

        stakingBalances[_addr][_stakeId] = UserBalance({
            deposit: userOld.deposit + _amount,
            LTOS: userOld.LTOS + LTOSamount,
            startTime: block.timestamp,
            endTime: getEndTime,
            getLTOS: userOld.getLTOS
        });

        totalLTOS = totalLTOS + userOld.LTOS;
        totaldeposit = totaldeposit + userOld.deposit;
    }

    /**
     * @notice redeem sOHM for OHMs
     * @param _to address
     * @param _amount uint
     * @param _trigger bool
     * @param _rebasing bool
     * @return amount_ uint
     */
    function unstake(
        address _to,
        uint256 _amount,
        bool _trigger,
        bool _rebasing
    ) external returns (uint256 amount_) {
        Users storage info = userInfo[_to];

        require(block.timestamp > info.epoEnd, "need the endPeriod");
        require(info.claim == false, "already get claim");

        // epoNumber = epoch.number - info.epoNum;
        require(info.LTOS > _amount, "lack the LTOS amount");

        amount_ = ((_amount*index_)/1e18);
        // 내가 스테이킹 한양보다 많이 받으면 그만큼 TOS를 mint하고 보상을 준다.
        if(amount_ > info.deposit) {
            treasury.mint(address(this),amount_-info.deposit);
        } 
        info.getReward = info.getReward + amount_;
        info.claim = true;

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

    // /**
    //  * @notice returns the sOHM index, which tracks rebase growth
    //  * @return uint
    //  */
    // function index() public returns (uint256) {
    //     uint256 alpha = ((APY+1)**(1/rebasePerday/365))-1;
    //     index_ = index_*(1+alpha);
    //     return index_;
    // }

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

}
