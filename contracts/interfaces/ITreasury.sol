// SPDX-License-Identifier: AGPL-3.0
pragma solidity >=0.7.5;

import "../libraries/LibTreasury.sol";

interface ITreasury {


    /* ========== onlyPolicyOwner ========== */
    /// @dev Set Permissions enable to Address
    /// @param _status  permission number you want to change
    /// @param _address permission the address
    function enable(uint _status,  address _address) external ;

    /// @dev Set Permissions disable to Address
    /// @param _status  permission number you want to change
    /// @param _toDisable permission the address
    function disable(uint _status, address _toDisable) external;

    /// @dev Set mintRate. mintRate is the ratio of setting how many TOS mint per 1 ETH as TOS/ETH.
    /// @param _mrRate mintRate
    /// @param amount  mint amount (After checking whether backing is performed even after mint by amount, mint TOS in treasury.)
    function setMR(uint256 _mrRate, uint256 amount) external;


    /// @dev set the TOS-ETH Pool address
    /// @param _poolAddressTOSETH  TOS-ETH Pool address
    function setPoolAddressTOSETH(address _poolAddressTOSETH) external;

    /// @dev set the uniswapV3Factory address
    /// @param _uniswapFactory  uniswapV3factory address
    function setUniswapV3Factory(address _uniswapFactory) external;

    /// @dev set the mintRateDenominator
    /// @param _mintRateDenominator  mintRateDenominator
    function setMintRateDenominator(uint256 _mintRateDenominator) external;

    /// @dev Add erc20 token, which is used as a backing asset in treasury.
    /// @param _address  erc20 Address
    function addBackingList(address _address) external ;

    /// @dev delete erc20 token, which is used as a backing asset in treasury.
    /// @param _address  erc20 Address
    function deleteBackingList(address _address) external;

    /// @dev Set the foundation address and distribution rate.
    /// @param _addr      foundation Address
    /// @param _percents  percents
    function setFoundationDistributeInfo(
        address[] memory  _addr,
        uint256[] memory _percents
    ) external ;


    /* ========== onlyOwner ========== */

    /// @dev Mint TOS and send tos to recipient. Decide whether to distribute to the foundation or not according to the distribution.
    /// @param _mintAmount      mintAmount
    /// @param _distribute      Foundation distribution check
    function requestMint(uint256 _mintAmount, bool _distribute) external ;

    /// @dev addbackingList called by bonder
    /// @param _address         erc20 Address
    function addBondAsset(
        address _address
    )
        external;

    /* ========== onlyStaker ========== */

    /// @dev TOS transfer called by Staker
    /// @param _recipient   recipient Address
    /// @param _amount      recipient get Amount
    function requestTransfer(address _recipient, uint256 _amount)  external;

    /* ========== Anyone can execute ========== */

    /* ========== VIEW ========== */

    /// @dev return the now mintRate
    /// @return uint256  mintRate
    function getMintRate() external view returns (uint256);

    /// @dev How much tokens are valued as TOS
    /// @return uint256  the amount evaluated as TOS
    function backingRateETHPerTOS() external view returns (uint256);

    /// @dev check if registry contains address
    /// @return (bool, uint256)
    function indexInRegistry(address _address, LibTreasury.STATUS _status) external view returns (bool, uint256);


    /// @dev return treasury tos balance
    /// @return uint256
    function enableStaking() external view returns (uint256);

    /// @dev The assets held by the treasury are converted into ETH and returned
    /// @return uint256
    function backingReserve() external view returns (uint256) ;

    /// @dev Total number of tokens backing by treasury
    /// @return uint256
    function totalBacking() external view returns (uint256);

    /// @dev Returns the backing information of all backings
    /// @return erc20Address   erc20Address
    function allBacking() external view returns (
        address[] memory erc20Address
    );

    /// @dev Returns the total length of mintings
    /// @return uint256  mintings
    function totalMinting() external view returns(uint256) ;

    /// @dev Returns the mintings information of mintings index
    /// @param _index   mintings.index
    /// @return mintAddress   mintAddress
    /// @return mintPercents  mintPercents
    function viewMintingInfo(uint256 _index)
        external view returns(address mintAddress, uint256 mintPercents);

    /// @dev Returns the mintings information of all mintings
    /// @return mintAddress   mintAddress
    /// @return mintPercents  mintPercents
    function allMinting() external view
        returns (
            address[] memory mintAddress,
            uint256[] memory mintPercents
            );

    /// @dev check the permission
    /// @param role      STATUS
    /// @param account   address
    /// @return bool     true or false
    function hasPermission(uint role, address account) external view returns (bool);

    /// @dev Check if mint can be added as much as amount when mintRate is change
    /// @param _checkMintRate      change mintRate
    /// @param amount              mint Amount
    /// @return bool               true or false
    function checkTosSolvencyAfterTOSMint (uint256 _checkMintRate, uint256 amount) external view returns (bool);

    /// @dev Check if mint can be added as much as amount when now mintRate
    /// @param amount              mint Amount
    /// @return bool               true or false
    function checkTosSolvency (uint256 amount) external view returns (bool);

    /// @dev return The value calculated by converting the value of all assets held by the treasury into ETH
    /// @return uint256 ETH Value
    function backingReserveETH() external view returns (uint256);

    /// @dev return The value calculated by converting the value of all assets owned by the treasury into TOS
    /// @return uint256 TOS Value
    function backingReserveTOS() external view returns (uint256);

    /// @dev Return the current ETH/TOS price
    /// @return uint256 ETH/TOS
    function getETHPricePerTOS() external view returns (uint256);

    /// @dev Return the current TOS/ETH price
    /// @return uint256 TOS/ETH
    function getTOSPricePerETH() external view returns (uint256);

    /// @dev Check if the account is bond permission
    /// @param account   BonderAddress
    /// @return bool     true or false
    function isBonder(address account) external view returns (bool);

    /// @dev Check if the account has staker permission
    /// @param account   stakerAddress
    /// @return bool     true or false
    function isStaker(address account) external view returns (bool);
}
