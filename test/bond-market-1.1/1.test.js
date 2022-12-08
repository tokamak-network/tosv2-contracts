const chai = require("chai");
const { solidity } = require("ethereum-waffle");
const { expect, assert } = chai;
const _ = require("lodash");
chai.use(solidity);
chai.use(solidity);
require("chai").should();

const { ethers } = require("hardhat");
const Web3EthAbi = require('web3-eth-abi');
const {
  keccak256,
} = require("web3-utils");

let { uniswapInfo, config, deployed} = require('./tosv2-mainnet-config.js');

// let treasuryLogicAbi = require('../artifacts/contracts/Treasury.sol/Treasury.json');
// let bondDepositoryLogicAbi = require('../artifacts/contracts/BondDepository.sol/BondDepository.json');
// let stakingV2LogicAbi = require('../artifacts/contracts/StakingV2.sol/StakingV2.json');

const BondDepositoryProxyABI = require('../../artifacts/contracts/BondDepositoryProxy.sol/BondDepositoryProxy.json');
const BondDepositoryV1_1ABI = require('../../artifacts/contracts/BondDepositoryV1_1.sol/BondDepositoryV1_1.json');
const StakingV2ABI = require('../../artifacts/contracts/StakingV2.sol/StakingV2.json');
const TreasuryABI = require('../../artifacts/contracts/Treasury.sol/Treasury.json');


let tosAdmin = "0x12a936026f072d4e97047696a9d11f97eae47d21";
let TosV2Admin = "0x15280a52E79FD4aB35F4B9Acbb376DCD72b44Fd1";

// test : https://docs.google.com/spreadsheets/d/1BozidTCxcwMT0wRcQrnIJkRMvE5xKZgDUF092fNPUpI/edit#gid=0

