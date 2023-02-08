// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./common/ProxyAccessCommon.sol";

import "@openzeppelin/contracts/utils/math/Math.sol";
// import "hardhat/console.sol";


contract DiscountRateLockUpMap {

    struct DiscountRates {
        uint8 intervalWeeks;
        uint16[] rates;
    }

    uint256 public discountRateId;
    mapping(uint256 => DiscountRates) public discountRates;

    function createDiscountRates(
        uint8 _intervalWeeks,
        uint16[] calldata _rates
    ) external {

        uint256 id = discountRateId++;

        discountRates[id] = DiscountRates({
            intervalWeeks: _intervalWeeks,
            rates: new uint16[](_rates.length)
        });

    }

    function getRatesInfo(uint256 id) public view returns (DiscountRates memory) {
        return discountRates[id];
    }

    function getRatesByIndex(uint256 id, uint256 index) public view returns (uint16 discountRateOfIndex) {

        DiscountRates memory _rates = discountRates[id];

        if (_rates.intervalWeeks != 0 || index < _rates.rates.length) {
            discountRateOfIndex = _rates.rates[index];
        }
    }

    function getRatesByWeeks(uint256 id, uint16 _weeks) public view returns (uint16 discountRateOfWeek) {

        DiscountRates memory _rates = discountRates[id];

        if (_rates.intervalWeeks != 0 ) {
            uint256 index = _weeks / _rates.intervalWeeks;
            if (index < _rates.rates.length) {
                discountRateOfWeek = _rates.rates[index];
            }
        }
    }

}