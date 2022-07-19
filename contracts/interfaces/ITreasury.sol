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

    function setMR(uint256 _mrRate) external;

    function addTransfer(address _addr, uint256 _percents) external;

    function transferChange(uint256 _id, address _addr, uint256 _percents) external;

    function transferLogic(uint256 _transAmount) external returns (uint256 totalAmount);

    function backingUpdate() external;

    function enableStaking() external view returns (uint256);

    function mintRateCall() external view returns (uint256);
}
