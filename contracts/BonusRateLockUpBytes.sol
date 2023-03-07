// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import './libraries/BytesLib.sol';

contract BonusRateLockUpBytes {
    using BytesLib for bytes;

    struct DiscountedRates {
        uint8 intervalWeeks;
        bytes rates;
    }

    uint256 public id;
    mapping(uint256 => DiscountedRates) public discountedRates;

    // event CreatedDiscountRates(uint256 _id, uint8 _intervalWeeks);

    constructor() {}

    function createDiscountRates (
        uint8 _intervalWeeks,
        bytes memory _rates
    ) external {
        require(_intervalWeeks != 0, "zero _intervalWeeks");
        require(_rates.length != 0, "rates is empty");

        id++;

        discountedRates[id] = DiscountedRates({
            intervalWeeks: _intervalWeeks,
            rates: _rates
        });

        // emit CreatedDiscountRates(id, _intervalWeeks);
    }

    function getRatesInfo(uint256 _id) public view returns (DiscountedRates memory) {
        return discountedRates[_id];
    }

    function getRatesByIndex(uint256 _id, uint256 index) public view returns (uint16 rate) {

        DiscountedRates memory _rates = discountedRates[_id];

        if (_rates.intervalWeeks != 0 || index < _rates.rates.length) {
            rate = _rates.rates.toUint16(index*2);
        }
    }

    function getRatesByWeeks(uint256 _id, uint8 _weeks) public view returns (uint16 rate) {

        DiscountedRates memory _rates = discountedRates[_id];

        if (_rates.intervalWeeks != 0 ) {
            uint8 index = _weeks / _rates.intervalWeeks;
            if (index < (_rates.rates.length/2)) rate = _rates.rates.toUint16(index*2);
        }
    }

}