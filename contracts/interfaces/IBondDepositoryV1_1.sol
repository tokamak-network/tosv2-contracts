// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./IERC20.sol";
import "../libraries/LibBondDepositoryV1_1.sol";

interface IBondDepositoryV1_1 {

    ///////////////////////////////////////
    /// onlyPolicyOwner
    //////////////////////////////////////

    /**
     * @dev                         creates a new market type
     * @param _token                token address of deposit asset. For ETH, the address is address(0). Will be used in Phase 2 and 3
     * @param _market               [capacity of the market, market closing time, return on the deposit in TOS, maximum purchasable bond in TOS]
     * @param startTime             start time
     * @param initialMaxPayout      initial max payout
     * @param capacityUpdatePeriod  capacity update period ( 1 real time, 60*60*24 one day, 60*60*24*7 one week )
     * @param availableBasicBond    available basic bond
     * @param availableStosBond     available sTOS bond
     * @return id_                  returns ID of new bond market
     */
    function create(
        address _token,
        uint256[4] calldata _market,
        uint256 startTime,
        uint256 initialMaxPayout,
        uint256 capacityUpdatePeriod,
        bool availableBasicBond,
        bool availableStosBond
    ) external returns (uint256 id_);


    /**
     * @dev                   change the market capacity
     * @param _marketId       marketId
     * @param _increaseFlag   if true, increase capacity, otherwise decrease capacity
     * @param _increaseAmount the capacity amount
     */
    function changeCapacity(
        uint256 _marketId,
        bool _increaseFlag,
        uint256 _increaseAmount
    )   external;


    /**
     * @dev                changes the market closeTime
     * @param _marketId    marketId
     * @param closeTime    closeTime
     */
    function changeCloseTime(
        uint256 _marketId,
        uint256 closeTime
    )   external ;

    /**
     * @dev                changes the maxPayout (maximum purchasable bond in TOS)
     * @param _marketId    marketId
     * @param _amount      maxPayout amount
     */
    function changeMaxPayout(
        uint256 _marketId,
        uint256 _amount
    )   external;

    /**
     * @dev                changes the market price
     * @param _marketId    marketId
     * @param _tosPrice    tosPrice
     */
    function changePrice(
        uint256 _marketId,
        uint256 _tosPrice
    )   external ;

    /**
     * @dev        closes the market
     * @param _id  market id
     */
    function close(uint256 _id) external;

    ///////////////////////////////////////
    /// Anyone can use.
    //////////////////////////////////////

    /// @dev             deposit with ether that does not earn sTOS
    /// @param _id       market id
    /// @param _amount   amount of deposit in ETH
    /// @return payout_  returns amount of TOS earned by the user
    function ETHDeposit(
        uint256 _id,
        uint256 _amount
    ) external payable returns (uint256 payout_ );


    /// @dev              deposit with ether that earns sTOS
    /// @param _id        market id
    /// @param _amount    amount of deposit in ETH
    /// @param _lockWeeks number of weeks for lock
    /// @return payout_   returns amount of TOS earned by the user
    function ETHDepositWithSTOS(
        uint256 _id,
        uint256 _amount,
        uint256 _lockWeeks
    ) external payable returns (uint256 payout_);


    ///////////////////////////////////////
    /// VIEW
    //////////////////////////////////////

    /// @dev                 returns information from active markets
    /// @return marketIds    array of total marketIds
    /// @return quoteTokens  array of total market's quoteTokens
    /// @return capacities   array of total market's capacities
    /// @return endSaleTimes array of total market's endSaleTimes
    /// @return pricesTos    array of total market's pricesTos
    /// @return capacityInfos    array of total market's capacity information
    function getBonds() external view
        returns (
            uint256[] memory marketIds,
            address[] memory quoteTokens,
            uint256[] memory capacities,
            uint256[] memory endSaleTimes,
            uint256[] memory pricesTos,
            LibBondDepositoryV1_1.CapacityInfo[] memory capacityInfos
        );

    /// @dev              returns all generated marketIDs
    /// @return memory[]  returns marketList
    function getMarketList() external view returns (uint256[] memory) ;

    /// @dev          returns the number of created markets
    /// @return Total number of markets
    function totalMarketCount() external view returns (uint256) ;

    /// @dev                    returns information about the market
    /// @param _marketId        market id
    /// @return quoteToken      saleToken Address
    /// @return capacity        tokenSaleAmount
    /// @return endSaleTime     market endTime
    /// @return maxPayout       maximum purchasable bond in TOS
    /// @return tosPrice        amount of TOS per 1 ETH
    /// @return capacityInfo    capacity information
    function viewMarket(uint256 _marketId) external view
        returns (
            address quoteToken,
            uint256 capacity,
            uint256 endSaleTime,
            uint256 maxPayout,
            uint256 tosPrice,
            LibBondDepositoryV1_1.CapacityInfo memory capacityInfo
            );

    /// @dev               checks whether a market is opened or not
    /// @param _marketId   market id
    /// @return closedBool true if market is open, false if market is closed
    function isOpened(uint256 _marketId) external view returns (bool closedBool);


    /// @dev               calculate the maximum purchasable amount at one time
    /// @param _marketId   market id
    /// @param _periodWeeks   lockup weeks
    /// @return maximumAmount_ maximum amount
    function maximumPurchasableAmountAtOneTime(
        uint256 _marketId,
        uint256 _periodWeeks
    ) external view returns (uint256 maximumAmount_);


    /// @dev                    calculate the possible capacity when setting lock-up period
    /// @param _marketId        market id
    /// @param _periodWeeks     lockup weeks
    /// @return maximumAmount_  maximum amount
    function maxPayoutPerLockUpPeriod(
        uint256 _marketId,
        uint256 _periodWeeks
    ) external view returns (uint256 maximumAmount_);



    /// @dev                        calculate the possible max capacity
    /// @param _marketId            market id
    /// @return periodicCapacity    the periodic capacity
    /// @return currentCapacity     the current capacity
    function possibleMaxCapacity(
        uint256 _marketId
    ) external view returns (uint256 periodicCapacity, uint256 currentCapacity);


    /// @dev                            calculate the sale periods
    /// @param _marketId                market id
    /// @return numberOfPeriods         number of periods
    /// @return numberOfPeriodsPassed   number of periods passed
    function salePeriod(
        uint256 _marketId
    ) external view returns (uint256 numberOfPeriods, uint256 numberOfPeriodsPassed);

}
