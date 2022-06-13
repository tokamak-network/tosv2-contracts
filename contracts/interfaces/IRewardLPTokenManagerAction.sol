//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../libraries/LibRewardLPToken.sol";

/// @title IRewardLPTokenManagerAction
interface IRewardLPTokenManagerAction {

    function mint(
        address to,
        address pool,
        uint256 poolTokenId,
        uint256 tosAmount,
        uint128 liquidity,
        uint256 factoredAmount
    ) external returns (uint256);

    function burn(
        uint256 tokenId
    ) external;

    function use(
        address account,
        uint256 amount
    ) external;

    function deposit(uint256 tokenId) external view returns (LibRewardLPToken.RewardTokenInfo memory);

    function tokensOfOwner(address account) external view returns (uint256[] memory);
}

