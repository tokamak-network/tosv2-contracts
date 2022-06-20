// SPDX-License-Identifier: AGPL-3.0
pragma solidity >=0.7.5;

import "./IERC20.sol";

interface IBondDepository {
    // Info about each type of market
    struct Market {
        bool method;        //selling token kinds
        IERC20 quoteToken;  //token to accept as payment
        uint256 tokenId;    //uniswapV3 tokenId    
        uint256 capacity;   //remain sale volume
        uint256 endSaleTime;    //saleEndTime
        uint256 sold;       // base tokens out
        uint256 purchased; // quote tokens in
        uint256 maxPayout;  // 한 tx에 살수 있는 물량
    }

    // Additional info about market.
    struct Metadata {
        uint256 tokenPrice;
        uint256 tosPrice;
        uint256 endTime;        //saleEndTime
        uint256 totalSaleAmount; //tos sales volume
        bool ethMarket;
    }

    struct User {
        uint256 tokenAmount;
        uint256 tosAmount;
        uint256 marketID;
        uint256 endTime;
        uint256 dTOSuse;
    }

    // Control variable adjustment data
    struct Adjustment {
        uint64 change;
        uint48 lastAdjustment;
        uint48 timeToAdjusted;
        bool active;
    }

    function create(
        bool _check,
        IERC20 _token,
        uint256 _tokenId,
        uint256[5] calldata _market
    ) external returns (uint256 id_);

    function close(uint256 _id) external;

    function deposit(
        uint256 _id,
        uint256 _amount,
        uint256 _time,
        uint256 _dTOSamount,
        bool _claim
    )
        external
        returns (
            uint256 payout_,
            uint256 index_
        );

    function remainingAmount(uint256 _id) external view returns (uint256);
}
