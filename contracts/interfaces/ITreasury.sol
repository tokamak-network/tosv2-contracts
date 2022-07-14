// SPDX-License-Identifier: AGPL-3.0
pragma solidity >=0.7.5;

interface ITreasury {

    function deposit(
        uint256 _amount,
        address _token,
        address _tosERC20Pool,
        uint24 _fee,
        uint256 _profit
    ) external returns (uint256);

    function withdraw(        
        uint256 _amount, 
        address _token,
        address _tosERC20Pool,
        uint24 _fee
    ) external;

    function mint(address _recipient, uint256 _amount) external;

    function addbackingList(address _address,address _tosPooladdress, uint24 _fee) external;

    function addLiquidityIdList(uint256 _tokenId, address _tosPoolAddress) external;

    function backingUpdate() external;

    function enableStaking() external view returns (uint256);
}
