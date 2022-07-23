// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

/// @title LibBondDepository
library LibBondDepository
{
     // Info about each type of market
    struct Market {
        bool method;        //selling token kinds
        address quoteToken;  //token to accept as payment
        uint256 capacity;   //remain sale volume
        uint256 endSaleTime;    //saleEndTime
        uint256 sold;       // base tokens out
        uint256 maxPayout;  // 한 tx에 살수 있는 물량
    }

    // Additional info about market.
    struct Metadata {
        address poolAddress;
        uint256 tokenPrice;
        uint256 tosPrice;
        uint256 totalSaleAmount; //tos sales volume
        uint24 fee;
        bool ethMarket;
    }

    /*
    struct User {
        uint256 tokenAmount;
        uint256 tosAmount;
        uint256 marketID;
        uint256 endTime;
        uint256 dTOSuse;
    }
    */
    struct Deposit {
        uint256 marketId;
        uint256 stakeId;
    }

}