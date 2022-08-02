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

    /// @dev This event is raised when withdrawing ERC20.
    /// @param to        address
    /// @param token     tokenAddress
    /// @param amount    the amount
    /// @param tosValue  value
    event WithdrawalERC20 (
        address to,
        address token,
        uint256 amount,
        uint256 tosValue
    );

    /// @dev This event is raised when withdrawing ETH.
    /// @param to        address
    /// @param amount    the amount
    /// @param tosValue  value
    event WithdrawalEther (
        address to,
        uint256 amount,
        uint256 tosValue
    );


    /// @dev This event occurs when TOS is burned.
    /// @param amount the amount
    event BurnedTOS (
        uint256 amount
    );

}