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
        uint256 distribute; // amount
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

    struct Rebase {
        uint256 epoch;
        uint256 rebase; // 18 decimals
        uint256 totalStakedBefore;
        uint256 totalStakedAfter;
        uint256 amountRebased;
        uint256 index;
        uint256 blockNumberOccured;
    }

    /* ========== STATE VARIABLES ========== */

    IERC20 public immutable TOS;
    ILockTOS public lockTOS;
    ITreasury public treasury;

    Epoch public epoch;

    Rebase[] public rebases; // past rebase data


    uint256 private constant MAX_UINT256 = type(uint256).max;
    uint256 private constant INITIAL_FRAGMENTS_SUPPLY = 5_000_000 * 10**9;

    // TOTAL_GONS is a multiple of INITIAL_FRAGMENTS_SUPPLY so that _gonsPerFragment is an integer.
    // Use the highest value that fits in a uint256 for max granularity.
    uint256 private constant TOTAL_GONS = MAX_UINT256 - (MAX_UINT256 % INITIAL_FRAGMENTS_SUPPLY);

    // MAX_SUPPLY = maximum integer < (sqrt(4*TOTAL_GONS + 1) - 1) / 2
    uint256 private constant MAX_SUPPLY = ~uint128(0); // (2^128) - 1

    mapping(address => Claim) public warmupInfo;
    mapping(address => Users) public userInfo;

    uint256 public epochUnit;

    uint256 public rebasePerday;
    uint256 public APY;

    uint256 public warmupPeriod;
    uint256 private gonsInWarmup;

    uint256 private _gonsPerFragment;

    uint256 public LTOSSupply;

    uint256 public index_;

    uint256 internal free = 1;

    uint8 public rebaseRate;

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

        epoch = Epoch({length_: _epoch[0], number: _epoch[1], end: _epoch[2], distribute: 0});
        epochUnit = _epoch[3];

        ///
        LTOSSupply = INITIAL_FRAGMENTS_SUPPLY;
        _gonsPerFragment = TOTAL_GONS.div(LTOSSupply);
    }

    /// @dev Check if a function is used or not
    modifier ifFree {
        require(free == 1, "LockId is already in use");
        free = 0;
        _;
        free = 1;
    }

    /* ========== SET VALUE ========== */

    // /**
    //  * @notice set the APY
    //  * @param _apy uint
    //  */
    // function setAPY(uint256 _apy) external onlyOwner {
    //     APY = _apy;
    // }

    // /**
    //  * @notice set rebase per day
    //  * @param _perday uint
    //  */
    // function setRebasePerday(uint256 _perday) external onlyOwner {
    //     rebasePerday = _perday;
    //     epoch.length_ = (86400 / rebasePerday);
    // } 

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

    // function rebaseInterestRate(uint8 _rate) external onlyOwner {
    //     rebaseRate = _rate;
    // }


    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @notice stake OHM to enter warmup
     * @param _to address
     * @param _amount uint tosAmount
     * @param _periodWeeks uint lockup하는 기간
     * @param _lockTOS bool
     * @param _rebasing bool
     * @return stakeId uint256
     */
    //그냥 staking을 할때는 lockup 기간이 없는 걸로
    function stake(
        address _to,
        uint256 _amount,
        uint256 _periodWeeks,
        bool _rebasing,
        bool _lockTOS
    ) 
        external 
        returns (uint256 stakeId) 
    {
        require(_amount > 0, "amount should be non-zero");
        TOS.safeTransferFrom(msg.sender, address(this), _amount);

        uint256 unlockTime = block.timestamp.add(_periodWeeks.mul(epochUnit));
    
        stakingIdCounter = stakingIdCounter + 1;
        stakeId = stakingIdCounter;
        userStakings[msg.sender].push(stakeId);

        _stake(_to,stakeId,_amount,unlockTime);

        if(_rebasing == true) {
            rebaseIndex();
        }

        if(_lockTOS == true) {
            lockTOS.createLock(_amount,_periodWeeks);
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

    // /**
    //  * @notice trigger rebase if epoch over
    //  * @return uint256
    //  */
    // function rebase2() public returns (uint256) {
    //     uint256 bounty;
    //     if (epoch.end <= block.timestamp) {
    //         rebasebyStaker(epoch.distribute, epoch.number);

    //         epoch.end = epoch.end.add(epoch.length_);
    //         epoch.number++;

    //         uint256 balance = TOS.balanceOf(address(this));         //staking되어있는 물량
    //         uint256 staked = circulatingSupply();                   //staking에 대한 보상
    //         if (balance <= staked.add(bounty)) {
    //             epoch.distribute = 0;
    //         } else {
    //             epoch.distribute = balance.sub(staked).sub(bounty);
    //         }
    //     }
    //     return bounty;
    // }


    /**
        @notice increases rOHM supply to increase staking balances relative to profit_
        @param profit_ uint256 (기본 rebase Amount) -> 우리는 APY를 이용해서 profit을 역산해야함
        @return uint256
     */
    function rebasebyStaker(uint256 profit_, uint256 epoch_) public returns (uint256) {
        uint256 rebaseAmount;
        uint256 circulatingSupply_ = circulatingSupply();
        if (profit_ == 0) {
            // emit LogSupply(epoch_, _totalSupply);
            // emit LogRebase(epoch_, 0, index());
            // return LTOSSupply;
        } else if (circulatingSupply_ > 0) {
            rebaseAmount = profit_.mul(LTOSSupply).div(circulatingSupply_);
        } else {
            rebaseAmount = profit_;
        }

        LTOSSupply = LTOSSupply.add(rebaseAmount);

        if (LTOSSupply > MAX_SUPPLY) {
            LTOSSupply = MAX_SUPPLY;
        }

        _gonsPerFragment = TOTAL_GONS.div(LTOSSupply);

        _storeRebase(circulatingSupply_, profit_, epoch_);

        return LTOSSupply;
    }

    /* ========== INTERNAL FUNCTIONS ========== */

     /**
        @notice emits event with data about rebase
        @param previousCirculating_ uint
        @param profit_ uint
        @param epoch_ uint
     */
    function _storeRebase(
        uint256 previousCirculating_,
        uint256 profit_,
        uint256 epoch_
    ) internal {
        uint256 rebasePercent = profit_.mul(1e18).div(previousCirculating_);
        rebases.push(
            Rebase({
                epoch: epoch_,
                rebase: rebasePercent, // 18 decimals
                totalStakedBefore: previousCirculating_,
                totalStakedAfter: circulatingSupply(),
                amountRebased: profit_,
                index: index(),
                blockNumberOccured: block.number
            })
        );

        // emit LogSupply(epoch_, _totalSupply);
        // emit LogRebase(epoch_, rebasePercent, index());
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
     * @notice total supply in warmup
     */
    // function supplyInWarmup() public view returns (uint256) {
    //     return sOHM.balanceForGons(gonsInWarmup);
    // }

    /**
     * @notice seconds until the next epoch begins
     */
    function secondsToNextEpoch() external view returns (uint256) {
        return epoch.end.sub(block.timestamp);
    }

    function gonsForBalance(uint256 amount) public view returns (uint256) {
        return amount.mul(_gonsPerFragment);
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

    /* ========== MANAGERIAL FUNCTIONS ========== */

    /**
     * @notice set warmup period for new stakers
     * @param _warmupPeriod uint
     */
    function setWarmupLength(uint256 _warmupPeriod) external onlyPolicyOwner {
        warmupPeriod = _warmupPeriod;
        emit WarmupSet(_warmupPeriod);
    }
}
