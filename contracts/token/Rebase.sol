// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/LibDTOS.sol";
import "../libraries/DSMath.sol";

contract Rebase is DSMath
{
    // epoch
    bool public epochFlag;
    uint256 public epochNumber;
    uint256 public epochStartTime;
    uint256 public epochDurationSecond;
    uint256 public apyForEpochDurationSecond; // wad, 18 decimals

    // LibDTOS.Rebase[] public rebases; // past rebase data
    // epochNumber - Rebase
    mapping(uint256 => LibDTOS.Rebase[]) public rebases;


    modifier onEpoch() {
        require(epochFlag, "epochFlag false");
        _;
    }

    constructor(){
    }

    function _setEpochFlag(bool _flag) internal {
        if (epochFlag != _flag) epochFlag = _flag;
    }

    function _setApyForDurationSecond(uint256 _epochDurationSecond, uint256 _apyForEpochDurationSecond)
        internal
    {
        require(_epochDurationSecond > 0 && _apyForEpochDurationSecond > 0 , "zero value");
        epochDurationSecond = _epochDurationSecond;
        apyForEpochDurationSecond = _apyForEpochDurationSecond;
    }

    function _applyRebase(uint256 curTotal) internal{
        uint256 interest = 0;
        if (epochFlag) {
            uint256 _end = 0;
            uint256 prevtotalBalance = curTotal;
            uint256 totalBalance = 0;

            if (epochNumber == 0) {
                epochNumber++;
                epochStartTime = block.timestamp;
                _end = epochStartTime + epochDurationSecond ;

                rebases[epochNumber] = LibDTOS.Rebase({
                    end : _end,
                    distributedAmount: 0,
                    totalSupply: totalBalance,
                    // apyForEpochDurationSecond: epochDurationSecond,
                    rebaseCount: 0
                });

            } else {
                if (rebases[epochNumber].end < block.timestamp && epochDurationSecond > 0) {
                    uint256 rebaseCount = (block.timestamp - rebases[epochNumber].end) / epochDurationSecond;
                    if (rebaseCount > 0) {
                        _end = rebases[epochNumber].end + (epochDurationSecond * rebaseCount);
                        totalBalance = compound(prevtotalBalance, apyForEpochDurationSecond, rebaseCount) ;

                        interest = totalBalance - prevtotalBalance;

                        epochNumber++;
                        rebases[epochNumber] = LibDTOS.Rebase({
                            end: _end,
                            distributedAmount: interest,
                            totalSupply: totalBalance,
                            // apyForEpochDurationSecond: epochDurationSecond,
                            rebaseCount: rebaseCount
                        });
                    }
                }
            }
        }
    }

    function compound (uint256 principal, uint256 ratio, uint256 n) public pure returns (uint256) {
        return principal * wpow(1 + ratio, n);
    }

}