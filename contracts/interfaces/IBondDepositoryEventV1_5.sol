// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

interface IBondDepositoryEventV1_5 {


    /// @dev                        this event occurs when set the calculator address
    /// @param calculatorAddress    calculator address
    event SetCalculator(address calculatorAddress);

    /// @dev               this event occurs when a specific market product is purchased
    /// @param user        user address
    /// @param marketId    market id
    /// @param amount      bond amount in ETH
    /// @param payout      amount of TOS earned by the user from bonding
    /// @param isEth       whether ether was used for bonding
    /// @param mintAmount  number of minted TOS from this deposit
    event Deposited(address user, uint256 marketId, uint256 amount, uint256 payout, bool isEth, uint256 mintAmount);


    /// @dev                        this event occurs when a specific market product is created
    /// @param marketId             market id
    /// @param token                token address of deposit asset. For ETH, the address is address(0). Will be used in Phase 2 and 3
    /// @param capacity             capacity of the market
    /// @param lowerPriceLimit     lowerPriceLimit
    /// @param startTime            start time
    /// @param endTime              market closing time
    event CreatedMarket(
        uint256 marketId,
        address token,
        uint256 capacity,
        uint256 lowerPriceLimit,
        int16 startTime,
        int16 endTime
        );


    /// @dev            this event occurs when a specific market product is closed
    /// @param marketId market id
    event ClosedMarket(uint256 marketId);

    /// @dev            this event occurs when change remaining TOS tolerance
    /// @param amount   amount
    event ChangedRemainingTosTolerance(uint256 amount);

    /// @dev                  this event occurs when a user bonds with ETH
    /// @param user           user account
    /// @param marketId       market id
    /// @param stakeId        stake id
    /// @param amount         amount of deposit in ETH
    /// @param lockWeeks      number of weeks to locking
    /// @param tosValuation   amount of TOS earned by the user
    event ETHDepositedWithoutStos(address user, uint256 marketId, uint256 stakeId, uint256 amount, uint8 lockWeeks, uint256 tosValuation);

    /// @dev                  this event occurs when a user bonds with ETH and earns sTOS
    /// @param user           user account
    /// @param marketId       market id
    /// @param stakeId        stake id
    /// @param amount         amount of deposit in ETH
    /// @param lockWeeks      number of weeks to locking
    /// @param tosValuation   amount of TOS earned by the user
    event ETHDepositedWithSTOS(address user, uint256 marketId, uint256 stakeId, uint256 amount, uint8 lockWeeks, uint256 tosValuation);

    /// @dev                   this event occurs when the market capacity is changed
    /// @param _marketId       market id
    /// @param _increaseFlag   if true, increase capacity, otherwise decrease capacity
    /// @param _increaseAmount the capacity amount
    event ChangedCapacity(uint256 _marketId, bool _increaseFlag, uint256  _increaseAmount);

    /// @dev             this event occurs when the closeTime is updated
    /// @param _marketId market id
    /// @param closeTime new close time
    event ChangedCloseTime(uint256 _marketId, uint256 closeTime);

    /// @dev             this event occurs when the maxPayout is updated
    /// @param _marketId market id
    /// @param _amount   maxPayout
    event ChangedMaxPayout(uint256 _marketId, uint256 _amount);

    /// @dev             this event occurs when the maxPayout is updated
    /// @param _marketId market id
    /// @param _tosPrice amount of TOS per 1 ETH
    event ChangedPrice(uint256 _marketId, uint256 _tosPrice);

    /// @dev             this event occurs when the maxPayout is updated
    /// @param _marketId market id
    /// @param _pools    pool addresses of uniswap for determaining a price
    event ChangedPools(uint256 _marketId, address[] _pools);

}