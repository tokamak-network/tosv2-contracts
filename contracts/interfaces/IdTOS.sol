//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;


/// @title IdTOS
interface IdTOS {


    /// @notice total amount
    /// @return total amount
    function totalSupply() external view returns (uint256);

    /// @notice account's balance amount in current snapshot
    /// @param account a account address
    /// @return amount account's balance amount
    function balanceOf(address account) external view returns (uint256);

    function mint(
        address to,
        uint256 amount
    ) external returns (bool) ;

    function burn(
        address to,
        uint256 amount
    ) external;

    function getBalance(address account)
        external
        view
        returns (
            uint256 balance,
            uint256 refactoredCount,
            uint256 remain
        );


}

