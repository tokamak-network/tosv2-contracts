// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../common/AccessibleCommon.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
//import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

import "../interfaces/IDTOS.sol";

contract DTOS is
    Context,
    AccessibleCommon,
    ERC20,
    IDTOS
{
    bytes32 public constant USER_ROLE = keccak256("USER_ROLE");
    uint256 public baseRate;
    uint256 public interestRate;

    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MINTER_ROLE, _msgSender());
        _setupRole(USER_ROLE, _msgSender());
    }

    function mint(address to, uint256 amount) external virtual override {
        require(hasRole(MINTER_ROLE, _msgSender()), "DTOS: must have minter role to mint");
        _mint(to, amount);
    }

    function burnFrom(address account, uint256 amount) external virtual override {
        require(hasRole(MINTER_ROLE, _msgSender()), "DTOS: must have minter role to burn");
        _burn(account, amount);
    }

    // function use(address account, uint256 amount) external virtual override {
    //     require(hasRole(USER_ROLE, _msgSender()), "DTOS: must have minter role to use");
    //     _burn(account, amount);
    // }


    function totalSupply() public view virtual override(ERC20) returns (uint256) {

        // 전체 tosAmount 값에서 추가해야 하나.
        // 각 풀에서 추가할때, 디토스 총계를 반영해서 동기화 해야 하는지..

        return super.totalSupply();
    }

    function balanceOf(address account) public view virtual override(ERC20) returns (uint256) {

        // 사용자가 가지고 있는 rewardToken을 가져와서.. 계산하는건지..
        // 아니면,, 전체 사용자의 잔액으로 계산이 되는건지..

        return super.balanceOf(account);
    }

    function transfer(address to, uint256 amount) public virtual override(ERC20) returns (bool) {

        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        return true;
    }

    function approve(address spender, uint256 amount) public virtual override(ERC20) returns (bool) {
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) public virtual override(ERC20) returns (bool) {
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual override(ERC20) returns (bool) {
        return true;
    }

}