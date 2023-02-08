//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

interface IStakingEvent_V1_5 {

    /// @dev            this event occurs when set the default lockup period(second)
    /// @param period   the default lockup period(second) when bonding.
    event SetBasicBondPeriod(
        uint256 period
    );


    /// @dev            this event occurs when bonding without sTOS
    /// @param to       user address
    /// @param amount   TOS amount used for staking
    /// @param ltos     LTOS amount from staking
    /// @param marketId marketId
    /// @param stakeId  stakeId
    /// @param tosPrice amount of TOS per 1 ETH
    /// @param periodWeeks   lock period
    event StakedByBondWithoutStos(
        address to,
        uint256 amount,
        uint256 ltos,
        uint256 marketId,
        uint256 stakeId,
        uint256 tosPrice,
        uint256 periodWeeks
    );

}
