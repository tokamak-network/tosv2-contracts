// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

interface IBondDepositoryEventV1_2 {

    /// @dev                this event occurs when npm set
    /// @param _account     account address
    event SetNonfungiblePositionManager(address _account);


    /// @dev                        this event occurs when a specific market product is created
    /// @param marketId             market id
    /// @param token                token address of deposit asset. For ETH, the address is address(0). Will be used in Phase 2 and 3
    /// @param market               [capacity of the market, market closing time, return on the deposit in TOS, maximum purchasable bond in TOS]
    /// @param startTime            start time
    /// @param initialMaxPayout     initial max payout
    /// @param capacityUpdatePeriod capacity update period ( 1 real time, 60*60*24 one day, 60*60*24*7 one week )
    /// @param availableBasicBond   available basic bond
    /// @param availableStosBond    available sTOS bond
    /// @param lpTokenId            lpTokenId
    event CreatedLpMarket(
        uint256 marketId,
        address token,
        uint256[4] market,
        uint256 startTime,
        uint256 initialMaxPayout,
        uint256 capacityUpdatePeriod,
        bool availableBasicBond,
        bool availableStosBond,
        uint256 lpTokenId
        );


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
    event LPDeposited(address user, uint256 marketId, uint256 stakeId, uint256 amount, uint256 tosValuation);

    /// @dev                  this event occurs when a user bonds with ETH and earns sTOS
    /// @param user           user account
    /// @param marketId       market id
    /// @param stakeId        stake id
    /// @param amount         amount of deposit in ETH
    /// @param lockWeeks      number of weeks to locking
    /// @param tosValuation   amount of TOS earned by the user
    event LPDepositedWithSTOS(address user, uint256 marketId, uint256 stakeId, uint256 amount, uint256 lockWeeks, uint256 tosValuation);


}