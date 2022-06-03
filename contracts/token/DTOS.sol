// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./DTOSStorage.sol";
import "../common/AccessibleCommon.sol";
import {IDTOS} from "../interfaces/IDTOS.sol";
import {DSMath} from "../libraries/DSMath.sol";
import "../libraries/SArrays.sol";

contract DTOS is
    DTOSStorage,
    AccessibleCommon,
    DSMath,
    IDTOS
{
    using SArrays for uint256[];

    modifier onlyRewardLPTokenManager() {
        require(
            rewardLPTokenManager == msg.sender
            || isAdmin(msg.sender),
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


    /// Only onlyRewardLPTokenManager

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
        if (amount > totalSupply()) _burn(to, totalSupply());
        else _burn(to, amount);
    }

    /// Can Anybody

    function snapshot() public override returns (uint256) {
        return _snapshot();
    }


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


    /// Internal Functions

    function _factorAt(uint256 snapshotId) internal view virtual returns (bool, uint256, uint256) {

        LibDTOS.FactorSnapshots storage snapshots = factorSnapshots;

        if (snapshotId > 0 && snapshotId <= currentSnapshotId) {
            uint256 index = snapshots.ids.findIndex(snapshotId);

            if (index == snapshots.ids.length) {
                return (false, 0, 0);
            } else {
                return (true, snapshots.factors[index], snapshots.refactorCounts[index]);
            }
        } else {
            return (false, 0, 0);
        }
    }

    function _getRefactoredCounts(address account, uint256 index) internal view
        returns (uint256 refactoredCounts, uint256 remains)
    {
        refactoredCounts = 0;
        remains = 0;
        if (
            account != address(0)
            && accountRefactoredCounts[account][index] > 0
        ){
            refactoredCounts = accountRefactoredCounts[account][index];

        } else if (
            account == address(0)
            && totalSupplyRefactoredCounts[index] > 0
        ){
            refactoredCounts = totalSupplyRefactoredCounts[index];
        }

        if (
            account != address(0)
            && accountRemains[account][index] > 0
        ){
            remains = accountRemains[account][index];

        } else if (
            account != address(0)
            && totalSupplyRemains[index] > 0
        ){
            remains = totalSupplyRemains[index];
        }
    }

    function _valueAt(uint256 snapshotId, LibDTOS.BalanceSnapshots storage snapshots, address account) internal view
        returns (bool, uint256, uint256, uint256)
    {

        if (snapshotId > 0 && snapshotId <= currentSnapshotId) {
            uint256 index = snapshots.ids.findIndex(snapshotId);
            if (index == snapshots.ids.length) {
                // return (false, 0, 0, 0);
                if (index > 0) {
                    (uint256 refactoredCounts, uint256 remains) = _getRefactoredCounts(account, index-1);
                    return (true, snapshots.balances[index-1], refactoredCounts, remains);
                } else {
                    return (false, 0, 0, 0);
                }
            } else {
                (uint256 refactoredCounts, uint256 remains) = _getRefactoredCounts(account, index);
                return (true, snapshots.balances[index], refactoredCounts, remains);
            }
        } else {
            return (false, 0, 0, 0);
        }
    }

    function _balanceOfAt(address account, uint256 snapshotId) internal view virtual
        returns (bool, uint256, uint256, uint256)
    {

        (bool snapshotted, uint256 balances, uint256 refactoredCounts, uint256 remains) = _valueAt(snapshotId, accountBalanceSnapshots[account], account);

        return (snapshotted, balances, refactoredCounts, remains);
        //return snapshotted ? value : balanceOf(account);
    }

    function _totalSupplyAt(uint256 snapshotId) internal view virtual
        returns (bool, uint256, uint256, uint256)
    {
        (bool snapshotted, uint256 balances, uint256 refactoredCounts, uint256 remains)  = _valueAt(snapshotId, totalSupplySnapshots, address(0));

        return (snapshotted, balances, refactoredCounts, remains);
        //return snapshotted ? value : totalSupply();
    }

    function _snapshot() internal virtual returns (uint256) {
        currentSnapshotId++;
        return currentSnapshotId;

    }

    function _lastSnapshotId(uint256[] storage ids) internal view returns (uint256) {
        if (ids.length == 0) {
            return 0;
        } else {
            return ids[ids.length - 1];
        }
    }


    function _updateBalanceSnapshots(
            LibDTOS.BalanceSnapshots storage snapshots,
            uint256 balances,
            uint256 refactoredCounts,
            uint256 remains,
            address account
    ) internal  {

        uint256 currentId = currentSnapshotId;

        uint256 index = _lastSnapshotId(snapshots.ids);

        if (index < currentId) {
            snapshots.ids.push(currentId);
            snapshots.balances.push(balances);

            if(refactoredCounts > 0 && account != address(0)) accountRefactoredCounts[account][snapshots.ids.length-1] = refactoredCounts;
            else if(refactoredCounts > 0 && account == address(0)) totalSupplyRefactoredCounts[snapshots.ids.length-1] = refactoredCounts;

            if(remains > 0 && account != address(0)) accountRemains[account][snapshots.ids.length-1] = remains;
            else if(remains > 0 && account == address(0)) totalSupplyRemains[snapshots.ids.length-1] = remains;
        }
    }


    function _updateFactorSnapshots(
        LibDTOS.FactorSnapshots storage snapshots,
        uint256 factors,
        uint256 refactorCounts
    ) internal {

        uint256 currentId = currentSnapshotId;

        if (_lastSnapshotId(snapshots.ids) < currentId) {
            snapshots.ids.push(currentId);
            snapshots.factors.push(factors);
            snapshots.refactorCounts.push(refactorCounts);
        }
    }

    function updateAccount(address account, uint256 balances, uint256 refactoredCounts, uint256 remains) internal {

        _updateBalanceSnapshots(
            accountBalanceSnapshots[account],
            balances,
            refactoredCounts,
            remains,
            account
            );
    }

    function updateTotalSupply(uint256 balances, uint256 refactoredCounts, uint256 remains) internal {

        _updateBalanceSnapshots(
            totalSupplySnapshots,
            balances,
            refactoredCounts,
            remains,
            address(0)
            );
    }

    function updateFactor(uint256 factor, uint256 refactorCount) internal {

        _updateFactorSnapshots(
            factorSnapshots,
            factor,
            refactorCount
        );
    }

    function _mint(
        address account,
        uint256 amount
    ) internal {

        uint256 currentBalance = balanceOf(account);
        uint256 newBalance = currentBalance + amount;

        uint256 rbAmount = _toRAYBased(newBalance);

        (, ,uint256 refactorCounts_) = _factorAt(currentSnapshotId);

        updateAccount(account, rbAmount, refactorCounts_, 0);
        addTotalSupply(amount);

        emit Transfer(address(0), account, _toRAYFactored(rbAmount));
    }

    function _burn(
        address account,
        uint256 amount
    ) internal {

        uint256 currentBalance = balanceOf(account);
        uint256 newBalance = currentBalance - amount;
        uint256 rbAmount = _toRAYBased(newBalance);

        (, ,uint256 refactorCounts_) = _factorAt(currentSnapshotId);

        updateAccount(account, rbAmount, refactorCounts_, 0);
        subTotalSupply(amount);

        emit Transfer(account, address(0), _toRAYFactored(rbAmount));
    }


    function _setFactor(uint256 infactor)
        internal
        returns (uint256)
    {
        (, uint256 factors,) = _factorAt(currentSnapshotId);

        uint256 count = 0;
        uint256 f = infactor;
        for (; f >= REFACTOR_BOUNDARY; f = (f / REFACTOR_DIVIDER)) {
            count = count + 1;
        }

        updateFactor(f, count);
        emit FactorSet(factors, f, count);
        return f;
    }

    function addTotalSupply(uint256 amount) internal {

        uint256 currentSupply = totalSupply();

        uint256 newSupply = currentSupply + amount;

        uint256 rbAmount = _toRAYBased(newSupply);
        (, , uint256 refactorCounts_) = _factorAt(currentSnapshotId);

        updateTotalSupply(rbAmount, refactorCounts_, 0);
    }

    function subTotalSupply(uint256 amount) internal {

        uint256 currentSupply = totalSupply();

        uint256 newSupply = currentSupply - amount;

        uint256 rbAmount = _toRAYBased(newSupply);

        (, , uint256 refactorCounts_) = _factorAt(currentSnapshotId);

        updateTotalSupply(rbAmount, refactorCounts_, 0);
    }

    /// helpers

    /**
     * @dev Calculate RAY BASED from RAY FACTORED
     */
    function _toRAYBased(uint256 rf) internal view returns (uint256 rb) {

        return rdiv2(rf, getFactor());
    }

    /**
     * @dev Calculate RAY FACTORED from RAY BASED
     */
    function _toRAYFactored(uint256 rb) internal view returns (uint256 rf) {
        return rmul2(rb, getFactor());
    }




    /// VIEW FUNCTIONS


    function applyFactor(uint256 v, uint256 refactoredCount, uint256 _factor, uint256 refactorCount) public view override returns (uint256)
    {
        if (v == 0) {
            return 0;
        }

        v = rmul2(v, _factor);

        for (uint256 i = refactoredCount; i < refactorCount; i++) {
            v = v * REFACTOR_DIVIDER ;
        }

        return v;
    }

    function currentFactorSnapshots() public view override
        returns (
                bool snapshotted,
                uint256 snapShotFactor,
                uint256 snapShotRefactorCount
        )
    {
        (snapshotted, snapShotFactor, snapShotRefactorCount) = _factorAt(currentSnapshotId);
    }

    function getCurrentSnapshotId() public view override returns (uint256) {
        return currentSnapshotId;
    }

    function balanceOf(address account) public view override returns (uint256)
    {
        return balanceOfAt(account, currentSnapshotId);
    }

    function balanceOfAt(address account, uint256 snapshotId)
        public view override returns (uint256)
    {
        if (snapshotId > 0) {
            (bool snapshotted1, uint256 balances, uint256 refactoredCounts, uint256 remains) = _balanceOfAt(account, snapshotId);
            (bool snapshotted2, uint256 factors, uint256 refactorCounts) = _factorAt(snapshotId);

            if (snapshotted1 && snapshotted2) {
                uint256 bal = applyFactor(balances, refactoredCounts, factors, refactorCounts);
                bal += remains;
                return bal;
            } else {
                return 0;
            }
        } else {
            return 0;
        }
    }

    function totalSupply() public view override returns (uint256)
    {
        return totalSupplyAt(currentSnapshotId);
    }

    function totalSupplyAt(uint256 snapshotId) public view override returns (uint256)
    {
        if (snapshotId > 0) {
            (bool snapshotted1, uint256 balances, uint256 refactoredCounts, uint256 remains) = _totalSupplyAt(snapshotId);
            (bool snapshotted2, uint256 factors, uint256 refactorCounts) = _factorAt(snapshotId);

            if (snapshotted1 &&  snapshotted2) {
                uint256 bal = applyFactor(balances, refactoredCounts, factors, refactorCounts);
                bal += remains;
                return bal;
            } else {
                return 0;
            }
        } else {
            return totalSupply();
        }
    }

    function lastSnapShotIndex() public view override returns (uint256)
    {
        if (totalSupplySnapshots.ids.length == 0) return 0;
        return totalSupplySnapshots.ids.length-1;
    }


    function getAccountBalanceSnapsByIds(uint256 id,  address account) public view override
        returns (uint256, uint256, uint256, uint256)
    {
        LibDTOS.BalanceSnapshots memory snapshot_ =  accountBalanceSnapshots[account];
        uint256 len = snapshot_.ids.length;
        if (id >= len){
            (uint256 refactoredCounts_, uint256 remains_) = _getRefactoredCounts(account, len-1);
            return (snapshot_.ids[len-1], snapshot_.balances[len-1], refactoredCounts_, remains_);
        } else {
            (uint256 refactoredCounts_, uint256 remains_) = _getRefactoredCounts(account, id);
            return (snapshot_.ids[id], snapshot_.balances[id], refactoredCounts_, remains_);
        }
    }

    function getAccountBalanceSnapsBySnapshotId(uint256 snapshotId, address account) public view override
        returns (uint256, uint256, uint256, uint256)
    {
        LibDTOS.BalanceSnapshots storage snapshot_ =  accountBalanceSnapshots[account];

        if (snapshot_.ids.length == 0) return (0,0,0,0);

        if (snapshotId > 0 && snapshotId <= currentSnapshotId) {
            uint256 id = snapshot_.ids.findIndex(snapshotId);
            (uint256 refactoredCounts, uint256 remains) = _getRefactoredCounts(account, id);
            return (snapshot_.ids[id], snapshot_.balances[id], refactoredCounts, remains);
        } else {
            return (0,0,0,0);
        }
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
        (, balance, refactoredCount, remain) = getAccountBalanceSnapsBySnapshotId(currentSnapshotId, account);

    }

    function getFactor() public view override returns (uint256 rb) {

        (, uint256 factor_,) = _factorAt(currentSnapshotId);

        return factor_;
    }
}
