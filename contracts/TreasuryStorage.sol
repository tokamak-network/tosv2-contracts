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

    /* ========== STATE VARIABLES ========== */

    IERC20 public TOS;

    address public calculator;

    mapping(STATUS => address[]) public registry;
    mapping(STATUS => mapping(address => bool)) public permissions;
    mapping(address => address) public bondCalculator;

    uint256 public totalReserves;
    uint256 public ETHbacking;
    uint256 public tosBacking;
    uint256 public ETHliquidity;

    Backing[] public backings;

    Listing[] public listings;

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
