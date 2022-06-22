// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "./RewardPoolSnapshotStorage.sol";

import "../common/AccessibleCommon.sol";

import "../interfaces/IERC20Minimal.sol";

import "../interfaces/IRewardPoolSnapshotEvent.sol";
import "../interfaces/IRewardPoolSnapshotAction.sol";

import {DSMath} from "../libraries/DSMath.sol";
import "../libraries/TOSEvaluator.sol";
import "../libraries/LibRewardLPToken.sol";
import "../libraries/LibFactorSnapshot.sol";
import "../libraries/SArrays.sol";
import "../libraries/ABDKMath64x64.sol";

import "hardhat/console.sol";

interface IIERC721{
    function ownerOf(uint256 tokenId) external view returns (address owner);
}

interface IIERC20{
    function decimals() external view returns (uint256);
}
interface IIDTOSManager{
    function mintNFT(
        address to,
        uint256 poolTokenId,
        uint256 tosAmount,
        uint256 factoredAmount
    ) external returns (uint256);

    function burn(
        uint256 tokenId
    ) external;
}

contract RewardPoolSnapshot is RewardPoolSnapshotStorage, AccessibleCommon, DSMath, IRewardPoolSnapshotEvent, IRewardPoolSnapshotAction {

    using SArrays for uint256[];

    constructor () {
    }

    function stake(uint256 tokenId) external override onlyNoExecPause {

        require(IIERC721(address(nonfungiblePositionManager)).ownerOf(tokenId) == msg.sender, "tokenId is not yours.");
        nonfungiblePositionManager.transferFrom(msg.sender, address(this), tokenId);
        _stake(msg.sender, tokenId);
    }

    function unstake(uint256 tokenId) external override onlyNoExecPause {

        _unstake(msg.sender, tokenId);
        nonfungiblePositionManager.transferFrom(address(this), msg.sender, tokenId);
    }

    function transferFrom(address from, address to, uint256 tokenId, uint256 amount, uint256 factoredAmount) external override onlyNoExecPause {

        require(msg.sender == address(rewardLPTokenManager), "sender is not rewardLPTokenManager.");

        uint256 _index = userTokenIndexs[from][tokenId];
        require(_index > 0,"It's not from's token");

        deleteUserToken(from, tokenId);
        addUserToken(to, tokenId);

        rebase();
        _transfer(from, to, amount, factoredAmount);

        emit TransferFrom(from, to, tokenId, amount, factoredAmount);
    }

    function evaluateTOS(uint256 tokenId, address token0, address token1) public view override returns (uint256 tosAmount) {

        tosAmount = 0;

        (uint256 amount0, uint256 amount1) = TOSEvaluator.getAmounts(
            address(nonfungiblePositionManager), address(pool), tokenId
        );

        if(token0 == tosAddress){
            tosAmount += amount0;
            uint256 price = TOSEvaluator.getPriceToken1(address(pool));
            // console.log("token0 == tosAddress price %s", price);
            // console.log("amount1 %s", amount1);
            if(price > 0) tosAmount += price * amount1 / (10**IIERC20(token1).decimals());
        }
        if(token1 == tosAddress) {
            tosAmount += amount1;
            uint256 price = TOSEvaluator.getPriceToken0(address(pool));
            // console.log("token1 == tosAddress price %s", price);
            // console.log("amount0 %s", amount0);
            if(price > 0){
                tosAmount += price * amount0 / (10**IIERC20(token0).decimals());
            }
        }
        // console.log("tosAmount %s", tosAmount);
    }

    function _stake(address sender, uint256 tokenId) internal {

        (,, address token0, address token1, , int24 tickLower, int24 tickUpper, uint128 liquidity,,,,)
            = nonfungiblePositionManager.positions(tokenId);

        require(liquidity > 0, "zero liquidity");

        (,int24 tick,,,,,) = pool.slot0();
        require(tickLower < tick && tick < tickUpper, "out of range");

        rebase();

        uint256 tosAmount = evaluateTOS(tokenId, token0, token1);
        require(tosAmount > 0, "tosAmount is zero");
        uint256 dtosAmount = tosToDtosAmount(tosAmount);
        uint256 factoredAmount = 0;

        uint256 factor = getFactor();

        if(dtosAmount > 0) factoredAmount = wdiv2(dtosAmount, factor);
        console.log("factoredAmount %s", factoredAmount);

        uint256 rTokenId = IIDTOSManager(dtosManagerAddress).mintNFT(sender, tokenId, tosAmount, factoredAmount);
        /*
        rewardLPs[tokenId] = rTokenId;

        addTokenInPool(tokenId);
        addUserToken(sender, tokenId);
        console.log('tokenId %s , rTokenId %s', tokenId, rTokenId);

        _mint(sender, tosAmount, factoredAmount);

        totalLiquidity += liquidity;

        emit Staked(sender, rTokenId, tokenId, tosAmount, dtosAmount, factoredAmount, liquidity);
        */
    }

    function tosToDtosAmount(uint256 _amount) public view virtual override returns (uint256) {
        return (_amount *  dTosBaseRate / 10**18);
    }

    function _unstake(address sender, uint256 tokenId) internal {
        uint256 rTokenId = rewardLPs[tokenId];
        require(rTokenId > 0, "zero rTokenId");
        LibRewardLPToken.RewardTokenInfo memory info = rewardLPTokenManager.deposit(rTokenId);

        require(info.rewardPool == address(this), "not pool's token");
        require(info.owner == sender, "not owner");
        require(info.poolTokenId == tokenId, "not same token");

        //rewardLPTokenManager.burn(rTokenId);
        IIDTOSManager(dtosManagerAddress).burn(rTokenId);

        deleteTokenInPool(tokenId);
        deleteUserToken(sender, tokenId);

        rebase();

        _burn(sender, info.tosAmount, info.factoredAmount);
        // totalLiquidity -= info.liquidity;
        rewardLPs[tokenId] = 0;

        emit Unstaked(sender, tokenId, info.tosAmount, info.factoredAmount, rTokenId);
    }

    function _burn(
        address account,
        uint256 amount,
        uint256 factoredAmount
    ) internal {

        require(account != address(0), "RewardPool: burn to the zero address");
        require(amount > 0 && factoredAmount > 0, "RewardPool: zero amount");

        (, uint256 _value, uint256 _factoredAmount) = _valueAt(getCurrentSnapshotId(), accountBalanceSnapshots[account]);
        (, uint256 value_, uint256 factoredAmount_) = _valueAt(getCurrentSnapshotId(), totalSupplySnapshots);

        uint256 amount0 = amount;
        if (_value < amount)  amount0 = _value;
        if (value_ < amount0) amount0 = value_;

        uint256 amount1 = factoredAmount;
        if (_factoredAmount < factoredAmount)  amount1 = _factoredAmount;
        if (factoredAmount_ < amount1) amount1 = factoredAmount_;

        updateAccount(account, _value - amount0, _factoredAmount - amount1);
        updateTotalSupply(value_ - amount0, factoredAmount_ - amount1);
    }

    function _mint(address account, uint256 amount, uint256 factoredAmount) internal virtual {
        require(account != address(0), "RewardPool: mint to the zero address");
        require(amount > 0 && factoredAmount > 0, "RewardPool: zero amount");
        console.log('_mint %s %s %s', account, amount, factoredAmount );

        if (currentSnapshotId == 0) currentSnapshotId++;

        (, uint256 _value, uint256 _factoredAmount) = _valueAt(getCurrentSnapshotId(), accountBalanceSnapshots[account]);
        (, uint256 value_, uint256 factoredAmount_) = _valueAt(getCurrentSnapshotId(), totalSupplySnapshots);

        updateAccount(account, _value + amount, _factoredAmount + factoredAmount);
        updateTotalSupply(value_ + amount, factoredAmount_ + factoredAmount);
    }

    function _transfer(
        address from,
        address to,
        uint256 amount,
        uint256 factoredAmount
    ) internal {

        require(from != address(0) && to != address(0), "RewardPool: zero address");
        require(amount > 0 && factoredAmount > 0, "RewardPool: zero amount");

        (, uint256 _valueFrom, uint256 _factoredAmountFrom) = _valueAt(getCurrentSnapshotId(), accountBalanceSnapshots[from]);
        (, uint256 _valueTo, uint256 _factoredAmountTo) = _valueAt(getCurrentSnapshotId(), accountBalanceSnapshots[to]);

        uint256 amount0 = amount;
        if (_valueFrom < amount)  amount0 = _valueFrom;

        uint256 amount1 = factoredAmount;
        if (_factoredAmountFrom < factoredAmount)  amount1 = _factoredAmountFrom;

        updateAccount(from, _valueFrom - amount0, _factoredAmountFrom - amount1);
        updateAccount(to, _valueTo + amount0, _factoredAmountTo + amount1);
    }


    function updateAccount(address account, uint256 amount, uint256 factoredAmount) internal {

        _updateBalanceSnapshots(
            accountBalanceSnapshots[account],
            account,
            amount,
            factoredAmount
            );
    }

    function updateTotalSupply(uint256 amount, uint256 factoredAmount) internal {

        _updateBalanceSnapshots(
            totalSupplySnapshots,
            address(0),
            amount,
            factoredAmount
            );
    }

    function _updateBalanceSnapshots(
            LibFactorSnapshot.Snapshots storage snapshots,
            address account,
            uint256 balances,
            uint256 factoredAmount
    ) internal  {

        uint256 currentId = currentSnapshotId;

        uint256 index = _lastSnapshotId(snapshots.ids);

        console.log('_updateBalanceSnapshots %s %s', currentId, index);

        if (index < currentId) {
            console.log('1. push %s %s', currentId, balances, factoredAmount);
            snapshots.ids.push(currentId);
            snapshots.values.push(balances);
            snapshots.factoredAmounts.push(factoredAmount);
        } else if (snapshots.ids.length > 0){
            snapshots.values[snapshots.ids.length-1] = balances;
            snapshots.factoredAmounts[snapshots.ids.length-1] = factoredAmount;
        } else {
            console.log('2. push %s %s', currentId, balances, factoredAmount);
            snapshots.ids.push(currentId);
            snapshots.values.push(balances);
            snapshots.factoredAmounts.push(factoredAmount);
        }

        emit UpdatedBalanceSnapshots(account, balances, factoredAmount);
    }

    function addTokenInPool(uint256 tokenId) internal {
        stakedTokensInPoolIndexs[tokenId] = stakedTokensInPool.length;
        stakedTokensInPool.push(tokenId);
    }

    function deleteTokenInPool(uint256 tokenId) internal {
        uint256 _index = stakedTokensInPoolIndexs[tokenId];
        uint256 _lastIndex = stakedTokensInPool.length-1;
        if(_index == _lastIndex){
            delete stakedTokensInPoolIndexs[tokenId];
            stakedTokensInPool.pop();
        } else {
            stakedTokensInPool[_index] = stakedTokensInPool[_lastIndex];
            stakedTokensInPoolIndexs[stakedTokensInPool[_index]] = _index;
            delete stakedTokensInPoolIndexs[tokenId];
            stakedTokensInPool.pop();
        }
    }

    function addUserToken(address user, uint256 tokenId) internal {
        userTokenIndexs[user][tokenId] = userTokens[user].length;
        userTokens[user].push(tokenId);
    }

    function deleteUserToken(address user, uint256 tokenId) internal {

        uint256 _index = userTokenIndexs[user][tokenId];
        uint256 _lastIndex = userTokens[user].length-1;
        if(_index == _lastIndex){
            delete userTokenIndexs[user][tokenId];
            userTokens[user].pop();
        } else {
            userTokens[user][_index] = userTokens[user][_lastIndex];
            userTokenIndexs[user][userTokens[user][_index]] = _index;
            delete userTokenIndexs[user][tokenId];
            userTokens[user].pop();
        }
    }

    function onERC721Received(address from, address sender, uint256 tokenId, bytes calldata data) external onlyNoExecPause returns (bytes4){
        require(msg.sender == address(nonfungiblePositionManager), "operator is not nonfungiblePositionManager");
        _stake(from, tokenId);
        return this.onERC721Received.selector;
    }

    /// Can Anybody

    function snapshot() public override returns (uint256) {
        return _snapshot();
    }

    function balanceOf(address account) public view virtual  override returns (uint256) {
        return balanceOfAt(account, getCurrentSnapshotId());
    }

    function totalSupply() public view virtual override returns (uint256) {
        return totalSupplyAt(getCurrentSnapshotId());
    }

    function depositAmount(address account) public view virtual override returns (uint256) {
        return depositAmountOfAt(account, getCurrentSnapshotId());
    }

    function totalDepositAmount() public view virtual override returns (uint256) {
        return totalDepositAmountOfAt(getCurrentSnapshotId());
    }

    function balanceOfAt(address account, uint256 snapshotId) public view virtual override returns (uint256) {

        if (dTosBaseRate == 0) return 0;

        (bool snapshotted, uint256 values, uint256 factoredAmount) = _valueAt(snapshotId, accountBalanceSnapshots[account]);
        console.log('balanceOfAt %s  %s', values, factoredAmount);
        if (snapshotted) {
             console.log('balanceOfAt snapshotted true , factoredAmount %s', factoredAmount);
            if (factoredAmount > 0) {
                (bool factorSnapshotted, uint256 factor) = _factorAt(snapshotId);
                console.log('factoredAmount %s , factor %s ', factoredAmount, factor);
                if (factorSnapshotted) return wmul2(factoredAmount, factor);
                else return wmul2(factoredAmount, DEFAULT_FACTOR);

            } else {
                return 0;
            }
        } else {
            console.log('balanceOfAt snapshotted false');
            return balanceOf(account);
        }

        /*
        if (snapshotted) {
            if (factoredAmount > 0) {
                (bool factorSnapshotted, uint256 factor) = _factorAt(snapshotId);
                uint256 dtosAmount = tosToDtosAmount(values);

                uint256 factoredAmount = 0;
                if(dtosAmount > 0) factoredAmount = wdiv2(dtosAmount, factor);

                if (factorSnapshotted) return wmul2(factoredAmount, factor);
                else return wmul2(factoredAmount, DEFAULT_FACTOR);

            } else {
                return 0;
            }
        } else {
            return balanceOf(account);
        }
        */


    }

    function totalSupplyAt(uint256 snapshotId) public view virtual override returns (uint256) {
        (bool snapshotted, , uint256 factoredAmount) = _valueAt(snapshotId, totalSupplySnapshots);

        if (snapshotted) {
            if (factoredAmount > 0) {
                (bool factorSnapshotted, uint256 factor) = _factorAt(snapshotId);

                if (factorSnapshotted) return wmul2(factoredAmount, factor);
                else return wmul2(factoredAmount, DEFAULT_FACTOR);

            } else {
                return 0;
            }
        } else {
            return totalSupply();
        }
    }


    function depositAmountOfAt(address account, uint256 snapshotId) public view virtual override returns (uint256) {
        (bool snapshotted, uint256 value, ) = _valueAt(snapshotId, accountBalanceSnapshots[account]);

        return snapshotted ? value : depositAmount(account);
    }

    function totalDepositAmountOfAt(uint256 snapshotId) public view virtual override returns (uint256) {
        (bool snapshotted, uint256 value, ) = _valueAt(snapshotId, totalSupplySnapshots);

        return snapshotted ? value : totalDepositAmount();
    }


    function getCurrentSnapshotId() public view  override returns (uint256) {
        return currentSnapshotId;
    }

    /// Internal Functions

    function _snapshot() internal virtual returns (uint256) {
        currentSnapshotId++;
        uint256 currentId = getCurrentSnapshotId();
        emit Snapshot(currentId);
        return currentId;
    }

    function _valueAt(uint256 snapshotId, LibFactorSnapshot.Snapshots storage snapshots) internal view returns (bool, uint256, uint256) {
        console.log('_valueAt snapshotId %s ', snapshotId  );

        console.log('snapshots.ids.length %s ', snapshots.ids.length  );
        if(snapshots.ids.length == 0 || currentSnapshotId == 0) return (true, 0, 0);
        if(snapshotId == 0){
            if(snapshots.ids.length == 0) return (true, 0, 0);
            else {
                console.log('_valueAt snapshots.values[0] %s, snapshots.factoredAmounts[0] %s', snapshots.values[0], snapshots.factoredAmounts[0]);
                return (true, snapshots.values[0], snapshots.factoredAmounts[0]);
            }
        }
        // require(snapshotId > 0, "RewardPool: id is 0");
        require(snapshotId <= getCurrentSnapshotId(), "RewardPool: nonexistent id");

        uint256 index = snapshots.ids.findUpperBound(snapshotId);
        console.log("_valueAt index %s", index);
        if (index == snapshots.ids.length) {
            return (false, 0, 0);
        } else {
            return (true, snapshots.values[index], snapshots.factoredAmounts[index]);
        }
    }

    function _factorAt(uint256 snapshotId) internal view virtual returns (bool, uint256) {

        LibFactorSnapshot.FactorSnapshots storage snapshots = factorSnapshots;
        // console.log("_factorAt snapshotId %s", snapshotId);

        if (snapshotId > 0 && snapshotId <= currentSnapshotId) {
            uint256 index = snapshots.ids.findIndex(snapshotId);

            // console.log("_factorAt index %s", index);
            // console.log("_factorAt snapshots.ids.length %s", snapshots.ids.length);

            if (index == snapshots.ids.length) {
                return (false, DEFAULT_FACTOR);
            } else {
                // console.log("_factorAt snapshots.factors[index] %s", snapshots.factors[index]);
                return (true, snapshots.factors[index]);
            }
        } else {
            return (false, DEFAULT_FACTOR);
        }
    }

    function _lastSnapshotId(uint256[] storage ids) internal view returns (uint256) {
        if (ids.length == 0) {
            return 0;
        } else {
            return ids[ids.length - 1];
        }
    }

    ///

    function changeInitializeAddress (
        address factory,
        address npm,
        address rlpm,
        address tos,
        address dtos,
        address policy
    )
        external
        nonZeroAddress(factory)
        nonZeroAddress(npm)
        nonZeroAddress(rlpm)
        nonZeroAddress(tos)
        nonZeroAddress(dtos)
        nonZeroAddress(policy)
        onlyOwner
    {
        require(
            factory != address(uniswapV3Factory)
            || npm != address(nonfungiblePositionManager)
            || rlpm != address(rewardLPTokenManager)
            || tos != tosAddress
            || dtos != dtosManagerAddress
            || policy != dtosPolicy
            , "same all address");

        uniswapV3Factory = IUniswapV3Factory(factory);
        nonfungiblePositionManager = INonfungiblePositionManager(npm);
        rewardLPTokenManager = IRewardLPTokenManagerAction(rlpm);
        tosAddress = tos;
        dtosManagerAddress = dtos;
        dtosPolicy = policy;
    }

    function execPause(bool flag) external override onlyPolicy
    {
        require(execPauseFlag != flag, "same value");
        execPauseFlag = flag;
    }

    function setDtosBaseRate (
        uint256 _baseRates
    )
        external override onlyDTOSManager
    {

        require(dTosBaseRate != _baseRates, "same value");

        dTosBaseRate = _baseRates;
    }

    function setRebaseInfo(uint256 _period, uint256 _interest)
        external override
        nonZero(_period)
        onlyDTOSManager
    {
        require(rebaseIntervalSecond != _period || interestRatePerRebase != _interest, "same rebase period or rate");

        rebaseIntervalSecond = _period;
        interestRatePerRebase = _interest;
    }

    function rebase() internal
    {
        if (rebaseIntervalSecond > 0 && interestRatePerRebase > 0) {
            uint256 curTime = block.timestamp;
            uint256 total = totalSupply();
            uint256 period = 0;

            if ( (lastRebaseTime == 0 && total > 0) || total == 0) {
                lastRebaseTime = curTime;
            } else if (curTime > lastRebaseTime && total > 0 ) {

                period = (curTime - lastRebaseTime) / rebaseIntervalSecond;

                if(period > 0){
                    uint256 prevFactor = getFactor();
                    uint256 addAmount = compound(total, interestRatePerRebase, period);

                    uint256 newFactor = _calcNewFactor(total, addAmount, prevFactor);

                    _setFactor(newFactor);

                    lastRebaseTime = curTime;
                    emit Rebased(prevFactor, getFactor(), lastRebaseTime, addAmount, addAmount-total);
                }
            }
        }
    }

    function _setFactor(uint256 _factor) internal
    {
        uint256 currentId = currentSnapshotId;
        LibFactorSnapshot.FactorSnapshots storage snapshots = factorSnapshots;

        uint256 index = _lastSnapshotId(snapshots.ids);
        if (index < currentId) {
            snapshots.ids.push(currentId);
            snapshots.factors.push(_factor);
        } else {
            snapshots.factors[snapshots.ids.length-1] = _factor;
        }
    }

    function _calcNewFactor(uint256 source, uint256 target, uint256 oldFactor) internal pure returns (uint256) {
        return wdiv(wmul(target, oldFactor), source);
    }

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

    function getFactor() public view override returns (uint256 f) {
        (, uint256 factor_) = _factorAt(currentSnapshotId);
        return factor_;
    }

    function allUserTokens(address account) external view returns (uint256[] memory) {
        return userTokens[account];
    }

    function userTokenCount(address account) public view returns (uint256) {
        return userTokens[account].length;
    }

    function userToken(address account, uint256 _index) external view returns (uint256) {
        require(_index < userTokenCount(account), "wrong index");
        return userTokens[account][_index];
    }
}