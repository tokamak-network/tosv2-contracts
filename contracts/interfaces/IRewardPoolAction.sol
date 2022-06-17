//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

/// @title IRewardPoolAction
interface IRewardPoolAction {

    /// can anybody

    /// @notice stake
    /// @param tokenId tokenId
    function stake(uint256 tokenId) external ;


    /// @notice unstake
    /// @param tokenId tokenId
    function unstake(uint256 tokenId) external ;

    /// @notice transferFrom
    /// @param from  from address
    /// @param to  to address
    /// @param tokenId tokenId
    /// @param amount amount
    function transferFrom(address from, address to, uint256 tokenId, uint256 amount) external ;


    function snapshot() external returns (uint256);
}

