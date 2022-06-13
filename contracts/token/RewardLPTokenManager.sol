// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../common/AccessibleCommon.sol";
//import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
//import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "../interfaces/IRewardLPTokenManagerEvent.sol";
import "../interfaces/IRewardLPTokenManagerAction.sol";
import "../interfaces/IRewardPoolAction.sol";
import "../interfaces/IDTOS.sol";

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

    bytes32 public constant USER_ROLE = keccak256("USER_ROLE");

    Counters.Counter private _tokenIdTracker;

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

    function setDtos(address _dtos) external onlyOwner {
        require(dtos != address(0),"already set");
        require(_dtos != address(0),"zero address");
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
        address pool,
        uint256 poolTokenId,
        uint256 tosAmount,
        uint128 liquidity
    ) external override whenNotPaused zeroAddress(dtos) returns (uint256) {

        require(hasRole(MINTER_ROLE, _msgSender()), "RewardLPTokenManager: must have minter role to mint");

        uint256 tokenId = _tokenIdTracker.current();

        deposits[tokenId] = LibRewardLPToken.RewardTokenInfo({
            rewardPool: msg.sender,
            // pool: pool,
            owner: to,
            poolTokenId: poolTokenId,
            tosAmount: tosAmount,
            usedAmount: 0,
            stakedTime: block.timestamp,
            liquidity: liquidity
        });

        _mint(to, tokenId);
        _tokenIdTracker.increment();

        addUserToken(to, tokenId);
        IDTOS(dtos).mint(to, tosAmount);

        emit MintedRewardToken(tokenId, to, pool, poolTokenId);
        return tokenId;
    }

    // 소각은 리워드 풀에 의해서만 가능하다. 리워드 풀에서 언스테이크 할때만 가능
    function burn(
        uint256 tokenId
    ) external override whenNotPaused zeroAddress(dtos) {

        require(hasRole(MINTER_ROLE, _msgSender()), "RewardLPTokenManager: must have role to burn");

        LibRewardLPToken.RewardTokenInfo memory info = deposits[tokenId];

        IDTOS(dtos).burn(info.owner, info.tosAmount);

        _burn(tokenId);
        deleteUserToken(info.owner, tokenId);

        delete deposits[tokenId];

        emit BurnedRewardToken(tokenId, info.owner, info.pool, info.poolTokenId);
    }


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

    function use(
        address account,
        uint256 amount
    ) external override whenNotPaused {

        require(hasRole(USER_ROLE, _msgSender()), "RewardLPTokenManager: must have user role to use");
        require(amount > 0, "zero amount");

        (uint256 dtosBalance, uint256 tosAmount, uint256 usedAmount) = usableAmount(account);

        require(dtosBalance > usedAmount && dtosBalance - usedAmount >= amount, "balance is insufficient.");

        uint256[] memory tokens = userTokens[account];

        for(uint256 i = 0; i < tokens.length; i++){
            LibRewardLPToken.RewardTokenInfo memory info = deposits[tokens[i]];

            // 사용금액에 반영한다.
            //info.usedAmount
        }

        emit UsedRewardToken(account, amount);
    }

    function tokensOfOwner(address account) external view returns (uint256[] memory)
    {
        return userTokens[account];
    }

    function deposit(uint256 tokenId) external view returns (LibRewardLPToken.RewardTokenInfo memory)
    {
        return deposits[tokenId];
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721Enumerable, ERC721Pausable) whenNotPaused {
        // super._beforeTokenTransfer(from, to, tokenId);

        if(from != address(0) && to != address(0)){
            LibRewardLPToken.RewardTokenInfo memory info = deposits[tokenId];
            IRewardPoolAction(info.rewardPool).transferFrom(from, to, info.poolTokenId);
        }
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

}