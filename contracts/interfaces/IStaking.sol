// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

interface IStaking {


    /* ========== onlyPolicyOwner ========== */


    function setAddressInfos(
        address _tos,
        address _lockTOS,
        address _treasury
    ) external;

    /// @dev set setRebasePerEpoch
    /// @param _rebasePerEpoch  the rate for rebase per epoch
    ///                         If input the 0.9 -> 900000000000000000
    function setRebasePerEpoch(
        uint256 _rebasePerEpoch
    ) external;


    /// @dev set index
    /// @param _index  index ( eth unit)
    function setIndex(
        uint256 _index
    ) external;

    /// @dev set basic lock period
    /// @param _period  _period (seconds)
    function setBasicBondPeriod(uint256 _period) external ;




    /* ========== onlyOwner ========== */


    /// @dev set basic lock period
    /// @param accounts  the array of account for sync
    /// @param balances  the array of tos amount for sync
    /// @param period  the array of end time for sync
    /// @param tokenId  the array of locktos id for sync
    function syncSTOS(
        address[] memory accounts,
        uint256[] memory balances,
        uint256[] memory period,
        uint256[] memory tokenId
    ) external ;


    /* ========== onlyBonder ========== */


    /// @dev Increment and return the market ID.
    function generateMarketId() external returns (uint256);

    /// @dev bonder stake the tos mintted when user purchase the bond with asset.
    /// @param to  the user address
    /// @param _amount  the tos amount
    /// @param _marketId  the market id
    /// @return stakeId  the stake id
    function stakeByBond(
        address to,
        uint256 _amount,
        uint256 _marketId
    ) external returns (uint256 stakeId);



    /// @dev bonder stake the tos mintted when user purchase the bond with asset.
    /// @param _to  the user address
    /// @param _amount  the tos amount
    /// @param _marketId  the market id
    /// @param _periodWeeks  the number of lockup weeks
    /// @return stakeId  the stake id
    function stakeGetStosByBond(
        address _to,
        uint256 _amount,
        uint256 _marketId,
        uint256 _periodWeeks
    ) external returns (uint256 stakeId);


    /* ========== Anyone can execute ========== */


    /// @dev user can stake the tos amount.
    /// @param _amount  the tos amount
    /// @return stakeId  the stake id
    function stake(
        uint256 _amount
    ) external  returns (uint256 stakeId);


    /// @dev user can stake the tos amount and get stos.
    /// @param _amount  the tos amount
    /// @param _periodWeeks the number of lockup weeks
    /// @return stakeId  the stake id
    function stakeGetStos(
        uint256 _amount,
        uint256 _periodWeeks
    ) external  returns (uint256 stakeId);


    /// @dev increase the tos amount in stakeId of simple stake product (without lock, without maeketid)
    /// @param _stakeId  the stake id
    /// @param _amount the tos amount
    function increaseAmountForSimpleStake(
        uint256 _stakeId,
        uint256 _amount
    )   external;

    /// @dev 잠금기간 종료 후에 스테이킹 양을 조절하려고 할때 사용
    /// @param _stakeId  the stake id
    /// @param _addAmount 토스 추가 금액
    /// @param _claimAmount 클래임 하려는 금액
    /// @param _periodWeeks 다시 잠금하려는 주 수
    function resetStakeGetStosAfterLock(
        uint256 _stakeId,
        uint256 _addAmount,
        uint256 _claimAmount,
        uint256 _periodWeeks
    ) external;



    /// @dev 잠금 기간 종료 전에 토스양을 추가하거나, 기간을 늘리고자 할 때 사용
    /// @param _stakeId  the stake id
    /// @param _amount 추가하려는 토스양
    /// @param _unlockWeeks 늘리려는 기간의 주수
    function increaseBeforeEndOrNonEnd(
        uint256 _stakeId,
        uint256 _amount,
        uint256 _unlockWeeks
    ) external;


