// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DTOSManagerStorage
{
    struct Snapshot {
        address poolAddress;
        uint256 snapshotId;
    }

    string public name;
    string public symbol;
    uint8 public decimals = 18;

    address public rewardPoolFactory;
    address public tosAddress;
    address public policyAddress;
    address public rewardLPTokenManager;


    // pool
    mapping (address => uint256) public poolIndex;
    // mapping (address => uint256) public poolDtosBaseRate;
    address[] public pools;

    // pool snapshot
    uint256 curSnapshotId;
    mapping (uint256 => Snapshot[]) public poolSnapshots;

    modifier nonZero(uint256 tokenId) {
        require(tokenId != 0, "DTOS:zero address");
        _;
    }

    modifier nonZeroAddress(address account) {
        require(
            account != address(0),
            "DTOS:zero address"
        );
        _;
    }

    modifier onlyRewardPool() {
        require(
            poolIndex[msg.sender] != 0,
            "DTOS: sender is not a managed RewardPool"
        );
        _;
    }

    modifier onlyRewardLPTokenManager() {
        require(
            rewardLPTokenManager == msg.sender,
            "DTOS: sender is not rewardLPTokenManager"
        );
        _;
    }
}
