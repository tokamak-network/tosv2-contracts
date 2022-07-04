// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IERC20.sol";
import "./interfaces/IDTOS.sol";
import "./interfaces/IStaking.sol";
import "./interfaces/ITreasury.sol";

contract BondDepositoryStorage {
    // Info about each type of market
    struct Market {
        bool method;        //selling token kinds
        IERC20 quoteToken;  //token to accept as payment
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
        bool ethMarket;
    }

    struct User {
        uint256 tokenAmount;
        uint256 tosAmount;
        uint256 marketID;
        uint256 endTime;
        uint256 dTOSuse;
    }

    struct Minting {
        address mintAddress;
        uint256 mintPercents;
    }

    /* ======== STATE VARIABLES ======== */

    Market[] public markets; // persistent market data
    Metadata[] public metadata; // extraneous market data
    Minting[] public mintings;

    mapping(address => User[]) public users;

    address[] public mintingList;

    IERC20 public tos;
    IDTOS public dTOS;
    IStaking public staking;
    ITreasury public treasury;

    address public calculator;
    address payable treasuryContract;

    uint256 public mintRate;
    uint256 public totalPercents;

    modifier nonZero(uint256 tokenId) {
        require(tokenId != 0, "BondDepository: zero uint");
        _;
    }

    modifier nonZeroAddress(address account) {
        require(
            account != address(0),
            "BondDepository:zero address"
        );
        _;
    }

}
