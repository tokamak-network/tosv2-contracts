// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./IERC20.sol";
import "../libraries/LibBondDepositoryV1_1.sol";

interface IBondDepositoryV1_2 {

    ///////////////////////////////////////
    /// onlyPolicyOwner
    //////////////////////////////////////

    /**
     * @dev                 set npm address
     * @param _account      a npm address
     */
    function setNonfungiblePositionManager(
        address _account
    )   external ;


    /**
     * @dev                         creates a new market type
     * @param _token                token address of deposit asset. For ETH, the address is address(0). Will be used in Phase 2 and 3
     * @param _market               [capacity of the market, market closing time, return on the deposit in TOS, maximum purchasable bond in TOS]
     * @param startTime             start time
     * @param initialMaxPayout      initial max payout
     * @param capacityUpdatePeriod  capacity update period ( 1 real time, 60*60*24 one day, 60*60*24*7 one week )
     * @param availableBasicBond    available basic bond
     * @param availableStosBond     available sTOS bond
     * @param lpTokenId             LP TokenId
     * @return id_                  returns ID of new bond market
     */
    function createLpMarket(
        address _token,
        uint256[4] calldata _market,
        uint256 startTime,
        uint256 initialMaxPayout,
        uint256 capacityUpdatePeriod,
        bool availableBasicBond,
        bool availableStosBond,
        uint256 lpTokenId
    ) external returns (uint256 id_);



    ///////////////////////////////////////
    /// Anyone can use.
    //////////////////////////////////////
    /*
    /// @dev             deposit with ether that does not earn sTOS
    /// @param _id       market id
    /// @param _amount   amount of deposit in ETH
    /// @return payout_  returns amount of TOS earned by the user
    function LPDeposit(
        uint256 _id,
        uint256 _amount
    ) external returns (uint256 payout_ );


    /// @dev              deposit with ether that earns sTOS
    /// @param _id        market id
    /// @param _amount    amount of deposit in ETH
    /// @param _lockWeeks number of weeks for lock
    /// @return payout_   returns amount of TOS earned by the user
    function LPDepositWithSTOS(
        uint256 _id,
        uint256 _amount,
        uint256 _lockWeeks
    ) external returns (uint256 payout_);

    */
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
    /// @return lpTokenIds    lp token id
    function getBonds2() external view
        returns (
            uint256[] memory marketIds,
            address[] memory quoteTokens,
            uint256[] memory capacities,
            uint256[] memory endSaleTimes,
            uint256[] memory pricesTos,
            LibBondDepositoryV1_1.CapacityInfo[] memory capacityInfos,
            uint256[] memory lpTokenIds
        );

    /// @dev                    returns information about the market
    /// @param _marketId        market id
    /// @return quoteToken      saleToken Address
    /// @return capacity        tokenSaleAmount
    /// @return endSaleTime     market endTime
    /// @return maxPayout       maximum purchasable bond in TOS
    /// @return tosPrice        amount of TOS per 1 ETH
    /// @return capacityInfo    capacity information
    /// @return lpTokenId    lp token id
    function viewMarket2(uint256 _marketId) external view
        returns (
            address quoteToken,
            uint256 capacity,
            uint256 endSaleTime,
            uint256 maxPayout,
            uint256 tosPrice,
            LibBondDepositoryV1_1.CapacityInfo memory capacityInfo,
            uint256 lpTokenId
            );
}
