// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./common/ProxyAccessCommon.sol";

import "@openzeppelin/contracts/utils/math/Math.sol";
// import "hardhat/console.sol";


contract DiscountRateLockUp {

    struct DiscountRates {
        uint8 intervalWeeks;
        uint16[] rates;
    }

    uint256 public discountRateId;
    mapping(uint256 => DiscountRates) public discountRates;

    function createDiscountRates (
        uint8 _intervalWeeks,
        uint16[] calldata _rates
    ) external {
        require(_intervalWeeks != 0, "zero _intervalWeeks");
        require(_rates.length != 0, "rates is empty");
        uint256 id = discountRateId++;

        discountRates[id] = DiscountRates({
            intervalWeeks: _intervalWeeks,
            rates: new uint16[](_rates.length)
        });

        // discountRates[id].rates = _rates;

        for (uint256 i = 0; i < _rates.length; i++){
            discountRates[id].rates[i] = _rates[i];
        }
    }

    function getRatesInfo(uint256 id) public view returns (DiscountRates memory) {
        return discountRates[id];
    }

    function getRatesByIndex(uint256 id, uint256 index) public view returns (uint16 rate) {

        DiscountRates memory _rates = discountRates[id];

        if (_rates.intervalWeeks != 0 || index < _rates.rates.length) {
            rate = _rates.rates[index];
        }
    }

    function getRatesByWeeks(uint256 id, uint8 _weeks) public view returns (uint16 rate) {

        DiscountRates memory _rates = discountRates[id];

        if (_rates.intervalWeeks != 0 ) {
            uint8 index = _weeks / _rates.intervalWeeks;
            if (index < _rates.rates.length) rate = _rates.rates[index];
        }
    }

}