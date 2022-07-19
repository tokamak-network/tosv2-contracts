// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.0;

import "./BondDepositoryStorage.sol";

import "./libraries/SafeERC20.sol";

import "./interfaces/IERC20Metadata.sol";

import "./interfaces/ITOSValueCalculator.sol";

import "./interfaces/IBondDepository.sol";

import "./common/ProxyAccessCommon.sol";

import "hardhat/console.sol"; 

contract BondDepository is 
    BondDepositoryStorage,
    ProxyAccessCommon,
    IBondDepository
{
    using SafeERC20 for IERC20;

    /* ======== EVENTS ======== */

    event CreateMarket(uint256 indexed id, uint256 saleAmount, uint256 endTime);
    event CloseMarket(uint256 indexed id);
    event Bond(uint256 indexed id, uint256 amount, uint256 payout);
    event Received(address, uint);

    constructor() {

    }

     /**
     * @notice             creates a new market type
     * @dev                
     * @param _check       ETH를 받을려면(true), token을 받으면(false)
     * @param _token       토큰 주소 
     * @param _poolAddress 토큰과 ETH주소의 pool주소
     * @param _fee         pool의 _fee
     * @param _market      [팔려고 하는 tos의 목표치, 판매 끝나는 시간, 받는 token의 가격, tos token의 가격, 한번에 구매 가능한 TOS물량]
     * @return id_         ID of new bond market
     */
    function create(
        bool _check,
        IERC20 _token,
        address _poolAddress,
        uint24 _fee,
        uint256[5] calldata _market
    ) 
        external
        override 
        onlyPolicyOwner
        returns (uint256 id_)
    {   
        console.log("1");
        id_ = staking.marketId();
        console.log("id_ : %s", id_);

        //tokenPrice, tosPrice, capacity, totalSaleAmount는 관리자가 변경할 수 있게해야함 (capacity, totalSaleAmount는 한 변수 입력에 변경가능하게)
        markets.push(
            Market({
                method: _check,
                quoteToken: _token,
                capacity: _market[0],
                endSaleTime: _market[1],
                sold: 0,
                maxPayout: _market[4]
            })
        );

        if(markets[id_].method) {
            metadata.push(
                Metadata({
                    poolAddress: _poolAddress,
                    tokenPrice: _market[2],
                    tosPrice: _market[3],
                    totalSaleAmount: _market[0],
                    fee: _fee,
                    ethMarket: true
                })
            );
        } else {
            metadata.push(
                Metadata({
                    poolAddress: _poolAddress,
                    tokenPrice: _market[2],
                    tosPrice: _market[3],
                    totalSaleAmount: _market[0],
                    fee: _fee,
                    ethMarket: false
                })
            );
        }

        emit CreateMarket(id_, _market[0], _market[1]);
    }

    //admin이 market에서 수정해야할 것 들, capacity, saleTime, Price(2개)

    /**
     * @notice             disable existing market
     * @param _id          ID of market to close
     */
    function close(uint256 _id) external override onlyPolicyOwner {
        markets[_id].endSaleTime = uint48(block.timestamp);
        markets[_id].capacity = 0;
        emit CloseMarket(_id);
    }


    //eth deposit
    //weth도 같이 받음 ex) 10ETH -> 5ETH, 5WETH
    function ETHDeposit(
        uint256 _id,
        uint256 _amount,
        uint256 _time,
        bool _lockTOS
    ) 
        public
        payable
        override
        returns (
            uint256 payout_,
            uint256 index_
        )
    {
        require(_amount > 0, "Depository : need the amount");
        if(_lockTOS){
            require(_time > 0, "Depository : sTOS need the time");
        }
        Market storage market = markets[_id];
        Metadata memory meta = metadata[_id];
        uint256 currentTime = uint256(block.timestamp);

        require(currentTime < market.endSaleTime, "Depository : market end");
        require(msg.value == _amount, "Depository : ETH value not same");
        require(meta.ethMarket, "Depository : not ETHMarket");
        
        uint256 _maxpayout = marketMaxPayout(_id);
        require(_amount <= _maxpayout, "Depository : over maxPay");

        payout_ = calculPayoutAmount(meta.tokenPrice,meta.tosPrice,_amount);
        console.log("payoutAmount : %s", payout_);

        require(payout_ <= market.capacity, "Depository : sold out");

        market.capacity -= payout_;
        market.sold += payout_;

        index_ = users[msg.sender].length;
        //user정보 저장
        users[msg.sender].push(
            User({
                tokenAmount: _amount,
                tosAmount: payout_,
                marketID: _id,
                endTime: market.endSaleTime,
                dTOSuse: 0
            })
        );

        uint256 amount = _amount;
        uint256 time = _time;
        uint256 marketId = _id;
        bool lockTOS = _lockTOS;
        //mintingRate는 1ETH당 TOS가 얼만큼 발행되는지 이다. (mintingRate = TOS/ETH)
        //mrAmount = ETH * TOS/ETH
        uint256 mrAmount = _amount * treasury.mintRateCall();
        treasury.mint(address(this), mrAmount);       
        treasuryContract.transfer(msg.value);

        //transAmount는 treasury에 갈 Amount이다. 
        //payAmount는 transAmount물량 중 재단에 쌓이는 물량이다. 그래서 최종적으로 transAmount - payAmount가 treasury에 쌓인다
        uint256 transAmount = mrAmount - payout_;
        tos.safeTransfer(address(ITreasury(treasury)),(transAmount));
        treasury.transferLogic(transAmount);
        console.log("transAmount : %s", transAmount);

        //update the backingData
        treasury.backingUpdate();

        //tos staking route    
        console.log("1");
        //_amount = ETH amount , payout_ = tos Amount  
        staking.stake(
            msg.sender,
            payout_,
            time,
            marketId,
            lockTOS
        );
        console.log("2");

        emit Bond(marketId, amount, payout_);

        //종료해야하는지 확인
        if (meta.totalSaleAmount <= market.sold) {
           market.capacity = 0;
           emit CloseMarket(marketId);
        }
    }

    //이더리움(가격)을 기준으로만 mintingRate를 정한다. -> MR은 어떻게 정할까? admin이 세팅할 수 있고 비율은 나중에 알려줌 (admin이 정하게하면 됨) 
    //admin과 policy가 있었으면 좋겠다. (admin이 하는 역할과 policy가 하는 역할은 다름)
    //dTOS로직 
    //총 가지고 있는 ETH기반으로 minting할 수 있는지 없는지 정한다. -> ETH가 아니라 token이 들어왔을떄
    //본딩할때 트레저리에서 TOS를 발행할 수 있는지 물어봐야함
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
    function marketMaxPayout(uint256 _id) public override view returns (uint256 maxpayout_) {
        Market memory market = markets[_id];
        maxpayout_ = (market.maxPayout*1e10)/tokenPrice(_id);
        return maxpayout_;
    }

    // ?TOS/1ETH -> 나온값에 /1e10 해줘야함
    function tokenPrice(uint256 _id) internal view returns (uint256 price) {
        Metadata memory meta = metadata[_id];
        return ((meta.tokenPrice * 1e10)/meta.tosPrice);
    }

    //market에서 tos를 최대로 구매할 수 있는 양
    function remainingAmount(uint256 _id) external override view returns (uint256 tokenAmount) {
        Market memory market = markets[_id];
        return ((market.capacity*1e10)/tokenPrice(_id));
    }
}