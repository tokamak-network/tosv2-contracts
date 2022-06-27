//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../libraries/LibRewardLPToken.sol";

/// @title IRewardLPTokenManagerAction
interface IRewardLPTokenManagerAction {

    function mint(
        address to,
        address rewardPool,
        uint256 poolTokenId,
        uint256 tosAmount,
        uint256 factoredAmount
    ) external returns (uint256);

    function burn(
        uint256 tokenId
    ) external;

    function use(
        uint256 tokenId,
        uint256 amount
    ) external;


    function multiUse(
        uint256[] memory tokenIds,
        uint256[] memory amounts
    ) external ;

    function useAll(
        uint256 tokenId
    ) external;

    function multiUseAll(
        uint256[] memory tokenIds
    ) external ;

    function deposit(uint256 tokenId) external view returns (LibRewardLPToken.RewardTokenInfo memory);

    function tokensOfOwner(address account) external view returns (uint256[] memory);

    function usableAmounts(uint256[] memory tokenIds) external view  returns (uint256[] memory);

    function usableAmount(uint256 tokenId) external view returns (uint256) ;

}

