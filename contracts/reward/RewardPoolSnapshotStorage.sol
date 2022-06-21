// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IUniswapV3Pool.sol";
import "../interfaces/IUniswapV3Factory.sol";
import "../interfaces/INonfungiblePositionManager.sol";
import "../interfaces/IRewardLPTokenManagerAction.sol";

import "../libraries/SArrays.sol";
import "../libraries/LibFactorSnapshot.sol";

contract RewardPoolSnapshotStorage {
    using SArrays for uint256[];

    string public name;
    string public symbol;
    uint8 public decimals = 18;

    uint256 public currentSnapshotId;

    // account - balance
    mapping(address =>  LibFactorSnapshot.Snapshots) internal accountBalanceSnapshots;

    // totalSupply
    LibFactorSnapshot.Snapshots internal totalSupplySnapshots;

    //factor
    LibFactorSnapshot.FactorSnapshots internal factorSnapshots;

    //----
    uint256 public totalLiquidity;

    //----
    IUniswapV3Pool public pool;
    address public token0;
    address public token1;
    address public tosAddress;
    address public dtosManagerAddress;
    address public dtosPolicy;


    IUniswapV3Factory public uniswapV3Factory;
    INonfungiblePositionManager public nonfungiblePositionManager;
    IRewardLPTokenManagerAction public rewardLPTokenManager;

    // user -> tokenIds
    mapping(address => uint256[]) public userTokens;
    mapping(address => mapping(uint256 => uint256)) public userTokenIndexs;

    // [tokenIds]
    uint256[] public stakedTokensInPool;
    mapping(uint256 => uint256) public stakedTokensInPoolIndexs;

    // tokenIds - rewardLP
    mapping(uint256 => uint256) public rewardLPs;

    uint256 public dTosBaseRate;
    uint256 public interestRatePerRebase; // 리베이스당 이자율
    uint256 public rebaseIntervalSecond; // 리베이스 (해당 초마다 리베이스)
    uint256 public lastRebaseTime;

    uint256 public DEFAULT_FACTOR = 10**18;
    bool public execPauseFlag;

    event Snapshot(uint256 id);

    modifier nonZero(uint256 value) {
        require(value > 0, "zero value");
        _;
    }

    modifier nonZeroAddress(address account) {
        require(
            account != address(0),
            "zero address"
        );
        _;
    }

    modifier onlyDTOSManager() {
        require(
            msg.sender == dtosManagerAddress,
            "caller is not dtosManager"
        );
        _;
    }

    modifier onlyPolicy() {
        require(
            msg.sender == dtosPolicy,
            "caller is not dtosPolicy"
        );
        _;
    }

    modifier onlyNoExecPause() {
        require(!execPauseFlag, "exec pause");
        _;
    }
}