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
  lockTOSProxyAddress,
} = require("./info_simulation_goerli");


// const { expect } = require("chai");
const { ethers } = require("hardhat");
const Web3EthAbi = require('web3-eth-abi');
const {
  keccak256,
} = require("web3-utils");

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

uniswapInfo._fee =  ethers.BigNumber.from("3000");

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

  let deposits = {user1 : [], user2: []};
  let depositor, depositorUser, index, depositData;

  before(async () => {
    accounts = await ethers.getSigners();
    [admin1, admin2, user1, user2, user3, user4, user5, user6 ] = accounts;
    //console.log('admin1',admin1.address);
    console.log('admin1',admin1.address);
    provider = ethers.provider;

    deployed.treasury = loadDeployed(stosMigrationBlockNumber, "TreasuryProxy");
    deployed.stake = loadDeployed(stosMigrationBlockNumber, "StakingV2Proxy");
    deployed.bond = loadDeployed(stosMigrationBlockNumber, "BondDepositoryProxy");

  });

/////////////////////////////////////
//  마이그레이션, StakeV2.syncStos
/////////////////////////////////////


  describe("#0. Get the contract", () => {

    it("#0-3-3. stakingProxyLogic set", async () => {
      stakingProxylogic = new ethers.Contract(deployed.stake, stakingV2LogicAbi.abi, admin1);
    })

  })

  describe("#5. lockTOS migration ", () => {

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
      console.log('stosMigrationSet.afterStakeId', stosMigrationSet.afterStakeId.toString())

      save(stosMigrationBlockNumber,{
        name: "afterStakeId",
        address: stosMigrationSet.afterStakeId.toString()
      });
    })

  })

});
