// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

interface IBondDepositoryEvent{

    /// @dev This event occurs when a specific market product is purchased.
    /// @param user  user address
    /// @param marketId  the market id
    /// @param amount the amount
    /// @param payout  Allocated TOS Amount
    /// @param isEth  Whether Ether is available
    /// @param mintAmount  the minting amount of TOS
    event Deposited(address user, uint256 marketId, uint256 amount, uint256 payout, bool isEth, uint256 mintAmount);

    /// @dev This event occurs when a specific market product is created.
    /// @param marketId the market id
    /// @param isEth Whether Ether is available
    /// @param token  available token address
    /// @param pool  Pool address from which you can get the price ratio of tokens and TOS or tokens and Ether
    /// @param fee  Pool's fee
    /// @param market  [팔려고 하는 tos의 목표치, close time,  tos token의 가격, 한번에 구매 가능한 TOS물량]
    event CreatedMarket(uint256 marketId, bool isEth, address token, address pool, uint24 fee, uint256[4] market);

    /// @dev This event occurs when a specific market product is closed.
    /// @param marketId the market id
    event ClosedMarket(uint256 marketId);

    /// @dev Events Emitted when Buying Bonding with ERC20 Token
    /// @param user name
    /// @param marketId the market id
    /// @param stakeId  the stake id
    /// @param token  ERC20 Token address
    /// @param amount  the amount of ERC20 Token
    /// @param tosValuation  the tos evaluate amount of sending
    event ERC20Deposited(address user, uint256 marketId, uint256 stakeId, address token, uint256 amount, uint256 tosValuation);

    /// @dev Event that gives a lockout period and is emitted when purchasing bonding with ERC20 Token
    /// @param user name
    /// @param marketId the market id
    /// @param stakeId  the stake id
    /// @param token  ERC20 Token address
    /// @param amount  the amount of ERC20 Token
    /// @param lockWeeks  the number of weeks to locking
    /// @param tosValuation  the tos evaluate amount of sending
    event ERC20DepositedWithSTOS(address user, uint256 marketId, uint256 stakeId, address token, uint256 amount, uint256 lockWeeks, uint256 tosValuation);

    /// @dev Events Emitted when Buying Bonding with Ether
    /// @param user the user account
    /// @param marketId the market id
    /// @param stakeId  the stake id
    /// @param amount  the amount of Ether
    /// @param tosValuation  the tos evaluate amount of sending
    event ETHDeposited(address user, uint256 marketId, uint256 stakeId, uint256 amount, uint256 tosValuation);

    /// @dev Event that gives a lockout period and is emitted when purchasing bonding with Ether
    /// @param user name
    /// @param marketId the market id
    /// @param stakeId  the stake id
    /// @param amount  the amount of Ether
    /// @param lockWeeks  the number of weeks to locking
    /// @param tosValuation  the tos evaluate amount of sending
    event ETHDepositedWithSTOS(address user, uint256 marketId, uint256 stakeId, uint256 amount, uint256 lockWeeks, uint256 tosValuation);

    /// @dev Event that occurs when the market capacity is increased
    /// @param _marketId the market id
    /// @param _amount increase capacity amount
    event IncreasedCapacity(uint256 _marketId, uint256  _amount);

    /// @dev Event that occurs when the market capacity is decreased
    /// @param _marketId the market id
    /// @param _amount decrease capacity amount
    event DecreasedCapacity(uint256 _marketId, uint256 _amount);

    /// @dev Event that occurs when the closeTime of the market is change
    /// @param _marketId the market id
    /// @param closeTime the close time
    event ChangedCloseTime(uint256 _marketId, uint256 closeTime);

    /// @dev Event that occurs when the market price changes
    /// @param _marketId the market id
    /// @param _amount maxPayout
    event ChangedMaxPayout(uint256 _marketId, uint256 _amount);

    /// @dev Event that gives a lockout period and is emitted when purchasing bonding with Ether
    /// @param _marketId the market id
    /// @param _tosPrice The price of the tos (price shown in uniswap)
    event ChangedPrice(uint256 _marketId, uint256 _tosPrice);

}