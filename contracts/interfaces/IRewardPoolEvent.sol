//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

/// @title IRewardPoolEvent
interface IRewardPoolEvent {

    event Staked(address sender, uint256 tokenId, uint256 tosAmount, uint256 liquidity);

    event Unstaked(address sender, uint256 tokenId, uint256 tosAmount, uint256 liquidity, uint256 rewardTokenId);

    event TransferFrom(address from, address to, uint256 tokenId, uint256 amount);
}

