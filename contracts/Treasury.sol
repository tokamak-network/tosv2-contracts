// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./TreasuryStorage.sol";

import "./libraries/SafeMath.sol";
import "./libraries/SafeERC20.sol";
import "./libraries/LibTreasury.sol";

// import "./interfaces/IERC20.sol";

import "./interfaces/IERC20Metadata.sol";
import "./interfaces/ITOS.sol";
import "./interfaces/ITreasury.sol";
import "./interfaces/ITOSValueCalculator.sol";

import "./common/ProxyAccessCommon.sol";


import "hardhat/console.sol";

interface IUniswapV3Pool {
    function token0() external view returns (address);
    function token1() external view returns (address);
}

contract Treasury is
    TreasuryStorage,
    ProxyAccessCommon,
    ITreasury
{
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    event Deposit(address indexed token, uint256 amount, uint256 value);
    event Withdrawal(address indexed token, uint256 amount, uint256 value);
    event Minted(address indexed caller, address indexed recipient, uint256 amount);
    event Permissioned(address addr, LibTreasury.STATUS indexed status, bool result);
    event ReservesAudited(uint256 indexed totalReserves);

    constructor() {
    }


    /* ========== onlyPolicyOwner ========== */

    /**
     * @notice enable permission from queue
     * @param _status uint(STATUS)
     * @param _address address
     */
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

        emit Permissioned(_address, role, true);
    }

    /**
     *  @notice disable permission from address
     *  @param _status uint(STATUS)
     *  @param _toDisable address
     */
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

        emit Permissioned(_toDisable, role, false);
    }

    function approve(
        address _addr
    ) external override onlyPolicyOwner {
        TOS.approve(_addr, 1e45);
    }

    function setMintRateDenominator(uint256 _mintRateDenominator) external onlyPolicyOwner {

        require(mintRateDenominator != _mintRateDenominator && _mintRateDenominator > 0, "check input value");

        mintRateDenominator = _mintRateDenominator;
    }

    function setMR(uint256 _mrRate, uint256 amount) external override onlyPolicyOwner {

        require(mintRate != _mrRate || amount > 0, "check input value");

        require(isTreasuryHealthyAfterTOSMint(_mrRate, amount), "unavailable mintRate");

        if (mintRate != _mrRate) mintRate = _mrRate;
        if (amount > 0) TOS.mint(address(this), amount);
    }

    function setMROfAddress(address _asset, uint256 _mrRate) external override onlyPolicyOwner {

        require(mintingRateOfAddress[_asset] != _mrRate, "same value");
        mintingRateOfAddress[_asset] = _mrRate;
    }

    function setUniswapV3Factory(address _uniswapFactory) external onlyPolicyOwner {

        require(uniswapV3Factory != _uniswapFactory, "same address");
        uniswapV3Factory = _uniswapFactory;
    }

    function totalBacking() public override view returns(uint256) {
         return backings.length;
    }

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


    function addBackingList(
        address _address,
        address _tosPooladdress,
        uint24 _fee
    )
        external override onlyPolicyOwner
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
    }


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
    }

    function totalMinting() public override view returns(uint256) {
         return mintings.length;
    }

    function viewMintingInfo(uint256 _index)
        public override view returns(address mintAddress, uint256 mintPercents)
    {
         return (mintings[_index].mintAddress, mintings[_index].mintPercents);
    }

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

    //TOS mint
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
    }

     /* ========== permissions : LibTreasury.STATUS.RESERVEDEPOSITOR ========== */

    //uniswapV3 LP token을 deposit할 수 있어야함
    //uniswapV3 LP token을 backing할 수 있어야함
    //uniswapV3 token을 manage할 수 있어야함, swap(TOS -> ETH) Treasury가 가지고 있는 물량 onlyPolicy , mint(treasury가 주인), increaseLiquidity(treasury물량을 씀) , collect(treasury가 받음), decreaseLiquidity(treasury한테 물량이 감)

    /**
     * @notice allow approved address to deposit an asset for TOS (token의 현재 시세에 맞게 입금하고 TOS를 받음)
     * @param _amount uint256
     * @param _token address
     * @param _tosERC20Pool address
     * @param _fee uint24
     * @param _profit uint256
     * @return send_ uint256
     */
    //erc20토큰을 받고 TOS를 준다.
    //amount = ? ERC20 ->  ?ERC20 * ?TOS/1ERC20 -> ??TOS
    function deposit(
        uint256 _amount,
        address _token,
        address _tosERC20Pool,
        uint24 _fee,
        uint256 _profit
    ) external override returns (uint256 send_) {
        if (permissions[LibTreasury.STATUS.RESERVETOKEN][_token]) {
            require(permissions[LibTreasury.STATUS.RESERVEDEPOSITOR][msg.sender], notApproved);
        } else if (permissions[LibTreasury.STATUS.LIQUIDITYTOKEN][_token]) {
            require(permissions[LibTreasury.STATUS.LIQUIDITYDEPOSITOR][msg.sender], notApproved);
        } else {
            revert(invalidToken);
        }

        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        uint256 value = (_amount * ITOSValueCalculator(calculator).getTOSERC20PoolERC20Price(_token,_tosERC20Pool,_fee))/1e18;

        // mint TOS needed and store amount of rewards for distribution
        send_ = value.sub(_profit);
        ITOS(address(TOS)).mint(msg.sender, send_);

        //주었을때 backing에 미치는 영향은 무엇인가?
        totalReserves = totalReserves.add(value);

        emit Deposit(_token, _amount, value);
    }

    //자기가 보유하고 있는 TOS를 burn시키구 그가치에 해당하는 token의 amount를 가지고 간다.
    //amount = ? TOS -> ?TOS * ?ERC20/1TOS -> ??ERC20
    function withdraw(
        uint256 _amount,
        address _token,
        address _tosERC20Pool,
        uint24 _fee
    )
        external
        override
    {
        require(permissions[LibTreasury.STATUS.RESERVETOKEN][_token], notAccepted); // Only reserves can be used for redemptions
        require(permissions[LibTreasury.STATUS.RESERVESPENDER][msg.sender], notApproved);

        uint256 value = (_amount * ITOSValueCalculator(calculator).getTOSERC20PoolTOSPrice(_token,_tosERC20Pool,_fee))/1e18;
        ITOS(address(TOS)).burn(msg.sender, value);

        //뺏을때 backing에 미치는 영향은 무엇인가?
        totalReserves = totalReserves.sub(value);

        IERC20(_token).safeTransfer(msg.sender, _amount);

        emit Withdrawal(_token, _amount, value);
    }

    /*
    // TOS mint 권한 및 통제 설정 필요
    // 자신받아야 하지 않나???
    function mint(address _recipient, uint256 _amount) external override {
        require(permissions[LibTreasury.STATUS.REWARDMANAGER][msg.sender], notApproved);
        ITOS(address(TOS)).mint(_recipient, _amount);
        emit Minted(msg.sender, _recipient, _amount);
    }
    */

    function requestMintAndTransfer(
        uint256 _mintAmount,
        address _recipient,
        uint256 _transferAmount,
        bool _distribute
    )
        external override
    {
        require(permissions[LibTreasury.STATUS.REWARDMANAGER][msg.sender]
                || isBonder(msg.sender), notApproved);

        require(_mintAmount > 0, "zero amount");
        require(_mintAmount >= _transferAmount, "_mintAmount is less than _transferAmount");

        require(isTreasuryHealthyAfterTOSMint(mintRate, _mintAmount), "non-available mintRate");

        TOS.mint(address(this), _mintAmount);

        if (_transferAmount > 0) {
            require(_recipient != address(0), "zero recipient");
            TOS.safeTransfer(_recipient, _transferAmount);
        }

        uint256 remainedAmount = _mintAmount - _transferAmount;
        if(remainedAmount > 0 && _distribute) _foundationDistribute(remainedAmount);
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

    function requestTrasfer(
        address _recipient,
        uint256 _amount
    ) external override {
        require(permissions[LibTreasury.STATUS.REWARDMANAGER][msg.sender]
                || isStaker(msg.sender), notApproved);
        require(_recipient != address(0), "zero recipient");
        require(_amount > 0, "zero amount");

        require(TOS.balanceOf(address(this)) >= _amount, "treasury balance is insufficient");

        TOS.safeTransfer(_recipient, _amount);
    }

    /**
     * @notice check if registry contains address
     * @return (bool, uint256)
     */
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

    function getMintRate(address _asset) public view returns (uint256) {
        if(_asset == address(0)) return mintRate;
        else return mintingRateOfAddress[_asset];
    }

    function isTreasuryHealthyAfterTOSMint(uint256 _checkMintRate, uint256 amount)
        public override view returns (bool)
    {
        /*
        if (TOS.totalSupply() + amount <= _checkMintRate * backingReserve() / mintRateDenominator ) {
             return true;
        } else {
            return false;
        }
        */
        // uint256 a = getTOSPricePerETH();
        // uint256 b = getETHPricPerTOS();

        // console.log("getTOSPricePerETH %s", a);
        // console.log("getETHPricPerTOS %s", b);

        if (
            TOS.totalSupply() + (amount * _checkMintRate / mintRateDenominator) <= backingReserveTOS()
            ) {
             return true;
        } else {
            return false;
        }
    }

    function backingReserveETH() public view returns (uint256) {
        return backingReserve();
    }

    function backingReserveTOS() public view returns (uint256) {
        uint256 totalValue;

        //uint256 tosPricePerETH = ITOSValueCalculator(calculator).getTOSWETHPoolETHPrice();
        uint256 tosPricePerETH = ITOSValueCalculator(calculator).getTOSPricePerETH();
        // console.log("tosPricePerETH %s", tosPricePerETH) ;

        bool applyTOS = false;
        bool applyWTON = false;

        for(uint256 i = 0; i < backings.length; i++) {

            if (backings[i].erc20Address == address(TOS))  {
                totalValue +=  TOS.balanceOf(address(this)) ;
                applyTOS = true;

            } else if (backings[i].erc20Address == wethAddress)  {
                totalValue += (IERC20(wethAddress).balanceOf(address(this)) * tosPricePerETH / 1e18);
                applyWTON = true;

            } else if (backings[i].erc20Address != address(0) )  {

                (bool existedWethPool, bool existedTosPool, , uint256 convertedAmmount)
                    = ITOSValueCalculator(calculator).convertAssetBalanceToWethOrTos(backings[i].erc20Address, IERC20(backings[i].erc20Address).balanceOf(address(this)));

                if (existedTosPool) totalValue += convertedAmmount;
                else if (existedWethPool) totalValue += (convertedAmmount * tosPricePerETH / 1e18);
            }
        }

        if (!applyTOS && address(TOS) != address(0)) totalValue += TOS.balanceOf(address(this));
        if (!applyWTON && wethAddress != address(0)) totalValue += (IERC20(wethAddress).balanceOf(address(this)) * tosPricePerETH / 1e18);

        totalValue += (address(this).balance * tosPricePerETH / 1e18);

        return totalValue;
    }

    // 이더 가치로 환산
    function backingReserve() public override view returns (uint256) {
        uint256 totalValue;
        //uint256 tosETHPricePerTOS = ITOSValueCalculator(calculator).getWETHPoolTOSPrice();

        uint256 tosETHPricePerTOS = ITOSValueCalculator(calculator).getETHPricPerTOS();

        //0.000004124853366489 ETH/TOS
        // console.log("tosETHPricePerTOS %s", tosETHPricePerTOS) ;

        bool applyTOS = false;
        bool applyWTON = false;

        for(uint256 i = 0; i < backings.length; i++) {

            if (backings[i].erc20Address == address(TOS))  {
                totalValue +=  (TOS.balanceOf(address(this)) * tosETHPricePerTOS / 1e18);
                applyTOS = true;

            } else if (backings[i].erc20Address == wethAddress)  {
                totalValue += IERC20(wethAddress).balanceOf(address(this));
                applyWTON = true;

            } else if (backings[i].erc20Address != address(0) )  {

                (bool existedWethPool, bool existedTosPool, , uint256 convertedAmmount) =
                    ITOSValueCalculator(calculator).convertAssetBalanceToWethOrTos(backings[i].erc20Address, IERC20(backings[i].erc20Address).balanceOf(address(this)));

                if (existedWethPool) totalValue += convertedAmmount;
                else if (existedTosPool) totalValue += (convertedAmmount * tosETHPricePerTOS / 1e18);
            }
        }

        if (!applyTOS && address(TOS) != address(0)) totalValue += (TOS.balanceOf(address(this))* tosETHPricePerTOS / 1e18);
        if (!applyWTON && wethAddress != address(0)) totalValue += IERC20(wethAddress).balanceOf(address(this));

        //0.000004124853366489 ETH/TOS ,  242427 TOS /ETH
        totalValue += address(this).balance;

        return totalValue;
    }


    function backingRateETHPerTOS() public override view returns (uint256) {
        return (backingReserve() / TOS.totalSupply()) ;
    }

    function enableStaking() public override view returns (uint256) {
        return TOS.balanceOf(address(this));
    }

    function hasPermission(LibTreasury.STATUS role, address account) public override view returns (bool) {
        return permissions[role][account];
    }

    function hasPermission(uint role, address account) public override view returns (bool) {
        return permissions[LibTreasury.getSatatus(role)][account];
    }

    function isBonder(address account) public view virtual returns (bool) {
        return hasPermission(LibTreasury.STATUS.BONDER, account);
    }

    function isStaker(address account) public view virtual returns (bool) {
        return hasPermission(LibTreasury.STATUS.STAKER, account);
    }

}
