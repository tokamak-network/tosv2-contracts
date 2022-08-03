//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

interface ITreasuryEvent{

    /// @dev This event occurs when a deposit is made to the treasury.
    /// @param token   token address
    /// @param amount  the amount
    /// @param value   the Value
    event Deposit(address indexed token, uint256 amount, uint256 value);
    
    /// @dev This event occurs when mint is performed.
    /// @param caller     caller address
    /// @param recipient  get address
    /// @param amount     the amount
    event Minted(address indexed caller, address indexed recipient, uint256 amount);

    /// @dev This event occurs when permission is change.
    /// @param addr    address
    /// @param status  STATUS
    /// @param result  true or false
    event Permissioned(address addr, uint indexed status, bool result);
}