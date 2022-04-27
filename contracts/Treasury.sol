// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.10;

import "./libraries/SafeMath.sol";
import "./libraries/SafeERC20.sol";

import "./interfaces/IERC20.sol";
import "./interfaces/IERC20Metadata.sol";

import "./interfaces/ITreasury.sol";

contract Treasury is ITreasury {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    event Deposit(address indexed token, uint256 amount, uint256 value);
    event Withdrawal(address indexed token, uint256 amount, uint256 value);
    event Minted(address indexed caller, address indexed recipient, uint256 amount);


    ITOS public TOS;

    mapping(address => address) public bondCalculator;

    uint256 public totalReserves;

    uint256 public immutable blocksNeededForQueue;

    
    constructor(
        address _tos,
        uint256 _timelock,
        address _owner
    ) {
        require(_tos != address(0), "Zero address: TOS");
        TOS = ITOS(_tos);

        timelockEnabled = false;
        blocksNeededForQueue = _timelock;
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
    ) external  returns (uint256 send_) {
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        uint256 value = tokenValue(_token, _amount);
        // mint TOS needed and store amount of rewards for distribution
        send_ = value.sub(_profit);
        TOS.mint(msg.sender, send_);

        totalReserves = totalReserves.add(value);

        emit Deposit(_token, _amount, value);
    }

    //자기가 보유하고 있는 TOS를 burn시키구 그가치에 해당하는 token의 amount를 가지고 간다.
    function withdraw(uint256 _amount, address _token) external {
        uint256 value = tokenValue(_token, _amount);
        TOS.burnFrom(msg.sender, value);

        totalReserves = totalReserves.sub(value);

        IERC20(_token).safeTransfer(msg.sender, _amount);

        emit Withdrawal(_token, _amount, value);
    }

    //TOS mint 권한 및 통제? 설정 필요
    function mint(address _recipient, uint256 _amount) external {
        TOS.mint(_recipient, _amount);
        emit Minted(msg.sender, _recipient, _amount);
    }


    function rebase() public returns (uint256) {
        
    }

    /**
     * @notice returns TOS valuation of asset (해당 토큰의 amount만큼의 TOS amount return)
     * @param _token address
     * @param _amount uint256
     * @return value_ uint256
     */
    function tokenValue(address _token, uint256 _amount) public view returns (uint256 value_) {
        value_ = _amount.mul(10**IERC20Metadata(address(TOS)).decimals()).div(10**IERC20Metadata(_token).decimals());

        //erc20일때
        value_ = IBondingCalculator(bondCalculator[_token]).valuation(_token, _amount);
        //uniswapV3일때
        value_ = IBondingCalculator(bondCalculator[_token]).valuation(_token, _amount);
    }
}
