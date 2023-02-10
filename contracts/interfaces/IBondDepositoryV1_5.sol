// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./IERC20.sol";
import "../libraries/LibBondDepositoryV1_5.sol";

interface IBondDepositoryV1_5 {

    ///////////////////////////////////////
    /// onlyPolicyOwner
    //////////////////////////////////////

    /// @dev                         creates a new market type
    /// @param token                token address of deposit asset. For ETH, the address is address(0). Will be used in Phase 2 and 3
    /// @param marketInfos          [capacity, maxPayout, lowerPriceLimit, initialMaxPayout, capacityUpdatePeriod]
    ///                             capacity            capacity of the market
    ///                             maxPayout           maximum purchasable bond in TOS
    ///                             lowerPriceLimit     lowerPriceLimit
    ///                             initialMaxPayout    initial max payout
    ///                             capacityUpdatePeriod capacity update period(seconds)
    /// @param discountRatesAddress discountRates logic address
    /// @param discountRatesId      discountRates id
    /// @param startTime            start time
    /// @param endTime              market closing time
    /// @param pools                pool addresses for calculating the pricing
    /// @return id_                  returns ID of new bond market
    function create(
        address token,
        uint256[5] calldata marketInfos,
        address discountRatesAddress,
        uint256 discountRatesId,
        uint32 startTime,
        uint32 endTime,
        address[] calldata pools
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
     * @dev                     changes the oralce library address
     * @param _oralceLibrary    oralce library address
     */
    function changeOracleLibrary(
        address _oralceLibrary
    )   external ;

    /**
     * @dev                changes the market pools
     * @param _marketId    marketId
     * @param _pools       pool addresses
     */
    function changePools(
        uint256 _marketId,
        address[] calldata _pools
    )   external ;

    /**
     * @dev        closes the market
     * @param _id  market id
     */
    function close(uint256 _id) external;

     /**
     * @dev             change remaining TOS tolerance
     * @param _amount   tolerance
     */
    function changeRemainingTosTolerance(uint256 _amount) external;

    ///////////////////////////////////////
    /// Anyone can use.
    //////////////////////////////////////

    /// @dev                        deposit with ether that does not earn sTOS
    /// @param _id                  market id
    /// @param _amount              amount of deposit in ETH
    /// @param _maximumPayablePrice the maximum price (per TOS) the user is willing to pay for bonding
    /// @return payout_             returns amount of TOS earned by the user
    function ETHDeposit(
        uint256 _id,
        uint256 _amount,
        uint256 _maximumPayablePrice
    ) external payable returns (uint256 payout_ );


    /// @dev              deposit with ether that earns sTOS
    /// @param _id        market id
    /// @param _amount    amount of deposit in ETH
    /// @param _maximumPayablePrice the maximum price (per TOS) the user is willing to pay for bonding
    /// @param _lockWeeks number of weeks for lock
    /// @return payout_   returns amount of TOS earned by the user
    function ETHDepositWithSTOS(
        uint256 _id,
        uint256 _amount,
        uint256 _maximumPayablePrice,
        uint8 _lockWeeks
    ) external payable returns (uint256 payout_);


    ///////////////////////////////////////
    /// VIEW
    //////////////////////////////////////

    /// @dev                        returns information from active markets
    /// @return marketIds           array of total marketIds
    /// @return quoteTokens         array of total market's quoteTokens
    /// @return capacities          array of total market's capacities
    /// @return endSaleTimes        array of total market's endSaleTimes
    /// @return pricesTos           array of total market's pricesTos
    /// @return discountRateInfo    array of total market's discountRateInfos
    /// @return marketInfo          array of total market's information
    function getBonds() external view
        returns (
            uint256[] memory marketIds,
            address[] memory quoteTokens,
            uint256[] memory capacities,
            uint256[] memory endSaleTimes,
            uint256[] memory pricesTos,
            LibBondDepositoryV1_5.DiscountRateInfo[] memory discountRateInfo,
            LibBondDepositoryV1_5.MarketInfo[] memory marketInfo
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
    /// @return discountInfo    discount information
    /// @return marketInfo      market information
    function viewMarket(uint256 _marketId) external view
        returns (
            address quoteToken,
            uint256 capacity,
            uint256 endSaleTime,
            uint256 maxPayout,
            uint256 tosPrice,
            LibBondDepositoryV1_5.DiscountRateInfo memory discountInfo,
            LibBondDepositoryV1_5.MarketInfo memory marketInfo
            );

    /// @dev               checks whether a market is opened or not
    /// @param _marketId   market id
    /// @return closedBool true if market is open, false if market is closed
    function isOpened(uint256 _marketId) external view returns (bool closedBool);

    /// @dev                    get bonding price
    /// @param _marketId        market id
    /// @param _lockWeeks       lock weeks
    /// @param basePrice       base price
    /// @return bondingPrice    bonding price
    function getBondingPrice(uint256 _marketId, uint8 _lockWeeks, uint256 basePrice)
        external view
        returns (uint256 bondingPrice);


    /// @dev                    get base price
    /// @param _marketId        market id
    /// @return basePrice       base price
    /// @return lowerPriceLimit lower price limit
    /// @return uniswapPrice    uniswap price
    function getBasePrice(uint256 _marketId)
        external view
        returns (uint256 basePrice, uint256 lowerPriceLimit, uint256 uniswapPrice);


    /// @dev                    get uniswap price
    /// @param pools            pool addresses
    /// @return poolCount       pool count
    /// @return uniswapMaxPrice uniswap max price
    function getUniswapPrice(address[] memory pools)
        external view
        returns (uint256 poolCount, uint256 uniswapMaxPrice);


    /// @dev                        calculate the possible max capacity
    /// @param _marketId            market id
    /// @return periodicCapacity    the periodic capacity
    /// @return currentCapacity     the current capacity
    function possibleMaxCapacity(
        uint256 _marketId
    ) external view returns (uint256 periodicCapacity, uint256 currentCapacity);


    /// @dev                         calculate the sale periods
    /// @param _marketId             market id
    /// @return totalSaleDays        the total sale days
    /// @return curWhatDays          what days
    function saleDays(
        uint256 _marketId
    ) external view returns (uint256 totalSaleDays, uint256 curWhatDays);


}