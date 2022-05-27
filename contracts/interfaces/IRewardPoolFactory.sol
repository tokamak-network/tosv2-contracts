//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IRewardPoolFactory {

    event CreatedRewardPool(address contractAddress, string name);

    /// ### anybody can use

    /// @dev Create a RewardPoolProxy
    /// @param _name name
    /// @param pool a pool address
    /// @param admin an admin address
    /// @return created RewardPoolFactory contract address
    function create(
        string calldata _name,
        address pool,
        address admin
    )
        external
        returns (address);
}
