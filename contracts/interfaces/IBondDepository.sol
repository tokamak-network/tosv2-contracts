// SPDX-License-Identifier: AGPL-3.0
pragma solidity >=0.7.5;

import "./IERC20.sol";

interface IBondDepository {
    function create(
        bool _check,
        IERC20 _token,
        address _poolAddress,
        uint24 _fee,
        uint256[5] calldata _market
    ) external returns (uint256 id_);

    function close(uint256 _id) external;

    function ERC20deposit(
        uint256 _id,
        uint256 _amount,
        uint256 _time,
        bool _claim
    )
        external
        returns (
            uint256 payout_,
            uint256 index_
        );

    function remainingAmount(uint256 _id) external view returns (uint256);
}
