// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./libraries/LibTreasury.sol";
import "./interfaces/IERC20.sol";

contract TreasuryStorage {

    /* ========== STATE VARIABLES ========== */

    IERC20 public TOS;

    address public calculator;

    mapping(LibTreasury.STATUS => address[]) public registry;
    mapping(LibTreasury.STATUS => mapping(address => bool)) public permissions;
    mapping(address => address) public bondCalculator;

    uint256 public totalReserves;
    uint256 public ETHbacking;
    uint256 public tosBacking;
    uint256 public ETHliquidity;

    uint256 public mintRate;
    uint256 public totalPercents;

    LibTreasury.Backing[] public backings;
    mapping(address => uint256) public backingsIndex;

    LibTreasury.Listing[] public listings;
    LibTreasury.Minting[] public mintings;

    // address[] public backingLists;
    uint256[] public tokenIdLists;

    mapping(uint256 => uint256) public tokenIdList;
    // mapping(uint256 => uint256) public backingList;

    string internal notAccepted = "Treasury: not accepted";
    string internal notApproved = "Treasury: not approved";
    string internal invalidToken = "Treasury: invalid token";
    string internal insufficientReserves = "Treasury: insufficient reserves";

    modifier nonZero(uint256 tokenId) {
        require(tokenId != 0, "Treasury: zero uint");
        _;
    }

    modifier nonZeroAddress(address account) {
        require(
            account != address(0),
            "Treasury:zero address"
        );
        _;
    }

}
