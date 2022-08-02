// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./IERC20.sol";

interface IBondDepository {

    ///////////////////////////////////////
    /// onlyPolicyOwner
    //////////////////////////////////////

    /**
     * @dev                creates a new market type
     * @param _check       ETH를 받을려면(true), token을 받으면(false)
     * @param _token       토큰 주소
     * @param _poolAddress 토큰과 ETH주소의 pool주소
     * @param _fee         pool의 _fee
     * @param _market      [팔려고 하는 tos의 목표치, 판매 끝나는 시간, 받는 token의 가격, tos token의 가격, 한번에 구매 가능한 TOS물량]
     * @return id_         ID of new bond market
     */
    function create(
        bool _check,
        address _token,
        address _poolAddress,
        uint24 _fee,
        uint256[5] calldata _market
    ) external returns (uint256 id_);

    /**
     * @dev        close the market
     * @param _id  ID of market to close
     */
    function close(uint256 _id) external;

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
     * @param _tokenPrice  tokenPrice
     * @param _tosPrice  tosPrice
     */
    function changePrice(
        uint256 _marketId,
        uint256 _tokenPrice,
        uint256 _tosPrice
    )   external ;

    ///////////////////////////////////////
    /// Anyone can use.
    //////////////////////////////////////

    /// @dev deposit with erc20 token
    /// @param _id  the market id
    /// @param _amount  the amount of deposit
    /// @return payout_  the amount of staking
    /// @return index_  the index of user's staking
    function ERC20Deposit(
        uint256 _id,
        uint256 _amount
    ) external returns (
            uint256 payout_,
            uint256 index_
        );

    /// @dev deposit with erc20 token
    /// @param _id  the market id
    /// @param _amount  the amount of deposit
    /// @param _lockWeeks  the number of weeks for lock
    /// @return payout_  the amount of staking
    /// @return index_  the index of user's staking
    function ERC20DepositWithSTOS(
        uint256 _id,
        uint256 _amount,
        uint256 _lockWeeks
    ) external returns (
            uint256 payout_,
            uint256 index_
        );


    /// @dev deposit with ether
    /// @param _id  the market id
    /// @param _amount  the amount of deposit
    /// @return payout_  the amount of staking
    /// @return index_  the index of user's staking
    function ETHDeposit(
        uint256 _id,
        uint256 _amount
    ) external payable returns (
            uint256 payout_,
            uint256 index_
        );


    /// @dev deposit with erc20 token
    /// @param _id  the market id
    /// @param _amount  the amount of deposit
    /// @param _lockWeeks  the number of weeks for lock
    /// @return payout_  the amount of staking
    /// @return index_  the index of user's staking
    function ETHDepositWithSTOS(
        uint256 _id,
        uint256 _amount,
        uint256 _lockWeeks
    ) external payable returns (
            uint256 payout_,
            uint256 index_
        );


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

    /// @dev Returns all generated marketIDs.
    /// @return memory[]  marketList
    function getMarketList() external view returns (uint256[] memory) ;

    /// @dev Returns the number of created markets.
    /// @return Total number of markets
    function totalMarketCount() external view returns (uint256) ;

    /// @dev Returns information about the market.
    /// @param _index  the market id
    /// @return method  market check ETHmarket, ERC20market
    /// @return quoteToken  saleToken Address
    /// @return capacity  tokenSaleAmount
    /// @return endSaleTime  market endTime
    /// @return sold  Token sale volume in the market 
    /// @return maxPayout  Amount of tokens that can be purchased for one tx in the market
    function viewMarket(uint256 _index) external view
        returns (
            bool method,
            address quoteToken,
            uint256 capacity,
            uint256 endSaleTime,
            uint256 sold,
            uint256 maxPayout
            );

    /// @dev Returns all generated Metadata.
    /// @return memory[] metadatalist
    function getMetadataList() external view returns (uint256[] memory);

    /// @dev Returns the number of created Metadata.
    /// @return memory[] Total number of metadata
    function totalMetadataCount() external view returns (uint256);
    
    /// @dev Returns information about the metadata.
    /// @param _index  the metadata id
    /// @return poolAddress  poolAddress
    /// @return _tokenPrice  tokenPrice
    /// @return _tosPrice  tosPrice
    /// @return _totalSaleAmount  The amount of tokens you want to sell on the market
    /// @return fee  fee of pool
    /// @return ethMarket  check the ethMarket
    function viewMetadata(uint256 _index) external view
        returns (
            address poolAddress,
            uint256 _tokenPrice,
            uint256 _tosPrice,
            uint256 _totalSaleAmount,
            uint24 fee,
            bool ethMarket
            );

    /// @dev Return The market ID and token ID that I deposited 
    /// @param account  depositAddress
    /// @return _marketIds Array of MarketIDs I deposited
    /// @return _stakeIds Array of stakeIDs I deposited
    function getDepositList(address account) external view returns (
        uint256[] memory _marketIds,
        uint256[] memory _stakeIds
    );

    /// @dev Returns the number of tokens deposited in the market
    /// @param account  depositAddress
    /// @return uint256 totalDepositCount
    function totalDepositCountOfAddress(address account) external view returns (uint256);

    /// @dev Return The market ID and token ID that I deposited 
    /// @param account  depositAddress
    /// @param _index  Index deposited in the market
    /// @return marketId MarketIDs
    /// @return stakeId stakeIDs
    function viewDeposit(address account, uint256 _index) external view
        returns (
            uint256 marketId,
            uint256 stakeId
            );

    /// @dev Return Whether The index market Whether is closed
    /// @param _index  Index in the market
    /// @return closedBool Whether the market is closed
    function isOpend(uint256 _index) external view returns (bool closedBool);

    /// @dev Return information from all markets
    /// @return marketIds Array of total MarketIDs
    /// @return quoteTokens Array of total market's quoteTokens
    /// @return capacities Array of total market's capacities
    /// @return maxpayouts Array of total market's maxpayouts
    /// @return endSaleTimes Array of total market's endSaleTimes
    /// @return pricesToken Array of total market's pricesToken
    /// @return pricesTos Array of total market's pricesTos
    function getBonds() external view
        returns (
            uint256[] memory marketIds,
            address[] memory quoteTokens,
            uint256[] memory capacities,
            uint256[] memory maxpayouts,
            uint256[] memory endSaleTimes,
            uint256[] memory pricesToken,
            uint256[] memory pricesTos
        );
}
