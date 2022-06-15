//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

/// @title IRewardPoolSnapshotAction
interface IRewardPoolSnapshotAction {

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
    /// @param factoredAmount factoredAmount
    function transferFrom(address from, address to, uint256 tokenId, uint256 amount, uint256 factoredAmount) external ;

    function snapshot() external returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function totalSupply() external view returns (uint256);

    function depositAmount(address account) external view returns (uint256);

    function totalDepositAmount() external view returns (uint256);

    function balanceOfAt(address account, uint256 snapshotId) external view  returns (uint256);

    function totalSupplyAt(uint256 snapshotId) external view returns (uint256);

    function depositAmountOfAt(address account, uint256 snapshotId) external view   returns (uint256);

    function totalDepositAmountOfAt(uint256 snapshotId) external view returns (uint256);

    function getCurrentSnapshotId() external view  returns (uint256);

    function getFactor() external view returns (uint256 f);
}

