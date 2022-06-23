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
import "../interfaces/IRewardPoolAction.sol";

import {DSMath} from "../libraries/DSMath.sol";
import "../libraries/LibRewardLPToken.sol";

import "hardhat/console.sol";

interface IIDTOS {
    function getFactor() external view returns (uint256);
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
        _setupRole(MINTER_ROLE, _msgSender());
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
        require(_msgSender() == dtos, "RewardLPTokenManager: sender is not dtosManager");

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
        // console.log("nft mint tokenId %s ",tokenId);

        addUserToken(to, tokenId);

        emit MintedRewardToken(tokenId, to, rewardPool, poolTokenId, tosAmount);
        return tokenId;
    }
    /*
    function mintableAmount(uint256 tokenId) public view returns (uint256 amount) {
        LibRewardLPToken.RewardTokenInfo memory info = deposits[tokenId];
        uint256 factor = IIDTOS(dtos).getFactor();

        if(info.dtosPrincipal > 0 && info.dtosFactor > 0 && factor > 0) {
            uint256 oldBalance = wdiv2(info.dtosPrincipal, info.dtosFactor);
            uint256 balance =  wmul2(oldBalance, factor);
            amount = balance;
            if(amount >= info.usedAmount) amount -= info.usedAmount;
            else amount = 0;
        }
    }
    */

    // 소각은 리워드 풀에 의해서만 가능하다. 리워드 풀에서 언스테이크 할때만 가능
    function burn(
        uint256 tokenId
    ) external override whenNotPaused zeroAddress(dtos) {

        //require(hasRole(MINTER_ROLE, _msgSender()), "RewardLPTokenManager: must have role to burn");
        require(_msgSender() == dtos, "RewardLPTokenManager: sender is not dtosManager");

        LibRewardLPToken.RewardTokenInfo memory info = deposits[tokenId];

        // uint256 amount = mintableAmount(tokenId);
        // uint256 balance = IDTOS(dtos).balanceOf(info.owner);

        // if(amount <= balance) IDTOS(dtos).burn(info.owner, amount);
        // else IDTOS(dtos).burn(info.owner, balance);

        _burn(tokenId);
        deleteUserToken(info.owner, tokenId);

        delete deposits[tokenId];

        emit BurnedRewardToken(tokenId, info.owner, info.rewardPool, info.poolTokenId);
    }

    /*
    function usableAmount(address account)
        public view
        returns (uint256 dtosBalance, uint256 tosAmount, uint256 usedAmount)
    {

        dtosBalance = 0;
        tosAmount = 0;
        usedAmount = 0;
        uint256[] memory tokens = userTokens[account];
        for(uint256 i = 0; i < tokens.length; i++){
            LibRewardLPToken.RewardTokenInfo memory info = deposits[tokens[i]];

            tosAmount += info.tosAmount;
            usedAmount += info.usedAmount;
        }

        // dtos 가 토스 총계로 한번에 계산가능한지
        // 또는 각 아이디별 이자율이 별도로 계산되어야 하는지 확인이 필요함.
    }


   */

    function avaiableAmounts(
        uint256[] memory tokenIds
    ) external view override returns (uint256[] memory) {
        if(tokenIds.length == 0) return new uint256[](0);
        else {
            uint256[] memory amounts = new uint256[](tokenIds.length);
            return amounts;
        }

    }

    function avaiableAmount(
        uint256 tokenId
    ) external view override returns (uint256 token) {
        return 0;
    }

    function multiUse(
        uint256[] memory tokenIds,
        uint256[] memory amounts
    ) external override whenNotPaused {
        // update
    }

    function use(
        uint256 tokenId,
        uint256 amount
    ) external override whenNotPaused {

        // require(hasRole(USER_ROLE, _msgSender()), "RewardLPTokenManager: must have user role to use");
        // require(amount > 0, "zero amount");

        // (uint256 dtosBalance, uint256 tosAmount, uint256 usedAmount) = usableAmount(account);

        // require(dtosBalance > usedAmount && dtosBalance - usedAmount >= amount, "balance is insufficient.");

        // uint256[] memory tokens = userTokens[account];

        // for(uint256 i = 0; i < tokens.length; i++){
        //     LibRewardLPToken.RewardTokenInfo memory info = deposits[tokens[i]];

        //     // 사용금액에 반영한다.
        //     //info.usedAmount
        // }

        // emit UsedRewardToken(account, amount);
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

        if(from != address(0) && to != address(0)){
            LibRewardLPToken.RewardTokenInfo memory info = deposits[tokenId];
            IRewardPoolAction(info.rewardPool).transferFrom(from, to, info.poolTokenId, info.tosAmount);
        }
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

        //console.log("userTokens : %s ",userTokens[user][userTokens[user].length-1]);
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

}