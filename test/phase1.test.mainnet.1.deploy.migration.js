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
// 메인넷에서 집계한 데이타
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

  let lockTOSProxy2;
  let lockTOSLogic2;

  let minter_role = "0xf0887ba65ee2024ea881d91b74c2450ef19e1557f03bed3ea9f16b037cbe2dc9";
  let burner_role = "0x9667e80708b6eeeb0053fa0cca44e028ff548e2a9f029edfeac87c118b08b7c8";

  // mainnet
  let wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  let testAddress = ""
  let lockTOSProxyAddress = "0x69b4A202Fa4039B42ab23ADB725aA7b1e9EEBD79"
  let lockTOSProxy2Address = ""
  let lockTOSLogic2Address = ""
  let etherUint = ethers.utils.parseUnits("1", 18);


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

  });

/////////////////////////////////////
// 1. 컨트랙 디플로이. LockTOS 업그레이드
/////////////////////////////////////

  describe("#0. lockTOSContract update", () => {

    it("deploy lockToslogic2Contract ", async () => {

        let factory = new ethers.ContractFactory(lockTOSLogic2abi.abi , lockTOSLogic2abi.bytecode , _lockTosAdmin)
        lockTOSLogic2 = await factory.deploy();
        await lockTOSLogic2.deployed()
        lockTOSLogic2Address = lockTOSLogic2.address;

        let code = await ethers.provider.getCode(lockTOSLogic2.address);
        expect(code).to.not.eq("0x");

        save(stosMigrationBlockNumber,{
            name: "LockTOSv2Logic0",
            address: lockTOSLogic2Address
          });
      })

      it("deploy lockTOSProxy2 ", async () => {
        let factory = new ethers.ContractFactory(lockTOSProxy2abi.abi , lockTOSProxy2abi.bytecode , _lockTosAdmin)
        lockTOSProxy2 = await factory.deploy();
        await lockTOSProxy2.deployed()
        lockTOSProxy2Address = lockTOSProxy2.address;

        let code = await ethers.provider.getCode(lockTOSProxy2.address);
        expect(code).to.not.eq("0x");

        save(stosMigrationBlockNumber,{
          name: "LockTOSv2Proxy",
          address: lockTOSProxy2Address
        });

      })

      it("upgrade LockTOSProxy's logic to lockTOSProxy2 ", async () => {
        lockTosContract = new ethers.Contract(lockTOSProxyAddress, lockTOSProxyabi, _lockTosAdmin);
        let tx = await lockTosContract.connect(_lockTosAdmin).upgradeTo(lockTOSProxy2Address);
        await tx.wait();
        expect(await lockTosContract.implementation()).to.be.eq(lockTOSProxy2Address);

        save(stosMigrationBlockNumber,{
          name: "LockTOSProxy",
          address: lockTOSProxyAddress
        });
      })

      it("set lockTOSProxy2's logic to lockToslogic2Contract ", async () => {
        lockTosContract = new ethers.Contract(lockTOSProxyAddress, lockTOSProxy2abi.abi, _lockTosAdmin);
        let tx = await lockTosContract.connect(_lockTosAdmin).setImplementation2(lockTOSLogic2Address, 0, true);
        await tx.wait();
        expect(await lockTosContract.implementation2(0)).to.be.eq(lockTOSLogic2Address);
      })

      it("lockTOS isAdmin", async () => {
        console.log("_lockTosAdmin.address : ",_lockTosAdmin.address);
        let tx = await lockTosContract.isAdmin(_lockTosAdmin.address);
        console.log("lockTos Admin : ",tx);
      })

      it("bring the newlogic", async () => {
        lockTosContract = new ethers.Contract(lockTOSProxyAddress, lockTOSLogic2abi.abi, ethers.provider);

        // console.log("lockTosContract", lockTOSLogic2abi.abi);

      })

  })


  describe("#0. Deploy the contract", () => {
    it("#0-0. Deploy TOSValueCalculator", async function () {
      tosCalculator = await ethers.getContractFactory("TOSValueCalculator");
      TOSValueCalculator = await tosCalculator.connect(admin1).deploy();
      await TOSValueCalculator.connect(admin1).deployed();

      let code = await ethers.provider.getCode(TOSValueCalculator.address);
      expect(code).to.not.eq("0x");
      // console.log(TOSValueCalculator.address);

      save(stosMigrationBlockNumber,{
        name: "TOSValueCalculator",
        address: TOSValueCalculator.address
      });

    });

    it("#0-0-1. initialize TOSCalculator", async () => {
      await TOSValueCalculator.connect(admin1).initialize(
        uniswapInfo.tos,
        uniswapInfo.weth,
        uniswapInfo.npm,
        uniswapInfo.tosethPool,
        uniswapInfo.poolfactory
      );

      let tosaddress = await TOSValueCalculator.tos()
      // console.log(tosaddress);
      expect(tosaddress).to.be.equal(uniswapInfo.tos);
    })

    it("#0-1. bring the TOS function", async () => {
      tosContract = new ethers.Contract( uniswapInfo.tos, tosabi, ethers.provider );
      // console.log(tosContract.address);
      let code = await ethers.provider.getCode(tosContract.address);
      expect(code).to.not.eq("0x");
    })

    describe("#0-2. Deploy treasuryLibrary ", () => {

      it("#0-2-0-1. Deploy LibTreasury ", async function () {
        const LibTreasury = await ethers.getContractFactory("LibTreasury");
        libTreasury = await LibTreasury.connect(admin1).deploy();

        save(stosMigrationBlockNumber,{
          name: "LibTreasury",
          address: libTreasury.address
        });

      });

      it("#0-2-0. Deploy Treasury Logic", async () => {
        treasurycont = await ethers.getContractFactory("Treasury",{
          libraries: {
            LibTreasury: libTreasury.address
          }
        });

        treasuryContract = await treasurycont.connect(admin1).deploy();
        await treasuryContract.deployed();

        let code = await ethers.provider.getCode(treasuryContract.address);
        // console.log("treasuryContract.address : ", treasuryContract.address)
        expect(code).to.not.eq("0x");

        save(stosMigrationBlockNumber,{
          name: "Treasury",
          address: treasuryContract.address
        });

      })

      it("#0-2-1. Deploy Treasury Proxy", async () => {
        treasurycont = await ethers.getContractFactory("TreasuryProxy");
        treasuryProxy = await treasurycont.connect(admin1).deploy();
        await treasuryProxy.deployed();

        save(stosMigrationBlockNumber,{
          name: "TreasuryProxy",
          address: treasuryProxy.address
        });

        await treasuryProxy.connect(admin1).upgradeTo(treasuryContract.address);
      })
      //
      // it("#0-2-2. initialize TreasuryProxy", async () => {
      //   await treasuryProxy.connect(admin1).initialize(
      //     tosContract.address,
      //     TOSValueCalculator.address,
      //     wethAddress
      //   );

      //   let calculAddrCheck = await treasuryProxy.calculator();
      //   expect(calculAddrCheck).to.be.equal(TOSValueCalculator.address);
      //   expect(await treasuryProxy.wethAddress()).to.be.equal(wethAddress);
      //   expect(await treasuryProxy.TOS()).to.be.equal(tosContract.address);
      // })
      //

      it("#0-2-3. TreasuryProxyLogic set", async () => {
        treasuryProxylogic = new ethers.Contract( treasuryProxy.address, treasuryLogicAbi.abi, ethers.provider);
        // console.log(treasuryProxylogic);

      })
    })


    describe("#0-5-1. burn TOS of Contracts", () => {
      it("#0-5-1-1. grantRole: give the burnRole to tosAdmin ", async () => {
        await tosContract.connect(_tosAdmin).grantRole(burner_role, tosAdmin);

        let tx = await tosContract.hasRole(burner_role,tosAdmin);
        expect(tx).to.be.equal(true);
      })

      it("#0-5-1-2. burn TOS of Contracts  ", async () => {

        let totalSupplyPrev = await tosContract.totalSupply();
        console.log('TOS totalSupply before burnning',totalSupplyPrev);

        let burnTosAmount = ethers.constants.Zero;
        for (let i = 0; i < burnTosContractList.length; i++){
          let balance = await tosContract.balanceOf(burnTosContractList[i]);
          let tx = await tosContract.connect(_tosAdmin).burn(burnTosContractList[i], balance);
          await tx.wait();
          burnTosAmount = burnTosAmount.add(balance);
        }

        let totalSuppley = await tosContract.totalSupply();
        console.log('TOS totalSupply after burnning',totalSuppley);

        expect(totalSuppley).to.be.equal(totalSupplyPrev.sub(burnTosAmount));
      })


      it("#0-5-1-3. burn TOS of EOA ", async () => {

        let totalSupplyPrev = await tosContract.totalSupply();
        console.log('TOS totalSupply before burnning',totalSupplyPrev);

        let burnTosAmount = ethers.constants.Zero;
        for (let i = 0; i < burnTosAddressList.length; i++){
          let balance = await tosContract.balanceOf(burnTosAddressList[i]);
          let tx = await tosContract.connect(_tosAdmin).burn(burnTosAddressList[i], balance);
          await tx.wait();
          burnTosAmount = burnTosAmount.add(balance);
        }

        let totalSuppley = await tosContract.totalSupply();
        console.log('TOS totalSupply after burnning',totalSuppley);

        expect(totalSuppley).to.be.equal(totalSupplyPrev.sub(burnTosAmount));
      })



    });


    describe("#0-3. Deploy Staking", () => {

      it("#0-2-0-1. Deploy LibStaking ", async function () {
        const LibStaking = await ethers.getContractFactory("LibStaking");
        libStaking = await LibStaking.connect(admin1).deploy();

        save(stosMigrationBlockNumber,{
          name: "LibStaking",
          address: libStaking.address
        });

      });

      it("#0-3-0. Deploy Staking Logic", async () => {
        const StakingV2 = await ethers.getContractFactory("StakingV2", {
          libraries: {
            LibStaking: libStaking.address
          }
        });

        stakingContract = await StakingV2.connect(admin1).deploy();
        await stakingContract.connect(admin1).deployed();

        let code = await ethers.provider.getCode(stakingContract.address);
        expect(code).to.not.eq("0x");

        save(stosMigrationBlockNumber,{
          name: "StakingV2",
          address: stakingContract.address
        });

      })

      it("#0-3-1. Deploy Staking Proxy", async () => {
        stakingcont = await ethers.getContractFactory("StakingV2Proxy");
        stakingProxy = await stakingcont.connect(admin1).deploy();
        await stakingProxy.connect(admin1).deployed();

        await stakingProxy.connect(admin1).upgradeTo(stakingContract.address);

        save(stosMigrationBlockNumber,{
          name: "StakingV2Proxy",
          address: stakingProxy.address
        });

      })

      it("#0-3-3. stakingProxyLogic set", async () => {
        stakingProxylogic = new ethers.Contract( stakingProxy.address, stakingV2LogicAbi.abi, ethers.provider);
      })
    })

    describe("#0-4. Deploy BondDepository", () => {
      it("#0-4-0. Deploy BondDepository logic", async () => {
        bondDepositorycont = await ethers.getContractFactory("BondDepository");
        bondDepositoryContract = await bondDepositorycont.connect(admin1).deploy();
        await bondDepositoryContract.connect(admin1).deployed();

        let code = await ethers.provider.getCode(bondDepositoryContract.address);
        // console.log("bondDepositoryContract.address : ", bondDepositoryContract.address)
        expect(code).to.not.eq("0x");

        save(stosMigrationBlockNumber,{
          name: "BondDepository",
          address: bondDepositoryContract.address
        });

      })

      it("#0-4-1. upgradeTo: Deploy BondDepository Proxy", async () => {
        bondDepositorycont = await ethers.getContractFactory("BondDepositoryProxy");
        bondDepositoryProxy = await bondDepositorycont.connect(admin1).deploy();
        await bondDepositoryProxy.connect(admin1).deployed();

        save(stosMigrationBlockNumber,{
          name: "BondDepositoryProxy",
          address: bondDepositoryProxy.address
        });

        await bondDepositoryProxy.connect(admin1).upgradeTo(bondDepositoryContract.address);
      })

      it("#0-4-3. stakingProxyLogic set", async () => {
        bondDepositoryProxylogic = new ethers.Contract(bondDepositoryProxy.address, bondDepositoryLogicAbi.abi, ethers.provider);
      })
    })

  })

  describe("#1. setting the contract", () => {

    it("grantRole: give the mintRole to treasury", async () => {
      await tosContract.connect(_tosAdmin).grantRole(minter_role, tosAdmin);

      let tx = await tosContract.hasRole(minter_role,tosAdmin);
      expect(tx).to.be.equal(true);
    })

    it("for test : tos admin mint tos ", async () => {
      await tosContract.connect(_tosAdmin).mint(tosAdmin, ethers.utils.parseEther("10000","Ether"));

    })

    it("grantRole: give the mintRole to treasury", async () => {
      await tosContract.connect(_tosAdmin).grantRole(minter_role,treasuryProxy.address);

      let tx = await tosContract.hasRole(minter_role,treasuryProxy.address);
      expect(tx).to.be.equal(true);
    })

    describe("#1-1. treasury setting", () => {
      it("1-1. treasury admin, proxyAdmin, policyAdmin check", async () => {
        // console.log(treasuryProxy);
        expect(await treasuryProxy.isAdmin(admin1.address)).to.be.equal(true)
        expect(await treasuryProxy.isProxyAdmin(admin1.address)).to.be.equal(true)

        expect(await treasuryProxy.isPolicy(admin1.address)).to.be.equal(false)
      })

      it("#1-1-1.addPolicy : user can't call addPolicy", async () => {
        await expect(
          treasuryProxy.connect(user1).addPolicy(admin1.address)
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-1-1. addPolicy : onlyProxyAdmin can call addPolicy", async () => {
        await treasuryProxy.connect(admin1).addPolicy(admin1.address)
        expect(await treasuryProxy.isPolicy(admin1.address)).to.be.equal(true)
      })

      it("#1-1-2. user can't call initialize", async () => {
        await expect(
          treasuryProxy.connect(user1).initialize(
            tosContract.address,
            TOSValueCalculator.address,
            wethAddress,
            uniswapInfo.poolfactory,
            stakingProxy.address,
            uniswapInfo.wtonTosPool
          )
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-1-2. initialize : onlyProxyAdmin can call initialize", async () => {
        await treasuryProxy.connect(admin1).initialize(
          tosContract.address,
          TOSValueCalculator.address,
          wethAddress,
          uniswapInfo.poolfactory,
          stakingProxy.address,
          uniswapInfo.wtonTosPool
        )

        expect(await treasuryProxylogic.calculator()).to.be.equal(TOSValueCalculator.address);
        expect(await treasuryProxylogic.tos()).to.be.equal(tosContract.address);
        expect(await treasuryProxylogic.wethAddress()).to.be.equal(wethAddress);
      })

      it("#1-1-3. enable : user can't call enable (for mint)", async () => {
        await expect(
          treasuryProxylogic.connect(user1).enable(
            STATUS.REWARDMANAGER,
            bondDepositoryProxy.address
          )
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-1-3. setMintRateDenominator  ", async () => {

        await treasuryProxylogic.connect(admin1).setMintRateDenominator(ethers.utils.parseEther("1"));

      })

      it("#1-1-3. enable : policy can call enable (for mint staking)", async () => {

        let stakingProxyREWARDMANAGER =  await treasuryProxylogic.permissions(STATUS.STAKER, stakingProxy.address)

        expect(
          await treasuryProxylogic.permissions(STATUS.STAKER, stakingProxy.address)
        ).to.be.equal(false)

        await treasuryProxylogic.connect(admin1).enable(STATUS.STAKER, stakingProxy.address);

        expect(
          await treasuryProxylogic.permissions(STATUS.STAKER, stakingProxy.address)
        ).to.be.equal(true)
      })

      it("#1-1-4. setFoundationDistributeInfo : user can't call setFoundationDistributeInfo ", async () => {
        expect(await treasuryProxy.isPolicy(user1.address)).to.be.equal(false)

        await expect(
          treasuryProxylogic.connect(user1).setFoundationDistributeInfo(
            foundations.address, foundations.percentages
          )
        ).to.be.revertedWith("Accessible: Caller is not an policy admin")
      })

      it("#1-1-4. setFoundationDistributeInfo : policy can call setFoundationDistributeInfo", async () => {


        expect(await treasuryProxy.isPolicy(admin1.address)).to.be.equal(true)

        await treasuryProxylogic.connect(admin1).setFoundationDistributeInfo(
          foundations.address, foundations.percentages
        );

        let totalPercantage = ethers.BigNumber.from("0");
        for (let i=0; i< foundations.percentages.length; i++) {
          totalPercantage = totalPercantage.add(foundations.percentages[i]);
        }

        expect(await treasuryProxylogic.foundationTotalPercentage()).to.be.equal(totalPercantage)

      })


      it("#1-1-5. disable : user can't call disable", async () => {
        await expect(
          treasuryProxylogic.connect(user1).disable(
            STATUS.REWARDMANAGER,
            stakingProxy.address        )
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-1-5. disable : policy can call disable", async () => {

          expect(
            await treasuryProxylogic.permissions(STATUS.STAKER, stakingProxy.address)
          ).to.be.equal(true)

          await treasuryProxylogic.connect(admin1).disable(STATUS.STAKER, stakingProxy.address);

          expect(
            await treasuryProxylogic.permissions(STATUS.STAKER, stakingProxy.address)
          ).to.be.equal(false)

          await treasuryProxylogic.connect(admin1).enable(STATUS.STAKER, stakingProxy.address);
      })
    });


    describe("#1-2. Staking setting", async () => {
      it("#1-2. Staking admin, proxyAdmin, policyAdmin check", async () => {
        expect(await stakingProxy.isAdmin(admin1.address)).to.be.equal(true)
        expect(await stakingProxy.isProxyAdmin(admin1.address)).to.be.equal(true)

        expect(await stakingProxy.isPolicy(admin1.address)).to.be.equal(false)
      })

      it("#1-2-1. addPolicy : user can't call addPolicy", async () => {
        await expect(
          stakingProxy.connect(user1).addPolicy(admin1.address)
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-2-1. addPolicy : onlyProxyAdmin can call addPolicy", async () => {
        await stakingProxy.connect(admin1).addPolicy(admin1.address)
        expect(await stakingProxy.isPolicy(admin1.address)).to.be.equal(true)
      })

      it("#1-2-2. initialize : user can't call initialize", async () => {
        const block = await ethers.provider.getBlock('latest')
        firstEndEpochTime = block.timestamp + epochLength;

        await expect(
          stakingProxy.connect(user1).initialize(
            uniswapInfo.tos,
            [epochLength, firstEndEpochTime],
            lockTosContract.address,
            treasuryProxy.address,
            basicBondPeriod
          )
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-2-2. initialize : onlyProxyAdmin can call initialize", async () => {
        const block = await ethers.provider.getBlock('latest')
        firstEndEpochTime = block.timestamp + epochLength;
        // console.log("firstEndEpochTime :", firstEndEpochTime);

        await stakingProxy.connect(admin1).initialize(
          uniswapInfo.tos,
          [epochLength,firstEndEpochTime],
          lockTosContract.address,
          treasuryProxy.address,
          basicBondPeriod
        )

        expect(await stakingProxy.treasury()).to.be.equal(treasuryProxy.address);
        expect(await stakingProxy.basicBondPeriod()).to.be.equal(basicBondPeriod);
        expect(await stakingProxy.lockTOS()).to.be.equal(lockTosContract.address);
        let epochInfo = await stakingProxy.epoch();
        expect(epochInfo.length_).to.be.equal(epochLength);
        // expect(epochInfo.number).to.be.equal(firstEpochNumber);
        expect(epochInfo.end).to.be.eq(firstEndEpochTime);

      })


      it("#1-2-3. setAddressInfos : user can't call setAddressInfos", async () => {

        await expect(
          stakingProxylogic.connect(user1).setAddressInfos(
            treasuryContract.address,
            treasuryContract.address,
            treasuryContract.address
          )
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })


      it("#1-2-3. setAddressInfos : admin can call setAddressInfos", async () => {

        expect(await stakingProxylogic.tos()).to.be.eq(uniswapInfo.tos);
        expect(await stakingProxylogic.lockTOS()).to.be.eq(lockTosContract.address);
        expect(await stakingProxylogic.treasury()).to.be.eq(treasuryProxy.address);

        await  stakingProxylogic.connect(admin1).setAddressInfos(
          treasuryContract.address,
          treasuryContract.address,
          treasuryContract.address
        );

        expect(await stakingProxylogic.tos()).to.be.eq(treasuryContract.address);
        expect(await stakingProxylogic.lockTOS()).to.be.eq(treasuryContract.address);
        expect(await stakingProxylogic.treasury()).to.be.eq(treasuryContract.address);

        await  stakingProxylogic.connect(admin1).setAddressInfos(
            uniswapInfo.tos,
            lockTosContract.address,
            treasuryProxy.address
        );

        expect(await stakingProxylogic.tos()).to.be.eq(uniswapInfo.tos);
        expect(await stakingProxylogic.lockTOS()).to.be.eq(lockTosContract.address);
        expect(await stakingProxylogic.treasury()).to.be.eq(treasuryProxy.address);

      })


      it("#1-2-3. setRebasePerEpoch : user can't call setRebasePerEpoch", async () => {
        let rebasePerEpoch = constRebasePerEpoch;
        await expect(
          stakingProxylogic.connect(user1).setRebasePerEpoch(rebasePerEpoch)
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-2-3. setRebasePerEpoch : onlyPolicyAdmin can call setRebasePerEpoch", async () => {
        let rebasePerEpoch = constRebasePerEpoch
        await stakingProxylogic.connect(admin1).setRebasePerEpoch(rebasePerEpoch);
        expect((await stakingProxylogic.rebasePerEpoch())).to.be.equal(rebasePerEpoch)
      })

      it("#1-2-4. setIndex : user can't call setIndex", async () => {
        let index = ethers.utils.parseEther("1")
        await expect(
          stakingProxylogic.connect(user1).setIndex(index)
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-2-4. setIndex : onlyPolicyAdmin can call setIndex", async () => {
        let epochtestbefore = await stakingProxylogic.epoch();

        expect(epochtestbefore.length_).to.be.equal(epochLength);

        let index = ethers.utils.parseEther("1")
        await stakingProxylogic.connect(admin1).setIndex(index);
        expect((await stakingProxylogic.index_())).to.be.equal(index)
      })

      it("#1-2-5. setBasicBondPeriod : user can't call setBasicBondPeriod", async () => {
        await expect(
          stakingProxylogic.connect(user1).setBasicBondPeriod(basicBondPeriod)
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-2-5. setBasicBondPeriod : onlyPolicyAdmin can call setBasicBondPeriod", async () => {
        await stakingProxylogic.connect(admin1).setBasicBondPeriod(basicBondPeriod + 100)
        expect((await stakingProxylogic.basicBondPeriod())).to.be.equal(basicBondPeriod+ 100);

        await stakingProxylogic.connect(admin1).setBasicBondPeriod(basicBondPeriod)
      })

      it("#1-2-6. addAdmin : user can't call addAdmin", async () => {
        await expect(
          stakingProxylogic.connect(user1).addAdmin(user1.address)
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-2-6. addAdmin : onlyProxyAdmin can call addAdmin", async () => {
        await stakingProxylogic.connect(admin1).addAdmin(bondDepositoryProxylogic.address)
        expect(await stakingProxylogic.isAdmin(bondDepositoryProxylogic.address)).to.be.equal(true);
      })

    })


    describe("#1-3. BondDepository setting", async () => {
      it("#1-3. BondDepository admin, proxyAdmin, policyAdmin check", async () => {
        expect(await bondDepositoryProxy.isAdmin(admin1.address)).to.be.equal(true)
        expect(await bondDepositoryProxy.isProxyAdmin(admin1.address)).to.be.equal(true)

        expect(await bondDepositoryProxy.isPolicy(admin1.address)).to.be.equal(false)
      })

      it("#1-3-1. addPolicy : user can't call addPolicy", async () => {
        await expect(
          bondDepositoryProxy.connect(user1).addPolicy(admin1.address)
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-3-1. addPolicy : onlyProxyAdmin can call addPolicy", async () => {
        await bondDepositoryProxy.connect(admin1).addPolicy(admin1.address)
        expect(await bondDepositoryProxy.isPolicy(admin1.address)).to.be.equal(true)
      })

      it("#1-3-2. initialize : user can't call initialize", async () => {
        await expect(
          bondDepositoryProxy.connect(user1).initialize(
            uniswapInfo.tos,
            stakingProxy.address,
            treasuryProxy.address,
            TOSValueCalculator.address,
            uniswapInfo.poolfactory
          )
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-3-2. initialize : onlyProxyAdmin can call initialize", async () => {
        await bondDepositoryProxy.connect(admin1).initialize(
            uniswapInfo.tos,
            stakingProxy.address,
            treasuryProxy.address,
            TOSValueCalculator.address,
            uniswapInfo.poolfactory
          )

        expect(await bondDepositoryProxy.calculator()).to.be.equal(TOSValueCalculator.address);
        expect(await bondDepositoryProxy.tos()).to.be.equal(uniswapInfo.tos);
        expect(await bondDepositoryProxy.staking()).to.be.equal(stakingProxy.address);
        expect(await bondDepositoryProxy.treasury()).to.be.equal(treasuryProxy.address);
        expect(await bondDepositoryProxy.uniswapV3Factory()).to.be.equal(uniswapInfo.poolfactory);


        let treasuryAddr = await bondDepositoryProxylogic.treasury();
        expect(treasuryAddr).to.be.equal(treasuryProxy.address);
      })

      it("#1-1-3. enable : policy can call enable (for create market in bondDepository)", async () => {
        expect(await treasuryProxylogic.isPolicy(admin1.address)).to.be.equal(true)
        expect(await treasuryProxylogic.isAdmin(admin1.address)).to.be.equal(true)
        expect(await treasuryProxylogic.isProxyAdmin(admin1.address)).to.be.equal(true)

        expect(
          await treasuryProxylogic.permissions(STATUS.BONDER, bondDepositoryProxy.address)
        ).to.be.equal(false)

        await treasuryProxylogic.connect(admin1).enable(STATUS.BONDER, bondDepositoryProxy.address);

        expect(
          await treasuryProxylogic.permissions(STATUS.BONDER, bondDepositoryProxy.address)
        ).to.be.equal(true)
      })

    })


    describe("#2. lockTOS setting", async () => {
      it("#2-1-1. user can't set the stakingContarct", async () => {
        await expect(
          lockTosContract.connect(user1).setStaker(stakingProxylogic.address)
        ).to.be.revertedWith("Accessible: Caller is not an admin")
      })

      it("#2-1-1. onlyLockTOSContract admin set the stakingContarct", async () => {
        await lockTosContract.connect(_lockTosAdmin).setStaker(stakingProxylogic.address);

        let staker = await lockTosContract.staker();
        expect(staker).to.be.equal(stakingProxylogic.address);
      })
    })
  })


});
