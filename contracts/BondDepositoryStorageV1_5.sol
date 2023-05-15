// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./libraries/LibBondDepositoryV1_5.sol";

contract BondDepositoryStorageV1_5 {
    uint256 public remainingTosTolerance;
    address public oracleLibrary;
    address public uniswapFactory; // 메인넷에 올릴때 삭제합시다.

    /// marketId - MarketInfo
    mapping(uint256 => LibBondDepositoryV1_5.MarketInfo) public marketInfos;

    /// marketId - BonusRateInfo
    mapping(uint256 => LibBondDepositoryV1_5.BonusRateInfo) public bonusRateInfos;

    /// marketId - PricePathInfo
    mapping(uint256 => bytes[]) public pricePathInfos;

}