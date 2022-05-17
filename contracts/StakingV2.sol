// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.5;

import "./libraries/SafeMath.sol";
import "./libraries/SafeERC20.sol";

import "./interfaces/IERC20.sol";
import "./interfaces/IsOHM.sol";
import "./interfaces/IgOHM.sol";

import "./types/OlympusAccessControlled.sol";

contract OlympusStaking is OlympusAccessControlled {
    /* ========== DEPENDENCIES ========== */

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /* ========== EVENTS ========== */

    event WarmupSet(uint256 warmup);

    /* ========== DATA STRUCTURES ========== */

    struct Epoch {
        uint256 length; // in seconds
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
        uint256 deposit;    // if forfeiting
        uint256 startTime;  // 시작 startTime
        uint256 epoEnd;     // lock기간
        uint256 getReward;  // 이미 받아간 claim 양
        bool claim;         // claim 유무          
    }

    /* ========== STATE VARIABLES ========== */

    IERC20 public immutable TOS;
    ITreasury public treasury;


    Epoch public epoch;

    uint256 private constant MAX_UINT256 = type(uint256).max;
    uint256 private constant INITIAL_FRAGMENTS_SUPPLY = 5_000_000 * 10**9;

    // TOTAL_GONS is a multiple of INITIAL_FRAGMENTS_SUPPLY so that _gonsPerFragment is an integer.
    // Use the highest value that fits in a uint256 for max granularity.
    uint256 private constant TOTAL_GONS = MAX_UINT256 - (MAX_UINT256 % INITIAL_FRAGMENTS_SUPPLY);

    // MAX_SUPPLY = maximum integer < (sqrt(4*TOTAL_GONS + 1) - 1) / 2
    uint256 private constant MAX_SUPPLY = ~uint128(0); // (2^128) - 1

    mapping(address => Claim) public warmupInfo;
    mapping(address => Users) public userInfo;

    uint256 public rebasePerday;
    uint256 public APY;

    uint256 public warmupPeriod;
    uint256 private gonsInWarmup;

    uint256 private _gonsPerFragment;

    uint256 public LTOSSupply;

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _tos,
        uint256 _epochLength,
        uint256 _firstEpochNumber,
        uint256 _firstEpochTime,
        address _authority,
        ITreasury _treasury
    ) OlympusAccessControlled(IOlympusAuthority(_authority)) {
        require(_tos != address(0), "Zero address : TOS");
        TOS = IERC20(_tos);
        epoch = Epoch({length: _epochLength, number: _firstEpochNumber, end: _firstEpochTime, distribute: 0});

        LTOSSupply = INITIAL_FRAGMENTS_SUPPLY;
        _gonsPerFragment = TOTAL_GONS.div(LTOSSupply);

        treasury = _treasury;
    }

    /* ========== SET VALUE ========== */

    /**
     * @notice set the APY
     * @param _apy uint
     */
    function setAPY(uint256 _apy) external onlyOwner {
        APY = _apy
    }

    /**
     * @notice set rebase per day
     * @param _perday uint
     */
    function rebasePerday(uint256 _perday) external onlyOwner {
        rebasePerday = _rebase;
        epoch.length = (86400 / rebasePerday);
    } 

    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @notice stake OHM to enter warmup
     * @param _to address
     * @param _amount uint
     * @param _period uint
     * @param _claim bool
     * @param _rebasing bool
     * @return uint
     */
    function stake(
        address _to,
        uint256 _amount,
        uint256 _period,
        bool _rebasing,
        bool _claim
    ) external returns (uint256) {
        TOS.safeTransferFrom(msg.sender, address(this), _amount);
        
        if(_rebaseing == true) {
            rebase();
        }

        Users memory info = userInfo[_to];

        userInfo[_to] = Users({
            deposit: info.deposit.add(_amount),
            startTime: block.timestamp,
            epoEnd: block.timestamp + _period,
            getReward: info.getReward,
            claim: false
        });

        totaldeposit = totaldeposit + info.deposit;
        gonsInWarmup = gonsInWarmup.add(gonsForBalance(_amount));

        return _amount;
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
        amount_ = (info.deposit*index());
        treasury.mint(address(this),amount_-info.deposit);
        info.getReward = amount_-info.deposit;
        info.claim = true;

        require(amount_ <= TOS.balanceOf(address(this)), "Insufficient TOS balance in contract");
        TOS.safeTransfer(_to, amount_);
    }

    /**
     * @notice trigger rebase if epoch over
     * @return uint256
     */
    function rebase() public returns (uint256) {
        uint256 bounty;
        if (epoch.end <= block.timestamp) {
            rebasebyStaker(epoch.distribute, epoch.number);

            epoch.end = epoch.end.add(epoch.length);
            epoch.number++;

            uint256 balance = TOS.balanceOf(address(this));         //staking되어있는 물량
            uint256 staked = circulatingSupply();                   //staking에 대한 보상
            if (balance <= staked.add(bounty)) {
                epoch.distribute = 0;
            } else {
                epoch.distribute = balance.sub(staked).sub(bounty);
            }
        }
        return bounty;
    }


    /**
        @notice increases rOHM supply to increase staking balances relative to profit_
        @param profit_ uint256 (기본 rebase Amount) -> 우리는 APY를 이용해서 profit을 역산해야함
        @return uint256
     */
    function rebasebyStaker(uint256 profit_, uint256 epoch_) public returns (uint256) {
        uint256 rebaseAmount;
        uint256 circulatingSupply_ = circulatingSupply();
        if (profit_ == 0) {
            emit LogSupply(epoch_, _totalSupply);
            emit LogRebase(epoch_, 0, index());
            return LTOSSupply;
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

        emit LogSupply(epoch_, _totalSupply);
        emit LogRebase(epoch_, rebasePercent, index());
    }

    /* ========== VIEW FUNCTIONS ========== */

    /**
     * @notice returns the sOHM index, which tracks rebase growth
     * @return uint
     */
    function index() public view returns (uint256 index) {
        alpha = ((APY+1)**(1/rebasePerday/365))-1;
        index = index*(1+alpha);
        return index;
    }

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

    function gonsForBalance(uint256 amount) public view override returns (uint256) {
        return amount.mul(_gonsPerFragment);
    }

    // Staking contract holds excess sOHM
    function circulatingSupply() public view override returns (uint256) {
        // return LTOSSupply.sub(balanceOf(address(this)));
        return 추가로 발행해야할 LTOSamount
    }

    /* ========== MANAGERIAL FUNCTIONS ========== */

    /**
     * @notice set warmup period for new stakers
     * @param _warmupPeriod uint
     */
    function setWarmupLength(uint256 _warmupPeriod) external onlyGovernor {
        warmupPeriod = _warmupPeriod;
        emit WarmupSet(_warmupPeriod);
    }
}
