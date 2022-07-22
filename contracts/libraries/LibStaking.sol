// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

/// @title LibStaking
library LibStaking
{
    struct Epoch {
        uint256 length_; // in seconds
        uint256 number; // since inception
        uint256 end; // timestamp
    }

    struct UserBalance {
        address staker;
        uint256 deposit;    //tos staking 양
        uint256 LTOS;       //변환된 LTOS 양
        uint256 endTime;    //끝나는 endTime
        uint256 getLTOS;    //이미 받아간 LTOS양
        uint256 rewardTOS;  //받아간 TOS양
        uint256 marketId;   //bondMarketId
        bool withdraw;      //unstakeing을 한번이라도 했는지
    }

}