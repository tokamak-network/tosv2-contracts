// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

// import "./common/ProxyAccessCommon.sol";

// import "@openzeppelin/contracts/utils/math/Math.sol";
import "hardhat/console.sol";

contract DiscountedRateLockUp {

    struct DiscountedRates {
        uint8 intervalWeeks;
        uint16[] rates;
    }

    uint256 public id;
    mapping(uint256 => DiscountedRates) public discountedRates;

    event CreatedDiscountRates(uint256 _id, uint8 _intervalWeeks, uint16[] _rates);

    constructor() {}

    function createDiscountRates (
        uint8 _intervalWeeks,
        uint16[] calldata _rates
    ) external {
        require(_intervalWeeks != 0, "zero _intervalWeeks");
        require(_rates.length != 0, "rates is empty");
        id++;

        console.log("id %s", id);

        discountedRates[id] = DiscountedRates({
            intervalWeeks: _intervalWeeks,
            rates: new uint16[](_rates.length)
        });

        // discountRates[id].rates = _rates;

        for (uint256 i = 0; i < _rates.length; i++){
            discountedRates[id].rates[i] = _rates[i];
        }

        emit CreatedDiscountRates(id, _intervalWeeks, _rates);
    }

    function getRatesInfo(uint256 _id) public view returns (DiscountedRates memory) {
        return discountedRates[_id];
    }

    function getRatesByIndex(uint256 _id, uint256 index) public view returns (uint16 rate) {

        DiscountedRates memory _rates = discountedRates[_id];

        if (_rates.intervalWeeks != 0 || index < _rates.rates.length) {
            rate = _rates.rates[index];
        }
    }

    function getRatesByWeeks(uint256 _id, uint8 _weeks) public view returns (uint16 rate) {

        DiscountedRates memory _rates = discountedRates[_id];

        if (_rates.intervalWeeks != 0 ) {
            uint8 index = _weeks / _rates.intervalWeeks;
            if (index < _rates.rates.length) rate = _rates.rates[index];
        }
    }

}