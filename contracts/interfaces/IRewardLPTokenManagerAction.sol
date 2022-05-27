//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

/// @title IRewardLPTokenManagerAction
interface IRewardLPTokenManagerAction {

    function mint(
        address to,
        address pool,
        uint256 poolTokenId,
        uint256 tosAmount,
        uint128 liquidity
    ) external;

    function burn(
        uint256 tokenId
    ) external;

}

