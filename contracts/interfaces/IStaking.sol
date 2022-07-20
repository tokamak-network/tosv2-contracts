// SPDX-License-Identifier: AGPL-3.0
pragma solidity >=0.7.5;

interface IStaking {
    /* ========== EVENTS ========== */

    event WarmupSet(uint256 warmup);

    /* ========== FUNCTIONS ========== */

    /**
     * @notice set the rebasePerepoch (If input the 0.9 -> 900000000000000000)
     * @param _rebasePerEpoch uint256 rebasePerEpoch
     */
    function setRebasePerepoch(
        uint256 _rebasePerEpoch
    ) external;

    /**
     * @notice return nextIndex
     * @return uint256
     */
    function nextIndex() external view returns (uint256);

    /**
     * @notice input the endTime get the exponent ((스테이킹 끝나는 시간 - 다음 인덱스 증가 시간)/인덱스 rebase 시간) = 몇번 rebase가 일어나는지 나옴
     * @param _endTime uint256 endTime
     * @return maxindex uint256
     */
    function maxIndex(
        uint256 _endTime
    ) external view returns (uint256 maxindex);

    /**
     * @notice return marketId and increase the marketId
     */
    function marketId() external returns (uint256);

    /**
     * @notice set the index
     * @param _index uint256 index
     */
    function setindex(
        uint256 _index
    ) external;

    /**
     * @notice stake the TOS and get LTOS
     * @param _to address stake address
     * @param _amount uint256 TOS amount
     * @param _periodWeeks uint256 weeks
     * @param _marketId uint256 bond market
     * @param _lockTOS bool sTOS
     * @return stakeId uint256
     */
    function stake(
        address _to,
        uint256 _amount,
        uint256 _periodWeeks,
        uint256 _marketId,
        bool _lockTOS
    ) external returns (uint256 stakeId);

    /**
     * @notice add stake TOS increase LTOS
     * @param _to address
     * @param _stakeId uint256
     * @param _amount uint256
     */
    function increaseAmountStake(
        address _to,
        uint256 _stakeId,
        uint256 _amount
    ) external;

    /**
     * @notice add staked Period 
     * @param _stakeId uint256
     * @param _unlockWeeks uint256
     */
    function increasePeriodStake(
        uint256 _stakeId,
        uint256 _unlockWeeks
    ) external;

    /**
     * @notice add staked Period and stake TOS increase LTOS 
     * @param _to address
     * @param _stakeId uint256
     * @param _amount uint256
     * @param _unlockWeeks uint256
     */
    function increaseAmountAndPeriodStake(
        address _to,
        uint256 _stakeId,
        uint256 _amount,
        uint256 _unlockWeeks
    ) external;

    /**
     * @notice Unstake part of stakeId's LTOS.
     * @param _stakeId uint256 stakeId
     * @param _amount uint256 LTOSamount
     * @return amount_ uint256
     */
    function unstake(
        uint256 _stakeId,
        uint256 _amount
    ) external returns (uint256 amount_);

    /**
     * @notice Unstake all LTOS of stakeId.
     * @param _stakeId uint256 stakeId
     * @return amount_ uint256
     */
    function unstakeId(
        uint256 _stakeId
    ) external returns (uint256 amount_);

    /**
     * @notice Unstake all stakeId received in the array.
     * @param _stakeIds uint256 array stakeids
     */
    function arrayUnstakeId(
        uint256[] calldata _stakeIds
    ) external;

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
