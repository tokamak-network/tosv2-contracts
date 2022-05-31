// // SPDX-License-Identifier: AGPL-3.0
// pragma solidity ^0.8.0;

// import "./libraries/SafeMath.sol";
// import "./libraries/FixedPoint.sol";
// import "./libraries/Address.sol";
// import "./libraries/SafeERC20.sol";

// import "./interfaces/IERC20Metadata.sol";
// import "./interfaces/IERC20.sol";

// contract BondingCalculator {
//     using FixedPoint for *;
//     using SafeMath for uint256;

//     IERC20 internal immutable TOS;

//     constructor(address _TOS) {
//         require(_TOS != address(0), "Zero address: TOS");
//         TOS = IERC20(_TOS);
//     }

//     function tokenValue(address _token) public view returns (uint256) {

//     }

//     function lpValue(uint256 _tokenid) public view returns (uint256) {

//     }
// }