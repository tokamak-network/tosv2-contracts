// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibDTOSSnapshot.sol";

contract DTOSSnapshotStorage
{
    // bool public pauseProxy;

    // mapping(uint256 => address) public proxyImplementation;
    // mapping(address => bool) public aliveImplementation;
    // mapping(bytes4 => address) public selectorImplementation;


    string public name;
    string public symbol;
    //uint8 public decimals = 27;
    uint8 public decimals = 18;

    uint256 public DEFAULT_FACTOR = 10**18;

    //uint256 public REFACTOR_BOUNDARY = 10**28;
    uint256 public REFACTOR_BOUNDARY = 10**19;

    uint256 public REFACTOR_DIVIDER = 2;

    //
    address public rewardLPTokenManager;

    //
    uint256 public compoundInteresRatePerRebase; // 리베이스당 이자율
    uint256 public rebaseIntervalSecond; // 리베이스 (해당 초마다 리베이스)
    uint256 public lastRebaseTime;

    // rebase
    uint256 public rebaseTotal;

    uint256 public snashotTotal;
    uint256 public currentSnapshotId;

    // account - balance
    mapping(address =>  LibDTOSSnapshot.BalanceSnapshots) internal accountBalanceSnapshots;
    // account - snapahot - RefactoredCounts
    mapping(address => mapping(uint256 => uint256)) internal accountRefactoredCounts;
    // account - snapahot - Remains
    mapping(address => mapping(uint256 =>  uint256)) internal accountRemains;

    //
    // totalSupply
    LibDTOSSnapshot.BalanceSnapshots internal totalSupplySnapshots;
    // snapahot - RefactoredCounts
    mapping(uint256 => uint256) internal totalSupplyRefactoredCounts;
    //snapahot - Remains
    mapping(uint256 => uint256) internal totalSupplyRemains;

    //factor
    LibDTOSSnapshot.FactorSnapshots internal factorSnapshots;

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


    // event FactorSet(uint256 previous, uint256 current, uint256 shiftCount);
    // event Transfer(address from, address to, uint256 amount);

}
