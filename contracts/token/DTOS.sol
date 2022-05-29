// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../common/AccessibleCommon.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Rebase.sol";

import "../interfaces/IDTOS.sol";
// import "../libraries/LibDTOS.sol";

contract DTOS is
    Context,
    AccessibleCommon,
    ERC20,
    Rebase,
    IDTOS
{
    bytes32 public constant USER_ROLE = keccak256("USER_ROLE");

    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) Rebase(){
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MINTER_ROLE, _msgSender());
        _setupRole(USER_ROLE, _msgSender());
    }

    function setApyForDurationSecond(uint256 _epochDurationSecond, uint256 _apyForEpochDurationSecond)
        external onlyOwner
    {
        require(epochNumber == 0, "already started");
        _setApyForDurationSecond(_epochDurationSecond, _apyForEpochDurationSecond);
    }

    function mint(address to, uint256 amount) external virtual override {
        require(hasRole(MINTER_ROLE, _msgSender()), "DTOS: must have minter role to mint");
        if(!epochFlag) _setEpochFlag(true);
        _applyRebase(totalSupply());
        _mint(to, amount);
    }

    function burnFrom(address account, uint256 amount) external virtual override {
        require(hasRole(MINTER_ROLE, _msgSender()), "DTOS: must have minter role to burn");
        _applyRebase(totalSupply());
        _burn(account, amount);
    }

    // function use(address account, uint256 amount) external virtual override {
    //     require(hasRole(USER_ROLE, _msgSender()), "DTOS: must have minter role to use");
    //     _burn(account, amount);
    // }


    function totalSupply() public view virtual override(ERC20) returns (uint256) {
        //return super.totalSupply();

        if(epochNumber == 0 || epochDurationSecond == 0) return _totalSupply;
        else {
            uint256 rebaseCount = (block.timestamp - epochStartTime) / epochDurationSecond;
            if(rebaseCount == 0) return _totalSupply;
            } else {
                return compound(_totalSupply, apyForEpochDurationSecond, rebaseCount) ;
            }
        }
    }

    function balanceOf(address account) public view virtual override(ERC20) returns (uint256) {
        //return super.balanceOf(account);
        if(epochNumber == 0 || epochDurationSecond == 0) return _balances[account];
        else {
            uint256 rebaseCount = (block.timestamp - epochStartTime) / epochDurationSecond;
            if(rebaseCount == 0) return _balances[account];
            } else {
                return compound(_balances[account], apyForEpochDurationSecond, rebaseCount) ;
            }
        }
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