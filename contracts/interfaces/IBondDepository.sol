// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./IERC20.sol";

interface IBondDepository {

    ///////////////////////////////////////
    /// onlyPolicyOwner
    //////////////////////////////////////

    /**
     * @dev                creates a new market type
     * @param _token       토큰 주소
     * @param _market      [팔려고 하는 tos의 목표치, 판매 끝나는 시간, tos token의 가격, 한번에 구매 가능한 TOS물량]
     * @return id_         ID of new bond market
     */
    function create(
        address _token,
        uint256[4] calldata _market
    ) external returns (uint256 id_);

    /**
     * @dev                increase the market Capacity
     * @param _marketId    marketId
     * @param amount       increase amount
     */
    function increaseCapacity(
        uint256 _marketId,
        uint256 amount
    )   external;

    /**
     * @dev                decrease the market Capacity
     * @param _marketId    marketId
     * @param amount       decrease amount
     */
    function decreaseCapacity(
        uint256 _marketId,
        uint256 amount
    ) external;

    /**
     * @dev                change the market closeTime
     * @param _marketId    marketId
     * @param closeTime    closeTime
     */
    function changeCloseTime(
        uint256 _marketId,
        uint256 closeTime
    )   external ;

    /**
     * @dev                change the market maxpayout(Maximum amount that can be purchased at one time)
     * @param _marketId    marketId
     * @param _amount      maxPayout Amount
     */
    function changeMaxPayout(
        uint256 _marketId,
        uint256 _amount
    )   external;

    /**
     * @dev                change the market price
     * @param _marketId    marketId
     * @param _tosPrice  tosPrice
     */
    function changePrice(
        uint256 _marketId,
        uint256 _tosPrice
    )   external ;

    /**
     * @dev        close the market
     * @param _id  ID of market to close
     */
    function close(uint256 _id) external;

    ///////////////////////////////////////
    /// Anyone can use.
    //////////////////////////////////////

    /// @dev deposit with ether
    /// @param _id  the market id
    /// @param _amount  the amount of deposit
    /// @return payout_  the amount of staking
    function ETHDeposit(
        uint256 _id,
        uint256 _amount
    ) external payable returns (uint256 payout_ );


    /// @dev deposit with erc20 token
    /// @param _id  the market id
    /// @param _amount  the amount of deposit
    /// @param _lockWeeks  the number of weeks for lock
    /// @return payout_  the amount of staking
    function ETHDepositWithSTOS(
        uint256 _id,
        uint256 _amount,
        uint256 _lockWeeks
    ) external payable returns (uint256 payout_);


    ///////////////////////////////////////
    /// VIEW
    //////////////////////////////////////

    /// @dev How much tokens are valued as TOS
    /// @param _id  the market id
    /// @param _amount the amount of asset
    /// @return payout  the amount evaluated as TOS
    function calculateTosAmountForAsset(
        uint256 _id,
        uint256 _amount
    )
        external
        view
        returns (uint256 payout);


    /// @dev purchasable Asset amount At One Time
    /// @param _id  the market id
    /// @return maxpayout_  the asset amount
    function purchasableAseetAmountAtOneTime(uint256 _id) external view returns (uint256 maxpayout_);

    /// @dev Return information from all markets
    /// @return marketIds Array of total MarketIDs
    /// @return quoteTokens Array of total market's quoteTokens
    /// @return capacities Array of total market's capacities
    /// @return endSaleTimes Array of total market's endSaleTimes
    /// @return pricesTos Array of total market's pricesTos
    function getBonds() external view
        returns (
            uint256[] memory marketIds,
            address[] memory quoteTokens,
            uint256[] memory capacities,
            uint256[] memory endSaleTimes,
            uint256[] memory pricesTos
        );

    /// @dev Returns all generated marketIDs.
    /// @return memory[]  marketList
    function getMarketList() external view returns (uint256[] memory) ;

    /// @dev Returns the number of created markets.
    /// @return Total number of markets
    function totalMarketCount() external view returns (uint256) ;

    /// @dev Returns information about the market.
    /// @param _index  the market id
    /// @return quoteToken  saleToken Address
    /// @return capacity  tokenSaleAmount
    /// @return endSaleTime  market endTime
    /// @return maxPayout  Amount of tokens that can be purchased for one tx in the market
    /// @return tosPrice  tos price
    function viewMarket(uint256 _index) external view
        returns (
            address quoteToken,
            uint256 capacity,
            uint256 endSaleTime,
            uint256 maxPayout,
            uint256 tosPrice
            );

    /// @dev Return Whether The index market Whether is closed
    /// @param _index  Index in the market
    /// @return closedBool Whether the market is closed
    function isOpend(uint256 _index) external view returns (bool closedBool);



}
