const chai = require("chai");
const { solidity } = require("ethereum-waffle");
const { expect, assert } = chai;
const save = require("./save_deployed");
const loadDeployed = require("./load_deployed");
const JSBI = require('jsbi');
const fs = require('fs');

chai.use(solidity);
require("chai").should();

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

uniswapInfo._fee =  ethers.BigNumber.from("3000");

let timeSetMintRate ;

describe("TOSv2 Phase1", function () {
  //시나리오 : https://www.notion.so/onther/BondDepository-StakingV2-scenario-Suah-497853d6e65f48a390255f3bca29fa36

  let lockTosContract;

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
// 1. 컨트랙 디플로이. LockTOS 업그레이드
/////////////////////////////////////

  describe("#0. Get the contract", () => {

    it("#0-4-4. lockTosContract set", async () => {
      lockTosContract = new ethers.Contract(lockTOSProxyAddress, lockTOSLogic2abi.abi, ethers.provider);
    })
  })

  describe("#5. lockTOS migration ", () => {

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

        save(stosMigrationBlockNumber,{
          name: "profitZeroLockIds",
          address: stosMigrationSet.profitZeroLockIds
        });

      }catch(error){
          console.log('compareStakeAnfLockTOSAmounts error', start, end, error);
      }
    })
  })

});
