// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./libraries/LibBondDepository.sol";

import "./interfaces/IERC20.sol";
import "./interfaces/IStaking.sol";

contract BondDepositoryStorage {

    mapping(uint256 => LibBondDepository.Market) public markets;
    mapping(uint256 => LibBondDepository.Metadata) public metadata;

    //mapping(address => LibBondDepository.User[]) public users;

    // user - Deposit(marketId, stakeId)[]
    mapping(address => LibBondDepository.Deposit[]) public deposits;

    uint256[] public marketList;
    uint256[] public metadataList;
    address[] public userList;

    IERC20 public tos;
    address public dTOS;
    IStaking public staking;
    address public treasury;

    address public calculator;
    address public uniswapV3Factory;

    uint256 public totalDepositCount;

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

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

    modifier nonReentrant() {
        // On the first call to nonReentrant, _notEntered will be true
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");

        // Any calls to nonReentrant after this point will fail
        _status = _ENTERED;

        _;

        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = _NOT_ENTERED;
    }

}
