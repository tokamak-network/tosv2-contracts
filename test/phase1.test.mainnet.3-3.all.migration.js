const chai = require("chai");
const { solidity } = require("ethereum-waffle");
const { expect, assert } = chai;
const save = require("./save_deployed");
const loadDeployed = require("./load_deployed");
const JSBI = require('jsbi');
const fs = require('fs');

chai.use(solidity);
require("chai").should();
const univ3prices = require('@thanpolas/univ3prices');
const utils = require("./utils");

const {
  calculateBalanceOfLock,
  calculateBalanceOfUser,
  createLockWithPermit,
  calculateCompound,
  timeout,
  containsNumber,
} = require("./helpers/lock-tos-helper");


const {
  stosMigrationBlockNumber,
  uniswapInfo,
  UniswapV3LiquidityChangerAddress,
  stosMigrationSet_adminAddress,
  foundation_info,
  totalTosSupplyTarget,
  tosAdmin,
  lockTosAdmin,
  burnTosContractList,
  burnTosAddressList,
  depositSchedule,
  MintingRateSchedule,
  eventCreatedMarket,
  eventETHDeposited,
  eventETHDepositWithSTOS,
  eventDeposited,
  eventStakedGetStosByBond,
  eventStaked,
  eventStakedGetStos,
  eventIncreasedAmountForSimpleStake,
  eventResetStakedGetStosAfterLock,
  eventIncreasedBeforeEndOrNonEnd,
  scheduleBackingRate,
  scheduleTosStaked,
  scheduleStakingReward,
  scheduleRunwayTos,
  scheduleTotalTosSupply,
  scheduleTreasuryTosBalance,
  scheduleMintedTos,
  scheduleTosAllocatedToBonder,
  scheduleTosAllocatedToTreasury,
  scheduleTotalDistribute,
  scheduleTosAllocatedToFoundation,
  scheduleTosAllocatedToTosDao,
  scheduleTosAllocatedToTonDao,
  scheduleTosBurn,
  scheduleLtosIndex,
  scheduleLtos,
  STATUS,
  lockTOSProxyAddress,
} = require("./info_simulation_mainnet");

const {
  indexEpochPassMonth,
  indexEpochPass,
  sendEthToTreasury,
  logStatus,
} = require("./phase1.test.mainnet.function");

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

let lockTOSProxy2abi = require('../abis/LockTOSv2Proxy.json');
let lockTOSLogic2abi = require('../abis/LockTOSv2Logic0.json');
let lockTOSProxyabi = require('../abis/LockTOSProxy.json').abi;

const { id } = require("@ethersproject/hash");

let treasuryLogicAbi = require('../artifacts/contracts/Treasury.sol/Treasury.json');
let bondDepositoryLogicAbi = require('../artifacts/contracts/BondDepository.sol/BondDepository.json');
let stakingV2LogicAbi = require('../artifacts/contracts/StakingV2.sol/StakingV2.json');

let deployed = {
  treasury: "",
  stake: "",
  bond: ""
}

/////////////////////////////////////
// Migration #1
// 1. 컨트랙 디플로이. LockTOS 업그레이드
//    phase1.test.mainnet.1.migration
//    배포한 파일은 deployed.stosMigrationBlockNumber.json 파일에 저장함
/////////////////////////////////////
let stosMigrationData = require('./data/stos-ids-'+stosMigrationBlockNumber+'.json');
let stosMigrationSet = {
  adminAddress : stosMigrationSet_adminAddress,
  round: 0,
  batchSize: 100,
  prevStakeId: ethers.BigNumber.from("0"),
  afterStakeId: ethers.BigNumber.from("0"),
  profitZeroLockIds : []
}
/**
   * admin : EOA  (test EOA)
    TOS DAO : EOA (test EOA)
    TON DAO **0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303**
    _percents = [25%,5%,1%] 0.25  0.05 0.01 ,  2500, 500, 100
   */
let foundations = {
  address: foundation_info.address,
  percentages: foundation_info.percentages,
  balances : [
    ethers.BigNumber.from("0"),
    ethers.BigNumber.from("0"),
    ethers.BigNumber.from("0")
  ],
  balancesAfter : [
    ethers.BigNumber.from("0"),
    ethers.BigNumber.from("0"),
    ethers.BigNumber.from("0")
  ]
}

// main-net
uniswapInfo._fee =  ethers.BigNumber.from("3000");

let indexMintRate = 0;
let timeSetMintRate ;


