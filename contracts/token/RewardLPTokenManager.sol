// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../common/AccessibleCommon.sol";
//import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
//import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
//import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "../interfaces/IRewardLPTokenManagerEvent.sol";
import "../interfaces/IRewardLPTokenManagerAction.sol";

import "../libraries/LibRewardLPToken.sol";

contract RewardLPTokenManager is
    Context,
    AccessibleCommon,
    ERC721Enumerable,
    ERC721Pausable,
   //ERC721Holder,
    IRewardLPTokenManagerEvent,
    IRewardLPTokenManagerAction
{
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdTracker;

    string private _baseTokenURI;

    mapping(uint256 => LibRewardLPToken.RewardTokenInfo) public deposits;


    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721(name, symbol) {
        _baseTokenURI = baseTokenURI;

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(ADMIN_ROLE, _msgSender());
        _setupRole(MINTER_ROLE, _msgSender());
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    // 발행은 리워드 풀에 의해서만 가능하다. 리워드 풀에서 스테이킹할때만 가능
    function mint(
        address to,
        address pool,
        uint256 poolTokenId,
        uint256 tosAmount,
        uint128 liquidity
    ) external override whenNotPaused {

        require(hasRole(MINTER_ROLE, _msgSender()), "RewardLPTokenManager: must have minter role to mint");

        uint256 tokenId = _tokenIdTracker.current();
        _mint(to, tokenId);

        deposits[tokenId] = LibRewardLPToken.RewardTokenInfo({
            pool: pool,
            owner: to,
            poolTokenId: poolTokenId,
            tosAmount: tosAmount,
            usedAmount: 0,
            stakedTime: block.timestamp,
            liquidity: liquidity
        });

        _tokenIdTracker.increment();

        emit MintedRewardToken(tokenId, to, pool, poolTokenId);
    }

    // 소각은 리워드 풀에 의해서만 가능하다. 리워드 풀에서 언스테이크 할때만 가능
    function burn(
        uint256 tokenId
    ) external override whenNotPaused {

        require(
            hasRole(MINTER_ROLE, _msgSender())
            , "RewardLPTokenManager: must have minter role to burn"
        );

        LibRewardLPToken.RewardTokenInfo memory info = deposits[tokenId];

        _burn(tokenId);
        delete deposits[tokenId];

        emit BurnedRewardToken(tokenId, info.owner, info.pool, info.poolTokenId);
    }


    function pause() public virtual onlyOwner {
        //require(hasRole(ADMIN_ROLE, _msgSender()), "RewardLPTokenManager: must have pauser role to pause");
        _pause();
    }

    function unpause() public virtual onlyOwner {
        //require(hasRole(ADMIN_ROLE, _msgSender()), "RewardLPTokenManager: must have pauser role to unpause");
        _unpause();
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721Enumerable, ERC721Pausable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControl, ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}