// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "./RewardPoolStorage.sol";
import "../interfaces/IERC20Minimal.sol";

import "../interfaces/IRewardPoolEvent.sol";
import "../interfaces/IRewardPoolAction.sol";

import "../libraries/UniswapV3LiquidityEvaluator.sol";

interface IIERC721{
    function ownerOf(uint256 tokenId) external view returns (address owner);
}


contract RewardPool is RewardPoolStorage, IRewardPoolEvent, IRewardPoolAction {

    function stake(uint256 tokenId) external override {
        require(IIERC721(address(nonfungiblePositionManager)).ownerOf(tokenId) == msg.sender, "tokenId is not yours.");
        nonfungiblePositionManager.transferFrom(msg.sender, address(this), tokenId);
        _stake(msg.sender, tokenId);
    }

    function unstake(uint256 tokenId) external override {

        require(IIERC721(address(nonfungiblePositionManager)).ownerOf(tokenId) == msg.sender, "owner is not you.");

        deleteTokenInPool(tokenId);
        deleteUserToken(msg.sender, tokenId);
        nonfungiblePositionManager.transferFrom(address(this), msg.sender, tokenId);

        emit Unstaked(msg.sender, tokenId);
    }

    function transferFrom(address from, address to, uint256 tokenId) external override {

        require(msg.sender == address(rewardLPTokenManager), "sender is not rewardLPTokenManager.");

        uint256 _index = userTokenIndexs[from][tokenId];
        require(_index > 0,"It's not from's token");

        deleteUserToken(from, tokenId);
        addUserToken(to, tokenId);
        emit TransferFrom(from, to, tokenId);
    }

    function evaluateTOS(uint256 tokenId, address token0, address token1) public view returns (uint256 tosAmount) {

        tosAmount = 0;
        (uint256 amount0, uint256 amount1) = UniswapV3LiquidityEvaluator.getAmounts(
            address(nonfungiblePositionManager), address(pool),tokenId
        );

        if(token0 == tosAddress){
            tosAmount += amount0;
            // caculate with the ratio price0, price1
            //tosAmount += amount0;
        }
        if(token1 == tosAddress) {
            tosAmount += amount1;
            // caculate with the ratio price0, price1
            //tosAmount += amount0;
        }
    }

    function _stake(address sender, uint256 tokenId) internal {

        (,, address token0, address token1,,int24 tickLower, int24 tickUpper, uint128 liquidity,,,,)
            = nonfungiblePositionManager.positions(tokenId);

        require(liquidity > 0, "zero liquidity");

        (,int24 tick,,,,,) = pool.slot0();
        require(tickLower < tick && tick < tickUpper, "tick is out of range");

        uint256 tosAmount = evaluateTOS(tokenId, token0, token1);

        uint256 rTokenId = rewardLPTokenManager.mint(sender, address(pool), tokenId, tosAmount, liquidity);

        addTokenInPool(tokenId);
        addUserToken(sender, tokenId);

        totalTOS += tosAmount;
        totalLiquidity += liquidity;

        emit Staked(sender, tokenId);
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


    function onERC721Received(address from, address sender, uint256 tokenId, bytes calldata data) external returns (bytes4){
        // console.log('onERC721Received from %s', from);
        // console.log('onERC721Received sender %s', sender);
        // console.log('onERC721Received tokenId %s', tokenId);
        require(msg.sender == address(nonfungiblePositionManager), "operator is not nonfungiblePositionManager");
        _stake(from, tokenId);

        return this.onERC721Received.selector;
    }
}