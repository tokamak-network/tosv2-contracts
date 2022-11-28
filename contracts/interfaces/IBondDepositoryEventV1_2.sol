// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

interface IBondDepositoryEventV1_2 {


    /// @dev               this event occurs when a specific market product is purchased
    /// @param user        user address
    /// @param marketId    market id
    /// @param amount      bond amount in ETH
    /// @param payout      amount of TOS earned by the user from bonding
    /// @param isEth       whether ether was used for bonding
    /// @param mintAmount  number of minted TOS from this deposit
    event Deposited(address user, uint256 marketId, uint256 amount, uint256 payout, bool isEth, uint256 mintAmount);


    /// @dev                  this event occurs when a user bonds with ETH
    /// @param user           user account
    /// @param marketId       market id
    /// @param stakeId        stake id
    /// @param amount         amount of deposit in ETH
    /// @param tosValuation   amount of TOS earned by the user
    event ERC20Deposited(address user, uint256 marketId, uint256 stakeId, uint256 amount, uint256 tosValuation);

    /// @dev                  this event occurs when a user bonds with ETH and earns sTOS
    /// @param user           user account
    /// @param marketId       market id
    /// @param stakeId        stake id
    /// @param amount         amount of deposit in ETH
    /// @param lockWeeks      number of weeks to locking
    /// @param tosValuation   amount of TOS earned by the user
    event ERC20DepositedWithSTOS(address user, uint256 marketId, uint256 stakeId, uint256 amount, uint256 lockWeeks, uint256 tosValuation);


}