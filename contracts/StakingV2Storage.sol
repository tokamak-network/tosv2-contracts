// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IERC20.sol";
import "./interfaces/ILockTOSv2Action0.sol";
import "./interfaces/ITreasury.sol";

contract StakingV2Storage {
     /* ========== DATA STRUCTURES ========== */

    struct Epoch {
        uint256 length_; // in seconds
        uint256 number; // since inception
        uint256 end; // timestamp
    }

    // struct Claim {
    //     uint256 deposit; // if forfeiting
    //     uint256 gons; // staked balance
    //     uint256 expiry; // end of warmup period
    //     bool lock; // prevents malicious delays for claim
    // }

    // struct Users {
    //     uint256 deposit;    // tos staking한 양
    //     uint256 LTOS;       // LTOS 양
    //     uint256 startTime;  // 시작 startTime
    //     uint256 epoEnd;     // lock기간
    //     uint256 getReward;  // 이미 받아간 claim 양
    //     bool claim;         // claim 유무          
    // }

    struct UserBalance {
        uint256 deposit;    //tos staking 양
        uint256 LTOS;       //변환된 LTOS 양
        uint256 endTime;    //끝나는 endTime
        uint256 getLTOS;    //이미 받아간 LTOS양
        uint256 rewardTOS;  //받아간 TOS양
        bool withdraw;      //unstakeing을 한번이라도 했는지
    }

    /* ========== STATE VARIABLES ========== */

    IERC20 public TOS;
    ILockTOSv2Action0 public lockTOS;
    ITreasury public treasury;

    Epoch public epoch;

    // mapping(address => Claim) public warmupInfo;
    // mapping(address => Users) public userInfo;

    uint256 public epochUnit;

    uint256 public index_;

    uint256 internal free = 1;

    uint256 public totalLTOS;

    uint256 public rebasePerEpoch;
    uint256 public basicBondPeriod;

    uint256 public stakingIdCounter;

    mapping(address => uint256[]) public userStakings;
    mapping(uint256 => UserBalance) public allStakings;
    mapping(address => mapping(uint256 => UserBalance)) public stakingBalances;

    mapping(uint256 => uint256) public connectId;
    mapping(uint256 => uint256) public lockTOSId;

    modifier nonZero(uint256 tokenId) {
        require(tokenId != 0, "BondDepository: zero uint");
        _;
    }

    modifier nonZeroAddress(address account) {
        require(
            account != address(0),
            "BondDepository:zero address"
        );
        _;
    }

    /// @dev Check if a function is used or not
    modifier ifFree {
        require(free == 1, "LockId is already in use");
        free = 0;
        _;
        free = 1;
    }

}
