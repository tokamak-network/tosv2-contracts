// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

contract BondDepositoryStorageV2 {

    /// marketId -> start time
    mapping(uint256 => uint256) marketStartTimes;

    /// marketId -> totalCapacity 본딩해도, 변하지 않는 값
    mapping(uint256 => uint256) marketTotalCapacity;

    /// 어떤식으로 하느냐에 따라 스토리지 구성이 달라짐.

    ///1. 일별 고정판매량 정해진경우, marketId -> 그날의 0시0분0초 -> dailyCapacity
    // mapping(uint256 => mapping(uint256 => uint256)) marketDailyCapacity;

    ///2. 일별 고정판매량에 미판매분은 다음에 판매가능하도록 할경우, marketId -> usedCapacity
    mapping(uint256 => uint256) marketUsedCapacity;


}
