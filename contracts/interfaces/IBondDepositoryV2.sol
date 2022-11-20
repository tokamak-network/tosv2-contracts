// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./IERC20.sol";

interface IBondDepositoryV2 {

    ///////////////////////////////////////
    /// onlyPolicyOwner
    //////////////////////////////////////

    /**
     * @dev                creates a new market type
     * @param _token       token address of deposit asset. For ETH, the address is address(0). Will be used in Phase 2 and 3
     * @param _market      [capacity of the market, market closing time, return on the deposit in TOS, maximum purchasable bond in TOS]
     * @return id_         returns ID of new bond market
     */
    function create(
        address _token,
        uint256[4] calldata _market
    ) external returns (uint256 id_);


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


}
