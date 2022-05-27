//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;


/// @title IDTOS
interface IDTOS {

    /// only MINTER_ROLE : RewardLPTokenManager

    /// @notice mint
    /// @param to a to address
    /// @param amount amount
    function mint(address to, uint256 amount) external ;

    /// @notice burnFrom
    /// @param account account
    /// @param amount amount
    function burnFrom(address account, uint256 amount) external ;


    // function use(address account, uint256 amount) external ;

    /// anybody

}

