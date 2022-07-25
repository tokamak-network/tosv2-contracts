// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./IERC20.sol";

interface IBondDepository {

    ///////////////////////////////////////
    /// onlyPolicyOwner
    //////////////////////////////////////

    /**
     * @notice             creates a new market type
     * @dev
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
     * @dev 이더
     * @param _id  ID of market to close
     */
    function close(uint256 _id) external;

    function increaseCapacity(
        uint256 _marketId,
        uint256 amount
    )   external;

    function decreaseCapacity(
        uint256 _marketId,
        uint256 amount
    ) external;

    function changeCloseTime(
        uint256 _marketId,
        uint256 closeTime
    )   external ;

    function changeMaxPayout(
        uint256 _marketId,
        uint256 _amount
    )   external;

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

    function getMarketList() external view returns (uint256[] memory) ;
    function totalMarketCount() external view returns (uint256) ;
    function viewMarket(uint256 _index) external view
        returns (
            bool method,
            address quoteToken,
            uint256 capacity,
            uint256 endSaleTime,
            uint256 sold,
            uint256 maxPayout
            );

    function getMetadataList() external view returns (uint256[] memory);
    function totalMetadataCount() external view returns (uint256);
    function viewMetadata(uint256 _index) external view
        returns
        (
            address poolAddress,
            uint256 _tokenPrice,
            uint256 _tosPrice,
            uint256 _totalSaleAmount,
            uint24 fee,
            bool ethMarket
            );

    function getDepositList(address account) external view returns (
        uint256[] memory _marketIds,
        uint256[] memory _stakeIds
    );

    function totalDepositCountOfAddress(address account) external view returns (uint256);

    function viewDeposit(address account, uint256 _index) external view
        returns
            (
            uint256 marketId,
            uint256 stakeId
            );
}
