// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.10;

import "./libraries/SafeMath.sol";
import "./libraries/SafeERC20.sol";

import "./interfaces/IERC20.sol";
import "./interfaces/IStaking.sol";


contract Staking is IStaking {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /* ========== EVENTS ========== */

    event DistributorSet(address distributor);
    event WarmupSet(uint256 warmup);

    /* ========== DATA STRUCTURES ========== */

    struct Epoch {
        uint256 length; // in seconds (epoch간격)
        uint256 number; // since inception
        uint256 end; // timestamp
        uint256 distribute; // amount
    }

    struct Claim {
        uint256 deposit; // if forfeiting
        uint256 startTime;
        uint256 expiry; // end of warmup period
        uint256 epoNum; // 현재 epochNumber
        bool lock; // prevents malicious delays for claim
    }

    struct Reward {
        uint256 getReward;  // 이미 받아간 claim 양
        uint256 nowReward;  // 자금 받을 수 있는 claim 양
    }

    struct Info {
        uint256 amount; // 복리 계산 금액
        address recipient;
    }

    /* ========== STATE VARIABLES ========== */

    IERC20 public immutable TOS;

    Epoch public epoch;

    Info[] public info;

    mapping(address => Claim) public claimInfo;
    mapping(address => Reward) public rewards;
    uint256 public rebaseRate;
    uint256 public rebasePerday;

    constructor(
        address _tos,
        uint256 _epochLength,
        uint256 _firstEpochNumber,
        uint256 _firstEpochTime
    ) {
        require(_tos != address(0), "Zero address: TOS");
        TOS = IERC20(_tos);

        epoch = Epoch({length: _epochLength, number: _firstEpochNumber, end: _firstEpochTime, distribute: 0});
    }

    /**
     * @notice stake TOS deposit할때 tos를 staking함 
     * @param _to address
     * @param _amount uint
     * @param _time uint
     * @param _claim bool
     * @param _rebasing bool (sOHM, gOHM 선택 하는거)
     * @return uint
     */
    function stake(
        address _to,
        uint256 _amount,
        uint256 _time,
        bool _claim
    ) external returns (uint256) {
        TOS.safeTransferFrom(_to, address(this), _amount);
        Claim memory claimInfos = warmupInfo[_to];
        uint256 reward = 0;
        rebase();
        
        //이전 stake 내용이 만기가 되었을때
        if(claimInfos.expiry < block.timestamp && claimInfos.expiry != 0) {
            uint256 diffDay = (claimInfos.expiry - claimInfos.startTime) / 1 days;
            //줘야하는 금액을 계산해줌
            treasury.mint(_to, reward);
        }

        if(_claim == true) {
            uint256 diffDay = (block.timestamp - claimInfos.startTime) / 1 days;
            //줘야하는 금액을 계산해줌
            treasury.mint(_to, reward);
        }

        info.push(Info({recipient: _to, amount: claimInfos.deposit.add(_amount)}));
        
        rewards[_to] = Reward({
            getReward: 0,
            nowReward: 0
        });
        

        claimInfo[_to] = Claim({
            deposit: claimInfo.deposit.add(_amount),
            startTime: block.timestamp,
            expiry: block.timestamp.add(_time),
            epoNum: epoch.number,
            lock: claimInfo.lock
        });


        return _amount;
    }

    /**
     * @notice retrieve stake from warmup
     * @param _to address
     * @param _rebasing bool
     * @return uint
     */
    function claim(address _to, bool _rebasing) public returns (uint256) {
        Claim memory claimInfos = claimInfo[_to];
        Reward storage rewardInfo = rewards[_to];

        uint256 currentTime = block.timestamp;

        lTOS.mint(_to, rewardInfo.nowReward);

        rewardInfo.getReward +=  rewardInfo.nowReward;

       
    }

    function unstake() external returns (uint256) {

    }
    
    /**
     * @notice set rebase_rate for stakers (30% -> input 3000)
     * @param _rate uint
     */
    function setRate(uint256 _rate) external onlyOwner {
        rebaseRate = _rate;
    }

    /**
     * @notice set rebase per day
     * @param _rebase uint
     */
    function rebasePerday(uint256 _rebase) external onlyOwner {
        rebasePerday = _rebase;
        epoch.length = (86400 / rebasePerday);
    }

    function rebase() external {
        if(epoch.end <= block.timestamp) {
            epoch.end = epoch.end.add(epoch.length);
            epoch.number++;

            distribute();
        }
    }

    function distribute() external override {
        require(msg.sender == address(this), "Only staking");
        // distribute rewards to each recipient
        for (uint256 i = 0; i < info.length; i++) {
            if (info[i].amount > 0) {
                info[i].amount = nextRewardAt(info[i].amount); // calculate the interest
                rewards[info[i].recipient].nowReward = info[i].amount;
            }
        }
    }

    /**
        @notice view function for next reward at given rate
        @param _user address
        @param _amount uint
        @return uint
     */
    function nextRewardAt(uint256 _amount) public view returns (uint256 reward_) {
        reward_ = ((_amount * 100) + ((_amount * rebaseRate) / 100)) / 100;
        return reward_;
    }


}