describe("TOSv2 Phase1", function () {
  //시나리오 : https://www.notion.so/onther/BondDepository-StakingV2-scenario-Suah-497853d6e65f48a390255f3bca29fa36

  let provider;
  let nonfungiblePositionManager, uniswapV3Pool, uniswapV3LiquidityChanger ;

  let libTreasury, libStaking;

  let tosCalculator;
  let TOSValueCalculator;

  let treasurycont;
  let treasuryContract;
  let treasuryProxy;
  let treasuryProxylogic;

  let stakingcont;
  let stakingContract;
  let stakingProxy;
  let stakingProxylogic;

  let tosContract;
  let lockTosContract;
  let lockTos2Contract;
  let lockToslogic2Contract;

  let bondDepositorycont;
  let bondDepositoryContract;
  let bondDepositoryProxy;
  let bondDepositoryProxylogic;

  let _lockTosAdmin;
  let _tosAdmin;

  // mainnet
  let firstEpochNumber = 0;
  let firstEndEpochTime
  let epochLength = 28800; //  8시간
  let mintRate = ethers.BigNumber.from("11261000000000000000000");
  let constRebasePerEpoch = ethers.BigNumber.from("87045050000000")
  let basicBondPeriod = 60*60*24*5 ;  // 본드를 사고, 락업없을때, 기본 락업기간 5일
  let sendAmountEthToTreasury = ethers.utils.parseEther("2000"); //초기에 트래저리에 넣는 이더 량

  let lockTOSProxy2;
  let lockTOSLogic2;

  let depositTime;
  let depositTime2;
  let unstakingTime;

  let stakeIdcheck;
  let balanceOfLTOS;
  let stakingBalanceLTOS;
  let totalLTOS;

  let sellingTime = 604800 * 20;

  let beforetosAmount;
  let aftertosAmount;

  let unstakingAmount = ethers.utils.parseUnits("500", 18);

  let minter_role = "0xf0887ba65ee2024ea881d91b74c2450ef19e1557f03bed3ea9f16b037cbe2dc9";
  let burner_role = "0x9667e80708b6eeeb0053fa0cca44e028ff548e2a9f029edfeac87c118b08b7c8";

  let lockTOSProxy2Address = ""
  let lockTOSLogic2Address = ""
  let etherUint = ethers.utils.parseUnits("1", 18);

  let firstMarketlength;
  let checkMarketLength;


  //[팔려고 하는 tos의 목표치, 판매 끝나는 시간, 받는 token의 가격, tos token의 가격, 한번에 구매 가능한 TOS물량]
  // 이더상품.
  let bondInfoEther = {
    marketId : null,
    check: true,
    token: ethers.constants.AddressZero,
    poolAddress: uniswapInfo.tosethPool,
    fee: 0,
    market: {
      capAmountOfTos: ethers.BigNumber.from("30400000000000000000000"),
      closeTime: 1669852800,
      priceTosPerToken: ethers.BigNumber.from("3015716000000000000000"),
      purchasableTOSAmountAtOneTime: ethers.BigNumber.from("822468000000000000000")
    },
    tosValuationSimple: 0,
    tosValuationLock: 0
  }


  let deposits = {user1 : [], user2: []};
  let depositor, depositorUser, index, depositData;

  async function setTimeNextSetMr() {
    let block = await ethers.provider.getBlock();
    timeSetMintRate = block.timestamp + (60*60*24*30);
 }

  async function nextSetMrPass() {
    let block = await ethers.provider.getBlock();
    if (block.timestamp < timeSetMintRate) {
      let passTime =  timeSetMintRate - block.timestamp ;
      ethers.provider.send("evm_increaseTime", [passTime])
      ethers.provider.send("evm_mine")
    }
  }

  function getUserLastData(depositorUser) {
    let depositList = deposits[depositorUser+""];
    let depositData = depositList[depositList.length-1];
    return depositData;
  }

  function getUserLastDataByIndex(depositorUser,  index) {
    let depositList = deposits[depositorUser+""];
    if( index < depositList.length) return depositList[index];
    else return null;
  }
  function convertFormat(bnWeiValue, uint) {
    let c = ethers.utils.formatUnits(bnWeiValue , uint);

    return c.substring(0,c.indexOf('.'));
  }

  async function bond(depositor, maxCumulativeDepositAmount, purchasableAssetAmountAtOneTime_, tosContract, stakingProxylogic, bondDepositoryProxylogic) {
      console.log('bond ');
      let m = 0;
      let accumulatedDepositAmount = ethers.utils.parseEther("0");
      let tosTotalSupplyPrev =  await tosContract.totalSupply();
      let stakingPrincipalPrev = await stakingProxylogic.stakingPrincipal();

      for (let i = 0; i < 11; i++){
        let amount = purchasableAssetAmountAtOneTime_ ;
        if (accumulatedDepositAmount.add(purchasableAssetAmountAtOneTime_).gt(maxCumulativeDepositAmount)){
          amount = maxCumulativeDepositAmount.sub(accumulatedDepositAmount) ;
        }
        accumulatedDepositAmount = accumulatedDepositAmount.add(amount);
        let tx = await bondDepositoryProxylogic.connect(depositor).ETHDeposit(
            bondInfoEther.marketId,
            amount,
            {value: amount}
        );
        // console.log('ETHDeposit', i, tx.hash);
        await tx.wait()
      }
      // console.log('accumulatedDepositAmount', ethers.utils.formatEther(accumulatedDepositAmount), "ETH");
      let tosTotalSupply =  await tosContract.totalSupply();
      let mintedTos =  tosTotalSupply.sub(tosTotalSupplyPrev);
      // console.log('minted TOS ', mintedTos);
      let stakingPrincipalAfter = await stakingProxylogic.stakingPrincipal();
      let StakedTosByBonder = stakingPrincipalAfter.sub(stakingPrincipalPrev);

      return {
        tosTotalSupply: tosTotalSupply,
        mintedTos: mintedTos,
        StakedTosByBonder: StakedTosByBonder,
        accumulatedDepositAmount: accumulatedDepositAmount
      }
  }

  before(async () => {
    accounts = await ethers.getSigners();
    [admin1, admin2, user1, user2, user3, user4, user5, user6 ] = accounts;

    console.log('admin1',admin1.address);
    provider = ethers.provider;

    await hre.ethers.provider.send("hardhat_setBalance", [
      admin1.address,
      "0x4EE2D6D415B85ACEF8100000000",
    ]);
    await hre.ethers.provider.send("hardhat_setBalance", [
      user1.address,
      "0x4EE2D6D415B85ACEF8100000000",
    ]);
    await hre.ethers.provider.send("hardhat_setBalance", [
      user2.address,
      "0x4EE2D6D415B85ACEF8100000000",
    ]);

    await hre.ethers.provider.send("hardhat_impersonateAccount",[lockTosAdmin]);

    _lockTosAdmin = await ethers.getSigner(lockTosAdmin);

    await hre.ethers.provider.send("hardhat_impersonateAccount",[tosAdmin]);
    _tosAdmin = await ethers.getSigner(tosAdmin);

    deployed.treasury = loadDeployed(stosMigrationBlockNumber, "TreasuryProxy");
    deployed.stake = loadDeployed(stosMigrationBlockNumber, "StakingV2Proxy");
    deployed.bond = loadDeployed(stosMigrationBlockNumber, "BondDepositoryProxy");

  });

/////////////////////////////////////
//  마이그레이션, StakeV2.syncStos
/////////////////////////////////////


  describe("#0. Get the contract", () => {

    it("#0-2-3. TreasuryProxyLogic set", async () => {
      treasuryProxylogic = new ethers.Contract(deployed.treasury, treasuryLogicAbi.abi, ethers.provider);

    })

    it("#0-3-3. stakingProxyLogic set", async () => {
      stakingProxylogic = new ethers.Contract(deployed.stake, stakingV2LogicAbi.abi, ethers.provider);
    })

    it("#0-4-3. stakingProxyLogic set", async () => {
      bondDepositoryProxylogic = new ethers.Contract(deployed.bond, bondDepositoryLogicAbi.abi, ethers.provider);
    })

    it("#0-4-4. lockTosContract set", async () => {
      lockTosContract = new ethers.Contract(lockTOSProxyAddress, lockTOSLogic2abi.abi, ethers.provider);
    })

    it("#0-4-5. tosContract set", async () => {
      tosContract = new ethers.Contract( uniswapInfo.tos, tosabi, ethers.provider );
    })

  })


  /////////////////////////////////////
  // 한달에 한번씩 본딩한다. 21회 수행
  /////////////////////////////////////

  describe("#3-1. bondDepository function test", async () => {

    it("#3-1-5. 한달에 3이더씩 본딩, 22회 실행 ", async () => {
      let marketId = loadDeployed(stosMigrationBlockNumber, "marketId");
      bondInfoEther.marketId = ethers.BigNumber.from(marketId);
      let StakedTosByBonderArray = [];
      let accumulatedDepositAmountArray = [];
      let mintedTosArray = [];
      let tosTotalSupplyArray = []


      let tosBalanceTreasuryPrev =  await tosContract.balanceOf(treasuryProxylogic.address);
      console.log('tosBalanceTreasuryPrev', tosBalanceTreasuryPrev);

      let tosBalanceLockTosPrev =  await tosContract.balanceOf(lockTosContract.address);
      console.log('tosBalanceLockTosPrev', tosBalanceLockTosPrev);

      let expectedAccumulatedDepositAmount = ethers.utils.parseEther("2.999999999999999997");
      let maxCumulativeDepositAmount = ethers.utils.parseEther("3");
      let accumulatedDepositAmount = ethers.utils.parseEther("0");

      let depositor = user1;
      let depositorUser = "user1";

      let purchasableAssetAmountAtOneTime_ = await bondDepositoryProxylogic.purchasableAssetAmountAtOneTime(
        bondInfoEther.market.priceTosPerToken,
        bondInfoEther.market.purchasableTOSAmountAtOneTime
      );
      let amount = purchasableAssetAmountAtOneTime_ ;
      if (accumulatedDepositAmount.add(purchasableAssetAmountAtOneTime_).gt(maxCumulativeDepositAmount)){
        amount = maxCumulativeDepositAmount.sub(accumulatedDepositAmount) ;
      }

      tosTotalSupplyArray.push(tosBalanceLockTosPrev.toString());

      let m = 0;
      for (m = 1; m < 2; m++) {

        /// 두번째 라운드 부터 이더를 보내고 민팅레이트를 수정한다.
        if (m != 0) {
          /// send ETH
          let balanceEthPrev =  await ethers.provider.getBalance(treasuryProxylogic.address);
          let sendEthAmount = ethers.utils.parseEther(depositSchedule[m]+"");
          sendEthToTreasury(admin1, treasuryProxylogic, sendEthAmount)
          expect(await ethers.provider.getBalance(treasuryProxylogic.address)).to.be.equal(balanceEthPrev.add(sendEthAmount));

          /// setMR
          let tosBalanceTotalSupply = await tosContract.totalSupply();
          let tosBalancePrev =  await tosContract.balanceOf(treasuryProxylogic.address);

          let amount = ethers.utils.parseEther("0");
          await treasuryProxylogic.connect(admin1).setMR(
            ethers.utils.parseEther(MintingRateSchedule[m]),
            amount,
            false
          );
          expect(await treasuryProxylogic.mintRate()).to.be.equal(ethers.utils.parseEther(MintingRateSchedule[m]));

        }

        /// 본드 구매
        let bondResponse = await bond(depositor, maxCumulativeDepositAmount, purchasableAssetAmountAtOneTime_, tosContract, stakingProxylogic, bondDepositoryProxylogic);
        console.log(m, bondResponse);

        StakedTosByBonderArray.push(bondResponse.StakedTosByBonder.toString());
        accumulatedDepositAmountArray.push(bondResponse.accumulatedDepositAmount.toString());
        mintedTosArray.push(bondResponse.mintedTos.toString());
        tosTotalSupplyArray.push(bondResponse.tosTotalSupply.toString());

        // console.log('expectedAccumulatedDepositAmount', convertFormat(expectedAccumulatedDepositAmount, 12));
        // console.log('bondResponse.accumulatedDepositAmount', convertFormat(bondResponse.accumulatedDepositAmount, 12));
        // console.log('bondResponse.mintedTos', convertFormat(bondResponse.mintedTos, 12));
        // console.log('bondResponse.StakedTosByBonder', convertFormat(bondResponse.StakedTosByBonder, 12));
        // console.log('bondResponse.tosTotalSupply', convertFormat(bondResponse.tosTotalSupply, 12));

        if (convertFormat(bondResponse.accumulatedDepositAmount, 12) !== (convertFormat(expectedAccumulatedDepositAmount, 12)))
          console.log("diff expectedAccumulatedDepositAmount" , expectedAccumulatedDepositAmount);

        if (convertFormat(bondResponse.mintedTos, 12) !== (convertFormat(ethers.utils.parseEther(scheduleMintedTos[m+1]), 12)))
          console.log("diff mintedTos" ,ethers.utils.parseEther(scheduleMintedTos[m+1]) );

        if (convertFormat(bondResponse.StakedTosByBonder, 12) !== (convertFormat(ethers.utils.parseEther(scheduleTosAllocatedToBonder[m+1]), 12)))
          console.log("diff StakedTosByBonder", ethers.utils.parseEther(scheduleTosAllocatedToBonder[m+1]) );

        if (convertFormat(bondResponse.tosTotalSupply, 12) !== (convertFormat(ethers.utils.parseEther(scheduleTotalTosSupply[m+1]), 12)))
          console.log("diff tosTotalSupply" , ethers.utils.parseEther(scheduleTotalTosSupply[m+1]));

        // expect(convertFormat(bondResponse.accumulatedDepositAmount, 12)).to.be.eq(
        //   convertFormat(expectedAccumulatedDepositAmount, 12));

        // expect(convertFormat(bondResponse.mintedTos, 12)).to.be.eq(
        //   convertFormat(ethers.utils.parseEther(scheduleMintedTos[m+1]), 12));

        // expect(convertFormat(bondResponse.StakedTosByBonder, 12)).to.be.eq(
        //   convertFormat(ethers.utils.parseEther(scheduleTosAllocatedToBonder[m+1]), 12));

        // expect(convertFormat(bondResponse.tosTotalSupply, 12)).to.be.eq(
        //   convertFormat(ethers.utils.parseEther(scheduleTotalTosSupply[m+1]), 12));

        /// Foundation Distribute
        {
          let tosBalanceTreasuryPrev =  await tosContract.balanceOf(treasuryProxylogic.address);
          let foundationTotalPercentage = await treasuryProxylogic.foundationTotalPercentage();
          let foundationAmount = await treasuryProxylogic.foundationAmount();

          let i = 0;
          for (i = 0; i < foundations.address.length; i++){
            foundations.balances[i] = await tosContract.balanceOf(foundations.address[i]);
          }

          let tx = await treasuryProxylogic.connect(admin1).foundationDistribute();

          for (i = 0; i < foundations.address.length; i++){
            let balanceTos = await tosContract.balanceOf(foundations.address[i]);
            foundations.balancesAfter[i] = balanceTos;
            if (!(foundations.balancesAfter[i].gt(foundations.balances[i]))) {
              console.log('foundationDistribute diff 1', foundations.balancesAfter[i], foundations.balances[i]);
            }
            if (!(foundations.balancesAfter[i].eq(foundationAmount.mul(foundations.percentages[i]).div(foundationTotalPercentage)))) {
              console.log('foundationDistribute diff 2', foundations.balancesAfter[i], foundationAmount.mul(foundations.percentages[i]).div(foundationTotalPercentage));
            }
            // expect(foundations.balancesAfter[i]).to.be.gt(foundations.balances[i]);
            // expect(foundations.balancesAfter[i]).to.be.eq(foundationAmount.mul(foundations.percentages[i]).div(foundationTotalPercentage));
          }
          let tosBalanceTreasuryAfter =  await tosContract.balanceOf(treasuryProxylogic.address);
          // console.log('tosBalanceTreasuryAfter', tosBalanceTreasuryAfter);

          let foundationAmountAfter = await treasuryProxylogic.foundationAmount();
          // console.log('foundationAmountAfter', foundationAmountAfter);

          if (!(tosBalanceTreasuryAfter.eq(tosBalanceTreasuryPrev.sub(foundationAmount).add(foundationAmountAfter)))) {
            console.log('foundationDistribute diff 3', foundations.balancesAfter[i], tosBalanceTreasuryPrev.sub(foundationAmount).add(foundationAmountAfter) );
          }

          // expect(tosBalanceTreasuryAfter).to.be.eq(tosBalanceTreasuryPrev.sub(foundationAmount).add(foundationAmountAfter));
        }

        /// 한달 시간 지남.
        {
          await indexEpochPassMonth();
        }

      }

      // save(stosMigrationBlockNumber,{
      //   name: "tosTotalSupplyArray",
      //   address: tosTotalSupplyArray
      // });
      // save(stosMigrationBlockNumber,{
      //   name: "accumulatedDepositAmountArray",
      //   address: accumulatedDepositAmountArray
      // });
      // save(stosMigrationBlockNumber,{
      //   name: "mintedTosArray",
      //   address: mintedTosArray
      // });
      // save(stosMigrationBlockNumber,{
      //   name: "StakedTosByBonderArray",
      //   address: StakedTosByBonderArray
      // });

    });


  })

});
