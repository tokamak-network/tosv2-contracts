// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.0;

import "./libraries/SafeERC20.sol";

import "./interfaces/IERC20Metadata.sol";

import "./interfaces/IdTOS.sol";
import "./interfaces/IStaking.sol";
import "./interfaces/ITreasury.sol";
import "./interfaces/IBondDepository.sol";

import "./common/ProxyAccessCommon.sol";

contract BondDepository is IBondDepository, ProxyAccessCommon {
    using SafeERC20 for IERC20;

    /* ======== EVENTS ======== */

    event CreateMarket(uint256 indexed id, uint256 saleAmount, uint256 endTime);
    event CloseMarket(uint256 indexed id);
    event Bond(uint256 indexed id, uint256 amount, uint256 payout);

    event Received(address, uint);

    /* ======== STATE VARIABLES ======== */

    // Storage
    Market[] public markets; // persistent market data
    Metadata[] public metadata; // extraneous market data

    mapping(address => User[]) public users;

    IERC20 public tos;
    IdTOS public dTOS;
    IStaking public staking;
    ITreasury public treasury;
    address payable treasuryContract;

    uint256 public mintRate;

    constructor(
        IERC20 _tos,
        IdTOS _dtos,
        IStaking _staking,
        ITreasury _treasury
    ) {
        _setRoleAdmin(PROJECT_ADMIN_ROLE, PROJECT_ADMIN_ROLE);
        _setupRole(PROJECT_ADMIN_ROLE, msg.sender);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        tos = _tos;
        dTOS = _dtos;
        staking = _staking;
        treasury = _treasury;
        tos.approve(address(_staking), 1e45);
    }

     /**
     * @notice             creates a new market type
     * @dev                
     * @param _check       ETH를 받을려면(true), token을 받으면(false)
     * @param _token       토큰 주소 
     * @param _tokenId     V3 LP 아이디 (Market의 tokenId = 0 이면 ETH나 erc20토큰 판매이다.)
     * @param _market      [팔려고 하는 tos의 목표치, 판매 끝나는 시간, 받는 token의 가격, tos token의 가격]
     * @return id_         ID of new bond market
     */
    function create(
        bool _check,
        IERC20 _token,
        uint256 _tokenId,
        uint256[4] calldata _market
    ) 
        external
        override 
        onlyOwner
        returns (uint256 id_)
    {
        id_ = markets.length;

        markets.push(
            Market({
                method: _check,
                quoteToken: _token,
                tokenId: _tokenId,
                capacity: _market[0],
                endSaleTime: _market[1],
                purchased: 0,
                sold: 0
            })
        );

        if(_tokenId == 0) {
            if(markets[id_].method) {
                metadata.push(
                    Metadata({
                        tokenPrice: _market[2],
                        tosPrice: _market[3],
                        endTime: _market[1],
                        totalSaleAmount: _market[0],
                        ethMarket: true
                    })
                );
            } else {
                metadata.push(
                    Metadata({
                        tokenPrice: _market[2],
                        tosPrice: _market[3],
                        endTime: _market[1],
                        totalSaleAmount: _market[0],
                        ethMarket: false
                    })
                );
            }
        } else {
            metadata.push(
                Metadata({
                    tokenPrice: 0,
                    tosPrice: 0,
                    endTime: _market[1],
                    totalSaleAmount: _market[0],
                    ethMarket: false
                })
            );
        }

        emit CreateMarket(id_, _market[0], _market[1]);
    }

    /**
     * @notice             disable existing market
     * @param _id          ID of market to close
     */
    function close(uint256 _id) external override onlyOwner {
        markets[_id].endSaleTime = uint48(block.timestamp);
        markets[_id].capacity = 0;
        emit CloseMarket(_id);
    }

    /**
     * @notice             deposit quote tokens in exchange for a bond from a specified market
     * @param _id          the ID of the market
     * @param _amount      the amount of quote token to spend
     * @param _time        staking time
     * @param _claim       Whether or not to claim
     * @return payout_     the amount of TOS due
     * @return index_      the user index of the Note (used to redeem or query information)
     */
    //사전에 Token을 bondDepositoryContract에 approve해줘야함
    function deposit(
        uint256 _id,
        uint256 _amount,
        uint256 _time,
        bool _claim
    )
        external
        override
        returns (
            uint256 payout_,
            uint256 index_
        )
    {
        Market storage market = markets[_id];
        Metadata memory meta = metadata[_id];
        uint256 currentTime = uint256(block.timestamp);

        require(currentTime < meta.endTime, "Depository : market end");
        
        payout_ = calculPayoutAmount(meta.tokenPrice,meta.tosPrice,_amount);

        require(0 <= (market.capacity - payout_), "Depository : sold out");

        market.capacity -= payout_;
        market.purchased += _amount;
        market.sold += payout_;

        index_ = users[msg.sender].length;
        //user정보 저장
        users[msg.sender].push(
            User({
                tokenAmount: _amount,
                tosAmount: payout_,
                marketID: _id,
                endTime: meta.endTime
            })
        );

        //tos를 산 후 MR을 곱해서 treasury에서 mint함
        uint256 mrAmount = payout_ * mintRate;
        treasury.mint(address(this), mrAmount);        

        emit Bond(_id, _amount, payout_);

        market.quoteToken.safeTransferFrom(msg.sender, address(treasury), _amount);
        //update the backingData
        treasury.backingUpdate();

        //tos staking route        
        staking.stake(msg.sender,payout_,_time,true,_claim);
        
        //종료해야하는지 확인
        if (meta.totalSaleAmount <= (market.sold + 1e18)) {
           market.capacity = 0;
           emit CloseMarket(_id);
        }
    }

    //eth deposit
    function ETHDeposit(
        uint256 _id,
        uint256 _amount,
        uint256 _time,
        bool _claim
    ) 
        public
        payable
        returns (
            uint256 payout_,
            uint256 index_
        )
    {
        Market storage market = markets[_id];
        Metadata memory meta = metadata[_id];
        uint256 currentTime = uint256(block.timestamp);

        require(currentTime < meta.endTime, "Depository : market end");
        require(msg.value == _amount, "Depository : ETH value not same");
        require(meta.ethMarket, "Depository : not ETHMarket");

        payout_ = calculPayoutAmount(meta.tokenPrice,meta.tosPrice,_amount);

        require(0 <= (market.capacity - payout_), "Depository : sold out");

        market.capacity -= payout_;
        market.purchased += _amount;
        market.sold += payout_;

        index_ = users[msg.sender].length;
        //user정보 저장
        users[msg.sender].push(
            User({
                tokenAmount: _amount,
                tosAmount: payout_,
                marketID: _id,
                endTime: meta.endTime
            })
        );

        //tos를 산 후 MR을 곱해서 treasury에서 mint함
        uint256 mrAmount = payout_ * mintRate;
        treasury.mint(address(this), mrAmount);       

        treasuryContract.transfer(msg.value);

        uint256 transAmount = mrAmount - payout_;
        tos.safeTransfer(address(ITreasury(treasury)),transAmount);

        //update the backingData
        treasury.backingUpdate();

        //tos staking route        
        staking.stake(
            msg.sender,
            payout_,
            _time,
            true,
            _claim
        );

        emit Bond(_id, _amount, payout_);

        //종료해야하는지 확인
        if (meta.totalSaleAmount <= market.sold) {
           market.capacity = 0;
           emit CloseMarket(_id);
        }
    }

    function setMR(uint256 _mrRate) external onlyPolicyOwner {
        mintRate = _mrRate;
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
        pure
        returns (
            uint256 payout
        ) 
    {
        return payout = ((((_tokenPrice * 1e10)/_tosPrice) * _amount) / 1e10);
    }


    function tokenPrice(uint256 _id) internal view returns (uint256 price) {
        Metadata memory meta = metadata[_id];
        return ((meta.tokenPrice * 1e10)/meta.tosPrice);
    }

    //market에서 tos를 최대로 구매할 수 있는 양
    function remainingAmount(uint256 _id) external override view returns (uint256 tokenAmount) {
        Market memory market = markets[_id];
        return ((market.capacity*1e10)/tokenPrice(_id));
    }

    function marketsLength() external view returns (uint256 length) {
        return markets.length;
    }

}