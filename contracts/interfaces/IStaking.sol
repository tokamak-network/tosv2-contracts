// SPDX-License-Identifier: AGPL-3.0
pragma solidity > 0.8.4;

interface IStaking {

    ///////////////////////////////////////
    /// onlyPolicyOwner
    //////////////////////////////////////

    function setAddressInfos(
        address _tos,
        address _lockTOS,
        address _treasury
    ) external;

    /// @dev set RebasePerepoch
    /// @param _rebasePerEpoch  the rate for rebase per epoch
    ///                         If input the 0.9 -> 900000000000000000
    function setRebasePerepoch(
        uint256 _rebasePerEpoch
    ) external;


    /// @dev set index
    /// @param _index  index ( eth unit)
    function setindex(
        uint256 _index
    ) external;

    /// @dev set basic lock period
    /// @param _period  _period (seconds)
    function setBasicBondPeriod(uint256 _period) external ;


    ///////////////////////////////////////
    /// onlyOwner
    //////////////////////////////////////

     /// @dev Increment and return the market ID.
    function marketId() external returns (uint256);


    ///////////////////////////////////////
    /// VIEW
    //////////////////////////////////////

    /// @dev Returns the index when rebase is executed once in the current index.
    function nextIndex() external view returns (uint256);

    /**
     * @notice input the endTime get the exponent
     * @param _endTime endTime
     * @return maxindex uint256
     */
    function maxIndex(
        uint256 _endTime
    ) external view returns (uint256 maxindex);



    /* ========== Anyone can execute ========== */

    /**
     * @notice stake OHM to enter warmup
     * @param _to address
     * @param _amount uint256 tosAmount
     * @param _periodWeeks uint256 lockup하는 기간
     * @param _marketId uint256 bonding으로 들어왔는지 확인
     * @param _lockTOS bool
     * @return stakeId uint256
     */
    function stake(
        address _to,
        uint256 _amount,
        uint256 _periodWeeks,
        uint256 _marketId,
        bool _lockTOS
    ) external returns (uint256 stakeId);

    function increaseAmountStake(
        address _to,
        uint256 _tokenId,
        uint256 _amount
    ) external;

    function increasePeriodStake(
        uint256 _tokenId,
        uint256 _unlockWeeks
    ) external;

    function unstake(
        uint256 _stakeId,
        uint256 _amount
    ) external returns (uint256 amount_);

    function unstakeId(
        uint256 _stakeId
    ) external returns (uint256 amount_);

    function allunStaking() external;

    function rebaseIndex() external;

    function stakinOf(address _addr)
        external
        view
        returns (uint256[] memory);

    function balanceOfId(uint256 _stakeId)
        external
        view
        returns (uint256);

    function balanceOf(address _addr)
        external
        view
        returns (uint256 balance);

    function maxIndexProfit(
        uint256 _amount,
        uint256 _endTime
    )
        external
        view
        returns (uint256 amount_);

    function secondsToNextEpoch() external view returns (uint256);

    function circulatingSupply() external view returns (uint256);

    function LTOSinterest() external view returns (uint256);

    function nextLTOSinterest() external view returns (uint256);

    function totalDepositTOS() external view returns (uint256);

    function syncSTOS(
        address[] memory accounts,
        uint256[] memory balances,
        uint256[] memory period,
        uint256[] memory tokenId
    )
        external
        returns (bool);
}
