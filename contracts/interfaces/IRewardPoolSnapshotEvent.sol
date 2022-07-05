//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

/// @title IRewardPoolSnapshotEvent
interface IRewardPoolSnapshotEvent {

    event Staked(
        address sender,
        uint256 rNFT,
        uint256 tokenId,
        uint256 tosAmount,
        uint256 dtosAmount,
        uint256 factoredAmount,
        uint256 liquidity
    );

    event Unstaked(
        address sender,
        uint256 tokenId,
        uint256 tosAmount,
        uint256 factoredAmount,
        uint256 rewardTokenId
        );

    event TransferFrom(address from, address to, uint256 tokenId, uint256 amount, uint256 factoredAmount);

    event Rebased(uint256 prevFactor, uint256 newFactor, uint256 lastRebaseTime, uint256 total, uint256 profits);

    event UpdatedBalanceSnapshots(address account, uint256 balances, uint256 factoredAmount);

    event SetFactor(uint256 factor, uint256 id);

}

