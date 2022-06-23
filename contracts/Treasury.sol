// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

import "./libraries/SafeMath.sol";
import "./libraries/SafeERC20.sol";

import "./interfaces/IERC20.sol";
import "./interfaces/IERC20Metadata.sol";
import "./interfaces/ITOS.sol";
import "./interfaces/ITreasury.sol";
import "./interfaces/ITOSValueCalculator.sol";

import "./common/ProxyAccessCommon.sol";


contract Treasury is ITreasury, ProxyAccessCommon {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    event Deposit(address indexed token, uint256 amount, uint256 value);
    event Withdrawal(address indexed token, uint256 amount, uint256 value);
    event Minted(address indexed caller, address indexed recipient, uint256 amount);
    event Permissioned(address addr, STATUS indexed status, bool result);
    event ReservesAudited(uint256 indexed totalReserves);

    enum STATUS {
        RESERVEDEPOSITOR,
        RESERVESPENDER,
        RESERVETOKEN,
        RESERVEMANAGER,
        LIQUIDITYDEPOSITOR,
        LIQUIDITYTOKEN,
        LIQUIDITYMANAGER,
        REWARDMANAGER
    }

    struct Backing {
        address erc20Address;
        address tosPoolAddress;
        uint24 fee; 
    }

    IERC20 public TOS;

    address public calculator;

    mapping(STATUS => address[]) public registry;
    mapping(STATUS => mapping(address => bool)) public permissions;
    mapping(address => address) public bondCalculator;

    uint256 public totalReserves;
    uint256 public ETHbacking;
    uint256 public tosBacking;

    Backing[] public backings;

    address[] public backingLists;
    mapping(uint256 => uint256) public backingList;

    string internal notAccepted = "Treasury: not accepted";
    string internal notApproved = "Treasury: not approved";
    string internal invalidToken = "Treasury: invalid token";
    string internal insufficientReserves = "Treasury: insufficient reserves";

    constructor(
        address _tos,
        address _calculator
    ) {
        require(_tos != address(0), "Zero address: TOS");

        _setRoleAdmin(PROJECT_ADMIN_ROLE, PROJECT_ADMIN_ROLE);
        _setupRole(PROJECT_ADMIN_ROLE, msg.sender);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        TOS = IERC20(_tos);
        calculator = _calculator;
    }

    /**
     * @notice allow approved address to deposit an asset for TOS (token의 현재 시세에 맞게 입금하고 TOS를 받음)
     * @param _amount uint256
     * @param _token address
     * @param _profit uint256
     * @return send_ uint256
     */
    function deposit(
        uint256 _amount,
        address _token,
        uint256 _profit
    ) external override returns (uint256 send_) {
        if (permissions[STATUS.RESERVETOKEN][_token]) {
            require(permissions[STATUS.RESERVEDEPOSITOR][msg.sender], notApproved);
        } else if (permissions[STATUS.LIQUIDITYTOKEN][_token]) {
            require(permissions[STATUS.LIQUIDITYDEPOSITOR][msg.sender], notApproved);
        } else {
            revert(invalidToken);
        }

        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        uint256 value = tokenValue(_token, _amount);
        // mint TOS needed and store amount of rewards for distribution
        send_ = value.sub(_profit);
        ITOS(address(TOS)).mint(msg.sender, send_);

        totalReserves = totalReserves.add(value);

        emit Deposit(_token, _amount, value);
    }

    //자기가 보유하고 있는 TOS를 burn시키구 그가치에 해당하는 token의 amount를 가지고 간다.
    function withdraw(uint256 _amount, address _token) external override {
        require(permissions[STATUS.RESERVETOKEN][_token], notAccepted); // Only reserves can be used for redemptions
        require(permissions[STATUS.RESERVESPENDER][msg.sender], notApproved);

        uint256 value = tokenValue(_token, _amount);
        ITOS(address(TOS)).burn(msg.sender, value);

        totalReserves = totalReserves.sub(value);

        IERC20(_token).safeTransfer(msg.sender, _amount);

        emit Withdrawal(_token, _amount, value);
    }

    //TOS mint 권한 및 통제? 설정 필요
    function mint(address _recipient, uint256 _amount) external override {
        require(permissions[STATUS.REWARDMANAGER][msg.sender], notApproved);
        ITOS(address(TOS)).mint(_recipient, _amount);
        emit Minted(msg.sender, _recipient, _amount);
    }

    /* ========== MANAGERIAL FUNCTIONS ========== */

    /**
     * @notice takes inventory of all tracked assets
     * @notice always consolidate to recognized reserves before audit
     */
    function auditReserves() external onlyPolicyOwner {
        uint256 reserves;
        address[] memory reserveToken = registry[STATUS.RESERVETOKEN];

        for (uint256 i = 0; i < reserveToken.length; i++) {
            if (permissions[STATUS.RESERVETOKEN][reserveToken[i]]) {
                reserves = reserves.add(tokenValue(reserveToken[i], IERC20(reserveToken[i]).balanceOf(address(this))));
            }
        }

        address[] memory liquidityToken = registry[STATUS.LIQUIDITYTOKEN];

        for (uint256 i = 0; i < liquidityToken.length; i++) {
            if (permissions[STATUS.LIQUIDITYTOKEN][liquidityToken[i]]) {
                reserves = reserves.add(
                    tokenValue(liquidityToken[i], IERC20(liquidityToken[i]).balanceOf(address(this)))
                );
            }
        }

        totalReserves = reserves;
        emit ReservesAudited(reserves);
    }

    /**
     * @notice enable permission from queue
     * @param _status STATUS
     * @param _address address
     * @param _calculator address
     */
    function enable(
        STATUS _status,
        address _address,
        address _calculator
    ) external onlyPolicyOwner {
        permissions[_status][_address] = true;

        (bool registered, ) = indexInRegistry(_address, _status);

        if (!registered) {
            registry[_status].push(_address);
        }

        emit Permissioned(_address, _status, true);
    }

    function approve(
        address _addr
    ) external onlyPolicyOwner {
        TOS.approve(_addr, 1e45);
    }

    /**
     *  @notice disable permission from address
     *  @param _status STATUS
     *  @param _toDisable address
     */
    function disable(STATUS _status, address _toDisable) external onlyPolicyOwner {
        permissions[_status][_toDisable] = false;
        emit Permissioned(_toDisable, _status, false);
    }
 
    /**
     * @notice check if registry contains address
     * @return (bool, uint256)
     */
    function indexInRegistry(address _address, STATUS _status) public view returns (bool, uint256) {
        address[] memory entries = registry[_status];
        for (uint256 i = 0; i < entries.length; i++) {
            if (_address == entries[i]) {
                return (true, i);
            }
        }
        return (false, 0);
    }

    //지원하는 자산을 추가 시킴
    function addbackingList(address _address,address _tosPooladdress, uint24 _fee) external onlyPolicyOwner {
        uint256 amount = IERC20(_address).balanceOf(address(this));
        backingList[backings.length] = amount;
        // backingList[backingLists.length] = amount;
        // backingLists.push(_address);
        backings.push(
            Backing({
                erc20Address: _address,
                tosPoolAddress: _tosPooladdress,
                fee: _fee
            })
        );
    }

    //현재 지원하는 자산을 최신으로 업데이트 시킴
    function backingUpdate() public override {
        ETHbacking = address(this).balance;
        for (uint256 i = 0; i < backings.length; i++) {
            uint256 amount = IERC20(backings[i].erc20Address).balanceOf(address(this));
            backingList[i] = amount;
        }
    }

    /**
     * @notice returns TOS valuation of asset (해당 토큰의 amount만큼의 TOS amount return)
     * @param _token address
     * @param _amount uint256
     * @return value_ uint256
     */
    function tokenValue(address _token, uint256 _amount) public override view returns (uint256 value_) {
        value_ = _amount.mul(10**IERC20Metadata(address(TOS)).decimals()).div(10**IERC20Metadata(_token).decimals());

        //erc20일때
        // value_ = IBondingCalculator(bondCalculator[_token]).valuation(_token, _amount);
        //uniswapV3일때
        // value_ = IBondingCalculator(bondCalculator[_token]).valuation(_token, _amount);
        // value_ = IBondingCalculator(address).valuation(address, uint256);
    }

    //eth, weth, market에서 받은 자산 다 체크해야함
    //환산은 eth단위로 
    //Treasury에 있는 자산을 ETH로 환산하여서 합하여 리턴함
    function backingReserve() public view returns (uint256) {
        uint256 totalValue;
        uint256 tosETHPrice = ITOSValueCalculator(calculator).getWETHPoolTOSPrice();
        for(uint256 i = 0; i < backings.length; i++) {
            uint256 amount = IERC20(backings[i].erc20Address).balanceOf(address(this));
            uint256 tosERC20Price = ITOSValueCalculator(calculator).getTOSERC20PoolTOSPrice(backings[i].erc20Address,backings[i].tosPoolAddress,backings[i].fee);
            totalValue = totalValue + (amount * tosERC20Price * tosETHPrice);
        }
        totalValue = totalValue + ETHbacking;
        return totalValue;
    }

    function enableStaking() public override view returns (uint256) {
        return TOS.balanceOf(address(this));
    }
}
