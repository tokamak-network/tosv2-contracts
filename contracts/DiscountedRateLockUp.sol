// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

// import "./common/ProxyAccessCommon.sol";
import './libraries/BytesLib.sol';
// import "@openzeppelin/contracts/utils/math/Math.sol";
import "hardhat/console.sol";

contract DiscountedRateLockUp {
    using BytesLib for bytes;
    struct DiscountedRates {
        uint8 intervalWeeks;
        bytes rates;
    }

    uint256 public id;
    mapping(uint256 => DiscountedRates) public discountedRates;

    // mapping(uint256 => uint8) public intervalWeeks;
    // mapping(uint256 => mapping(uint16 => uint16)) public rates;

    event CreatedDiscountRates(uint256 _id, uint8 _intervalWeeks);

    constructor() {}
    /*
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

    function createDiscountRates (
        uint8 _intervalWeeks,
        uint16[] calldata _rates
    ) external {
        require(_intervalWeeks != 0, "zero _intervalWeeks");
        require(_rates.length != 0, "rates is empty");
        id++;

        console.log("id %s", id);
        // intervalWeeks[id] = _intervalWeeks;

        // rates[id] = new uint16[](_rates.length);

        discountedRates[id] = DiscountedRates({
            intervalWeeks: _intervalWeeks,
            rates: new uint16[](_rates.length)
        });
        console.log("discountedRates[id] %s", discountedRates[id].intervalWeeks);

        // discountedRates[id].rates = _rates;

        for (uint256 i = 0; i < _rates.length; i++){
            discountedRates[id].rates[i] = _rates[i];
        }

        // for (uint16 i = 0; i < _rates.length; i++){
        //     rates[id][i] = _rates[i];
        // }

        emit CreatedDiscountRates(id, _intervalWeeks);
    }*/

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

        emit CreatedDiscountRates(id, _intervalWeeks);
    }


    // function getRatesInfo(uint256 _id) public view returns (DiscountedRates memory) {
    //     return discountedRates[_id];
    // }

    // function getRatesByIndex(uint256 _id, uint16 index) public view returns (uint16 rate) {

    //     return rates[_id][index];
    // }
    // function getRatesByWeeks(uint256 _id, uint8 _weeks) public view returns (uint16 rate) {

    //     if (intervalWeeks[_id] != 0 ) {
    //         rate = rates[_id][_weeks / intervalWeeks[_id]];
    //     }
    // }

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