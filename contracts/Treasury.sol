// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./TreasuryStorage.sol";
import "./common/ProxyAccessCommon.sol";

import "./libraries/SafeERC20.sol";
import "./libraries/LibTreasury.sol";

import "./interfaces/ITreasury.sol";
import "./interfaces/ITreasuryEvent.sol";

import "hardhat/console.sol";

interface IIERC20 {
    function burn(address account, uint256 amount) external returns (bool);
}

interface IITOSValueCalculator {

    function getTOSERC20PoolERC20Price(
        address _erc20address,
        address _tosERC20Pool,
        uint24 fee
    )
        external
        view
        returns (uint256 price);

    function convertAssetBalanceToWethOrTos(address _asset, uint256 _amount)
        external view
        returns (bool existedWethPool, bool existedTosPool,  uint256 priceWethOrTosPerAsset, uint256 convertedAmmount);

    function getTOSPricePerETH() external view returns (uint256 price);

    function getETHPricePerTOS() external view returns (uint256 price);
}

interface IIStaking {
    function stakedOfAll() external view returns (uint256) ;
}

interface IIIUniswapV3Pool {
    function liquidity() external view returns (uint128);
}

contract Treasury is
    TreasuryStorage,
    ProxyAccessCommon,
    ITreasury,
    ITreasuryEvent
{
    using SafeERC20 for IERC20;


    constructor() {
    }

    /* ========== onlyPolicyOwner ========== */

    /// @inheritdoc ITreasury
    function enable(
        uint _status,
        address _address
    )
        external override
        onlyPolicyOwner
    {
        LibTreasury.STATUS role = LibTreasury.getSatatus(_status);

        require(role != LibTreasury.STATUS.NONE, "NONE permission");
        require(permissions[role][_address] == false, "already set");

        permissions[role][_address] = true;

        (bool registered, ) = indexInRegistry(_address, role);

        if (!registered) {
            registry[role].push(_address);
        }

        emit Permissioned(_address, _status, true);
    }

    /// @inheritdoc ITreasury
    function disable(uint _status, address _toDisable)
        external override onlyPolicyOwner
    {
        LibTreasury.STATUS role = LibTreasury.getSatatus(_status);
        require(role != LibTreasury.STATUS.NONE, "NONE permission");
        require(permissions[role][_toDisable] == true, "hasn't permissions");

        permissions[role][_toDisable] = false;

        (bool registered, uint256 _index) = indexInRegistry(_toDisable, role);
        if (registered && registry[role].length > 0) {
            if (_index < registry[role].length-1) registry[role][_index] = registry[role][registry[role].length-1];
            registry[role].pop();
        }

        emit Permissioned(_toDisable, uint(role), false);
    }

    /// @inheritdoc ITreasury
    function approve(
        address _addr
    ) external override onlyPolicyOwner {
        TOS.approve(_addr, 1e45);
    }

    /// @inheritdoc ITreasury
    function setMR(uint256 _mrRate, uint256 amount) external override onlyPolicyOwner {

        require(mintRate != _mrRate || amount > 0, "check input value");

        require(checkTosSolvencyAfterTOSMint(_mrRate, amount), "unavailable mintRate");

        if (mintRate != _mrRate) mintRate = _mrRate;
        if (amount > 0) TOS.mint(address(this), amount);

        emit SetMintRate(_mrRate, amount);
    }

    /// @inheritdoc ITreasury
    function setPoolAddressTOSETH(address _poolAddressTOSETH) external override onlyPolicyOwner {
        require(poolAddressTOSETH != _poolAddressTOSETH, "same address");
        poolAddressTOSETH = _poolAddressTOSETH;

        emit SetPoolAddressTOSETH(_poolAddressTOSETH);
    }

    /// @inheritdoc ITreasury
    function setUniswapV3Factory(address _uniswapFactory) external onlyPolicyOwner {
        require(uniswapV3Factory != _uniswapFactory, "same address");
        uniswapV3Factory = _uniswapFactory;

        emit SetUniswapV3Factory(_uniswapFactory);
    }

    /// @inheritdoc ITreasury
    function setMintRateDenominator(uint256 _mintRateDenominator) external onlyPolicyOwner {
        require(mintRateDenominator != _mintRateDenominator && _mintRateDenominator > 0, "check input value");
        mintRateDenominator = _mintRateDenominator;

        emit SetMintRateDenominator(_mintRateDenominator);
    }

    /// @inheritdoc ITreasury
    function totalBacking() public override view returns(uint256) {
         return backings.length;
    }

    /// @inheritdoc ITreasury
    function viewBackingInfo(uint256 _index)
        public override view
        returns (address erc20Address, address tosPoolAddress, uint24 fee)
    {
         return (
                backings[_index].erc20Address,
                backings[_index].tosPoolAddress,
                backings[_index].fee
            );
    }

    /// @inheritdoc ITreasury
    function allBacking() public override view
        returns (
            address[] memory erc20Address,
            address[] memory tosPoolAddress,
            uint24[] memory fee)
    {
        uint256 len = backings.length;
        erc20Address = new address[](len);
        tosPoolAddress = new address[](len);
        fee = new uint24[](len);

        for (uint256 i = 0; i < len; i++){
            erc20Address[i] = backings[i].erc20Address;
            tosPoolAddress[i] = backings[i].tosPoolAddress;
            fee[i] = backings[i].fee;
        }
    }

    /// @inheritdoc ITreasury
    function addBondAsset(
        address _address,
        address _tosPooladdress,
        uint24 _fee
    )
        external override
    {
        require(isBonder(msg.sender), "caller is not bonder");

        if (backingsIndex[_address] == 0 && _address != address(0) ){
            addBackingList(
                _address,
                _tosPooladdress,
                _fee
            );
        }

        emit AddedBondAsset(_address, _tosPooladdress, _fee);
    }

    /// @inheritdoc ITreasury
    function addBackingList(
        address _address,
        address _tosPooladdress,
        uint24 _fee
    )
        public override onlyPolicyOwner
        nonZeroAddress(_address)
        nonZeroAddress(_tosPooladdress)
    {

        if(backings.length == 0) {
            // add dummy
            backings.push(
                LibTreasury.Backing({
                    erc20Address: address(0),
                    tosPoolAddress: address(0),
                    fee: 0
                })
            );
        }
        require(backingsIndex[_address] == 0, "already added");

        backingsIndex[_address] = backings.length;

        backings.push(
            LibTreasury.Backing({
                erc20Address: _address,
                tosPoolAddress: _tosPooladdress,
                fee: _fee
            })
        );

        emit AddedBackingList(_address, _tosPooladdress, _fee);
    }

    /// @inheritdoc ITreasury
    function deleteBackingList(
        address _address
    )
        external override onlyPolicyOwner
        nonZeroAddress(_address)
    {
        require(backingsIndex[_address] > 0, "not registered");

        uint256 curIndex = backingsIndex[_address];
        if (curIndex < backings.length-1) {
            LibTreasury.Backing storage info = backings[curIndex];
            info.erc20Address = backings[backings.length-1].erc20Address;
            info.tosPoolAddress = backings[backings.length-1].tosPoolAddress;
            info.fee = backings[backings.length-1].fee;

            backingsIndex[info.erc20Address] = curIndex;
        }
        backingsIndex[_address] = 0;
        backings.pop();

        emit DeletedBackingList(_address);
    }

    /// @inheritdoc ITreasury
    function totalMinting() public override view returns(uint256) {
         return mintings.length;
    }

    /// @inheritdoc ITreasury
    function viewMintingInfo(uint256 _index)
        public override view returns(address mintAddress, uint256 mintPercents)
    {
         return (mintings[_index].mintAddress, mintings[_index].mintPercents);
    }

    /// @inheritdoc ITreasury
    function allMintingg() public override view
        returns (
            address[] memory mintAddress,
            uint256[] memory mintPercents
            )
    {
        uint256 len = mintings.length;
        mintAddress = new address[](len);
        mintPercents = new uint256[](len);

        for (uint256 i = 0; i < len; i++){
            mintAddress[i] = mintings[i].mintAddress;
            mintPercents[i] = mintings[i].mintPercents;
        }
    }

    /// @inheritdoc ITreasury
    function setFoundationDistributeInfo(
        address[] memory  _addr,
        uint256[] memory _percents
    )
        external override onlyPolicyOwner
    {
        uint256 total = 0;
        require(_addr.length > 0, "zero length");
        require(_addr.length == _percents.length, "wrong length");

        uint256 len = _addr.length;
        for (uint256 i = 0; i< len ; i++){
            require(_addr[i] != address(0), "zero address");
            require(_percents[i] > 0, "zero _percents");
            total += _percents[i];
        }
        require(total < 100, "wrong _percents");

        delete mintings;

        for (uint256 i = 0; i< len ; i++) {
            mintings.push(
                LibTreasury.Minting({
                    mintAddress: _addr[i],
                    mintPercents: _percents[i]
                })
            );
        }

        emit SetFoundationDistributeInfo(_addr, _percents);
    }

    /* ========== permissions : LibTreasury.STATUS.RESERVEDEPOSITOR ========== */

    /// @inheritdoc ITreasury
    function requestMintAndTransfer(
        uint256 _mintAmount,
        address _recipient,
        uint256 _transferAmount,
        bool _distribute
    )
        external override
    {
        require(isBonder(msg.sender), notApproved);

        require(_mintAmount > 0, "zero amount");
        require(_mintAmount >= _transferAmount, "_mintAmount is less than _transferAmount");

        TOS.mint(address(this), _mintAmount);

        if (_transferAmount > 0) {
            require(_recipient != address(0), "zero recipient");
            TOS.safeTransfer(_recipient, _transferAmount);
        }

        uint256 remainedAmount = _mintAmount - _transferAmount;
        if(remainedAmount > 0 && _distribute) _foundationDistribute(remainedAmount);


        emit RquestedMintAndTransfer(_mintAmount, _recipient, _transferAmount, _distribute);

    }

    /// @inheritdoc ITreasury
    function requestTrasfer(
        address _recipient,
        uint256 _amount
    ) external override {
        require(isStaker(msg.sender), notApproved);

        console.log("------------ requestTrasfer ---------------------");

        require(_recipient != address(0), "zero recipient");
        require(_amount > 0, "zero amount");

        // 확인 필요
        // 토스가 모자르면 기존에 있던 이더 및 다른 에셋을 토스로 바꿔서 주어야 하는가?
        // 또는 토스를 민트해서 보내주어야 하는가?
        uint256 _tosBalance = TOS.balanceOf(address(this));

        if (_tosBalance < _amount){

            console.log("requestTrasfer _tosBalance %s", _tosBalance);
            console.log("requestTrasfer _amount %s", _amount);

            require(checkTosSolvency(_amount-_tosBalance), "treasury balance is insufficient");
            TOS.mint(address(this), (_amount-_tosBalance));

        }
        // require(TOS.balanceOf(address(this)) >= _amount, "treasury balance is insufficient");

        console.log("requestTrasfer _recipient %s", _recipient);
        console.log("requestTrasfer _amount %s", _amount);

        TOS.transfer(_recipient, _amount);

        emit RequestedTrasfer(_recipient, _amount);

    }


    function _foundationDistribute(uint256 remainedAmount) internal {
        if (mintings.length > 0) {
            for (uint256 i = 0; i < mintings.length ; i++) {
                TOS.safeTransfer(
                    mintings[i].mintAddress, remainedAmount *  mintings[i].mintPercents / 100
                );
            }
        }
    }

    /// @inheritdoc ITreasury
    function indexInRegistry(
        address _address,
        LibTreasury.STATUS _status
    )
        public override view returns (bool, uint256)
    {
        address[] memory entries = registry[_status];
        for (uint256 i = 0; i < entries.length; i++) {
            if (_address == entries[i]) {
                return (true, i);
            }
        }
        return (false, 0);
    }

    /* ========== VIEW ========== */

    /// @inheritdoc ITreasury
    function getMintRate() public override view returns (uint256) {
        return mintRate;
    }

    /// @inheritdoc ITreasury
    function checkTosSolvencyAfterTOSMint(uint256 _checkMintRate, uint256 amount)
        public override view returns (bool)
    {
        if (TOS.totalSupply() + amount  <= backingReserveTOS() * _checkMintRate / mintRateDenominator)  return true;
        else return false;
    }

    /// @inheritdoc ITreasury
    function  checkTosSolvency(uint256 amount)
        public override view returns (bool)
    {
        if ( TOS.totalSupply() + amount <= backingReserveTOS() * mintRate / mintRateDenominator)  return true;
        else return false;
    }

    /// @inheritdoc ITreasury
    function backingReserveETH() public view returns (uint256) {
        return backingReserve();
    }

    /// @inheritdoc ITreasury
    function backingReserveTOS() public view returns (uint256) {

        return backingReserve() * getTOSPricePerETH() / 1e18;
    }

    /// @inheritdoc ITreasury
    function getETHPricePerTOS() public view returns (uint256) {
        console.log("getETHPricePerTOS poolAddressTOSETH %s",poolAddressTOSETH);
        console.log("getETHPricePerTOS liquidity %s",IIIUniswapV3Pool(poolAddressTOSETH).liquidity());
        if (poolAddressTOSETH != address(0) && IIIUniswapV3Pool(poolAddressTOSETH).liquidity() == 0) {
            return  (mintRateDenominator / mintRate);
        } else {
            console.log("getETHPricePerTOS liquidity is not zero ");
            return IITOSValueCalculator(calculator).getETHPricePerTOS();
        }
    }

    /// @inheritdoc ITreasury
    function getTOSPricePerETH() public view returns (uint256) {

        console.log("getTOSPricePerETH poolAddressTOSETH %s",poolAddressTOSETH);

        if (poolAddressTOSETH != address(0) && IIIUniswapV3Pool(poolAddressTOSETH).liquidity() == 0) {
            return  mintRate;
        } else {
            return IITOSValueCalculator(calculator).getTOSPricePerETH();
        }
    }

    /// @inheritdoc ITreasury
    function backingReserve() public override view returns (uint256) {
        uint256 totalValue = 0;

        bool applyWTON = false;
        uint256 tosETHPricePerTOS = IITOSValueCalculator(calculator).getETHPricePerTOS();
        console.log("tosETHPricePerTOS %s", tosETHPricePerTOS) ;

        for(uint256 i = 0; i < backings.length; i++) {

            if (backings[i].erc20Address == wethAddress)  {
                totalValue += IERC20(wethAddress).balanceOf(address(this));
                applyWTON = true;

            } else if (backings[i].erc20Address != address(0) && backings[i].erc20Address != address(TOS))  {

                (bool existedWethPool, bool existedTosPool, , uint256 convertedAmmount) =
                    IITOSValueCalculator(calculator).convertAssetBalanceToWethOrTos(backings[i].erc20Address, IERC20(backings[i].erc20Address).balanceOf(address(this)));

                if (existedWethPool) totalValue += convertedAmmount;

                else if (existedTosPool){

                    if (poolAddressTOSETH != address(0) && IIIUniswapV3Pool(poolAddressTOSETH).liquidity() == 0) {
                        // 확인필요 -> TOS * 1e18 / (TOS/ETH) = ETH
                        totalValue +=  (convertedAmmount * mintRateDenominator / mintRate );
                    } else {
                        // TOS * ETH/TOS / token decimal = ETH
                        totalValue += (convertedAmmount * tosETHPricePerTOS / 1e18);
                    }
                }
            }
        }


        if (!applyWTON && wethAddress != address(0)) totalValue += IERC20(wethAddress).balanceOf(address(this));

        //0.000004124853366489 ETH/TOS ,  242427 TOS /ETH
        totalValue += address(this).balance;

        console.log("backingReserve %s", totalValue);

        return totalValue;
    }

    /// @inheritdoc ITreasury
    function backingRateETHPerTOS() public override view returns (uint256) {
        return (backingReserve() / TOS.totalSupply()) ;
    }

    /// @inheritdoc ITreasury
    function enableStaking() public override view returns (uint256) {
        return TOS.balanceOf(address(this));
    }

    /// @inheritdoc ITreasury
    function hasPermission(uint role, address account) public override view returns (bool) {
        return permissions[LibTreasury.getSatatus(role)][account];
    }

    function isBonder(address account) public view virtual returns (bool) {
        return permissions[LibTreasury.STATUS.BONDER][account];
    }

    function isStaker(address account) public view virtual returns (bool) {
        return permissions[LibTreasury.STATUS.STAKER][account];
    }

    function withdrawEther(address account) external {
        uint256 ethbalance = address(this).balance;
        payable(account).transfer(ethbalance);
    }
}
