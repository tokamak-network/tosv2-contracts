//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;


/// @title IDTOSManager
interface IDTOSManager {


    /// @notice total amount
    /// @return total amount
    function totalSupply() external view returns (uint256);

    /// @notice total amount
    /// @param pool a pool address
    /// @return total amount
    function totalSupply(address pool) external view returns (uint256);

    /// @notice account's balance amount in current snapshot
    /// @param account a account address
    /// @return amount account's balance amount
    function balanceOf(address account) external view returns (uint256);

    /// @notice account's balance amount in current snapshot
    /// @param pool a pool address
    /// @param account a account address
    /// @return amount account's balance amount
    function balanceOf(address pool, address account) external view returns (uint256);


    function balanceOfAt(address account, uint256 snapshotId) external view returns (uint256 amount);

    function totalSupplyAt(uint256 snapshotId) external view returns (uint256 amount);

    function minDtosBaseRate() external view returns (uint256 amount);
    function maxDtosBaseRate() external view returns (uint256 amount);
    function initialDtosBaseRate() external view returns (uint256 amount);
    function initialRebaseIntervalSecond() external view returns (uint256 amount);
    function initialInterestRatePerRebase() external view returns (uint256 amount);

    /// only onlyOwner
    function setReabseInfo(address _pool, uint256 _period, uint256 _interest) external;
    function setDtosBaseRate(address _pool, uint256 _baserate)  external;
    function addPoolAndInitialize(address _pool) external ;
    function addPool(address _pool) external;
    function deletePool(address _pool) external;
    function snapshot() external;


}

