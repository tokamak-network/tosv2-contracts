// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

interface IStaking {


    /* ========== onlyPolicyOwner ========== */

    /// @dev set the tos, lockTOS, treasury Address
    /// @param _tos       tosAddress
    /// @param _lockTOS   lockTOSAddress
    /// @param _treasury  treausryAddress
    function setAddressInfos(
        address _tos,
        address _lockTOS,
        address _treasury
    ) external;

    /// @dev set setRebasePerEpoch
    /// @param _rebasePerEpoch  the rate for rebase per epoch (eth uint)
    ///                         If input the 0.9 -> 900000000000000000
    function setRebasePerEpoch(
        uint256 _rebasePerEpoch
    ) external;


    /// @dev set index
    /// @param _index  index (eth uint)
    function setIndex(
        uint256 _index
    ) external;

    /// @dev set bond staking
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
    /// @param tosPrice  the tos price per Token
    /// @return stakeId  the stake id
    function stakeByBond(
        address to,
        uint256 _amount,
        uint256 _marketId,
        uint256 tosPrice
    ) external returns (uint256 stakeId);



    /// @dev bonder stake the tos mintted when user purchase the bond with asset.
    /// @param _to  the user address
    /// @param _amount  the tos amount
    /// @param _marketId  the market id
    /// @param _periodWeeks  the number of lockup weeks
    /// @param tosPrice  the tos price per Token
    /// @return stakeId  the stake id
    function stakeGetStosByBond(
        address _to,
        uint256 _amount,
        uint256 _marketId,
        uint256 _periodWeeks,
        uint256 tosPrice
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

    /// @dev Used to adjust the amount of staking after the lockout period ends
    /// @param _stakeId     the stake id
    /// @param _addAmount   addAmount
    /// @param _claimAmount claimAmount
    /// @param _periodWeeks add lock Weeks
    function resetStakeGetStosAfterLock(
        uint256 _stakeId,
        uint256 _addAmount,
        uint256 _claimAmount,
        uint256 _periodWeeks
    ) external;



    /// @dev Used to add a toss amount before the end of the lock period or to extend the period
    /// @param _stakeId  the stake id
    /// @param _amount   add amount
    /// @param _unlockWeeks add lock weeks
    function increaseBeforeEndOrNonEnd(
        uint256 _stakeId,
        uint256 _amount,
        uint256 _unlockWeeks
    ) external;


    /// @dev For staking items that are not locked up, use when claiming
    /// @param _stakeId  the stake id
    /// @param _claimAmount claimAmount
    function claimForSimpleType(
        uint256 _stakeId,
        uint256 _claimAmount
    ) external;


    /// @dev Used to unstake a specific staking ID
    /// @param _stakeId  the stake id
    function unstake(
        uint256 _stakeId
    ) external;

    /// @dev Used when unstaking multiple staking IDs
    /// @param _stakeIds  the stake id
    function multiUnstake(
        uint256[] calldata _stakeIds
    ) external;


    /// @dev Index adjustment, compound interest
    function rebaseIndex() external;

    /* ========== VIEW ========== */
    /*
    /// @dev Returns the remaining toss amount of a specific staking ID.
    /// @param _stakeId  the stake id
    /// @return return remain tos Amount
    function remainedLTOSToTos(uint256 _stakeId) external view returns (uint256) ;
    */

    /// @dev Returns the remaining amount of LTOS for a specific staking ID.
    /// @param _stakeId  the stake id
    /// @return return Amount of LTOS remaining
    function remainedLTOS(uint256 _stakeId) external view returns (uint256) ;


    /// @dev Returns the claimable amount of LTOS for a specific staking ID.
    /// @param _stakeId  the stake id
    /// @return return Claimable amount of LTOS
    function claimableLtos(uint256 _stakeId) external view returns (uint256);

    /// @dev Returns the claimable TOS amount of a specific staking ID.
    /// @param _stakeId  the stake id
    /// @return return Claimable amount of TOS
    function claimableTos(uint256 _stakeId) external view returns (uint256);


    /// @dev Returns the index when rebase is executed once in the current index.
    function nextIndex() external view returns (uint256);

    /// @dev Returns the current Index value
    function getIndex() external view returns(uint256) ;


    /// @dev Returns a list of staking IDs owned by a specific account.
    /// @param _addr ownerAddress
    /// @return return List of staking IDs you have
    function stakingOf(address _addr)
        external
        view
        returns (uint256[] memory);


    /// @dev Returns the amount of remaining LTOS in _stakeId
    /// @param _stakeId stakeId
    /// @return return Amount of LTOS remaining
    function balanceOfId(uint256 _stakeId)
        external
        view
        returns (uint256);


    /// @dev Returns the amount of LTOS remaining on the account
    /// @param _addr address
    /// @return balance Returns the amount of LTOS remaining
    function balanceOf(address _addr)
        external
        view
        returns (uint256 balance);

    /// @dev Returns the time remaining until the next rebase time
    /// @return time
    function secondsToNextEpoch() external view returns (uint256);

    /// @dev  Compensation for LTOS with TOS and the remaining amount of TOS
    /// @return TOS with treasury - minus staking interest
    function runwayTOS() external view returns (uint256);

    /// @dev Total amount of Staking TOS
    /// @return tosAmount
    function totalDepositTOS() external view returns (uint256);

    /// @dev Convert tos amount to LTOS (based on current index)
    /// @param amount  tosAmount
    /// @return return LTOS Amount
    function getTosToLtos(uint256 amount) external view returns (uint256);

    /// @dev Convert LTOS to TOS (based on current index)
    /// @param ltos  LTOS Amount
    /// @return return TOS Amount
    function getLtosToTos(uint256 ltos) external view returns (uint256);

    /// @dev Amount of TOS staked by users
    /// @param stakeId  the stakeId
    function stakedOf(uint256 stakeId) external view returns (uint256);

    /// @dev Total staked toss amount (principal + interest of all users)
    function stakedOfAll() external view returns (uint256) ;

    /// @dev Detailed information of specific staking ID
    /// @param stakeId  the stakeId
    function stakeInfo(uint256 stakeId) external view returns (
        address staker,
        uint256 deposit,
        uint256 LTOS,
        uint256 startTime,
        uint256 endTime,
        uint256 marketId
    );

}
