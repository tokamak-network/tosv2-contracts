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
} = require("./info_simulation_mainnet");


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

  // mainnet
  let wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  let testAddress = ""
  let lockTOSProxyAddress = "0x69b4A202Fa4039B42ab23ADB725aA7b1e9EEBD79"
  let lockTOSProxy2Address = ""
  let lockTOSLogic2Address = ""
  let etherUint = ethers.utils.parseUnits("1", 18);

  let firstMarketlength;
  let checkMarketLength;

  // main-net
  let uniswapInfo={
    poolfactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    npm: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    swapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    wethUsdcPool: "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8",
    tosethPool: "0x2ad99c938471770da0cd60e08eaf29ebff67a92a",
    wtonWethPool: "0xc29271e3a68a7647fd1399298ef18feca3879f59",
    wtonTosPool: "0x1c0ce9aaa0c12f53df3b4d8d77b82d6ad343b4e4",
    tosDOCPool: "0x369bca127b8858108536b71528ab3befa1deb6fc",
    wton: "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2",
    tos: "0x409c4D8cd5d2924b9bc5509230d16a61289c8153",
    weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    doc: "0x0e498afce58de8651b983f136256fa3b8d9703bc",
    _fee: ethers.BigNumber.from("3000"),
    NonfungibleTokenPositionDescriptor: "0x91ae842A5Ffd8d12023116943e72A606179294f3"
  }


  let STATUS = {
      NONE: 0,
      RESERVEDEPOSITOR: 1,
      RESERVESPENDER: 2,
      RESERVETOKEN: 3,
      RESERVEMANAGER: 4,
      LIQUIDITYDEPOSITOR: 5,
      LIQUIDITYTOKEN: 6,
      LIQUIDITYMANAGER: 7,
      REWARDMANAGER: 8,
      BONDER: 9,
      STAKER: 10
  }

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

  let bondInfoWTON = {
    marketId : null,
    check: true,
    token: ethers.constants.AddressZero,
    poolAddress: uniswapInfo.tosethPool,
    fee: 0,
    market: {
      capAmountOfTos: ethers.utils.parseEther("1000"),
      closeTime: 0,
      priceTokenPerTos: ethers.BigNumber.from("4124960000000"),
      priceTosPerToken: ethers.BigNumber.from("242427000000000000000000"),
      purchasableTOSAmountAtOneTime: ethers.utils.parseEther("100")
    }
  }

  let bondInfoLP = {
    marketId : null,
    check: true,
    token: ethers.constants.AddressZero,
    poolAddress: uniswapInfo.tosethPool,
    fee: 0,
    market: {
      capAmountOfTos: ethers.utils.parseEther("1000"),
      closeTime: 0,
      priceTosPerToken: ethers.BigNumber.from("242427000000000000000000"),
      purchasableTOSAmountAtOneTime: ethers.utils.parseEther("100")
    }
  }

  let deposits = {user1 : [], user2: []};
  let depositor, depositorUser, index, depositData;

  async function indexEpochPassMonth() {
    let passTime =   60 * 60 * 24 * 30;
    ethers.provider.send("evm_increaseTime", [passTime])
    ethers.provider.send("evm_mine")
  }
  async function indexEpochPass(_stakingProxylogic, passNextEpochCount) {
      let block = await ethers.provider.getBlock();
      let epochInfo = await _stakingProxylogic.epoch();
      let passTime =  epochInfo.end - block.timestamp + (epochInfo.length_ * passNextEpochCount) + 60;
      ethers.provider.send("evm_increaseTime", [passTime])
      ethers.provider.send("evm_mine")
  }

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

  async function sendEthToTreasury(admin1, treasuryProxylogic, amount) {
    let transaction = {
      to: treasuryProxylogic.address,
      from: admin1.address,
      data: "0x",
      value: amount
    }
    await admin1.sendTransaction( transaction );
  }


  async function logStatus(str, treasuryProxylogic, stakingProxylogic, tosContract, foundations) {
    console.log('----- '+str+' ------- ');

    let getIndex = await stakingProxylogic.getIndex();
    console.log('getIndex', getIndex);

    let balanceOf = await tosContract.balanceOf(treasuryProxylogic.address);
    console.log('TOS.balanceOf(treasury)', ethers.utils.formatEther(balanceOf));

    let enableStaking = await treasuryProxylogic.enableStaking();
    console.log('treasuryProxylogic enableStaking', ethers.utils.formatEther(enableStaking));

    let runwayTos = await stakingProxylogic.runwayTos();
    console.log('runwayTos', ethers.utils.formatEther(runwayTos));

    let totalSupply = await tosContract.totalSupply();
    console.log('Total TOS Supply',  ethers.utils.formatEther(totalSupply) , "TOS");

    let stakingPrincipal = await stakingProxylogic.stakingPrincipal();
    console.log('stakingPrincipal', ethers.utils.formatEther(stakingPrincipal));

    let totalLtos = await stakingProxylogic.totalLtos();
    console.log('totalLtos', ethers.utils.formatEther(totalLtos));

    let getLtosToTos = await stakingProxylogic.getLtosToTos(totalLtos);
    console.log('getLtosToTos', ethers.utils.formatEther(getLtosToTos));

    for (let k = 0; k < foundations.length; k++){
      let foundationBalance = await tosContract.balanceOf(foundations.address[k]);
      console.log('foundation TOS Balance', k, foundations.address[k], ethers.utils.formatEther(foundationBalance));
    }

    console.log('-----  possibleIndex ------- ');
    let possibleIndex = await stakingProxylogic.possibleIndex();
    console.log('possibleIndex', possibleIndex);

    let runwayTosPossibleIndex = await stakingProxylogic.runwayTosPossibleIndex();
    console.log('runwayTosPossibleIndex', ethers.utils.formatEther(runwayTosPossibleIndex));

    let getLtosToTosPossibleIndex = await stakingProxylogic.getLtosToTosPossibleIndex(totalLtos);
    console.log('getLtosToTosPossibleIndex', ethers.utils.formatEther(getLtosToTosPossibleIndex));

    let reward = getLtosToTosPossibleIndex.sub(stakingPrincipal);
    console.log('reward', ethers.utils.formatEther(reward));

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


  before(async () => {
    accounts = await ethers.getSigners();
    [admin1, admin2, user1, user2, user3, user4, user5, user6 ] = accounts;
    //console.log('admin1',admin1.address);
    console.log('admin1',admin1.address);
    provider = ethers.provider;
    // poolInfo.admin = admin1;
    // tokenInfo.admin = admin1;

    // await hre.ethers.provider.send("hardhat_setBalance", [
    //   admin1.address,
    //   "0x56BC75E2D63100000",
    // ]);

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

  describe("#5. lockTOS migration ", () => {

    it("#5-5. Transfer LockTOS's TOS from LockTOS to Treasury ", async () => {
      let tosBalance = await tosContract.balanceOf(lockTosContract.address);
      console.log('LockTOS before tosBalance',  ethers.utils.formatEther(tosBalance) , "TOS");

      let tosBalanceTreasury =  await tosContract.balanceOf(deployed.treasury);
      console.log('treasury before tosBalance',  ethers.utils.formatEther(tosBalanceTreasury) , "TOS");


      console.log('락토스의 토스를 트래저리로 옮깁니다.',deployed.treasury);

      let tx = await lockTosContract.connect(_lockTosAdmin)["transferTosToTreasury(address)"](deployed.treasury);

      console.log('LockTOS.transferTosToTreasury end ',tx)

      await tx.wait();

      let tosBalanceAfter = await tosContract.balanceOf(lockTosContract.address);
      console.log('LockTOS after tosBalance ',  ethers.utils.formatEther(tosBalanceAfter) , "TOS");

      let tosBalanceTreasuryAfter =  await tosContract.balanceOf(deployed.treasury);
      console.log('treasury after tosBalance',  ethers.utils.formatEther(tosBalanceTreasuryAfter) , "TOS");


      save(stosMigrationBlockNumber,{
        name: "LockTosBalanceTOS",
        address: tosBalance.toString()
      });

    })

  })
  /*
  describe("#6. check data after migrating ", () => {

    it("#6-1. Initial TOS Staked", async () => {
      let stakingPrincipal = await stakingProxylogic.stakingPrincipal();
      console.log('stakingPrincipal',ethers.utils.formatEther(stakingPrincipal), "TOS");
    })

    it("#6-2. Initial Treasury Reserve (TOS mint)", async () => {
      let tosBalanceTotalSupply = await tosContract.totalSupply();
      let tosBalancePrev =  await tosContract.balanceOf(treasuryProxylogic.address);

      let amount = ethers.utils.parseEther("0");
      if (tosBalanceTotalSupply.lt(totalTosSupplyTarget)) {
        amount = totalTosSupplyTarget.sub(tosBalanceTotalSupply);
      }
      console.log('Amoun to mint TOS', ethers.utils.formatEther(amount) , "TOS");

    })

  })


  describe("#7. Initial Set Minting Rate in Treaury ", () => {

    it("#7-1. send 100 ETH to treasury ", async () => {
      let balanceEthPrev =  await ethers.provider.getBalance(treasuryProxylogic.address);

      let amount = ethers.utils.parseEther(depositSchedule[indexMintRate]+"");

      let transaction = {
        to: treasuryProxylogic.address,
        from: admin1.address,
        data: "0x",
        value:amount
      }

      await admin1.sendTransaction(transaction);

      let balanceEthAfter =  await ethers.provider.getBalance(treasuryProxylogic.address);
      expect(balanceEthAfter).to.be.equal(balanceEthPrev.add(amount));
    })

    it("#7-2. setMR : onlyPolicyAdmin can call setMR(mintRate, 0, false)", async () => {
      let tosBalanceTotalSupply = await tosContract.totalSupply();
      let tosBalancePrev =  await tosContract.balanceOf(treasuryProxylogic.address);

      let amount = ethers.utils.parseEther("0");
      if (tosBalanceTotalSupply.lt(totalTosSupplyTarget)) {
        amount = totalTosSupplyTarget.sub(tosBalanceTotalSupply);
      }

      console.log('tos mint', amount);

      await treasuryProxylogic.connect(admin1).setMR(
        ethers.utils.parseEther(MintingRateSchedule[indexMintRate]),
        amount,
        false
      );

      expect(await tosContract.balanceOf(treasuryProxylogic.address)).to.be.equal(tosBalancePrev.add(amount));
      expect(await tosContract.totalSupply()).to.be.equal(totalTosSupplyTarget);

      expect(await treasuryProxylogic.mintRate()).to.be.equal(ethers.utils.parseEther(MintingRateSchedule[indexMintRate]));

      // let tosBalanceAfter =  await tosContract.balanceOf(treasuryProxylogic.address);
      // console.log('treasury tosBalance', ethers.utils.formatEther(tosBalanceAfter) , "TOS");

      indexMintRate++;
      await setTimeNextSetMr();
    })

    it("#7-3. RunwayTOS Treasury Reserve ", async () => {
      let getIndex = await stakingProxylogic.getIndex();
      console.log('getIndex', getIndex);

      let balanceOf = await tosContract.balanceOf(treasuryProxylogic.address);
      console.log('treasuryProxylogic balanceOf', ethers.utils.formatEther(balanceOf));

      let enableStaking = await treasuryProxylogic.enableStaking();
      console.log('treasuryProxylogic enableStaking', ethers.utils.formatEther(enableStaking));

      let runwayTos = await stakingProxylogic.runwayTos();
      console.log('runwayTos', ethers.utils.formatEther(runwayTos));
    })

    it("#7-4. Total TOS Supply ", async () => {
      let totalSupply = await tosContract.totalSupply();
      console.log('Total TOS Supply',  ethers.utils.formatEther(totalSupply) , "TOS");
    })

  })
  */

});
