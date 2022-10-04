// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../common/AccessibleCommon.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
//import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";

import "@openzeppelin/contracts/utils/Context.sol";
//import "@openzeppelin/contracts/utils/Counters.sol";

import "../interfaces/IRewardLPTokenManagerEvent.sol";
import "../interfaces/IRewardLPTokenManagerAction.sol";
import "../interfaces/IRewardPoolSnapshotAction.sol";

import {DSMath} from "../libraries/DSMath.sol";
import "../libraries/LibRewardLPToken.sol";

import "hardhat/console.sol";


interface IIRewardPoolSnapshotAction {
    function getFactor() external view returns (uint256);
    function dTosBaseRate() external view returns (uint256);
    function transferFrom(address from, address to, uint256 tokenId, uint256 amount, uint256 factoredAmount) external ;
}

contract RewardLPTokenManager is
    Context,
    AccessibleCommon,
    ERC721,
    ERC721Pausable,
    DSMath,
    IRewardLPTokenManagerEvent,
    IRewardLPTokenManagerAction
{
    //using Counters for Counters.Counter;

    bytes32 public constant USER_ROLE = keccak256("USER_ROLE");

    uint256 private _tokenIdTracker;

    string private _baseTokenURI;

    address public dtos;

    // rewardTokenId
    mapping(uint256 => LibRewardLPToken.RewardTokenInfo) public deposits;

    // user -> rewardTokenIds
    mapping(address => uint256[]) public userTokens;
    mapping(address => mapping(uint256 => uint256)) public userTokenIndexs;

    modifier zeroAddress(address addr) {
        require(addr != address(0), "zero address");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721(name, symbol) {
        _baseTokenURI = baseTokenURI;

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(ADMIN_ROLE, _msgSender());
        // _setupRole(MINTER_ROLE, _msgSender());
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseTokenURI(string memory baseTokenURI) external onlyOwner {
        require(keccak256(bytes(_baseTokenURI)) != keccak256(bytes(baseTokenURI)),"same value");
        _baseTokenURI = baseTokenURI;
    }

    function setDtos(address _dtos) external onlyOwner {
        require(_dtos != address(0),"zero address");
        require(dtos != _dtos,"same");

        dtos = _dtos;
    }


    function pause() public virtual onlyOwner {
        //require(hasRole(ADMIN_ROLE, _msgSender()), "RewardLPTokenManager: must have pauser role to pause");
        _pause();
    }

    function unpause() public virtual onlyOwner {
        //require(hasRole(ADMIN_ROLE, _msgSender()), "RewardLPTokenManager: must have pauser role to unpause");
        _unpause();
    }

    // 발행은 리워드 풀에 의해서만 가능하다. 리워드 풀에서 스테이킹할때만 가능
    function mint(
        address to,
        address rewardPool,
        uint256 poolTokenId,
        uint256 tosAmount,
        uint256 factoredAmount
    ) external override whenNotPaused zeroAddress(dtos) returns (uint256) {
        // require(hasRole(MINTER_ROLE, _msgSender()), "RewardLPTokenManager: must have minter role to mint");
        require(hasRole(ADMIN_ROLE, _msgSender()), "RewardLPTokenManager: must have minter role to mint");

        _tokenIdTracker++;

        uint256 tokenId = _tokenIdTracker;

        deposits[tokenId] = LibRewardLPToken.RewardTokenInfo({
            rewardPool: rewardPool,
            owner: to,
            poolTokenId: poolTokenId,
            tosAmount: tosAmount,
            usedAmount: 0,
            stakedTime: block.timestamp,
            factoredAmount: factoredAmount
        });


        _mint(to, tokenId);

        addUserToken(to, tokenId);

        emit MintedRewardToken(tokenId, to, rewardPool, poolTokenId, tosAmount);
        return tokenId;
    }

    // 소각은 리워드 풀에 의해서만 가능하다. 리워드 풀에서 언스테이크 할때만 가능
    function burn(
        uint256 tokenId
    ) external override whenNotPaused zeroAddress(dtos) {
        // console.log("IIRewardLPTokenManager burn tokenId %s", tokenId) ;
        // require(hasRole(MINTER_ROLE, _msgSender()), "RewardLPTokenManager: must have role to burn");
        require(hasRole(ADMIN_ROLE, _msgSender()), "RewardLPTokenManager: must have role to burn");

        LibRewardLPToken.RewardTokenInfo memory info = deposits[tokenId];

        // uint256 amount = mintableAmount(tokenId);
        // uint256 balance = IDTOS(dtos).balanceOf(info.owner);

        // if(amount <= balance) IDTOS(dtos).burn(info.owner, amount);
        // else IDTOS(dtos).burn(info.owner, balance);

        // LibRewardLPToken.RewardTokenInfo memory info = deposits[tokenId];
        address _tokenOwner = deposits[tokenId].owner;
        address _rewardPool = deposits[tokenId].rewardPool;
        uint256 _poolTokenId = deposits[tokenId].poolTokenId;
        _burn(tokenId);

        deleteUserToken(_tokenOwner, tokenId);
        delete deposits[tokenId];

        emit BurnedRewardToken(tokenId, _tokenOwner, _rewardPool, _poolTokenId);
    }

    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721){
        if(from != address(0) && to != address(0)){
            LibRewardLPToken.RewardTokenInfo storage info = deposits[tokenId];
            info.owner = to;

            IIRewardPoolSnapshotAction(info.rewardPool).transferFrom(
                    from,
                    to,
                    info.poolTokenId,
                    info.tosAmount,
                    info.factoredAmount
                );

            deleteUserToken(from, tokenId);
            addUserToken(to, tokenId);
        }
        super._transfer(from, to, tokenId);
    }

    function balanceOf(address _rewardPool, uint256 factoredAmount) public view returns (uint256) {
        if (_rewardPool == address(0) || factoredAmount == 0) return 0;
        if (IIRewardPoolSnapshotAction(_rewardPool).dTosBaseRate() == 0) return 0;
        uint256 factor = IIRewardPoolSnapshotAction(_rewardPool).getFactor();
        if (factor == 0) return 0;
        return wmul2(factoredAmount, factor);
    }

    function usableAmount(
        uint256 tokenId
    ) public view override whenNotPaused returns (uint256){
        uint256 dTosBalance = balanceOf(deposits[tokenId].rewardPool, deposits[tokenId].factoredAmount);
        if (dTosBalance == 0 || dTosBalance <= deposits[tokenId].usedAmount) return 0;
        return (dTosBalance - deposits[tokenId].usedAmount);
    }


    function usableAmounts(
        uint256[] memory tokenIds
    ) external view override whenNotPaused returns (uint256[] memory){
        uint256[] memory amounts = new uint256[](tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            amounts[i] = usableAmount(tokenIds[i]);
        }
        return amounts;
    }
    /*
    function useAll(uint256 tokenId) public override whenNotPaused {
        use(tokenId, usableAmount(tokenId));
    }

    function multiUseAll(uint256[] memory tokenIds) public override whenNotPaused {
        require( tokenIds.length > 0,"wrong length");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            useAll(tokenIds[i]);
        }
    }

    */
    function use(
        uint256 tokenId,
        uint256 amount
    ) public override whenNotPaused {

        require(hasRole(USER_ROLE, _msgSender()), "RewardLPTokenManager: must have user role to use");
        require(amount > 0, "zero amount");
        require(amount <= usableAmount(tokenId), "usabeAmount is insufficient");
        LibRewardLPToken.RewardTokenInfo storage info = deposits[tokenId];

        info.usedAmount += amount;

        emit UsedRewardToken(tokenId, amount);
    }

    function multiUse(
        uint256[] memory tokenIds,
        uint256[] memory amounts
    ) external override whenNotPaused {
        require(
            tokenIds.length == amounts.length && tokenIds.length > 0
            ,"wrong length");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            use(tokenIds[i], amounts[i]);
        }
    }

    function tokensOfOwner(address account) external view override returns (uint256[] memory)
    {
        return userTokens[account];
    }

    function userTokenCount(address account) public view returns (uint256)
    {
        return userTokens[account].length;
    }

    function userToken(address account, uint256 _index) external view returns (uint256)
    {
        require(_index < userTokens[account].length, "wrong index");
        return userTokens[account][_index];
    }

    function deposit(uint256 tokenId) external view override returns (LibRewardLPToken.RewardTokenInfo memory)
    {
        return deposits[tokenId];
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721, ERC721Pausable) whenNotPaused {
        // super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControl, ERC721)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function addUserToken(address user, uint256 tokenId) internal {
        userTokenIndexs[user][tokenId] = userTokens[user].length;
        userTokens[user].push(tokenId);

        console.log("addUserToken %s , userTokenIndexs : %s ,userTokens: %s ",user, userTokenIndexs[user][tokenId], userTokens[user][userTokenIndexs[user][tokenId]] );
    }

    function deleteUserToken(address user, uint256 tokenId) internal {
         console.log("deleteUserToken %s %s", user, tokenId);
        uint256 _index = userTokenIndexs[user][tokenId];
        console.log("userTokenIndexs %s", _index);

        uint256 _lastIndex = userTokens[user].length-1;
        console.log("userTokenIndexs _lastIndex %s", _lastIndex);

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

}