    /// @dev 락업되어 있지 않은 스테이킹 아이템인경우, 클래임할때 사용
    /// @param _stakeId  the stake id
    /// @param _claimAmount 클래임 하려는 양
    function claimForSimpleType(
        uint256 _stakeId,
        uint256 _claimAmount
    ) external;


    /// @dev 특정 스테이킹 아이디를 언스테이킹 하려고 할때 사용
    /// @param _stakeId  the stake id
    function unstake(
        uint256 _stakeId
    ) external;

    /// @dev 여러개의 스테이킹 아이디를 언스테이킹 하려고 할 때 사용
    /// @param _stakeIds  the stake id
    function multiUnstake(
        uint256[] calldata _stakeIds
    ) external;


     /// @dev 인덱스 조절, 복리 적용
    function rebaseIndex() external;

    /* ========== VIEW ========== */

    /// @dev 특정 스테이킹아이디의 남아있는 토스 양을 리턴함.
    /// @param _stakeId  the stake id
    /// @return return 남아있는 토스 양
    function remainedLTOSToTos(uint256 _stakeId) external view returns (uint256) ;

    /// @dev 특정 스테이킹아이디의 남아있는 LTOS 양을 리턴함.
    /// @param _stakeId  the stake id
    /// @return return 남아있는 LTOS 양
    function remainedLTOS(uint256 _stakeId) external view returns (uint256) ;


    /// @dev 특정 스테이킹아이디의 클래임가능한 LTOS 양을 리턴함.
    /// @param _stakeId  the stake id
    /// @return return 클래임가능한 LTOS 양
    function claimableLtos(uint256 _stakeId) external view returns (uint256);

    /// @dev 특정 스테이킹아이디의 클래임가능한 TOS 양을 리턴함.
    /// @param _stakeId  the stake id
    /// @return return 클래임가능한 TOS 양
    function claimableTos(uint256 _stakeId) external view returns (uint256);


    /// @dev Returns the index when rebase is executed once in the current index.
    function nextIndex() external view returns (uint256);


    function getIndex() external view returns(uint256) ;


    /// @dev 특정 계정이 보유하고 있는 스테이킹아이디 리스트를 리턴함.
    /// @param _addr 계정 주소
    /// @return return 보유하고 있는 스테이킹 아이디 리스트
    function stakingOf(address _addr)
        external
        view
        returns (uint256[] memory);


    /// @dev _stakeId 의 남아있는 LTOS 양 리턴
    /// @param _stakeId 스테이크 아이디
    /// @return return 남아있는 LTOS 양
    function balanceOfId(uint256 _stakeId)
        external
        view
        returns (uint256);


    /// @dev 계정이 남아있는 LTOS 양 리턴
    /// @param _addr 계정 주소
    /// @return balance 남아있는 LTOS 양 리턴
    function balanceOf(address _addr)
        external
        view
        returns (uint256 balance);

    /// @dev
    /// @return
    function secondsToNextEpoch() external view returns (uint256);

    /// @dev  treasury가지고 있는 TOS  - staking 이자 빼기
    /// @return
    function runwayTOS() external view returns (uint256);

    /// @dev
    /// @return
    function totalDepositTOS() external view returns (uint256);

    /// @dev 토스양을 LTOS 로 변환 (현재 인덱스 기준 )
    /// @param amount  토스 양
    /// @return return LTOS 양
    function getTosToLtos(uint256 amount) external view returns (uint256);

    /// @dev LTOS을 TOS 로 변환 (현재 인덱스 기준 )
    /// @param ltos  LTOS 양
    /// @return return TOS 양
    function getLtosToTos(uint256 ltos) external view returns (uint256);

    function stakedOf(uint256 stakeId) external view returns (uint256);

    function stakedOfAll() external view returns (uint256) ;

    function stakeInfo(uint256 stakeId) external view returns (
        address staker,
        uint256 deposit,
        uint256 LTOS,
        uint256 endTime,
        uint256 marketId
    );


}
