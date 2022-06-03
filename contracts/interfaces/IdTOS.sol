//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;


/// @title IDTOS
interface IDTOS {

    /*
    /// @notice This event is emitted when taking a snapshot. You can check the snashotAggregatorId.
    /// @param snashotAggregatorId snashotAggregatorId, By using snashotAggregatorId, you can query the balance and total amount for a specific snashotAggregatorId.
    event Snapshot(uint256 snashotAggregatorId);
   */


    /// @notice You can calculate the balance with the saved snapshot information.
    /// @param v  balances of AutoRefactorCoinageI(coinage).balances(account);
    /// @param refactoredCount  refactoredCounts of AutoRefactorCoinageI(coinage).balances(account);
    /// @param _factor  _factor of AutoRefactorCoinage(coinage)
    /// @param refactorCount  refactorCount of AutoRefactorCoinage(coinage)
    /// @return balance  balance
    function applyFactor(uint256 v, uint256 refactoredCount, uint256 _factor, uint256 refactorCount) external view returns (uint256);

    /// @notice Snapshot
    /// @return snashotId
    function snapshot() external returns (uint256);


    /// @notice Returns factor stored in the current snapshot.
    /// @return snapshotted Whether a snapshot was taken
    /// @return snapShotFactor factor in Snapshot
    /// @return snapShotRefactorCount RefactorCount in Snapshot
    function currentFactorSnapshots() external view
        returns (
                bool snapshotted,
                uint256 snapShotFactor,
                uint256 snapShotRefactorCount
        );

    /// @notice Current snapshotId
    /// @return  SnapshotId
    function getCurrentSnapshotId() external view returns (uint256) ;

    /// @notice total amount
    /// @return total amount
    function totalSupply() external view returns (uint256);

    /// @notice account's balance amount in current snapshot
    /// @param account a account address
    /// @return amount account's balance amount
    function balanceOf(address account) external view returns (uint256);

    /// @notice account's balance amount in snashotId
    /// @param account a account address
    /// @param snashotId a snashotId
    /// @return amount account's balance  amount
    function balanceOfAt(address account, uint256 snashotId) external view returns (uint256);

    /// @notice total amount in snashotId
    /// @param snashotId  snashotId
    /// @return totalAmount total  amount
    function totalSupplyAt(uint256 snashotId) external view returns (uint256 totalAmount);

    /// @notice last SnapShotIndex
    /// @return SnapShotIndex  SnapShotIndex
    function lastSnapShotIndex() external view returns (uint256);

    /// @notice snapshot's information by snapshotIndex
    /// @param id  id
    /// @param account a account address
    /// @return ids  snapshot's id
    /// @return balances  snapshot's balance
    /// @return refactoredCounts  snapshot's refactoredCount
    /// @return remains  snapshot's remain
    function getAccountBalanceSnapsByIds(uint256 id, address account) external view
        returns (uint256, uint256, uint256, uint256);

    /// @notice snapshot's information by snapshotId
    /// @param snapshotId  snapshotId
    /// @param account a account address
    /// @return ids  snapshot's id
    /// @return balances  snapshot's balance
    /// @return refactoredCounts  snapshot's refactoredCount
    /// @return remains  snapshot's remain
    function getAccountBalanceSnapsBySnapshotId(uint256 snapshotId, address account) external view
        returns (uint256, uint256, uint256, uint256);

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

    function getFactor() external view returns (uint256 rb);
}

