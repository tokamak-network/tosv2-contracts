//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;


/// @title IDTOSManager
interface IDTOSManager {


    /// @notice total amount
    /// @return total amount
    function totalSupply() external view returns (uint256);

    /// @notice account's balance amount in current snapshot
    /// @param account a account address
    /// @return amount account's balance amount
    function balanceOf(address account) external view returns (uint256);


}

