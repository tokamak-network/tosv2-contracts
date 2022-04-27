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
        uint256 gons; // staked balance
        uint256 expiry; // end of warmup period
        uint256 startTime;
        bool lock; // prevents malicious delays for claim
    }

    /* ========== STATE VARIABLES ========== */

    IERC20 public immutable TOS;

    Epoch public epoch;

    mapping(address => Claim) public warmupInfo;
    uint256 public warmupPeriod;
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
        _amount = _amount; // add bounty if rebase occurred

        Claim memory info = warmupInfo[_to];
        
        warmupInfo[_to] = Claim({
                deposit: info.deposit.add(_amount),
                gons: info.gons.add(TOS.gonsForBalance(_amount)),
                expiry: epoch.number.add(warmupPeriod),
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

       
    }

    function checkEpoch() public returns (bool) {

    }

    /**
     * @notice set warmup period for new stakers
     * @param _warmupPeriod uint
     */
    function setWarmupLength(uint256 _warmupPeriod) external onlyOwner {
        warmupPeriod = _warmupPeriod;
        emit WarmupSet(_warmupPeriod);
    }

}