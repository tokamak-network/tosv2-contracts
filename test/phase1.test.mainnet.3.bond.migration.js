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
  treasuary: "",
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

    deployed.treasuary = loadDeployed(stosMigrationBlockNumber, "TreasuryProxy");
    deployed.stake = loadDeployed(stosMigrationBlockNumber, "StakingV2Proxy");
    deployed.bond = loadDeployed(stosMigrationBlockNumber, "BondDepositoryProxy");

  });

/////////////////////////////////////
// 1. 컨트랙 디플로이. LockTOS 업그레이드
/////////////////////////////////////


  describe("#0. Get the contract", () => {

    it("#0-2-3. TreasuryProxyLogic set", async () => {
      treasuryProxylogic = new ethers.Contract(deployed.treasury, treasuryLogicAbi.abi, ethers.provider);

    })

    it("#0-3-3. stakingProxyLogic set", async () => {
      stakingProxylogic = new ethers.Contract( stakingProxy.address, stakingV2LogicAbi.abi, ethers.provider);
    })

    it("#0-4-3. stakingProxyLogic set", async () => {
      bondDepositoryProxylogic = new ethers.Contract(bondDepositoryProxy.address, bondDepositoryLogicAbi.abi, ethers.provider);
    })

  })

  describe("#5. lockTOS migration ", () => {

    it("5-1. LockTOS.increaseLockTOSAmounts : Only _lockTosAdmin can call increaseLockTOSAmounts ", async () => {
        const addLockTosInfos = JSON.parse(await fs.readFileSync("./test/data/stos-ids-"+stosMigrationBlockNumber+".json"));
        if(addLockTosInfos.ids == null) return;
        let batchSize = stosMigrationSet.batchSize;
        let tx;

        let len = addLockTosInfos.ids.length;
        let currentTime = addLockTosInfos.timestamp;
        let ids = addLockTosInfos.ids;
        let accounts = addLockTosInfos.accounts;
        let amounts = addLockTosInfos.amounts;
        let ends = addLockTosInfos.ends;
        let profits = addLockTosInfos.profits;
        console.log('len',len)
        console.log('currentTime',currentTime)

        let loopCount = Math.floor(len/batchSize)+1;
        let maxRound = loopCount -1;
        console.log('loopCount',loopCount, 'maxRound',maxRound );
        let c = 0;
        for(c = 0; c < loopCount; c++){

          let start = c * batchSize;
          let end = start + batchSize;
          if(end > addLockTosInfos.ids.length)  end = addLockTosInfos.ids.length;

          // console.log('start',start)
          // console.log('end',end)

          let idList = [];
          let accountList = [];
          let amountList = [];
          let profitList = [];

          try{
              if(!ids) return;
              if(!accounts) return;
              if(!amounts) return;
              if(!ends) return;
              if(!profits) return;

              for(let i = start; i < end; i++){
                  idList.push(ethers.BigNumber.from(ids[i]));
                  accountList.push(accounts[i]);
                  amountList.push(ethers.BigNumber.from(amounts[i]));
                  profitList.push(ethers.BigNumber.from(profits[i]));
              }
              // console.log(c, 'idList',idList)
              // console.log(c, 'accountList',accountList)
              // console.log(c, 'amountList',amountList)
              // console.log(c, 'profitList',profitList)
              console.log('LockTOS.increaseLockTOSAmounts call ',start, end, 'round', c )
              tx = await lockTosContract.connect(_lockTosAdmin).increaseAmountOfIds(
                          accountList,
                          idList,
                          profitList,
                          currentTime
                      );

              console.log('LockTOS.increaseLockTOSAmounts end ',start, end, tx.hash)

              await tx.wait();
              await timeout(1);

          }catch(error){
            console.log('LockTOS.increaseLockTOSAmounts error',c, start, end, error);
            //break;
          }
        }

    })

    it("5-2. check stos's principal ", async () => {
      const addLockTosInfos = JSON.parse(await fs.readFileSync("./test/data/stos-ids-"+stosMigrationBlockNumber+".json"));
      if(addLockTosInfos.ids == null) return;
      let len = addLockTosInfos.ids.length;
      let currentTime = addLockTosInfos.timestamp;
      let ids = addLockTosInfos.ids;
      let accounts = addLockTosInfos.accounts;
      let amounts = addLockTosInfos.amounts;
      let ends = addLockTosInfos.ends;
      let profits = addLockTosInfos.profits;
      // console.log('len',len)

      let start = 0;
      let end = addLockTosInfos.ids.length;
      try{
        if(!ids) return;
        if(!accounts) return;
        if(!amounts) return;
        if(!ends) return;
        if(!profits) return;
        stosMigrationSet.profitZeroLockIds = [];

        for(let i = start; i < end; i++){

            let id = ethers.BigNumber.from(ids[i]);
            let amount = ethers.BigNumber.from(amounts[i]);
            let profit = profits[i];
            let lockTosInfo = await lockTosContract.locksInfo(id);

            if(profit != "0"){
              expect(lockTosInfo.amount).to.be.gt(amount);

                if(lockTosInfo.amount.gt(amount)) {
                    //console.log('ok ', id.toString(), 'original ', amount.toString(), ',profit',profit, 'increase',lockTosInfo.amount.toString() );
                } else {
                    console.log('wrong ', id.toString(), 'original ', amount.toString(), ',profit',profit, 'increase',lockTosInfo.amount.toString());
                }
            } else {
              // console.log('profit zero id ', id.toNumber());
              // console.log('amount',amount) ;
              // console.log('profit',profit) ;
              // console.log('lockTosInfo',lockTosInfo) ;
              stosMigrationSet.profitZeroLockIds.push(id.toNumber());

              expect(lockTosInfo.amount).to.be.eq(amount);
              if(lockTosInfo.amount.eq(amount)) {
                  //console.log('ok ', id.toString(), 'original ', amount.toString(), ',profit',profit, 'increase',lockTosInfo.amount.toString() );
              } else {
                  console.log('wrong ', id.toString(), 'original ', amount.toString(), ',profit',profit, 'increase',lockTosInfo.amount.toString());
              }
            }
        }
        console.log('profitZeroLockIds 이미 종료되었는데, 언스테이킹을 하지 않음. ', stosMigrationSet.profitZeroLockIds);

      }catch(error){
          console.log('compareStakeAnfLockTOSAmounts error', start, end, error);
      }
    })

    it("5-3. StakeV2.syncStos : Only policyAdmin can call syncStos ", async () => {
      const addLockTosInfos = JSON.parse(await fs.readFileSync("./test/data/stos-ids-"+stosMigrationBlockNumber+".json"));

      let index = await stakingProxylogic.getIndex();
      console.log('index', index)
      stosMigrationSet.prevStakeId = await stakingProxylogic.stakingIdCounter();
      console.log('stosMigrationSet.prevStakeId', stosMigrationSet.prevStakeId)

      if(addLockTosInfos.ids == null) return;
      let batchSize = stosMigrationSet.batchSize;
      let tx;

      let len = addLockTosInfos.ids.length;
      let currentTime = addLockTosInfos.timestamp;
      let ids = addLockTosInfos.ids;
      let accounts = addLockTosInfos.accounts;
      let amounts = addLockTosInfos.amounts;
      let ends = addLockTosInfos.ends;
      let profits = addLockTosInfos.profits;
      console.log('len',len)
      // console.log('currentTime',currentTime)

      let loopCount = Math.floor(len/batchSize)+1;
      let maxRound = loopCount -1;
      console.log('loopCount',loopCount, 'maxRound',maxRound );
      let c = 0;
      for(c = 0; c < loopCount; c++){

        let start = c * batchSize;
        let end = start + batchSize;
        if(end > addLockTosInfos.ids.length)  end = addLockTosInfos.ids.length;

        // console.log('start',start)
        // console.log('end',end)

        let idList = [];
        let accountList = [];
        let amountList = [];
        //let profitList = [];
        let endList = [];

        try{
            if(!ids) return;
            if(!accounts) return;
            if(!amounts) return;
            if(!ends) return;
            //if(!profits) return;

            for(let i = start; i < end; i++){
                idList.push(ethers.BigNumber.from(ids[i]));
                accountList.push(accounts[i]);
                amountList.push(ethers.BigNumber.from(amounts[i]));
                //profitList.push(ethers.BigNumber.from(profits[i]));
                endList.push(ethers.BigNumber.from(ends[i]));
            }
            // console.log(c, 'idList',idList)
            // console.log(c, 'accountList',accountList)
            // console.log(c, 'amountList',amountList)
            // console.log(c, 'profitList',profitList)
            console.log('StakeV2.syncStos call ',start, end, 'round', c )
            tx = await stakingProxylogic.connect(admin1).syncStos(
                        accountList,
                        amountList,
                        endList,
                        idList
                    );

            console.log('StakeV2.syncStos end ',start, end, tx.hash)

            await tx.wait();
            await timeout(1);

        }catch(error){
          console.log('StakeV2.syncStos error',c, start, end, error);
          //break;
        }
      }

      stosMigrationSet.afterStakeId = await stakingProxylogic.stakingIdCounter();
      console.log('stosMigrationSet.afterStakeId', stosMigrationSet.afterStakeId)

    })

    it("5-4. check the staked amount", async () => {
      const addLockTosInfos = JSON.parse(await fs.readFileSync("./test/data/stos-ids-"+stosMigrationBlockNumber+".json"));
      if(addLockTosInfos.ids == null) return;
      let len = addLockTosInfos.ids.length;
      // let currentTime = addLockTosInfos.timestamp;
      // let ids = addLockTosInfos.ids;
      // let accounts = addLockTosInfos.accounts;
      // let amounts = addLockTosInfos.amounts;
      // let ends = addLockTosInfos.ends;
      // let profits = addLockTosInfos.profits;
      // console.log('len',len)

      let start = stosMigrationSet.prevStakeId.add(ethers.constants.One).toNumber();
      let end = stosMigrationSet.afterStakeId.toNumber();
      // console.log('start', start);
      // console.log('end', end);
      let count = 0;
      try{
        // if(!ids) return;
        // if(!accounts) return;
        // if(!amounts) return;
        // if(!ends) return;
        // if(!profits) return;

        for(let i = start; i <= end; i++){

            let stakeId = ethers.BigNumber.from(i+"");
            let lockId = await stakingProxylogic.connectId(stakeId);

            if(lockId.gt(ethers.constants.Zero)){
              count++;

              let stakeInfo = await stakingProxylogic.stakeInfo(stakeId);
              let lockTosInfo = await lockTosContract.allLocks(lockId);
              let userLocks = await lockTosContract.locksOf(stakeInfo.staker);
              let includeUserLocks = containsNumber(userLocks, lockId);
              let includeProfitZero = stosMigrationSet.profitZeroLockIds.includes(lockId.toNumber());

              // console.log(lockId, 'includeUserLocks ', includeUserLocks, "includeProfitZero ", includeProfitZero );

              // if (!includeUserLocks || includeProfitZero ) {
              //   console.log('--- check --- ');
              //   console.log('includeUserLocks',includeUserLocks);
              //   console.log('includeProfitZero',includeProfitZero);
              //   console.log('stakeId',stakeId);
              //   console.log('stakeInfo',stakeInfo);
              //   console.log('lockId',lockId);
              //   console.log('lockTosInfo',lockTosInfo);
              //   console.log('userLocks',userLocks);
              // }
              expect(includeUserLocks).to.eq(true);
              if (includeProfitZero) expect(stakeInfo.deposit).to.be.eq(lockTosInfo.amount);
              else  expect(stakeInfo.deposit).to.be.lt(lockTosInfo.amount);
            }
        }
        // console.log('check count',count);
        expect(count).to.be.eq(len);
      }catch(error){
          console.log('check the staked amount: error', start, end, error);
      }
    })

    it("#5-5. Transfer LockTOS's TOS from LockTOS to Treasury ", async () => {
      let tosBalance = await tosContract.balanceOf(lockTosContract.address);
      console.log('LockTOS tosBalance',  ethers.utils.formatEther(tosBalance) , "TOS");
      console.log('락토스의 토스를 트래저리로 옮깁니다.',treasuryProxylogic.address);

      let tx = await lockTosContract.connect(_lockTosAdmin)["transferTosToTreasury(address)"](treasuryProxylogic.address);

      console.log('LockTOS.transferTosToTreasury end ',tx)

      await tx.wait();

      let tosBalanceAfter = await tosContract.balanceOf(lockTosContract.addres);
      console.log('lockTosContract tosBalanceAfter',  ethers.utils.formatEther(tosBalanceAfter) , "TOS");

      let tosBalanceTreasury =  await tosContract.balanceOf(treasuryProxylogic.addres);
      console.log('treasuryProxylogic tosBalance',  ethers.utils.formatEther(tosBalanceTreasury) , "TOS");

    })

  })

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


  /////////////////////////////////////
  // 4. 마켓 설정
  /////////////////////////////////////

  describe("#3-1. bondDepository function test", async () => {

    it("#3-1-1. create : user don't create the ETH market", async () => {
      const block = await ethers.provider.getBlock('latest')
      let finishTime = block.timestamp + sellingTime  //2주

      bondInfoEther.market.closeTime = finishTime;

      await expect(
          bondDepositoryProxylogic.connect(user1).create(
              bondInfoEther.token,
              [
                bondInfoEther.market.capAmountOfTos,
                bondInfoEther.market.closeTime,
                bondInfoEther.market.priceTosPerToken,
                bondInfoEther.market.purchasableTOSAmountAtOneTime
              ]
          )
      ).to.be.revertedWith("Accessible: Caller is not an policy admin")

    })

    it("#3-1-2. create : create the ETH market", async () => {
        const block = await ethers.provider.getBlock('latest');

        let marketbefore = await stakingProxylogic.marketIdCounter();

        let tx = await bondDepositoryProxylogic.connect(admin1).create(
            bondInfoEther.token,
            [
              bondInfoEther.market.capAmountOfTos,
              bondInfoEther.market.closeTime,
              bondInfoEther.market.priceTosPerToken,
              bondInfoEther.market.purchasableTOSAmountAtOneTime
            ]
        )

        const receipt = await tx.wait();

        let interface = bondDepositoryProxylogic.interface;
        for(let i=0; i< receipt.events.length; i++){

            if(receipt.events[i].topics[0] == interface.getEventTopic(eventCreatedMarket)){
                let data = receipt.events[i].data;
                let topics = receipt.events[i].topics;
                let log = interface.parseLog(
                {  data,  topics } );
                // console.log('log', log);
                bondInfoEther.marketId = log.args.marketId;
            }
        }

        let marketIdCounter = await stakingProxylogic.marketIdCounter();
        expect(marketIdCounter).to.be.eq(marketbefore.add(ethers.constants.One));
        expect(bondInfoEther.marketId).to.be.eq(marketIdCounter);

        let market = await bondDepositoryProxylogic.viewMarket(bondInfoEther.marketId);

        expect(market.quoteToken).to.be.eq(bondInfoEther.token);
        expect(market.capacity).to.be.eq(bondInfoEther.market.capAmountOfTos);
        expect(market.endSaleTime).to.be.eq(bondInfoEther.market.closeTime);
        expect(market.maxPayout).to.be.eq(bondInfoEther.market.purchasableTOSAmountAtOneTime);

    })

    it("#3-1-5. ETHDeposit run 10 times  ", async () => {

      let tosBalanceTreasuryPrev =  await tosContract.balanceOf(treasuryProxylogic.address);
      console.log('tosBalanceTreasuryPrev', tosBalanceTreasuryPrev);
      let tosBalanceLockTosPrev =  await tosContract.balanceOf(lockTosContract.address);
      console.log('tosBalanceLockTosPrev', tosBalanceLockTosPrev);

      let maxCumulativeDepositAmount = ethers.utils.parseEther("3");
      let accumulatedDepositAmount = ethers.utils.parseEther("0");

      for (let i = 0; i < 11; i++){
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

        accumulatedDepositAmount = accumulatedDepositAmount.add(amount);
        console.log(i, 'amount', ethers.utils.formatEther(amount), "ETH");

        let tx = await bondDepositoryProxylogic.connect(depositor).ETHDeposit(
            bondInfoEther.marketId,
            amount,
            {value: amount}
        );
        await tx.wait()
        //const receipt = await tx.wait();

        let tosBalanceTreasuryAfter =  await tosContract.balanceOf(treasuryProxylogic.address);
        console.log('tosBalanceTreasuryAfter', tosBalanceTreasuryAfter);

      }

      console.log('accumulatedDepositAmount', ethers.utils.formatEther(accumulatedDepositAmount), "ETH");
    });

    it(" foundationDistribute ", async function () {
      let tosBalanceTreasuryPrev =  await tosContract.balanceOf(treasuryProxylogic.address);
      console.log('tosBalanceTreasuryPrev', tosBalanceTreasuryPrev);

      let foundationTotalPercentage = await treasuryProxylogic.foundationTotalPercentage();
      // console.log('foundationTotalPercentage', foundationTotalPercentage);
      // let allMinting = await treasuryProxylogic.allMinting();
      // console.log('allMinting', allMinting);
      let foundationAmount = await treasuryProxylogic.foundationAmount();
      // console.log('foundationAmount', foundationAmount);

      let i = 0;
      for (i = 0; i < foundations.address.length; i++){
        foundations.balances[i] = await tosContract.balanceOf(foundations.address[i]);
        // console.log('foundation TOS Balance Prev', i, foundations.address[i], ethers.utils.formatEther(foundations.balances[i]));
      }

      let tx = await treasuryProxylogic.connect(admin1).foundationDistribute();
      let receipt = await tx.wait();
      let eventDistributedFoundation = "DistributedFoundation(address,uint256)";
      for (let i = 0; i < receipt.events.length; i++){
        if(receipt.events[i].topics[0] == treasuryProxylogic.interface.getEventTopic(eventDistributedFoundation)){
            let data = receipt.events[i].data;
            let topics = receipt.events[i].topics;
            let log = treasuryProxylogic.interface.parseLog({data, topics});
            // console.log('DistributedFoundation log.args',log.args)
        }
      }

      timeout(2);

      i = 0;
      // console.log('foundations.address.length', foundations.address.length);

      for (i = 0; i < foundations.address.length; i++){
        let balanceTos = await tosContract.balanceOf(foundations.address[i]);
        foundations.balancesAfter[i] = balanceTos;
        // console.log('balanceTos', i, balanceTos);
        expect(foundations.balancesAfter[i]).to.be.gt(foundations.balances[i]);
        expect(foundations.balancesAfter[i]).to.be.eq(foundationAmount.mul(foundations.percentages[i]).div(foundationTotalPercentage));
      }
      console.log('foundations', foundations);

      let tosBalanceTreasuryAfter =  await tosContract.balanceOf(treasuryProxylogic.address);
      console.log('tosBalanceTreasuryAfter', tosBalanceTreasuryAfter);

      let foundationAmountAfter = await treasuryProxylogic.foundationAmount();
      console.log('foundationAmountAfter', foundationAmountAfter);

      expect(tosBalanceTreasuryAfter).to.be.eq(tosBalanceTreasuryPrev.sub(foundationAmount));
      expect(foundationAmountAfter).to.be.eq(ethers.BigNumber.from("0"));

    });

    it("      pass 1 month ", async function () {
      await indexEpochPassMonth();

      await logStatus(" *** 1st round ", treasuryProxylogic, stakingProxylogic, tosContract, foundations);

    });

  })

});
