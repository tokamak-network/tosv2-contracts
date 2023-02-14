// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./libraries/LibBondDepositoryV1_5.sol";

contract BondDepositoryStorageV1_5 {
    uint256 public remainingTosTolerance;
    address public oracleLibrary;
    address public uniswapFactory;
    uint32 public oracleConsultPeriod;
    uint8 public maxLockupWeeks;

    /// marketId - MarketInfo
    mapping(uint256 => LibBondDepositoryV1_5.MarketInfo) marketInfos;

    /// marketId - DiscountRateInfo
    mapping(uint256 => LibBondDepositoryV1_5.DiscountRateInfo) discountRateInfos;

    /// marketId - PricePathInfo
    mapping(uint256 => bytes[]) pricePathInfos;

}