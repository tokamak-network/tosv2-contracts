//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

interface IStakingEvent{

    event StakedByBond(address to, uint256 amount, uint256 ltos, uint256 marketId, uint256 stakeId, uint256 tosPrice);

    event StakedGetStosByBond(
        address to,
        uint256 amount,
        uint256 ltos,
        uint256 periodWeeks,
        uint256 marketId,
        uint256 stakeId,
        uint256 stosId,
        uint256 tosPrice
    );

    event Staked(address to, uint256 amount, uint256 stakeId);

    event StakedGetStos(
        address to,
        uint256 amount,
        uint256 periodWeeks,
        uint256 stakeId,
        uint256 stosId
    );

    event IncreasedAmountForSimpleStake(address to, uint256 amount, uint256 stakeId);

    event ResetStakedGetStosAfterLock(
        address to,
        uint256 addAmount,
        uint256 claimAmount,
        uint256 periodWeeks,
        uint256 stakeId,
        uint256 stosId
    );

    event IncreasedBeforeEndOrNonEnd(
        address staker,
        uint256 amount,
        uint256 unlockWeeks,
        uint256 stakeId,
        uint256 stosId
    );

    event ClaimdForNonLock(address staker, uint256 claimAmount, uint256 stakeId);
    event Unstaked(address staker, uint256 amount, uint256 stakeId);

    event Rebased(uint256 oldIndex, uint256 newIndex, uint256 totalLTOS);
}