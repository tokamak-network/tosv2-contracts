const chai = require("chai");
const { solidity } = require("ethereum-waffle");
const { expect, assert } = chai;
const save = require("./save_deployed");
const loadDeployed = require("./load_deployed");
const JSBI = require('jsbi');
const fs = require('fs');

chai.use(solidity);
require("chai").should();
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
  bondTosPrice,
  bondPurchasableTOSAmount,
  bondCapAmountOfTos,
  bondCloseTime,
  STATUS,
  lockTOSProxyAddress,
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

let bondInfoEther = {
  marketId : null,
  check: true,
  token: ethers.constants.AddressZero,
  poolAddress: uniswapInfo.tosethPool,
  fee: 0,
  market: {
    capAmountOfTos: ethers.BigNumber.from(bondCapAmountOfTos),
    closeTime: bondCloseTime,
    priceTosPerToken: ethers.BigNumber.from(bondTosPrice),
    purchasableTOSAmountAtOneTime: ethers.BigNumber.from(bondPurchasableTOSAmount)
  },
  tosValuationSimple: 0,
  tosValuationLock: 0
}

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

  let firstEpochNumber = 0;
  let firstEndEpochTime

  let lockTOSProxy2;
  let lockTOSLogic2;

  let depositTime;
  let depositTime2;
  let unstakingTime;

  let stakeIdcheck;
  let balanceOfLTOS;
  let stakingBalanceLTOS;
  let totalLTOS;

  let beforetosAmount;
  let aftertosAmount;

  let minter_role = "0xf0887ba65ee2024ea881d91b74c2450ef19e1557f03bed3ea9f16b037cbe2dc9";
  let burner_role = "0x9667e80708b6eeeb0053fa0cca44e028ff548e2a9f029edfeac87c118b08b7c8";
  let lockTOSProxy2Address = ""
  let lockTOSLogic2Address = ""
  let etherUint = ethers.utils.parseUnits("1", 18);

  let firstMarketlength;
  let checkMarketLength;


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

    console.log('deployed',deployed);

  });

/////////////////////////////////////
// 1. 컨트랙 디플로이. LockTOS 업그레이드
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
        // let round = 0;
        // if(round <= maxRound){
        //   c = round;

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

    it("5-3. StakeV2.syncStos : Only policyAdmin can call syncStos ", async () => {
      const addLockTosInfos = JSON.parse(await fs.readFileSync("./test/data/stos-ids-"+stosMigrationBlockNumber+".json"));

      let index = await stakingProxylogic.getIndex();
      console.log('index', index)
      stosMigrationSet.prevStakeId = await stakingProxylogic.stakingIdCounter();
      console.log('stosMigrationSet.prevStakeId', stosMigrationSet.prevStakeId)

      save(stosMigrationBlockNumber,{
        name: "prevStakeId",
        address: stosMigrationSet.prevStakeId.toString()
      });

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
      // let round = 0;
      // if(round <= maxRound){
      //  c = round;
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

      save(stosMigrationBlockNumber,{
        name: "afterStakeId",
        address: stosMigrationSet.afterStakeId.toString()
      });
    })


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
      console.log('tosBalanceTotalSupply Prev', ethers.utils.formatEther(tosBalanceTotalSupply) , "TOS");
      console.log('treasury tos Balance Prev', ethers.utils.formatEther(tosBalancePrev) , "TOS");

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

      let tosBalanceTotalSupplyAfter = await tosContract.totalSupply();
      let tosBalanceAfter =  await tosContract.balanceOf(treasuryProxylogic.address);
      console.log('tosBalanceTotalSupply After', ethers.utils.formatEther(tosBalanceTotalSupplyAfter) , "TOS");
      console.log('treasury tos Balance After', ethers.utils.formatEther(tosBalanceAfter) , "TOS");


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


  describe("#3-1. bondDepository function test", async () => {

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

        save(stosMigrationBlockNumber,{
          name: "marketId",
          address: bondInfoEther.marketId.toString()
        });

    })

  })

});
