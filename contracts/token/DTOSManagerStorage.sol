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

    address public rewardLPTokenManager;
    address public bondDepository;
    address public rewardPoolFactory;
    address public tosAddress;

    // pool
    mapping (address => uint256) public poolIndex;
    mapping (address => uint256) public poolDtosBaseRate;
    address[] public pools;

    // pool snapshot
    uint256 curSnapshotId;
    mapping (uint256 => Snapshot[]) public poolSnapshots;

    uint256 public initialDtosBaseRate;
    uint256 public initialRebasePeriod;

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

}
