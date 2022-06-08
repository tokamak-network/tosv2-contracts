// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./DTOSStorage.sol";
import "../common/AccessibleCommon.sol";
import {IDTOS} from "../interfaces/IDTOS.sol";
import {IDTOSEvent} from "../interfaces/IDTOSEvent.sol";

import {DSMath} from "../libraries/DSMath.sol";
import "../libraries/SArrays.sol";
import "../libraries/ABDKMath64x64.sol";

import "hardhat/console.sol";
contract DTOS is
    DTOSStorage,
    AccessibleCommon,
    DSMath,
    IDTOS,
    IDTOSEvent
{
    using SArrays for uint256[];

    modifier onlyRewardLPTokenManager() {
        require(
            rewardLPTokenManager == msg.sender,
            "DTOS:sender is not rewardLPTokenManager"
        );
        _;
    }

    constructor() {

    }

    // constructor(string memory _name, string memory _symbol, uint256 initfactor) {
    //     name = _name;
    //     symbol = _symbol;

    //     _updateFactorSnapshots(
    //         factorSnapshots,
    //         initfactor,
    //         0
    //     );
    //     _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);
    //     _setupRole(ADMIN_ROLE, msg.sender);
    // }


    /// Only Admin

    function setRewardLPTokenManager(address _addr)
        external
        nonZeroAddress(_addr) onlyOwner
    {
        require(rewardLPTokenManager != _addr, "same address");
        rewardLPTokenManager = _addr;
    }


    function setRebaseInfo(uint256 _period, uint256 _interest)
        external
        nonZero(_period)
        nonZero(_interest)
        onlyOwner
    {
        require(rebaseIntervalSecond != _period, "same rebase period");
        require(compoundInteresRatePerRebase != _interest, "same rebase rate");
        rebaseIntervalSecond = _period;
        compoundInteresRatePerRebase = _interest;
    }


    /// Only onlyRewardLPTokenManager
    function rebase() public onlyRewardLPTokenManager
    {
        if (rebaseIntervalSecond > 0 && compoundInteresRatePerRebase > 0) {
            uint256 curTime = block.timestamp;
            uint256 total = totalSupply();
            uint256 period = 0;

            if ( (lastRebaseTime == 0 && total > 0) || total == 0) {
                lastRebaseTime = curTime;
            } else if (curTime > lastRebaseTime && total > 0 ) {

                period = (curTime - lastRebaseTime) / rebaseIntervalSecond;

                if(period > 0){
                    uint256 addAmount = compound(total, compoundInteresRatePerRebase, period);

                    uint256 newFactor = _calcNewFactor(total, addAmount, _factor);

                    _setFactor(newFactor);

                    lastRebaseTime = curTime;

                    rebaseTotal++;
                    // rebases[rebaseTotal] = LibDTOS.Rebase(curTime, _factor, refactorCount);

                    emit OnRebase(rebaseTotal, _factor, addAmount, addAmount-total, lastRebaseTime);
                }
            }
        }
    }

    function setFactor(uint256 infactor)
        public onlyRewardLPTokenManager
        returns (uint256)
    {
        return _setFactor(infactor);
    }

    function mint(
        address to,
        uint256 amount
    )
        public
        override
        onlyRewardLPTokenManager
        nonZeroAddress(to)
        returns (bool)
    {
        rebase();
        _mint(to, amount);
        return true;
    }

    function burn(
        address to,
        uint256 amount
    ) public override onlyRewardLPTokenManager {
        require(
            amount <= balanceOf(to),
            "DTOS: Insufficient balance of owner"
        );
        rebase();
        if (amount > totalSupply()) _burn(to, totalSupply());
        else _burn(to, amount);
    }

    /// Can Anybody
    function transfer(address recipient, uint256 amount) public virtual returns (bool) {
        return false;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public virtual  returns (bool) {
        return false;
    }

    function approve(address spender, uint256 amount) public virtual returns (bool) {
        return false;
    }

    /// Internal Functions
    function _calcNewFactor(uint256 source, uint256 target, uint256 oldFactor) internal pure returns (uint256) {
        return wdiv(wmul(target, oldFactor), source);
    }

    function _mint(
        address account,
        uint256 amount
    ) internal {

        LibDTOS.Balance storage b = balances[account];

        uint256 currentBalance = balanceOf(account);
        uint256 newBalance = currentBalance + amount;

        uint256 rbAmount = _toWADBased(newBalance);
        b.balance = rbAmount;
        b.refactoredCount = refactorCount;

        addTotalSupply(amount);

        emit Transfer(address(0), account, _toWADFactored(rbAmount));
    }

    function _burn(
        address account,
        uint256 amount
    ) internal {

        LibDTOS.Balance storage b = balances[account];

        uint256 currentBalance = balanceOf(account);
        uint256 newBalance = currentBalance - amount;

        uint256 rbAmount = _toWADBased(newBalance);
        b.balance = rbAmount;
        b.refactoredCount = refactorCount;

        subTotalSupply(amount);

        emit Transfer(account, address(0), _toWADFactored(rbAmount));
    }


    function _setFactor(uint256 factor)
        internal
        returns (uint256)
    {
        uint256 previous = _factor;
        uint256 count = 0;
        uint256 f = factor;
        for (; f >= REFACTOR_BOUNDARY; f = (f / REFACTOR_DIVIDER)) {
            count = count + 1;
        }

        refactorCount = count;
        _factor = f;

        emit FactorSet(previous, f, count);
        return f;
    }

    function addTotalSupply(uint256 amount) internal {

        uint256 currentSupply = _applyFactor(_totalSupply.balance, _totalSupply.refactoredCount);
        uint256 newSupply = currentSupply + amount;

        uint256 rbAmount = _toWADBased(newSupply);
        _totalSupply.balance = rbAmount;
        _totalSupply.refactoredCount = refactorCount;
    }

    function subTotalSupply(uint256 amount) internal {

        uint256 currentSupply = _applyFactor(_totalSupply.balance, _totalSupply.refactoredCount);
        uint256 newSupply = currentSupply - amount;

        uint256 rbAmount = _toWADBased(newSupply);
        _totalSupply.balance = rbAmount;
        _totalSupply.refactoredCount = refactorCount;

    }

    /// helpers

    /**
     * @dev Calculate RAY BASED from RAY FACTORED
     */
    // function _toRAYBased(uint256 rf) internal view returns (uint256 rb) {

    //     return rdiv2(rf, getFactor());
    // }
    function _toWADBased(uint256 rf) internal view returns (uint256 rb) {

        return wdiv2(rf, _factor);
    }
    /**
     * @dev Calculate RAY FACTORED from RAY BASED
     */
    // function _toRAYFactored(uint256 rb) internal view returns (uint256 rf) {
    //     return rmul2(rb, getFactor());
    // }
    function _toWADFactored(uint256 rb) internal view returns (uint256 rf) {
        return wmul2(rb, _factor);
    }



    /// VIEW FUNCTIONS

    function pow (int128 x, uint n) public pure returns (int128 r) {
        r = ABDKMath64x64.fromUInt (1);
        while (n > 0) {
            if (n % 2 == 1) {
                r = ABDKMath64x64.mul (r, x);
                n -= 1;
            } else {
                x = ABDKMath64x64.mul (x, x);
                n /= 2;
            }
        }
    }

    function compound (uint principal, uint ratio, uint n) public pure returns (uint) {
        return ABDKMath64x64.mulu (
                pow (
                ABDKMath64x64.add (
                    ABDKMath64x64.fromUInt (1),
                    ABDKMath64x64.divu (
                    ratio,
                    10**18)),
                n),
                principal);
    }

    function _applyFactor(uint256 v, uint256 refactoredCount) internal view returns (uint256) {
        if (v == 0) {
        return 0;
        }

        v = wmul2(v, _factor);

        for (uint256 i = refactoredCount; i < refactorCount; i++) {
             v = v * REFACTOR_DIVIDER ;
        }

        return v;
    }

    function balanceOf(address account) public view override returns (uint256)
    {

        LibDTOS.Balance storage b = balances[account];
        return (_applyFactor(b.balance, b.refactoredCount)+(b.remain));
    }

    function totalSupply() public view override returns (uint256) {
        return (_applyFactor(_totalSupply.balance, _totalSupply.refactoredCount) + (_totalSupply.remain));
    }

    function allowance(address owner, address spender) public view virtual returns (uint256) {
        return 0;
    }

    function getBalance(address account)
        public
        view
        override
        returns (
            uint256 balance,
            uint256 refactoredCount,
            uint256 remain
        )
    {
        LibDTOS.Balance storage b = balances[account];
        return (b.balance, b.refactoredCount, b.remain);
    }

}
