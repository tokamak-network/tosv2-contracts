//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

/// @title IRewardPoolEvent
interface IRewardPoolEvent {

    event Staked(address sender, uint256 tokenId);
    event Unstaked(address sender, uint256 tokenId);

}

