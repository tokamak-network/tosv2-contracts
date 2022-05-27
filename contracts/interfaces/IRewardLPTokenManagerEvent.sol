//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IRewardLPTokenManagerEvent{

    event MintedRewardToken(uint256 tokenId, address owner, address  pool, uint256 poolTokenId);

    event BurnedRewardToken(uint256 tokenId, address owner, address  pool, uint256 poolTokenId);

}