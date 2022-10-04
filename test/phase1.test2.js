const chai = require("chai");
const { solidity } = require("ethereum-waffle");
const { expect, assert } = chai;

const JSBI = require('jsbi');

//chai.use(require("chai-bn")(BN));
chai.use(solidity);
require("chai").should();
const univ3prices = require('@thanpolas/univ3prices');
const utils = require("./utils");

// const { expect } = require("chai");
const { ethers } = require("hardhat");
const Web3EthAbi = require('web3-eth-abi');
const {
  keccak256,
} = require("web3-utils");

const {
  deployedUniswapV3Contracts,
  FeeAmount,
  TICK_SPACINGS,
  getMinTick,
  getMaxTick,
  getNegativeOneTick,
  getPositiveOneMaxTick,
  encodePriceSqrt,
  getUniswapV3Pool,
  getBlock,
  mintPosition2,
  getTick,
  // getMaxLiquidityPerTick,
} = require("./uniswap-v3/uniswap-v3-contracts");

let NonfungiblePositionManager = require('../abis/NonfungiblePositionManager.json');
let UniswapV3Pool = require('../abis/UniswapV3Pool.json');
let UniswapV3LiquidityChanger = require('../abis/UniswapV3LiquidityChanger.json');
let tosabi = require('../abis/TOS.json');
let lockTOSProxyabi = require('../abis/LockTOSProxy_ABI.json');
let lockTOSProxy2abi = require('../abis/LockTOSv2Proxy.json').abi;
let lockTOSLogic2abi = require('../abis/LockTOSv2Logic0.json').abi;
const { id } = require("@ethersproject/hash");

let treasuryLogicAbi = require('../artifacts/contracts/Treasury.sol/Treasury.json');
let bondDepositoryLogicAbi = require('../artifacts/contracts/BondDepository.sol/BondDepository.json');
let stakingV2LogicAbi = require('../artifacts/contracts/StakingV2.sol/StakingV2.json');

let UniswapV3LiquidityChangerAddress = "0xa839a0e64b27a34ed293d3d81e1f2f8b463c3514";
let totalTosSupplyTarget = ethers.utils.parseEther("1000000");

let tosAdmin = "0x5b6e72248b19F2c5b88A4511A6994AD101d0c287";
let lockTosAdmin = "0x5b6e72248b19F2c5b88A4511A6994AD101d0c287";

let eventCreatedMarket ="CreatedMarket(uint256,address,uint256[4])";
let eventETHDeposited ="ETHDeposited(address,uint256,uint256,uint256,uint256)";
let eventETHDepositWithSTOS ="ETHDepositedWithSTOS(address,uint256,uint256,uint256,uint256,uint256)";
let eventDeposited ="Deposited(address,uint256,uint256,uint256,bool,uint256)";

let eventStakedGetStosByBond ="StakedGetStosByBond(address,uint256,uint256,uint256,uint256,uint256,uint256,uint256)";

let eventStaked ="Staked(address,uint256,uint256)";
let eventStakedGetStos ="StakedGetStos(address,uint256,uint256,uint256,uint256)";
let eventIncreasedAmountForSimpleStake ="IncreasedAmountForSimpleStake(address,uint256,uint256)";
let eventResetStakedGetStosAfterLock ="ResetStakedGetStosAfterLock(address,uint256,uint256,uint256,uint256,uint256)";
let eventIncreasedBeforeEndOrNonEnd ="IncreasedBeforeEndOrNonEnd(address,uint256,uint256,uint256,uint256)";

function compoundInterest([principal, interest, period, time]) {
  [principal, interest, period, time]=[principal, interest, period, time].map(Number);

  interest /= 100;//or interest = interest/100;
  let frequency = 12 / period;

  let total = principal * Math.pow(1 + interest / frequency, frequency * time);

  console.log(total.toFixed(2));

}


let amount = JSBI.BigInt("4124960000000");
let rebasePerEpoch = ethers.BigNumber.from("87045050000000");
let n = JSBI.BigInt("5");

let subEther =  JSBI.BigInt('1000000000000000000')

// let sub1 =  JSBI.BigInt('1')
// console.log(sub1, sub1.toString())
// let sub2 =  JSBI.BigInt(rebasePerEpoch.toString())
// console.log(sub2, sub2.toString())



// let sub21 =  JSBI.add(subEther, JSBI.BigInt(rebasePerEpoch.toString()))
// console.log("sub21", sub21, sub21.toString())

// let sub22 =  JSBI.exponentiate(
//   JSBI.add(subEther, JSBI.BigInt(rebasePerEpoch.toString())),
//   n)
// console.log("sub22", sub22, sub22.toString())


// let sub23 =  JSBI.divide(
//   JSBI.exponentiate(
//     JSBI.add(subEther, JSBI.BigInt(rebasePerEpoch.toString())),
//     n
//   ),
//   JSBI.exponentiate(subEther, JSBI.subtract(n, JSBI.BigInt("2")))
// )
// let sub24 =  JSBI.multiply(amount, sub23)
// console.log("sub24", sub24, sub24.toString())

let sub25 =  JSBI.divide(
  JSBI.multiply(
    amount,
    JSBI.divide(
      JSBI.exponentiate(
        JSBI.add(subEther, JSBI.BigInt(rebasePerEpoch.toString())),
        n
      ),
      JSBI.exponentiate(subEther, JSBI.subtract(n, JSBI.BigInt("2")))
    )
    ),
  JSBI.exponentiate(subEther, JSBI.BigInt("2")))

console.log("sub25", sub25, sub25.toString())
