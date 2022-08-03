//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

interface IStakingEvent{

    /// @dev This event occurs when a stking by Bond without sTOS.
    /// @param to  user address
    /// @param amount  tosAmount
    /// @param ltos get LTOS
    /// @param marketId  marketId
    /// @param stakeId  stakeId
    /// @param tokenPrice  TOKEN/TOS
    /// @param tosPrice    TOS/TOKEN
    event StakedByBond(
        address to, 
        uint256 amount, 
        uint256 ltos, 
        uint256 marketId, 
        uint256 stakeId, 
        uint256 tokenPrice, 
        uint256 tosPrice
    );

    /// @dev This event occurs when a stking by Bond with sTOS.
    /// @param to  user address
    /// @param amount  tosAmount
    /// @param ltos get LTOS
    /// @param periodWeeks lock period
    /// @param marketId  marketId
    /// @param stakeId  stakeId
    /// @param stosId   sTOSId
    /// @param tokenPrice  TOKEN/TOS
    /// @param tosPrice    TOS/TOKEN
    event StakedGetStosByBond(
        address to,
        uint256 amount,
        uint256 ltos,
        uint256 periodWeeks,
        uint256 marketId,
        uint256 stakeId,
        uint256 stosId,
        uint256 tokenPrice,
        uint256 tosPrice
    );

    /// @dev This event occurs when a stking without sTOS
    /// @param to  user address
    /// @param amount  tosAmount
    /// @param stakeId stakeId
    event Staked(address to, uint256 amount, uint256 stakeId);

    /// @dev This event occurs when a stking with sTOS
    /// @param to  user address
    /// @param amount  tosAmount
    /// @param periodWeeks lock period
    /// @param stakeId  stakeId
    /// @param stosId   sTOSId
    event StakedGetStos(
        address to,
        uint256 amount,
        uint256 periodWeeks,
        uint256 stakeId,
        uint256 stosId
    );

    /// @dev This event occurs when a increaseAmount
    /// @param to  user address
    /// @param amount  tosAmount
    /// @param stakeId  stakeId
    event IncreasedAmountForSimpleStake(address to, uint256 amount, uint256 stakeId);


    /// @dev This event occurs when a stking and claim after lock
    /// @param to  user address
    /// @param addAmount  tosAmount
    /// @param claimAmount  claimAmount
    /// @param periodWeeks lock period
    /// @param stakeId  stakeId
    /// @param stosId   sTOSId
    event ResetStakedGetStosAfterLock(
        address to,
        uint256 addAmount,
        uint256 claimAmount,
        uint256 periodWeeks,
        uint256 stakeId,
        uint256 stosId
    );

    /// @dev This event occurs increase the amount or lock period before lock
    /// @param staker  user address
    /// @param amount  tosAmount
    /// @param unlockWeeks  lock period
    /// @param stakeId  stakeId
    /// @param stosId   sTOSId
    event IncreasedBeforeEndOrNonEnd(
        address staker,
        uint256 amount,
        uint256 unlockWeeks,
        uint256 stakeId,
        uint256 stosId
    );

    /// @dev This event occurs claim for non lock stakeId
    /// @param staker  user address
    /// @param claimAmount  claimAmount
    /// @param stakeId  stakeId
    event ClaimdForNonLock(address staker, uint256 claimAmount, uint256 stakeId);

    /// @dev This event occurs when unstaking stakeId that has passed the lockup period.
    /// @param staker  user address
    /// @param amount  claimAmount(tos)
    /// @param stakeId  stakeId
    event Unstaked(address staker, uint256 amount, uint256 stakeId);

    /// @dev This event occurs when the index is rebase.
    /// @param oldIndex   before index
    /// @param newIndex   newly calculated index
    /// @param totalLTOS  Total amount of LTOS in the staking contract
    event Rebased(uint256 oldIndex, uint256 newIndex, uint256 totalLTOS);
}