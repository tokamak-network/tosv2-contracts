// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.10;

import "./libraries/SafeERC20.sol";


contract BondDepository {
    using SafeERC20 for IERC20;

    /* ======== EVENTS ======== */

    event CreateMarket(uint256 indexed id, uint256 saleAmount, uint256 endTime);
    event CloseMarket(uint256 indexed id);
    event Bond(uint256 indexed id, uint256 amount, uint256 payout);

    /* ======== STATE VARIABLES ======== */

    // Info about each type of market
    struct Market {
        bool method;        //selling token kinds
        IERC20 quoteToken;  //token to accept as payment
        uint256 tokenId;    //uniswapV3 tokenId    
        uint256 capacity;   //remain sale volume
        uint256 endSaleTime;    //saleEndTime
        uint256 sold;       // base tokens out
        uint256 purchased; // quote tokens in
    }

    // Additional info about market.
    struct Metadata {
        uint256 tokenPrice;
        uint256 tosPrice;
        uint256 endTime;        //saleEndTime
        uint256 totalSaleAmount; //tos sales volume
    }

    struct User {
        uint256 tokenAmount;
        uint256 tosAmount;
        uint256 marketID;
        uint256 endTime;
    }


    // Storage
    Market[] public markets; // persistent market data
    Metadata[] public metadata; // extraneous market data

    mapping(address => User[]) public users;

    IERC20 public tos;
    IdTOS public dTOS;
    IStaking public staking;
    ITreasury public treasury;

    constructor(
        IERC20 _tos,
        IdTOS _dtos,
        IStaking _staking,
        ITreasury _treasury
    ) {
        tos = _tos;
        dTOS = _dtos;
        staking = _staking;
        treasury = _treasury;
        tos.approve(address(_staking), 1e45);
    }

     /**
     * @notice             creates a new market type
     * @dev                
     * @param _check       token을 팔 것인지(true), V3 LP 증가로 팔 것인지(false)
     * @param _token       토큰 주소 
     * @param _tokenId     V3 LP 아이디
     * @param _market      [팔려고 하는 tos의 목표치, 판매 끝나는 시간, 받는 token의 가격, tos token의 가격]
     * @return id_         ID of new bond market
     */
    function create(
        bool _check,
        IERC20 _token,
        uint256 _tokenId,
        uint256[4] _market
    ) 
        external 
        onlyOwner
        returns (uint256 id_)
    {
        id_ = markets.length;

        markets.push(
            Market({
                method: _check,
                quoteToken: _quoteToken,
                tokenId: _tokenId,
                capacity: _market[0],
                endSaleTime: _market[1],
                purchased: 0,
                sold: 0
            })
        );

        if(_check == true) {
            metadata.push(
                Metadata({
                    tokenPrice: _market[2],
                    tosPrice: _market[3],
                    endTime: _market[1],
                    totalSaleAmount: _market[0]
                })
            );
        } else {
            metadata.push(
                Metadata({
                    endTime: _market[1],
                    totalSaleAmount: _market[0]
                })
            );
        }

        emit CreateMarket(id_, _market[0], _market[1]);
    }

    /**
     * @notice             disable existing market
     * @param _id          ID of market to close
     */
    function close(uint256 _id) external onlyOwner {
        markets[_id].endSaleTime = uint48(block.timestamp);
        markets[_id].capacity = 0;
        emit CloseMarket(_id);
    }


    /**
     * @notice             deposit quote tokens in exchange for a bond from a specified market
     * @param _id          the ID of the market
     * @param _amount      the amount of quote token to spend
     * @param _staking     Whether or not to staking
     * @param _time        staking time
     * @return payout_     the amount of TOS due
     * @return expiry_     the timestamp at which payout is redeemable
     * @return index_      the user index of the Note (used to redeem or query information)
     */
    function deposit(
        uint256 _id,
        uint256 _amount,
        bool _staking,
        uint256 _time
    )
        external
        returns (
            uint256 payout_,
            uint256 expiry_,
            uint256 index_
        )
    {
        Market storage market = markets[_id];
        Metadata memory meta = metadata[_id];
        uint256 currentTime = uint256(block.timestamp);

        require(currentTime < meta.endTime, "Depository : market end");
        
        // price * 100000 so need the amount / 100000
        uint256 price = ((meta.tokenPrice * 1e5)/meta.tosPrice);

        // give tos amount
        payout_ = ((price * _amount) / 1e5);

        require(0 <= (market.capacity - payout_), "Depository : sold out");

        market.capacity -= payout_;
        market.purchased += _amount;
        market.sold += payout_;

        index_ = notes[_user].length;
        //user정보 저장
        users[msg.sender].push(
            User({
                tokenAmount: _amount,
                tosAmount: payout_,
                marketID: _id,
                endTime: meta.endTime
            })
        );

        //if have reward, give reward (market reward)

        //tos를 산만큼 treasury에서 mint함
        treasury.mint(address(this), _payout);        

        emit Bond(_id, _amount, payout_);

        market.quoteToken.safeTransferFrom(msg.sender, address(treasury), _amount);

        //tos staking route
        if(_staking == true) {

        }

        //종료해야하는지 확인
        if (meta.totalSaleAmount <= (market.sold + 1e18)) {
           market.capacity = 0;
           emit CloseMarket(_id);
        }
    }

    //LP token Deposit
    function LPDeposit(

    )
        external
        returns (
            uint256 payout_
        ) 
    {

    }

    function tokenPrice(uint256 _id) internal view returns (uint256 price) {
        Metadata memory meta = metadata[_id];
        return ((meta.tokenPrice * 1e5)/meta.tosPrice);
    }

    //market에서 tos를 최대로 구매할 수 있는 양
    function remainingAmount(uint256 _id) external view returns (uint256 tokenAmount) {
        Metadata memory meta = metadata[_id];
        return ((meta.capacity*1e5)/tokenPrice(_id));
    }

}