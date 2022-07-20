// SPDX-License-Identifier: AGPL-3.0
pragma solidity >=0.7.5;

interface ITreasury {
    /**
     * @notice allow approved address to deposit an asset for TOS 
     * @param _amount uint256 give TokenAmount
     * @param _token address tokenAddress
     * @param _tosERC20Pool address token And TOS poolAddress
     * @param _fee uint24 fee of Pool
     * @param _profit uint256 
     * @return send_ uint256
     */
    function deposit(
        uint256 _amount,
        address _token,
        address _tosERC20Pool,
        uint24 _fee,
        uint256 _profit
    ) external returns (uint256);

    /**
     * @notice burn my TOS and get token
     * @param _amount uint256 
     * @param _token address
     * @param _tosERC20Pool address
     * @param _fee uint24
     */
    function withdraw(        
        uint256 _amount, 
        address _token,
        address _tosERC20Pool,
        uint24 _fee
    ) external;

    /**
     * @notice If a mint request comes from an address allowed by the policy, it mints tos.
     * @param _recipient address mint TOS address
     * @param _amount uint256 Mint Amount
     */
    function mint(address _recipient, uint256 _amount) external;

    /**
     * @notice treasury TOS approve the another contract
     * @param _addr approve address
     */
    function approve(
        address _addr
    ) external;

    /**
     * @notice treasury have token add backingAddress
     * @param _address address backing Token Address 
     * @param _tosPooladdress address backingTokenTOSPoolAddress
     * @param _fee uint24 pool fee
     */
    function addbackingList(address _address,address _tosPooladdress, uint24 _fee) external;

    function addLiquidityIdList(uint256 _tokenId, address _tosPoolAddress) external;

    /**
     * @notice set the mintRate
     * @param _mrRate uint256 mintRate
     */
    function setMR(uint256 _mrRate) external;

    /**
     * @notice Added TOS distribution list when selling in bond sale
     * @param _addr address 
     * @param _percents uint256
     */
    function addTransfer(address _addr, uint256 _percents) external;

    /**
     * @notice Edited distribution list
     * @param _id uint256 
     * @param _addr address 
     * @param _percents uint256
     */
    function transferChange(uint256 _id, address _addr, uint256 _percents) external;
    
    /**
     * @notice Edited distribution list
     * @param _transAmount uint256 
     */
    function transferLogic(uint256 _transAmount) external returns (uint256 totalAmount);

    /**
     * @notice Updating the currently supported assets to the latest
     */
    function backingUpdate() external;
    
    /**
     * @notice The assets in the Treasury are converted into ETH and returned.
     */
    function backingReserve() external view returns (uint256);

    /**
     * @notice Returns the amount of TOS in the Treasury
     */
    function enableStaking() external view returns (uint256);

    function mintRateCall() external view returns (uint256);
}
