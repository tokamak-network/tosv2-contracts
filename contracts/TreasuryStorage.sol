// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IERC20.sol";

contract TreasuryStorage {
     /* ========== DATA STRUCTURES ========== */

    enum STATUS {
        RESERVEDEPOSITOR,
        RESERVESPENDER,
        RESERVETOKEN,
        RESERVEMANAGER,
        LIQUIDITYDEPOSITOR,
        LIQUIDITYTOKEN,
        LIQUIDITYMANAGER,
        REWARDMANAGER
    }

    struct Backing {
        address erc20Address;
        address tosPoolAddress;
        uint24 fee; 
    }

    struct Listing {
        uint256 tokenId;
        address tosPoolAddress;
    }

    struct Minting {
        address mintAddress;
        uint256 mintPercents;
    }

    /* ========== STATE VARIABLES ========== */

    IERC20 public TOS;

    address public calculator;

    mapping(STATUS => address[]) public registry;
    mapping(STATUS => mapping(address => bool)) public permissions;
    mapping(address => address) public bondCalculator;

    mapping(uint256 => address) public mintingList;


    uint256 public totalReserves;
    uint256 public ETHbacking;
    uint256 public tosBacking;
    uint256 public ETHliquidity;

    uint256 public mintRate;
    uint256 public totalPercents;



    Backing[] public backings;

    Listing[] public listings;

    Minting[] public mintings;


    address[] public backingLists;
    uint256[] public tokenIdLists;

    mapping(uint256 => uint256) public tokenIdList;
    mapping(uint256 => uint256) public backingList;

    string internal notAccepted = "Treasury: not accepted";
    string internal notApproved = "Treasury: not approved";
    string internal invalidToken = "Treasury: invalid token";
    string internal insufficientReserves = "Treasury: insufficient reserves";

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
