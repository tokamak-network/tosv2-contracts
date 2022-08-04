//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

interface ITreasuryEvent{

    // /// @dev This event occurs when a deposit is made to the treasury.
    // /// @param token   token address
    // /// @param amount  the amount
    // /// @param value   the Value
    // event Deposit(address indexed token, uint256 amount, uint256 value);

    // /// @dev This event occurs when mint is performed.
    // /// @param caller     caller address
    // /// @param recipient  get address
    // /// @param amount     the amount
    // event Minted(address indexed caller, address indexed recipient, uint256 amount);

    /// @dev This event occurs when permission is change.
    /// @param addr    address
    /// @param status  STATUS
    /// @param result  true or false
    event Permissioned(address addr, uint indexed status, bool result);

    /// @dev This event occurs when setting the mint rate.
    /// @param mrRate    the mint rate
    /// @param amount    the TOS amountto add
    event SetMintRate(uint256 mrRate, uint256 amount);

    /// @dev This event occurs when set the PoolAddressTOSETH
    /// @param _poolAddressTOSETH    the pool address of TOS-ETH pair
    event SetPoolAddressTOSETH(address _poolAddressTOSETH);

    /// @dev This event occurs when set the UniswapV3Factory
    /// @param _uniswapFactory    the address of uniswapFactory
    event SetUniswapV3Factory(address _uniswapFactory);

    /// @dev This event occurs when set the MintRateDenominator
    /// @param _mintRateDenominator    the _mintRateDenominator
    event SetMintRateDenominator(uint256 _mintRateDenominator);
    
    /// @dev This event occurs when add the BackingList
    /// @param _address    the asset address
    /// @param _tosPooladdress    the asset's _tosPooladdress
    /// @param _fee    the _tosPool's fee
    event AddedBackingList(
        address _address,
        address _tosPooladdress,
        uint24 _fee
    );

    /// @dev This event occurs when delete the BackingList
    /// @param _address    the asset address
    event DeletedBackingList(
        address _address
    );


    /// @dev This event occurs when set the Foundation Distribute Info
    /// @param _addr    the address list
    /// @param _percents    the percentage list
    event SetFoundationDistributeInfo(
        address[]  _addr,
        uint256[] _percents
    );

    /// @dev This event occurs when request mint and transfer TOS
    /// @param _mintAmount    the TOS amount to mint
    /// @param _recipient    the recipient
    /// @param _transferAmount   the TOS amount to transfer
    /// @param _distribute   If true,  distribute a percentage of the remaining amount to the foundation after mint and transfer.
    event RquestedMintAndTransfer(
        uint256 _mintAmount,
        address _recipient,
        uint256 _transferAmount,
        bool _distribute
    );

    /// @dev This event occurs when add the BondAsset
    /// @param _address    the asset address
    /// @param _tosPooladdress    the asset's _tosPooladdress
    /// @param _fee    the _tosPool's fee
    event AddedBondAsset(
        address _address,
        address _tosPooladdress,
        uint24 _fee
    );

    /// @dev This event occurs when request transfer TOS
    /// @param _recipient    the recipient
    /// @param _amount   the TOS amount to transfer
    event RequestedTransfer(
        address _recipient,
        uint256 _amount
    );

}