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
        uint256 length; // in seconds
        uint256 number; // since inception
        uint256 end; // timestamp
        uint256 distribute; // amount
    }

    struct Claim {
        uint256 deposit; // if forfeiting
        uint256 startTime;
        uint256 expiry; // end of warmup period
        uint256 debt; // 이미 받아간 claim 양
        bool lock; // prevents malicious delays for claim
    }

    struct Reward {
        address user;
        uint256 allReward;
        uint256 getReward;
        uint256 nowReward;
    }

    /* ========== STATE VARIABLES ========== */

    IERC20 public immutable TOS;

    Epoch public epoch;

    mapping(address => Claim) public warmupInfo;
    mapping(uint256 => Reward) public rewards;
    uint256 public warmupPeriod;
    uint256 public apyPercent;
    uint256 private gonsInWarmup;

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
        TOS.safeTransferFrom(msg.sender, address(this), _amount);
        Claim memory info = warmupInfo[_to];
        uint256 reward = 0;
        checkEpoch();
        
        //이전 stake 내용이 만기가 되었을때
        if(info.expiry < block.timestamp && info.expiry != 0) {
            uint256 diffDay = (info.expiry - info.startTime) / 1 days;
            //줘야하는 금액을 계산해줌
            treasury.mint(_to, reward);
        }

        if(_claim == true) {
            uint256 diffDay = (block.timestamp - info.startTime) / 1 days;
            //줘야하는 금액을 계산해줌
            treasury.mint(_to, reward);
        }

        warmupInfo[_to] = Claim({
            deposit: info.deposit.add(_amount),
            startTime: block.timestamp,
            expiry: block.timestamp.add(_time),
            debt: debt.add(reward),
            lock: info.lock
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
        Claim memory info = warmupInfo[_to];

        uint256 currentTime = block.timestamp;
       
    }

    //Epoch시간 되었는지 확인
    function checkEpoch() public returns (bool) {
        if(epoch.end <= block.timestamp) {
            uint256 difftime = block.timestamp.sub(epoch.end);
            uint256 count = (difftime/epoch.length);
            epoch.end += (epoch.length*count);
            epoch.number.add(count);

            return true;
        }
        return false;
    }

    /**
     * @notice set warmup period for new stakers
     * @param _warmupPeriod uint
     */
    function setWarmupLength(uint256 _warmupPeriod) external onlyOwner {
        warmupPeriod = _warmupPeriod;
        emit WarmupSet(_warmupPeriod);
    }
    
    /**
     * @notice set setAPY for stakers (30% -> input 30)
     * @param _apy uint
     */
    function setAPY(uint256 _apy) external onlyOwner {
        apyPercent = _apy;
    }

    function rebase() external {

    }

    function distribute() external override {
        require(msg.sender == staking, "Only staking");
        // distribute rewards to each recipient
        for (uint256 i = 0; i < info.length; i++) {
            if (info[i].rate > 0) {
                treasury.mint(info[i].recipient, nextRewardAt(info[i].rate)); // mint and send tokens
                adjust(i); // check for adjustment
            }
        }
    }

    /**
        @notice view function for next reward at given rate
        @param _rate uint
        @return uint
     */
    function nextRewardAt(uint256 _rate) public view override returns (uint256) {
        return TOS.totalSupply().mul(_rate).div(rateDenominator);
    }


}