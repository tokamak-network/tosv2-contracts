// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IUniswapV3Pool.sol";
import "../interfaces/IUniswapV3Factory.sol";
import "../interfaces/INonfungiblePositionManager.sol";
import "../interfaces/IRewardLPTokenManagerAction.sol";

import "../libraries/SArrays.sol";
import "../libraries/LibSnapshot.sol";

contract RewardPoolStorage {
    using SArrays for uint256[];

    // struct Snapshots {
    //     uint256[] ids;
    //     uint256[] values;
    // }

    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public DEFAULT_FACTOR = 10**18;
    mapping(address => LibSnapshot.Snapshots) internal accountBalanceSnapshots;
    LibSnapshot.Snapshots internal totalSupplySnapshots;
    uint256 public currentSnapshotId;

    uint256 public totalLiquidity;

    //----
    IUniswapV3Pool public pool;
    address public token0;
    address public token1;
    address public tosAddress;
    address public rewardPoolManager;

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
    uint256 public dTosBaseRates;

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

}