//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;


/// @title IDTOSEvent
interface IDTOSEvent {

    event FactorSet(uint256 previous, uint256 current, uint256 shiftCount);
    event Transfer(address from, address to, uint256 amount);
    event OnRebase(uint256 rebaseIndex, uint256 factor, uint256 totalSupply, uint256 interestAmount, uint256 rebaseTime);

}

