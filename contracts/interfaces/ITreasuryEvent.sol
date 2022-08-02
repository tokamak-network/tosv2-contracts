//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

interface ITreasuryEvent{

    event Deposit(address indexed token, uint256 amount, uint256 value);

    event Minted(address indexed caller, address indexed recipient, uint256 amount);
    event Permissioned(address addr, uint indexed status, bool result);

    event WithdrawalERC20 (
        address to,
        address token,
        uint256 amount,
        uint256 tosValue
    );

    event WithdrawalEther (
        address to,
        uint256 amount,
        uint256 tosValue
    );

    event BurnedTOS (
        uint256 amount
    );

}