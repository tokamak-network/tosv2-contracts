//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract TestLogic  {

    function sayAdd(uint256 a, uint256 b) external pure returns (uint256 answer)
    {
        answer = a+b;
    }

    function sayMul(uint256 a, uint256 b) external pure returns (uint256 answer)
    {
        answer = a*b;
    }
}