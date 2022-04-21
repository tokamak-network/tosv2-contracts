// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.10;

import "./libraries/SafeMath.sol";
import "./libraries/SafeERC20.sol";

import "./interfaces/IERC20.sol";
import "./interfaces/IERC20Metadata.sol";

contract Treasury {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    ITOS public TOS;



    constructor(
        address _tos,
        uint256 _timelock,
        address _owner
    ) {
        require(_tos != address(0), "Zero address: TOS");
        TOS = ITOS(_tos);
    }

}
