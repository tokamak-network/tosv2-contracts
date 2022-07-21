// SPDX-License-Identifier: AGPL-3.0
pragma solidity >=0.7.5;

import "../libraries/LibTreasury.sol";

interface ITreasury {


    /* ========== onlyPolicyOwner ========== */


    function enable(LibTreasury.STATUS _status,  address _address) external ;

    function approve(address _addr) external ;

    function setMR(uint256 _mrRate) external;

    function disable(LibTreasury.STATUS _status, address _toDisable) external;

    function addbackingList(address _address, address _tosPooladdress, uint24 _fee) external ;

    function addLiquidityIdList(uint256 _tokenId, address _tosPoolAddress) external ;

    function addTransfer(address _addr, uint256 _percents) external ;

    function transferChange(uint256 _id, address _addr, uint256 _percents) external ;


    /* ========== onlyOwner ========== */


    /* ========== onlyBonder ========== */

    function requestMintAndTransfer(uint256 _mintAmount, address _recipient, uint256 _transferAmount) external ;

    /* ========== onlyStaker ========== */

    function requestTrasfer(address _recipient, uint256 _amount)  external;

    /* ========== Anyone can execute ========== */

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

    function transferLogic(uint256 _transAmount) external returns (uint256 totalAmount);

    function backingUpdate() external;


    /* ========== VIEW ========== */

    function indexInRegistry(address _address, LibTreasury.STATUS _status) external view returns (bool, uint256);

    function enableStaking() external view returns (uint256);

}
