// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;
import "./ABDKMath64x64.sol";

interface IILockTosV2 {
    function epochUnit() external view returns(uint256);
}


/// @title LibStaking
library LibStaking
{
    struct Epoch {
        uint256 length_; // in seconds
        uint256 number; // since inception
        uint256 end; // timestamp
    }

    struct UserBalance {
        address staker;
        uint256 deposit;    //tos staking 양
        uint256 LTOS;       //변환된 LTOS 양
        uint256 startTime;  //스테이킹한 시간 startTime     //possible delete
        uint256 endTime;    //끝나는 endTime
        uint256 marketId;   //bondMarketId
    }

    function getUnlockTime(address lockTos, uint256 start, uint256 _periodWeeks)
        public view returns (uint256 sTosEpochUnit, uint256 unlockTime)
    {
        sTosEpochUnit = IILockTosV2(lockTos).epochUnit();
        unlockTime = start + (_periodWeeks * sTosEpochUnit);
        unlockTime = unlockTime / sTosEpochUnit * sTosEpochUnit ;
    }


   /**
   * Calculate the maximum possible # of epochs that can be rebased while keeping LTOS solvency
   * equation = ln(runwayTOS/getLtosToTos+1) / ln(1+rebasePerEpoch)
   *
   * @return rebaseCount unsigned 256-bit integer number
   */
    function possibleEpochNumber(uint256 _runwayTOS, uint256 _totalTOS, uint256 rebasePerEpoch) public pure returns (uint256 ){

        int128 a = ABDKMath64x64.ln(
                    ABDKMath64x64.add(
                        ABDKMath64x64.divu(_runwayTOS,_totalTOS),
                        ABDKMath64x64.fromUInt(1)
                    )); //a = ln(runwayTOS/getLtosToTos+1)
        int128 b = ABDKMath64x64.ln(ABDKMath64x64.fromUInt(1e18+rebasePerEpoch))-764553562531198000000; //b = ln(1+rebasePerEpoch). rebasePerEpoch is internally scaled by 10^18 to keep the decimal positions=> instead of adding 1, 1e18 has to be added + subtract ln(10^18) 64.64 hardcoded, subtracting this value from 'b' offsets the 10^18 scaling
        int64 rebaseCount = ABDKMath64x64.toInt(ABDKMath64x64.div(a,b)); //recasts 64 bit output to uint256
        return uint256(int256(rebaseCount));
    }


    function pow (int128 x, uint n) public pure returns (int128 r) {
        r = ABDKMath64x64.fromUInt (1);
        while (n > 0) {
            if (n % 2 == 1) {
                r = ABDKMath64x64.mul (r, x);
                n -= 1;
            } else {
                x = ABDKMath64x64.mul (x, x);
                n /= 2;
            }
        }
    }

    function compound (uint principal, uint ratio, uint n) public pure returns (uint) {
        return ABDKMath64x64.mulu (
                pow (
                ABDKMath64x64.add (
                    ABDKMath64x64.fromUInt (1),
                    ABDKMath64x64.divu (
                    ratio,
                    10**18)),
                n),
                principal);
    }

}