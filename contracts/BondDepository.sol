// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

import "./BondDepositoryStorage.sol";
import "./common/ProxyAccessCommon.sol";

import "./libraries/SafeERC20.sol";

import "./interfaces/IBondDepository.sol";
import "./interfaces/IBondDepositoryEvent.sol";
//import "hardhat/console.sol";

interface IUniswapV3Pool {
    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface IITreasury {
    function mintRate() external view returns (uint256);
    function requestMintAndTransfer(
        uint256 _mintAmount, address _recipient, uint256 _transferAmount, bool _distribute) external ;
}

contract BondDepository is
    BondDepositoryStorage,
    ProxyAccessCommon,
    IBondDepository,
    IBondDepositoryEvent
{
    using SafeERC20 for IERC20;

    modifier nonEndMarket(uint256 id_) {
        require( markets[id_].endSaleTime > 0 && markets[id_].endSaleTime < block.timestamp,
            "BondDepository: closed market"
        );
        _;
    }

    modifier isEthMarket(uint256 id_) {
        require( metadata[id_].totalSaleAmount > 0 && metadata[id_].ethMarket,
            "BondDepository: not ETH market"
        );
        _;
    }

    modifier nonEthMarket(uint256 id_) {
        require(
            markets[id_].quoteToken != address(0) && metadata[id_].totalSaleAmount > 0 && !metadata[id_].ethMarket,
            "BondDepository: ETH market"
        );
        _;
    }

    constructor() {

    }

    ///////////////////////////////////////
    /// onlyPolicyOwner
    //////////////////////////////////////

    function tokenInUniswapV3Pool(address pool, address token0) public view returns (bool) {

       if (IUniswapV3Pool(pool).token0() == token0 || IUniswapV3Pool(pool).token1() == token0 ) return true;
       else return false;
    }

    /// @inheritdoc IBondDepository
    function create(
        bool _check,
        address _token,
        address _poolAddress,
        uint24 _fee,
        uint256[5] memory _market
    )
        external
        override
        onlyPolicyOwner
        nonZero(_market[0])
        nonZero(_market[2])
        nonZero(_market[3])
        nonZero(_market[4])
        returns (uint256 id_)
    {
        id_ = staking.marketId();  // BondDepository는 staking의 오너로 등록이 되어야 함.

        if (_check) require(_token == address(0), "when use eth, token must be zero address");
        else require(_token != address(0), "zero address");

        require(_market[1] > block.timestamp, "sale end time has passed.");
        require(_fee > 0, "zero fee");

        require(markets[id_].endSaleTime == 0 && metadata[id_].totalSaleAmount == 0, "already registered market and metadata");

        if(!_check) require(tokenInUniswapV3Pool(_poolAddress, _token), "not token pair pool");

        //tokenPrice, tosPrice, capacity, totalSaleAmount는 관리자가 변경할 수 있게해야함 (capacity, totalSaleAmount는 한 변수 입력에 변경가능하게)
        markets[id_] = LibBondDepository.Market({
                            method: _check,
                            quoteToken: _token,
                            capacity: _market[0],
                            endSaleTime: _market[1],
                            sold: 0,
                            maxPayout: _market[4]
                        });

        metadata[id_] = LibBondDepository.Metadata({
                    poolAddress: _poolAddress,
                    tokenPrice: _market[2],
                    tosPrice: _market[3],
                    totalSaleAmount: _market[0],
                    fee: _fee,
                    ethMarket: _check
                });

        emit CreatedMarket(id_, _check, _token, _poolAddress, _fee, _market);
    }

    /// @inheritdoc IBondDepository
    function close(uint256 _id) external override onlyPolicyOwner {
        require(metadata[_id].fee > 0, "empty market");
        require(markets[_id].endSaleTime > block.timestamp , "already end");
        markets[_id].endSaleTime = block.timestamp;
        markets[_id].capacity = 0;
        emit ClosedMarket(_id);
    }

    ///////////////////////////////////////
    /// Anyone can use.
    //////////////////////////////////////

    /// @inheritdoc IBondDepository
    function ERC20Deposit(
        uint256 _id,
        uint256 _amount
    )
        external override
        nonEndMarket(_id)
        nonEthMarket(_id)
        nonZero(_amount)
        returns (
            uint256 payout_,
            uint256 index_
        )
    {
        address _token = markets[_id].quoteToken;
        require(IERC20(_token).allowance(msg.sender, address(this)) >= _amount, "Depository : allowance is insufficient");
        IERC20(_token).transferFrom(msg.sender, address(treasury), _amount);

        (payout_, index_) = _deposit(msg.sender, _amount, _id, false);

        require(payout_ > 0, "zero TOS amount");
        staking.stakeByBond(msg.sender, payout_, _id);

        emit ERC20Deposited(msg.sender, _id, _token, _amount);
    }

    /// @inheritdoc IBondDepository
    function ERC20DepositWithSTOS(
        uint256 _id,
        uint256 _amount,
        uint256 _lockWeeks
    )
        external override
        nonEndMarket(_id)
        nonEthMarket(_id)
        nonZero(_amount)
        nonZero(_lockWeeks)
        returns (
            uint256 payout_,
            uint256 index_
        )
    {
        address _token = markets[_id].quoteToken;
        require(IERC20(_token).allowance(msg.sender, address(this)) >= _amount, "Depository : allowance is insufficient");
        IERC20(_token).transferFrom(msg.sender, address(treasury), _amount);

        (payout_, index_) = _deposit(msg.sender, _amount, _id, false);

        require(payout_ > 0, "zero TOS amount");
        staking.stakeGetStosByBond(msg.sender, payout_, _id, _lockWeeks);

        emit ERC20DepositedWithSTOS(msg.sender, _id, _token, _amount, _lockWeeks);
    }

    /// @inheritdoc IBondDepository
    function ETHDeposit(
        uint256 _id,
        uint256 _amount
    )
        external payable override
        nonEndMarket(_id)
        isEthMarket(_id)
        nonZero(_amount)
        returns (
            uint256 payout_,
            uint256 index_
        )
    {
        require(msg.value == _amount, "Depository : ETH value not same");

        (payout_, index_) = _deposit(msg.sender, _amount, _id, true);

        require(payout_ > 0, "zero TOS amount");
        staking.stakeByBond(msg.sender, payout_, _id);

        payable(treasury).transfer(msg.value);

        emit ETHDeposited(msg.sender, _id, _amount);
    }

    /// @inheritdoc IBondDepository
    function ETHDepositWithSTOS(
        uint256 _id,
        uint256 _amount,
        uint256 _lockWeeks
    )
        external payable override
        nonEndMarket(_id)
        isEthMarket(_id)
        nonZero(_amount)
        nonZero(_lockWeeks)
        returns (
            uint256 payout_,
            uint256 index_
        )
    {
        require(msg.value == _amount, "Depository : ETH value not same");

        (payout_, index_) = _deposit(msg.sender, _amount, _id, true);

        require(payout_ > 0, "zero TOS amount");
        staking.stakeGetStosByBond(msg.sender, payout_, _id, _lockWeeks);

        payable(treasury).transfer(msg.value);

        emit ETHDepositedWithSTOS(msg.sender, _id, _amount, _lockWeeks);
    }


    function _deposit(
        address user,
        uint256 _amount,
        uint256 _marketId,
        bool _eth
    ) internal nonReentrant returns (uint256 _payout, uint256 index_) {

        require(_amount <= marketMaxPayout(_marketId), "Depository : over maxPay");

        _payout = calculPayoutAmount(metadata[_marketId].tokenPrice, metadata[_marketId].tosPrice, _amount);
       // console.log("payoutAmount : %s", _payout);

        require(_payout > 0, "zero staking amount");

        uint256 mrAmount = _amount * IITreasury(treasury).mintRate();
        require(mrAmount >= _payout, "mintableAmount is less than staking amount.");

        LibBondDepository.Market storage market = markets[_marketId];
        require(_payout <= market.capacity, "Depository : sold out");

        market.capacity -= _payout;
        market.sold += _payout;

        //check closing
        if (metadata[_marketId].totalSaleAmount <= market.sold) {
           market.capacity = 0;
           emit ClosedMarket(_marketId);
        }

        index_ = users[msg.sender].length;
        users[user].push(
            LibBondDepository.User({
                tokenAmount: _amount,
                tosAmount: _payout,
                marketID: _marketId,
                endTime: market.endSaleTime,
                dTOSuse: 0
            })
        );

        if(mrAmount > 0 && _payout <= mrAmount) {
            IITreasury(treasury).requestMintAndTransfer(mrAmount, address(staking), _payout, true);
        }

        emit Deposited(user, _amount, _payout, _marketId, _eth);
    }

    ///////////////////////////////////////
    /// VIEW
    //////////////////////////////////////

    //이더리움(가격)을 기준으로만 mintingRate를 정한다. -> MR은 어떻게 정할까? admin이 세팅할 수 있고 비율은 나중에 알려줌 (admin이 정하게하면 됨)
    //admin과 policy가 있었으면 좋겠다. (admin이 하는 역할과 policy가 하는 역할은 다름)
    //dTOS로직
    //총 가지고 있는 ETH기반으로 minting할 수 있는지 없는지 정한다. -> ETH가 아니라 token이 들어왔을떄
    //본딩할때 트레저리에서 TOS를 발행할 수 있는지 물어봐야함

    /// @inheritdoc IBondDepository
    function calculPayoutAmount(
        uint256 _tokenPrice,
        uint256 _tosPrice,
        uint256 _amount
    )
        public
        override
        pure
        returns (
            uint256 payout
        )
    {
        return payout = ((((_tokenPrice * 1e10)/_tosPrice) * _amount) / 1e10);
    }

    //해당 마켓의 maxpayout양을 return한다.

    /// @inheritdoc IBondDepository
    function marketMaxPayout(uint256 _id) public override view returns (uint256 maxpayout_) {
        maxpayout_ = (markets[_id].maxPayout*1e10)/tokenPrice(_id);
        return maxpayout_;
    }

    // ?TOS/1ETH -> 나온값에 /1e10 해줘야함

    /// @inheritdoc IBondDepository
    function tokenPrice(uint256 _id) public override view returns (uint256 price) {
        return ((metadata[_id].tokenPrice * 1e10)/metadata[_id].tosPrice);
    }

    //market에서 tos를 최대로 구매할 수 있는 양

    /// @inheritdoc IBondDepository
    function remainingAmount(uint256 _id) external override view returns (uint256 tokenAmount) {

        return ((markets[_id].capacity*1e10)/tokenPrice(_id));
    }
}