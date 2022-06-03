// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibDTOS.sol";

contract DTOSStorage
{
    bool public pauseProxy;

    mapping(uint256 => address) public proxyImplementation;
    mapping(address => bool) public aliveImplementation;
    mapping(bytes4 => address) public selectorImplementation;


    string public name;
    string public symbol;
    uint8 public decimals = 27;
    uint256 public REFACTOR_BOUNDARY = 10**28;
    uint256 public REFACTOR_DIVIDER = 2;

    address public rewardLPTokenManager;

    uint256 public snashotTotal;
    uint256 public currentSnapshotId;

    // account - balance
    mapping(address =>  LibDTOS.BalanceSnapshots) internal accountBalanceSnapshots;
    // account - snapahot - RefactoredCounts
    mapping(address => mapping(uint256 => uint256)) internal accountRefactoredCounts;
    // account - snapahot - Remains
    mapping(address => mapping(uint256 =>  uint256)) internal accountRemains;

    //
    // totalSupply
    LibDTOS.BalanceSnapshots internal totalSupplySnapshots;
    // snapahot - RefactoredCounts
    mapping(uint256 => uint256) internal totalSupplyRefactoredCounts;
    //snapahot - Remains
    mapping(uint256 => uint256) internal totalSupplyRemains;

    //factor
    LibDTOS.FactorSnapshots internal factorSnapshots;

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


    event FactorSet(uint256 previous, uint256 current, uint256 shiftCount);
    event Transfer(address from, address to, uint256 amount);

}
