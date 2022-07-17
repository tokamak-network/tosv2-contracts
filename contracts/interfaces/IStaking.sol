// SPDX-License-Identifier: AGPL-3.0
pragma solidity >=0.7.5;

interface IStaking {
    /* ========== EVENTS ========== */

    event WarmupSet(uint256 warmup);

    /* ========== FUNCTIONS ========== */

    function setRebasePerepoch(
        uint256 _rebasePerEpoch
    ) external;

    function nextIndex() external view returns (uint256);

    function maxIndex(
        uint256 _endTime
    ) external view returns (uint256 maxindex);

    function setindex(
        uint256 _index
    ) external;

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
