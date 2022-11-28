// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./IERC20.sol";
import "../libraries/LibBondDepositoryV1_1.sol";

interface IBondDepositoryV1_2 {


    ///////////////////////////////////////
    /// Anyone can use.
    //////////////////////////////////////

    /// @dev             deposit with ether that does not earn sTOS
    /// @param _id       market id
    /// @param _amount   amount of deposit in ETH
    /// @return payout_  returns amount of TOS earned by the user
    function ERC20Deposit(
        uint256 _id,
        uint256 _amount
    ) external returns (uint256 payout_ );


    /// @dev              deposit with ether that earns sTOS
    /// @param _id        market id
    /// @param _amount    amount of deposit in ETH
    /// @param _lockWeeks number of weeks for lock
    /// @return payout_   returns amount of TOS earned by the user
    function ERC20DepositWithSTOS(
        uint256 _id,
        uint256 _amount,
        uint256 _lockWeeks
    ) external returns (uint256 payout_);


}
