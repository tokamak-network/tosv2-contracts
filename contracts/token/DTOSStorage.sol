// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibDTOS.sol";

contract DTOSStorage
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

    uint256 public refactorCount;
    uint256 public _factor;

    // rebase
    uint256 public rebaseTotal;
    // mapping(uint256 => LibDTOS.Rebase) public rebases;

    mapping (address => LibDTOS.Balance) public balances;
    mapping (address => LibDTOS.Balance) public nonBalances;

    LibDTOS.Balance public _totalSupply;

    // usedAmount
    mapping (address => uint256) public usedAmount;

    //


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
