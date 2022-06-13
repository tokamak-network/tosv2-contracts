// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibDTOS.sol";

contract DTOSStorage
{
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
    address public bondDepository;
    address public rewardPoolFactory;

    //
    uint256 public compoundInteresRatePerRebase; // 리베이스당 이자율
    uint256 public rebaseIntervalSecond; // 리베이스 (해당 초마다 리베이스)
    uint256 public lastRebaseTime;

    uint256 public refactorCount;
    uint256 public _factor;

    // rebase
    uint256 public rebaseTotal;
    mapping (address => LibDTOS.Balance) public balances;

    LibDTOS.Balance public _totalSupply;

    // usedAmount
    mapping (address => uint256) public usedAmount;

    // pool
    mapping (address => uint256) public poolIndex;
    mapping (address => uint256) public poolDtosBaseRate;
    address[] public pools;
    uint256 public initialDtosBaseRate;

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
