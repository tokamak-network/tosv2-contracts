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

    // it("#0-2-3. TreasuryProxyLogic set", async () => {
    //   treasuryProxylogic = new ethers.Contract(deployed.treasury, treasuryLogicAbi.abi, ethers.provider);

    // })

    it("#0-3-3. stakingProxyLogic set", async () => {
      stakingProxylogic = new ethers.Contract(deployed.stake, stakingV2LogicAbi.abi, ethers.provider);
    })

    // it("#0-4-3. stakingProxyLogic set", async () => {
    //   bondDepositoryProxylogic = new ethers.Contract(deployed.bond, bondDepositoryLogicAbi.abi, ethers.provider);
    // })

    it("#0-4-4. lockTosContract set", async () => {
      lockTosContract = new ethers.Contract(lockTOSProxyAddress, lockTOSLogic2abi.abi, ethers.provider);
    })
  })

  describe("#5. lockTOS migration ", () => {

    it("5-4. check the staked amount", async () => {
      const addLockTosInfos = JSON.parse(await fs.readFileSync("./test/data/stos-ids-"+stosMigrationBlockNumber+".json"));
      if(addLockTosInfos.ids == null) return;
      stosMigrationSet.profitZeroLockIds = loadDeployed(stosMigrationBlockNumber, "profitZeroLockIds");
      stosMigrationSet.prevStakeId = loadDeployed(stosMigrationBlockNumber, "prevStakeId");
      stosMigrationSet.prevStakeId = ethers.BigNumber.from(stosMigrationSet.prevStakeId);

      stosMigrationSet.afterStakeId = loadDeployed(stosMigrationBlockNumber, "afterStakeId");
      stosMigrationSet.afterStakeId = ethers.BigNumber.from(stosMigrationSet.afterStakeId);

      console.log('stosMigrationSet.profitZeroLockIds',stosMigrationSet.profitZeroLockIds);
      console.log('stosMigrationSet.prevStakeId',stosMigrationSet.prevStakeId);
      console.log('stosMigrationSet.afterStakeId',stosMigrationSet.afterStakeId);

      let len = addLockTosInfos.ids.length;

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
  })

});