describe("TOSv2 Bond Market V1.1", function () {

  let provider;

  let tosContract;

  let treasury;
  let stakingV2;
  let bondDepositoryProxy, bondDepositoryV1_1, bondDepository, libBondDepositoryV1_1;

  let _TosV2Admin;
  let _tosAdmin;

  let markets = [];
  let viewMarketlength;

  //[팔려고 하는 tos의 목표치, 판매 끝나는 시간, 받는 token의 가격, tos token의 가격, 한번에 구매 가능한 TOS물량]
  // 이더상품.
  let bondInfoEther_5days = {
    marketId : null,
    check: true,
    token: ethers.constants.AddressZero,
    market: {
      capAmountOfTos: ethers.BigNumber.from("19402097498000000000000"),
      closeTime: 0,
      priceTosPerToken: ethers.BigNumber.from("1616841458170000000000"),
      purchasableTOSAmountAtOneTime: ethers.BigNumber.from("485052437451000000000"),
      startTime: 0,
      initialMaxPayout: ethers.BigNumber.from("2000000000000000000"),
      capacityUpdatePeriod: 60*60*1,
      availableBasicBond: true,
      availableStosBond: false,
      salePeriod : 60*60*24*7 // 7일
    },
    stakeId: 0,
    tosValuation: 0,
    mintAmount: 0,
    stosId: 0
  }

  let bondInfoEther_lockup = {
    marketId : null,
    check: true,
    token: ethers.constants.AddressZero,
    market: {
      capAmountOfTos: ethers.BigNumber.from("19402097498000000000000"),
      closeTime: 1669852800,
      priceTosPerToken: ethers.BigNumber.from("1616841458170000000000"),
      purchasableTOSAmountAtOneTime: ethers.BigNumber.from("485052437451000000000"),
      startTime: 0,
      initialMaxPayout: ethers.BigNumber.from("2000000000000000000"),
      capacityUpdatePeriod: 60*60*24,
      availableBasicBond: false,
      availableStosBond: true,
      salePeriod : 60*60*24*7 // 7일
    },
    stakeId: 0,
    tosValuation: 0,
    mintAmount: 0,
    stosId: 0
  }

  let deposits = {user1 : [], user2: []};
  let depositor, depositorUser, index, depositData;


  async function indexEpochPass(_stakingProxylogic, passNextEpochCount) {
      let block = await ethers.provider.getBlock();
      let epochInfo = await _stakingProxylogic.epoch();
      let passTime =  epochInfo.end - block.timestamp + (epochInfo.length_ * passNextEpochCount) + 60;
      ethers.provider.send("evm_increaseTime", [passTime])
      ethers.provider.send("evm_mine")
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

    await hre.ethers.provider.send("hardhat_impersonateAccount",[TosV2Admin]);

    _TosV2Admin = await ethers.getSigner(TosV2Admin);

  });

  describe("Set TOSv2 phase1 ", () => {

    it("BondDepositoryProxy", async () => {

      bondDepositoryProxy = new ethers.Contract(deployed.BondDepositoryProxy, BondDepositoryProxyABI.abi, _TosV2Admin)

      let code = await ethers.provider.getCode(deployed.BondDepositoryProxy);
      expect(code).to.not.eq("0x");
    })

    it("StakingV2", async () => {
      stakingV2 = new ethers.Contract(deployed.StakingV2Proxy, StakingV2ABI.abi, ethers.provider)

      let code = await ethers.provider.getCode(deployed.StakingV2Proxy);
      expect(code).to.not.eq("0x");
    })

    it("Treasury", async () => {
      treasury = new ethers.Contract(deployed.TreasuryProxy, TreasuryABI.abi, ethers.provider)

      let code = await ethers.provider.getCode(deployed.TreasuryProxy);
      expect(code).to.not.eq("0x");
    })

  })

  describe("Upgrade BondDepository to BondDepositoryV1_1", () => {


    it("BondDepositoryV1_1", async () => {
      bondDepositoryV1_1 = new ethers.Contract(deployed.BondDepositoryProxy, BondDepositoryV1_1ABI.abi, _TosV2Admin)

    })

    it("deploy LibBondDepositoryV1_1 ", async () => {
      let factory = await ethers.getContractFactory("LibBondDepositoryV1_1")
      libBondDepositoryV1_1 = await factory.deploy();
      await libBondDepositoryV1_1.deployed()
      // console.log("libBondDepositoryV1_1 ", libBondDepositoryV1_1.address)
      let code = await ethers.provider.getCode(libBondDepositoryV1_1.address);
      expect(code).to.not.eq("0x");
    })

    it("deploy BondDepositoryV1_1 ", async () => {
      let factory = await ethers.getContractFactory("BondDepositoryV1_1",{
        libraries: {
          LibBondDepositoryV1_1: libBondDepositoryV1_1.address,
        }
      })
      bondDepositoryV1_1 = await factory.deploy();
      await bondDepositoryV1_1.deployed()

      // console.log("bondDepositoryV1_1 ", bondDepositoryV1_1.address)

      let code = await ethers.provider.getCode(bondDepositoryV1_1.address);
      expect(code).to.not.eq("0x");
    })

    it("upgrade BondDepositoryProxy's logic to BondDepositoryV1_1 ", async () => {

      let tx = await bondDepositoryProxy.connect(_TosV2Admin).upgradeTo(bondDepositoryV1_1.address);
      await tx.wait();

      expect(await bondDepositoryProxy.implementation()).to.be.eq(bondDepositoryV1_1.address);
    })

    it("get Contract", async () => {
      bondDepository = new ethers.Contract(deployed.BondDepositoryProxy, BondDepositoryV1_1ABI.abi, ethers.provider);
      // console.log("bondDepository ", bondDepository.address)
    })

  })

  describe("#1. bondDepositoryV1_1 : create the 5-days bond ", async () => {

    it("#1-1. create : fail when caller is not an policy admin", async () => {
      const block = await ethers.provider.getBlock('latest')

      let bondInfo = bondInfoEther_5days;
      bondInfo.market.startTime = block.timestamp + (60*5);
      bondInfo.market.closeTime = bondInfo.market.startTime + bondInfo.market.salePeriod;

      await expect(
        bondDepository.connect(user1).create(
          bondInfo.token,
          [
            bondInfo.market.capAmountOfTos,
            bondInfo.market.closeTime,
            bondInfo.market.priceTosPerToken,
            bondInfo.market.purchasableTOSAmountAtOneTime
          ],
          bondInfo.market.startTime,
          bondInfo.market.initialMaxPayout,
          bondInfo.market.capacityUpdatePeriod,
          bondInfo.market.availableBasicBond,
          bondInfo.market.availableStosBond
        )
      ).to.be.revertedWith("Accessible: Caller is not an policy admin")
    })

    it("#1-1. create : onlyPolicy can call create", async () => {
      const block = await ethers.provider.getBlock('latest')
      viewMarketlength = await stakingV2.marketIdCounter();

      let bondInfo =  _.cloneDeep(bondInfoEther_5days);
      bondInfo.market.startTime = block.timestamp + (60*5);
      bondInfo.market.closeTime = bondInfo.market.startTime + bondInfo.market.salePeriod;

      const tx = await bondDepository.connect(_TosV2Admin).create(
        bondInfo.token,
        [
          bondInfo.market.capAmountOfTos,
          bondInfo.market.closeTime,
          bondInfo.market.priceTosPerToken,
          bondInfo.market.purchasableTOSAmountAtOneTime
        ],
        bondInfo.market.startTime,
        bondInfo.market.initialMaxPayout,
        bondInfo.market.capacityUpdatePeriod,
        bondInfo.market.availableBasicBond,
        bondInfo.market.availableStosBond
      );
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      // console.log('receipt',receipt);

      const interface = new ethers.utils.Interface(["event CreatedMarket(uint256 marketId, address token, uint256[4] market, uint256 startTime, uint256 initialMaxPayout, uint256 capacityUpdatePeriod, bool availableBasicBond, bool availableStosBond)"]);
      const data = receipt.logs[0].data;
      const topics = receipt.logs[0].topics;
      const event = interface.decodeEventLog("CreatedMarket", data, topics);
      // console.log('event',event);

      expect(event.token).to.equal(bondInfo.token);
      expect(event.market.length).to.equal(4);
      expect(event.market[0]).to.equal(bondInfo.market.capAmountOfTos);
      expect(event.market[1]).to.equal(bondInfo.market.closeTime);
      expect(event.market[2]).to.equal(bondInfo.market.priceTosPerToken);
      expect(event.market[3]).to.equal(bondInfo.market.purchasableTOSAmountAtOneTime);
      expect(event.startTime).to.equal(bondInfo.market.startTime);
      expect(event.initialMaxPayout).to.equal(bondInfo.market.initialMaxPayout);
      expect(event.capacityUpdatePeriod).to.equal(bondInfo.market.capacityUpdatePeriod);
      expect(event.availableBasicBond).to.equal(bondInfo.market.availableBasicBond);
      expect(event.availableStosBond).to.equal(bondInfo.market.availableStosBond);

      markets.push({
        id: event.marketId,
        info: bondInfo
      });
      // console.log("markets id", event.marketId.toString()) ;
      // console.log("markets info", bondInfo) ;

      viewMarketlength = viewMarketlength.add(ethers.constants.One);
      expect(await stakingV2.marketIdCounter()).to.be.equal(viewMarketlength);
    })

    it("#1-2. create : Fails if _capacityUpdatePeriod is not appropriate.", async () => {
      const block = await ethers.provider.getBlock('latest')

      let bondInfo = _.cloneDeep(bondInfoEther_5days);
      bondInfo.market.startTime = block.timestamp + (60*5);
      bondInfo.market.closeTime = bondInfo.market.startTime + bondInfo.market.salePeriod;

      await expect(
        bondDepository.connect(_TosV2Admin).create(
          bondInfo.token,
          [
            bondInfo.market.capAmountOfTos,
            bondInfo.market.closeTime,
            bondInfo.market.priceTosPerToken,
            bondInfo.market.purchasableTOSAmountAtOneTime
          ],
          bondInfo.market.startTime,
          bondInfo.market.initialMaxPayout,
          3,
          bondInfo.market.availableBasicBond,
          bondInfo.market.availableStosBond
        )
      ).to.be.revertedWith("invalid capacityUpdatePeriod")
    })

    it("#1-3. create : Either _availableBasicBond or _availableLockupBond must be true. or fail", async () => {
      const block = await ethers.provider.getBlock('latest')

      let bondInfo =  _.cloneDeep(bondInfoEther_5days);
      bondInfo.market.startTime = block.timestamp + (60*5);
      bondInfo.market.closeTime = bondInfo.market.startTime + bondInfo.market.salePeriod;

      await expect(
        bondDepository.connect(_TosV2Admin).create(
          bondInfo.token,
          [
            bondInfo.market.capAmountOfTos,
            bondInfo.market.closeTime,
            bondInfo.market.priceTosPerToken,
            bondInfo.market.purchasableTOSAmountAtOneTime
          ],
          bondInfo.market.startTime,
          bondInfo.market.initialMaxPayout,
          bondInfo.market.capacityUpdatePeriod,
          false,
          false
        )
      ).to.be.revertedWith("both false _availableBasicBond & _availableStosBond")
    })

  })

  describe("#2~8. bondDepositoryV1_1 : VIEW FUNCTIONS", async () => {

    it("#2-1. salePeriod : Before the start time, the 0th day is returned.", async () => {

      let marketId = markets[markets.length-1].id ;

      let days_ = await bondDepository.connect(_TosV2Admin).salePeriod(
        marketId
      );

      expect(days_[1]).to.be.equal(ethers.constants.Zero);
    })

    it("#3-1. possibleMaxCapacity : Before the start time, currentCapacity is zero.", async () => {

      let marketId = markets[markets.length-1].id ;

      let capacity = await bondDepository.connect(_TosV2Admin).possibleMaxCapacity(
        marketId
      );

      expect(capacity[1]).to.be.equal(ethers.constants.Zero);
    })

    it("#5-1. maximumPurchasableAmountAtOneTime", async () => {

      let marketId = markets[markets.length-1].id ;

      let maximumAmount = await bondDepository.maximumPurchasableAmountAtOneTime(
        marketId,
        0
      );

      expect(maximumAmount).to.be.equal(ethers.constants.Zero);

    })

    it("   evm_increaseTime ", async () => {
      const block = await ethers.provider.getBlock('latest')

      let passTime = markets[markets.length-1].info.market.startTime - block.timestamp ;
      // console.log('passTime',passTime );
      ethers.provider.send("evm_increaseTime", [passTime+100])
      ethers.provider.send("evm_mine")
    });

    it("#2-2. salePeriod : During the sales period, it is returned as 1 on the first cycle. ", async () => {
      let marketId = markets[markets.length-1].id ;

      let days_ = await bondDepository.connect(_TosV2Admin).salePeriod(
        marketId
      );

      expect(days_[1]).to.be.equal(ethers.constants.One);
    })

    it("#3-2. possibleMaxCapacity", async () => {

      let marketId = markets[markets.length-1].id ;
      let bondInfo = markets[markets.length-1].info ;

      let days_ = await bondDepository.connect(_TosV2Admin).salePeriod(
        marketId
      );
      expect(days_[1]).to.be.equal(ethers.constants.One);

      let capacity = await bondDepository.connect(_TosV2Admin).possibleMaxCapacity(
        marketId
      );

      let currentCapacity = bondInfo.market.capAmountOfTos.mul(days_[1]).div(days_[0])

      expect(capacity[1]).to.be.equal(currentCapacity);
    })

    it("#5-2. maximumPurchasableAmountAtOneTime : In the first round, lock-up weeks is 0, the smaller value of the currentCapacity and the set maxPayout is returned.", async () => {

      let marketId = markets[markets.length-1].id ;
      let bondInfo = markets[markets.length-1].info ;

      let maximumAmount = await bondDepository.maximumPurchasableAmountAtOneTime(
        marketId,
        0
      );

      let days_ = await bondDepository.connect(_TosV2Admin).salePeriod(
        marketId
      );
      let currentCapacity = bondInfo.market.capAmountOfTos.mul(days_[1]).div(days_[0])

      if (currentCapacity.lt(bondInfo.market.purchasableTOSAmountAtOneTime) )
        expect(maximumAmount).to.be.equal(currentCapacity);
      else
        expect(maximumAmount).to.be.equal(bondInfo.market.purchasableTOSAmountAtOneTime);

    })

    it("#5-3. maximumPurchasableAmountAtOneTime : In the first round, lock-up weeks is 1, the smaller value of the currentCapacity and the initialMaxPayout is returned.", async () => {

      let marketId = markets[markets.length-1].id ;
      let bondInfo = markets[markets.length-1].info ;

      let maximumAmount = await bondDepository.maximumPurchasableAmountAtOneTime(
        marketId,
        1
      );
      let days_ = await bondDepository.connect(_TosV2Admin).salePeriod(
        marketId
      );
      let currentCapacity = bondInfo.market.capAmountOfTos.mul(days_[1]).div(days_[0])

      if (currentCapacity.lt(bondInfo.market.initialMaxPayout) )
        expect(maximumAmount).to.be.equal(currentCapacity);
      else
        expect(maximumAmount).to.be.equal(bondInfo.market.initialMaxPayout);

    })

    it("   evm_increaseTime ", async () => {
      let bondInfo = markets[markets.length-1].info ;
      ethers.provider.send("evm_increaseTime", [bondInfo.market.capacityUpdatePeriod])
      ethers.provider.send("evm_mine")
    });

    it("#2-3. salePeriod : During the sales period, it returns to 2 for the second cycle.", async () => {
      let marketId = markets[markets.length-1].id ;

      let days_ = await bondDepository.connect(_TosV2Admin).salePeriod(
        marketId
      );

      expect(days_[1]).to.be.equal(ethers.constants.Two);
    })

    it("#3-2. possibleMaxCapacity", async () => {

      let marketId = markets[markets.length-1].id ;
      let bondInfo = markets[markets.length-1].info ;

      let days_ = await bondDepository.connect(_TosV2Admin).salePeriod(
        marketId
      );

      expect(days_[1]).to.be.equal(ethers.constants.Two);

      let capacity = await bondDepository.connect(_TosV2Admin).possibleMaxCapacity(
        marketId
      );

      let currentCapacity = bondInfo.market.capAmountOfTos.mul(days_[1]).div(days_[0])

      expect(capacity[1]).to.be.equal(currentCapacity.toString());
    })

    it("#4-1. maxPayoutPerLockUpPeriod", async () => {

      let marketId = markets[markets.length-1].id ;
      let bondInfo = markets[markets.length-1].info ;

      let payoutWeek0 = await bondDepository.maxPayoutPerLockUpPeriod(
        marketId,
        0
      );

      expect(payoutWeek0).to.be.equal(bondInfo.market.purchasableTOSAmountAtOneTime);
    })

    it("#4-2. maxPayoutPerLockUpPeriod", async () => {

      let marketId = markets[markets.length-1].id ;

      let payoutWeek1 = await bondDepository.maxPayoutPerLockUpPeriod(
        marketId,
        1
      );

      let payoutWeek2 = await bondDepository.maxPayoutPerLockUpPeriod(
        marketId,
        2
      );

      expect(payoutWeek2).to.be.gt(payoutWeek1);
    })

    it("#4-3. maxPayoutPerLockUpPeriod", async () => {

      let marketId = markets[markets.length-1].id ;

      let payoutWeek155 = await bondDepository.maxPayoutPerLockUpPeriod(
        marketId,
        155
      );

      let payoutWeek156 = await bondDepository.maxPayoutPerLockUpPeriod(
        marketId,
        156
      );

      let payoutWeek160 = await bondDepository.maxPayoutPerLockUpPeriod(
        marketId,
        160
      );

      expect(payoutWeek156).to.be.gt(payoutWeek155);
      expect(payoutWeek156).to.be.equal(payoutWeek160);
    })

    it("#6. viewMarket", async () => {

      let marketId = markets[markets.length-1].id ;
      let bondInfo = markets[markets.length-1].info ;

      let info = await bondDepository.viewMarket(
        marketId
      );

      expect(info.quoteToken).to.equal(bondInfo.token);
      expect(info.capacity).to.equal(bondInfo.market.capAmountOfTos);
      expect(info.endSaleTime).to.equal(bondInfo.market.closeTime);
      expect(info.tosPrice).to.equal(bondInfo.market.priceTosPerToken);
      expect(info.maxPayout).to.equal(bondInfo.market.purchasableTOSAmountAtOneTime);
      expect(info.capacityInfo.startTime).to.equal(bondInfo.market.startTime);
      expect(info.capacityInfo.initialMaxPayout).to.equal(bondInfo.market.initialMaxPayout);
      expect(info.capacityInfo.capacityUpdatePeriod).to.equal(bondInfo.market.capacityUpdatePeriod);
      expect(info.capacityInfo.availableBasicBond).to.equal(bondInfo.market.availableBasicBond);
      expect(info.capacityInfo.availableStosBond).to.equal(bondInfo.market.availableStosBond);

    })

    it("#7. getBonds", async () => {

      let marketId = markets[markets.length-1].id ;

      let bondsList = await bondDepository.getBonds();
      expect(bondsList[0].length).to.gt(ethers.constants.One);
      expect(bondsList[0][bondsList[0].length-1]).to.eq(marketId);

    })

    it("#8. getMarketList", async () => {

      let marketId = markets[markets.length-1].id ;

      let bondsList = await bondDepository.getMarketList();
      expect(bondsList.length).to.gt(ethers.constants.One);
      expect(bondsList[bondsList.length-1]).to.eq(marketId);

    })

  })

  describe("#1. bondDepositoryV1_1 : create the lockup(sTOS) bond ", async () => {

    it("#1-1. create : onlyPolicy can call create", async () => {
      const block = await ethers.provider.getBlock('latest')
      viewMarketlength = await stakingV2.marketIdCounter();

      let bondInfo =  _.cloneDeep(bondInfoEther_lockup);
      bondInfo.market.startTime = block.timestamp + (60*5);
      bondInfo.market.closeTime = bondInfo.market.startTime + bondInfo.market.salePeriod;

      const tx = await bondDepository.connect(_TosV2Admin).create(
        bondInfo.token,
        [
          bondInfo.market.capAmountOfTos,
          bondInfo.market.closeTime,
          bondInfo.market.priceTosPerToken,
          bondInfo.market.purchasableTOSAmountAtOneTime
        ],
        bondInfo.market.startTime,
        bondInfo.market.initialMaxPayout,
        bondInfo.market.capacityUpdatePeriod,
        bondInfo.market.availableBasicBond,
        bondInfo.market.availableStosBond
      );
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      // console.log('receipt',receipt);

      const interface = new ethers.utils.Interface(["event CreatedMarket(uint256 marketId, address token, uint256[4] market, uint256 startTime, uint256 initialMaxPayout, uint256 capacityUpdatePeriod, bool availableBasicBond, bool availableStosBond)"]);
      const data = receipt.logs[0].data;
      const topics = receipt.logs[0].topics;
      const event = interface.decodeEventLog("CreatedMarket", data, topics);
      // console.log('event',event);

      expect(event.token).to.equal(bondInfo.token);
      expect(event.market.length).to.equal(4);
      expect(event.market[0]).to.equal(bondInfo.market.capAmountOfTos);
      expect(event.market[1]).to.equal(bondInfo.market.closeTime);
      expect(event.market[2]).to.equal(bondInfo.market.priceTosPerToken);
      expect(event.market[3]).to.equal(bondInfo.market.purchasableTOSAmountAtOneTime);
      expect(event.startTime).to.equal(bondInfo.market.startTime);
      expect(event.initialMaxPayout).to.equal(bondInfo.market.initialMaxPayout);
      expect(event.capacityUpdatePeriod).to.equal(bondInfo.market.capacityUpdatePeriod);
      expect(event.availableBasicBond).to.equal(bondInfo.market.availableBasicBond);
      expect(event.availableStosBond).to.equal(bondInfo.market.availableStosBond);

      markets.push({
        id: event.marketId,
        info: bondInfo
      });
      // console.log("markets id", event.marketId.toString()) ;
      // console.log("markets info", bondInfo) ;

      viewMarketlength = viewMarketlength.add(ethers.constants.One);
      expect(await stakingV2.marketIdCounter()).to.be.equal(viewMarketlength);
    })
  })


  describe("#2~8. bondDepositoryV1_1 : VIEW FUNCTIONS", async () => {

    it("#2-1. salePeriod : Before the start time, the 0th day is returned.", async () => {

      let marketId = markets[markets.length-1].id ;

      let days_ = await bondDepository.connect(_TosV2Admin).salePeriod(
        marketId
      );

      expect(days_[1]).to.be.equal(ethers.constants.Zero);
    })

    it("#3-1. possibleMaxCapacity : Before the start time, currentCapacity is zero.", async () => {

      let marketId = markets[markets.length-1].id ;

      let capacity = await bondDepository.connect(_TosV2Admin).possibleMaxCapacity(
        marketId
      );

      expect(capacity[1]).to.be.equal(ethers.constants.Zero);
    })

    it("#5-1. maximumPurchasableAmountAtOneTime", async () => {

      let marketId = markets[markets.length-1].id ;

      let maximumAmount = await bondDepository.maximumPurchasableAmountAtOneTime(
        marketId,
        0
      );

      expect(maximumAmount).to.be.equal(ethers.constants.Zero);

    })

    it("   evm_increaseTime ", async () => {
      const block = await ethers.provider.getBlock('latest')

      let passTime = markets[markets.length-1].info.market.startTime - block.timestamp ;
      // console.log('passTime',passTime );
      ethers.provider.send("evm_increaseTime", [passTime+100])
      ethers.provider.send("evm_mine")
    });

    it("#2-2. salePeriod : During the sales period, it is returned as 1 on the first cycle. ", async () => {
      let marketId = markets[markets.length-1].id ;

      let days_ = await bondDepository.connect(_TosV2Admin).saleDasalePeriodys(
        marketId
      );

      expect(days_[1]).to.be.equal(ethers.constants.One);
    })

    it("#3-2. possibleMaxCapacity", async () => {

      let marketId = markets[markets.length-1].id ;
      let bondInfo = markets[markets.length-1].info ;

      let days_ = await bondDepository.connect(_TosV2Admin).salePeriod(
        marketId
      );
      expect(days_[1]).to.be.equal(ethers.constants.One);

      let capacity = await bondDepository.connect(_TosV2Admin).possibleMaxCapacity(
        marketId
      );

      let currentCapacity = bondInfo.market.capAmountOfTos.mul(days_[1]).div(days_[0])

      expect(capacity[1]).to.be.equal(currentCapacity);
    })

    it("#5-2. maximumPurchasableAmountAtOneTime", async () => {

      let marketId = markets[markets.length-1].id ;
      let bondInfo = markets[markets.length-1].info ;

      let maximumAmount = await bondDepository.maximumPurchasableAmountAtOneTime(
        marketId,
        0
      );

      let days_ = await bondDepository.connect(_TosV2Admin).salePeriod(
        marketId
      );
      let currentCapacity = bondInfo.market.capAmountOfTos.mul(days_[1]).div(days_[0])

      if (currentCapacity.lt(bondInfo.market.purchasableTOSAmountAtOneTime) )
        expect(maximumAmount).to.be.equal(currentCapacity);
      else
        expect(maximumAmount).to.be.equal(bondInfo.market.purchasableTOSAmountAtOneTime);

    })

    it("#5-3. maximumPurchasableAmountAtOneTime", async () => {

      let marketId = markets[markets.length-1].id ;
      let bondInfo = markets[markets.length-1].info ;

      let maximumAmount = await bondDepository.maximumPurchasableAmountAtOneTime(
        marketId,
        1
      );
      let days_ = await bondDepository.connect(_TosV2Admin).salePeriod(
        marketId
      );
      let currentCapacity = bondInfo.market.capAmountOfTos.mul(days_[1]).div(days_[0])

      if (currentCapacity.lt(bondInfo.market.initialMaxPayout) )
        expect(maximumAmount).to.be.equal(currentCapacity);
      else
        expect(maximumAmount).to.be.equal(bondInfo.market.initialMaxPayout);

    })

    it("   evm_increaseTime ", async () => {
      let bondInfo = markets[markets.length-1].info ;
      ethers.provider.send("evm_increaseTime", [bondInfo.market.capacityUpdatePeriod])
      ethers.provider.send("evm_mine")
    });

    it("#2-3. salePeriod : During the sales period, it returns to 2 for the second cycle.", async () => {
      let marketId = markets[markets.length-1].id ;

      let days_ = await bondDepository.connect(_TosV2Admin).salePeriod(
        marketId
      );

      expect(days_[1]).to.be.equal(ethers.constants.Two);
    })

    it("#3-2. possibleMaxCapacity", async () => {

      let marketId = markets[markets.length-1].id ;
      let bondInfo = markets[markets.length-1].info ;

      let days_ = await bondDepository.connect(_TosV2Admin).salePeriod(
        marketId
      );
      expect(days_[1]).to.be.equal(ethers.constants.Two);

      let capacity = await bondDepository.connect(_TosV2Admin).possibleMaxCapacity(
        marketId
      );

      let currentCapacity = bondInfo.market.capAmountOfTos.mul(days_[1]).div(days_[0])

      expect(capacity[1]).to.be.equal(currentCapacity);
    })

    it("#4-1. maxPayoutPerLockUpPeriod", async () => {

      let marketId = markets[markets.length-1].id ;
      let bondInfo = markets[markets.length-1].info ;

      let payoutWeek0 = await bondDepository.maxPayoutPerLockUpPeriod(
        marketId,
        0
      );

      expect(payoutWeek0).to.be.equal(bondInfo.market.purchasableTOSAmountAtOneTime);
    })

    it("#4-2. maxPayoutPerLockUpPeriod", async () => {

      let marketId = markets[markets.length-1].id ;

      let payoutWeek1 = await bondDepository.maxPayoutPerLockUpPeriod(
        marketId,
        1
      );

      let payoutWeek2 = await bondDepository.maxPayoutPerLockUpPeriod(
        marketId,
        2
      );

      expect(payoutWeek2).to.be.gt(payoutWeek1);
    })

    it("#4-3. maxPayoutPerLockUpPeriod", async () => {

      let marketId = markets[markets.length-1].id ;

      let payoutWeek155 = await bondDepository.maxPayoutPerLockUpPeriod(
        marketId,
        155
      );

      let payoutWeek156 = await bondDepository.maxPayoutPerLockUpPeriod(
        marketId,
        156
      );

      let payoutWeek160 = await bondDepository.maxPayoutPerLockUpPeriod(
        marketId,
        160
      );

      expect(payoutWeek156).to.be.gt(payoutWeek155);
      expect(payoutWeek156).to.be.equal(payoutWeek160);
    })

    it("#6. viewMarket", async () => {

      let marketId = markets[markets.length-1].id ;
      let bondInfo = markets[markets.length-1].info ;

      let info = await bondDepository.viewMarket(
        marketId
      );

      expect(info.quoteToken).to.equal(bondInfo.token);
      expect(info.capacity).to.equal(bondInfo.market.capAmountOfTos);
      expect(info.endSaleTime).to.equal(bondInfo.market.closeTime);
      expect(info.tosPrice).to.equal(bondInfo.market.priceTosPerToken);
      expect(info.maxPayout).to.equal(bondInfo.market.purchasableTOSAmountAtOneTime);
      expect(info.capacityInfo.startTime).to.equal(bondInfo.market.startTime);
      expect(info.capacityInfo.initialMaxPayout).to.equal(bondInfo.market.initialMaxPayout);
      expect(info.capacityInfo.capacityUpdatePeriod).to.equal(bondInfo.market.capacityUpdatePeriod);
      expect(info.capacityInfo.availableBasicBond).to.equal(bondInfo.market.availableBasicBond);
      expect(info.capacityInfo.availableStosBond).to.equal(bondInfo.market.availableStosBond);

    })

    it("#7. getBonds", async () => {

      let marketId = markets[markets.length-1].id ;

      let bondsList = await bondDepository.getBonds();
      expect(bondsList[0].length).to.gt(ethers.constants.One);
      expect(bondsList[0][bondsList[0].length-1]).to.eq(marketId);

    })

    it("#8. getMarketList", async () => {

      let marketId = markets[markets.length-1].id ;

      let bondsList = await bondDepository.getMarketList();
      expect(bondsList.length).to.gt(ethers.constants.One);
      expect(bondsList[bondsList.length-1]).to.eq(marketId);

    })

  })

  describe("#9. bondDepositoryV1_1 : ETHDeposit ", async () => {

    it("#9-1. ETHDeposit : fail when _availableBasicBond is false", async () => {

      let marketId = markets[markets.length-1].id ;
      let bondInfo = markets[markets.length-1].info ;
      expect(bondInfo.market.availableBasicBond).to.equal(false);

      let amount = ethers.utils.parseEther("1");

      await expect(
        bondDepository.connect(user1).ETHDeposit(
          marketId,
          amount,
          {
            value: amount
          }
        )
      ).to.be.revertedWith("unavailable in basic bond")
    })

    it("#9-2. ETHDeposit : fail when amount exceed maximumPurchasableAmountAtOneTime", async () => {

      let marketId = markets[markets.length-2].id;
      let bondInfo = markets[markets.length-2].info ;
      expect(bondInfo.market.availableBasicBond).to.equal(true);

      let amount = await bondDepository.maximumPurchasableAmountAtOneTime(
        marketId,
        ethers.constants.Zero
      );
      amount = amount.mul(ethers.utils.parseEther("1"))
        .div(bondInfo.market.priceTosPerToken);
      amount = amount.add(ethers.constants.One);

      await expect(
        bondDepository.connect(user1).ETHDeposit(
          marketId,
          amount,
          {
            value: amount
          }
        )
      ).to.be.revertedWith("exceed currentCapacityLimit")
    })

    it("#9-3. ETHDeposit  ", async () => {

      let skipIndex = 2;
      let stakingIdCounter = await stakingV2.stakingIdCounter();
      let possibleIndex = await stakingV2.possibleIndex();

      let marketId = markets[markets.length-skipIndex].id;
      let bondInfo = markets[markets.length-skipIndex].info ;
      expect(bondInfo.market.availableBasicBond).to.equal(true);

      let currentBefore = await bondDepository.possibleMaxCapacity(
        marketId
      );

      let payout = await bondDepository.maximumPurchasableAmountAtOneTime(
        marketId,
        ethers.constants.Zero
      );

      let amount = payout.mul(ethers.utils.parseEther("1"))
        .div(bondInfo.market.priceTosPerToken);

      const tx = await bondDepository.connect(user1).ETHDeposit(
        markets[markets.length-skipIndex].id,
        amount,
        {
          value: amount
        }
      );
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);

      const abi = require("../../artifacts/contracts/BondDepositoryV1_1.sol/BondDepositoryV1_1.json").abi;
      const interface   = new ethers.utils.Interface(abi);

      const StakingV2abi = require("../../artifacts/contracts/StakingV2.sol/StakingV2.json").abi;
      const StakingV2Interface   = new ethers.utils.Interface(StakingV2abi);

      let funcNameDeposited = "Deposited(address,uint256,uint256,uint256,bool,uint256)";
      let funcETHDeposited = "ETHDeposited(address,uint256,uint256,uint256,uint256)";
      let funcStakedByBond = "StakedByBond(address,uint256,uint256,uint256,uint256,uint256)";

      let TopicStakedByBond = Web3EthAbi.encodeEventSignature(funcStakedByBond);
      let TopicDeposited = Web3EthAbi.encodeEventSignature(funcNameDeposited);
      let TopicETHDeposited = Web3EthAbi.encodeEventSignature(funcETHDeposited);

      // console.log('funcNameDeposited',funcNameDeposited);
      // console.log('TopicDeposited',TopicDeposited);

      let stakeId = ethers.constants.Zero;
      let stakedAmount = ethers.constants.Zero;

      let tosAmount = amount.mul(bondInfo.market.priceTosPerToken).div(ethers.utils.parseEther("1"));

      for (let i = 0; i < receipt.logs.length; i++) {

        if (receipt.logs[i].topics[0] === TopicDeposited) {
          const data0 = receipt.logs[i].data;
          const topics0 = receipt.logs[i].topics;
          const event0 = interface.decodeEventLog("Deposited", data0, topics0);
          expect(event0.user).to.equal(user1.address);
          expect(event0.marketId).to.equal(marketId);
          expect(event0.amount).to.equal(amount);
          expect(event0.payout).to.equal(tosAmount);
          expect(event0.isEth).to.equal(true);
          bondInfo.mintAmount = event0.mintAmount;
        }

        if (receipt.logs[i].topics[0] === TopicStakedByBond) {

          const data0 = receipt.logs[i].data;
          const topics0 = receipt.logs[i].topics;
          const event0 = StakingV2Interface.decodeEventLog("StakedByBond", data0, topics0);
          expect(event0.to).to.equal(user1.address);
          expect(event0.marketId).to.equal(marketId);
          expect(event0.amount).to.equal(tosAmount);
          expect(event0.ltos).to.equal(tosAmount.mul(ethers.utils.parseEther("1")).div(possibleIndex));
          expect(event0.tosPrice).to.equal(bondInfo.market.priceTosPerToken);
          stakeId = event0.stakeId;
          stakedAmount = event0.amount;
        }


        if (receipt.logs[i].topics[0] === TopicETHDeposited) {
          const data0 = receipt.logs[i].data;
          const topics0 = receipt.logs[i].topics;
          const event0 = interface.decodeEventLog("ETHDeposited", data0, topics0);

          expect(event0.user).to.equal(user1.address);
          expect(event0.marketId).to.equal(marketId);
          expect(event0.amount).to.equal(amount);
          expect(event0.stakeId).to.equal(stakeId);

          bondInfo.stakeId = event0.stakeId;
          bondInfo.tosValuation = event0.tosValuation;
        }
      }

      expect(bondInfo.mintAmount).to.gt(bondInfo.tosValuation);

      expect(await stakingV2.stakingIdCounter()).to.be.lte(stakingIdCounter.add(ethers.constants.Two));
      expect(await stakingV2.connectId(bondInfo.stakeId)).to.be.equal(ethers.constants.Zero);


      let currentAfter = await bondDepository.possibleMaxCapacity(
        marketId
      );
      expect(currentAfter[1]).to.be.lt(currentBefore[1]);


    })

  })


  describe("#10. bondDepositoryV1_1 : ETHDepositedWithSTOS ", async () => {

    it("#10-1. ETHDepositWithSTOS : fail when availableStosBond is false", async () => {

      let marketId = markets[markets.length-2].id ;
      let bondInfo = markets[markets.length-2].info ;
      expect(bondInfo.market.availableStosBond).to.equal(false);

      let amount = ethers.utils.parseEther("1");

      await expect(
        bondDepository.connect(user1).ETHDepositWithSTOS(
          marketId,
          amount,
          1,
          {
            value: amount
          }
        )
      ).to.be.revertedWith("unavailable in lockup bond")
    })

    it("#10-2. ETHDepositWithSTOS : fail when amount exceed maximumPurchasableAmountAtOneTime", async () => {

      let marketId = markets[markets.length-1].id;
      let bondInfo = markets[markets.length-1].info ;
      let lockWeeks = ethers.constants.Two;

      expect(bondInfo.market.availableStosBond).to.equal(true);

      let payout = await bondDepository.maximumPurchasableAmountAtOneTime(
        marketId,
        lockWeeks
      );

      amount = payout.mul(ethers.utils.parseEther("1"))
        .div(bondInfo.market.priceTosPerToken);
      amount = amount.add(ethers.constants.One);

      await expect(
        bondDepository.connect(user1).ETHDepositWithSTOS(
          marketId,
          amount,
          lockWeeks,
          {
            value: amount
          }
        )
      ).to.be.revertedWith("exceed currentCapacityLimit")
    })

    it("#10-3. ETHDepositWithSTOS  ", async () => {

      let skipIndex = 1;
      let stakingIdCounter = await stakingV2.stakingIdCounter();
      let possibleIndex = await stakingV2.possibleIndex();
      let lockWeeks = ethers.constants.Two;

      let marketId = markets[markets.length-skipIndex].id;
      let bondInfo = markets[markets.length-skipIndex].info ;
      expect(bondInfo.market.availableStosBond).to.equal(true);

      let currentBefore = await bondDepository.possibleMaxCapacity(
        marketId
      );

      let payout = await bondDepository.maximumPurchasableAmountAtOneTime(
        marketId,
        lockWeeks
      );

      let amount = payout.mul(ethers.utils.parseEther("1"))
        .div(bondInfo.market.priceTosPerToken);

      const tx = await bondDepository.connect(user1).ETHDepositWithSTOS(
        marketId,
        amount,
        lockWeeks,
        {
          value: amount
        }
      );
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);

      const abi = require("../../artifacts/contracts/BondDepositoryV1_1.sol/BondDepositoryV1_1.json").abi;
      const interface   = new ethers.utils.Interface(abi);

      const StakingV2abi = require("../../artifacts/contracts/StakingV2.sol/StakingV2.json").abi;
      const StakingV2Interface   = new ethers.utils.Interface(StakingV2abi);


      let funcNameDeposited = "Deposited(address,uint256,uint256,uint256,bool,uint256)";
      let funcETHDepositedWithSTOS = "ETHDepositedWithSTOS(address,uint256,uint256,uint256,uint256,uint256)";

      let funcStakedGetStosByBond = "StakedGetStosByBond(address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)";

      let TopicDeposited = Web3EthAbi.encodeEventSignature(funcNameDeposited);
      let TopicETHDepositedWithSTOS = Web3EthAbi.encodeEventSignature(funcETHDepositedWithSTOS);

      let TopicStakedGetStosByBond = Web3EthAbi.encodeEventSignature(funcStakedGetStosByBond);

      let stakeId = ethers.constants.Zero;
      let stosId = ethers.constants.Zero;
      let stakedAmount = ethers.constants.Zero;
      let tosAmount = amount.mul(bondInfo.market.priceTosPerToken).div(ethers.utils.parseEther("1"));

      for (let i = 0; i < receipt.logs.length; i++) {

        if (receipt.logs[i].topics[0] === TopicDeposited) {
          const data0 = receipt.logs[i].data;
          const topics0 = receipt.logs[i].topics;
          const event0 = interface.decodeEventLog("Deposited", data0, topics0);
          expect(event0.user).to.equal(user1.address);
          expect(event0.marketId).to.equal(marketId);
          expect(event0.amount).to.equal(amount);
          expect(event0.payout).to.equal(tosAmount);
          expect(event0.isEth).to.equal(true);
          bondInfo.mintAmount = event0.mintAmount;
        }

        if (receipt.logs[i].topics[0] === TopicStakedGetStosByBond) {
          const data0 = receipt.logs[i].data;
          const topics0 = receipt.logs[i].topics;
          const event0 = StakingV2Interface.decodeEventLog("StakedGetStosByBond", data0, topics0);

          expect(event0.to).to.equal(user1.address);
          expect(event0.marketId).to.equal(marketId);
          expect(event0.amount).to.lte(tosAmount);
          expect(event0.ltos).to.equal(tosAmount.mul(ethers.utils.parseEther("1")).div(possibleIndex));
          expect(event0.periodWeeks).to.equal(lockWeeks);
          expect(event0.tosPrice).to.equal(bondInfo.market.priceTosPerToken);
          expect(event0.stosPrincipal).to.gte(tosAmount);

          stakedAmount = event0.amount;
          stakeId = event0.stakeId;
          stosId = event0.stosId;
          bondInfo.stosId = stosId;
        }

        if (receipt.logs[i].topics[0] === TopicETHDepositedWithSTOS) {
          const data0 = receipt.logs[i].data;
          const topics0 = receipt.logs[i].topics;
          const event0 = interface.decodeEventLog("ETHDepositedWithSTOS", data0, topics0);

          expect(event0.user).to.equal(user1.address);
          expect(event0.marketId).to.equal(marketId);
          expect(event0.amount).to.equal(amount);
          expect(event0.lockWeeks).to.equal(lockWeeks);
          expect(event0.stakeId).to.equal(stakeId);
          expect(event0.tosValuation).to.equal(stakedAmount);

          bondInfo.stakeId = event0.stakeId;
          bondInfo.tosValuation = event0.tosValuation;
        }
      }

      expect(bondInfo.mintAmount).to.gt(bondInfo.tosValuation);

      let count = await stakingV2.stakingIdCounter();
      expect(count).to.be.gt(stakingIdCounter);
      expect(count).to.be.lte(stakingIdCounter.add(ethers.constants.Two));

      let connectId = await stakingV2.connectId(bondInfo.stakeId)

      expect(bondInfo.stakeId).to.be.gt(ethers.constants.Zero);
      expect(connectId).to.be.equal(stosId);



      let currentAfter = await bondDepository.possibleMaxCapacity(
        marketId
      );
      expect(currentAfter[1]).to.be.lt(currentBefore[1]);


    })

  })


});
