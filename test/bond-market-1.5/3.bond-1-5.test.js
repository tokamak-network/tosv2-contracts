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

const BondDepositoryProxyABI = require('../../artifacts/contracts/BondDepositoryProxy.sol/BondDepositoryProxy.json');
const BondDepositoryV1_5ABI = require('../../artifacts/contracts/BondDepositoryV1_5.sol/BondDepositoryV1_5.json');
const StakingV2ABI = require('../../artifacts/contracts/StakingV2.sol/StakingV2.json');
const TreasuryABI = require('../../artifacts/contracts/Treasury.sol/Treasury.json');


let tosAdmin = "0x12a936026f072d4e97047696a9d11f97eae47d21";
let TosV2Admin = "0x15280a52E79FD4aB35F4B9Acbb376DCD72b44Fd1";

// test : https://docs.google.com/spreadsheets/d/1BozidTCxcwMT0wRcQrnIJkRMvE5xKZgDUF092fNPUpI/edit#gid=0

describe("TOSv2 Bond Market V1.5", function () {

  let provider;

  let tosContract;

  let treasury;
  let stakingV2;
  let bondDepositoryProxy, bondDepositoryV1_5, bondDepository, libBondDepositoryV1_5;
  let discountRateLockUp;

  let _TosV2Admin;
  let _tosAdmin;

  let markets = [];
  let viewMarketlength;

  //[팔려고 하는 tos의 목표치, 판매 끝나는 시간, 받는 token의 가격, tos token의 가격, 한번에 구매 가능한 TOS물량]
  // 이더상품.
  //0. uint256 _capacity,
  //1. uint256 _maxPayout, - 이것이 의미가 없어서, 0으로 설정한다.
  //2. uint256 _lowerPriceLimit,
  //3. uint256 _initialMaxPayout,
  //4. uint256 _capacityUpdatePeriod

  let bondInfoEther_sample = {
    marketId : null,
    check: true,
    token: ethers.constants.AddressZero,
    market: {
      startTime: 0,
      closeTime: 1669852800,
      capacity: ethers.BigNumber.from("19402097498000000000000"),
      lowerPriceLimit: ethers.BigNumber.from("1616841458170000000000"),
      initialMaxPayout: ethers.BigNumber.from("2000000000000000000"),
      capacityUpdatePeriod: 60*60*24,
      salePeriod : 60*60*24*7*4 // 7일 * 4
    },
    stakeId: 0,
    tosValuation: 0,
    mintAmount: 0,
    stosId: 0
  }

  let pools = [
    {count:1, path:[tosethPool]},
    {count:2, path:[wtonTosPool, wtonWethPool]}
  ];

  let discountSets = [ ];
  let discountMaxWeek = 156;

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


  function setDiscountRate(discountRate,  intervalWeeks) {
    let set = {
      address: '',
      id: 0,
      intervalWeeks : intervalWeeks,
      rates : []
    }

    let maxIndex = parseInt(discountMaxWeek / set.intervalWeeks);

    for (i = 0; i < maxIndex; i++){
      let rate = parseInt(( 1.0 - (discountRate * i)) * 10000);
      // console.log(i, '<= weeks <' ,i * set.intervalWeeks, rate);
      set.rates.push(rate);
    }

    if ((set.rates.length-1) * set.intervalWeeks < discountMaxWeek) {
      let rate = parseInt(( 1.0 - (discountRate * maxIndex)) * 10000);
      // console.log(  'weeks <' ,maxIndex * set.intervalWeeks, rate);
      set.rates.push(rate);
    }
    // console.log(set.rates);
    return set;
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

  describe("Deploy DiscountedRateLockUp ", () => {

    it("deploy DiscountedRateLockUp ", async () => {
      let factory = await ethers.getContractFactory("DiscountedRateLockUp")
      discountRateLockUp = await factory.deploy();
      await discountRateLockUp.deployed()
      // console.log("discountRateLockUp ", discountRateLockUp.address)
      let code = await ethers.provider.getCode(discountRateLockUp.address);
      expect(code).to.not.eq("0x");
    })

  })

  describe("Set DiscountedRateLockUp ", () => {
    it("Set discount datas : interval weeks is 13 weeks ", async () => {

      let discountRate = 0.06 ;

      let set = setDiscountRate(discountRate,  13);
      set.address = discountRateLockUp.address;
      let tx = await discountRateLockUp.connect(admin1).createDiscountRates(
        set.intervalWeeks,
        set.rates
      );
      await tx.wait();

      const receipt = await tx.wait();
      let _function ="CreatedDiscountRates(uint256,uint8,uint16[])";
      let interface = discountRateLockUp.interface;

      for(let i=0; i< receipt.events.length; i++){
          if(receipt.events[i].topics[0] == interface.getEventTopic(_function)){
              let data = receipt.events[i].data;
              let topics = receipt.events[i].topics;
              let log = interface.parseLog(
              {  data,  topics } );
              // console.log(log.args);
              set.id = log.args._id;
          }
      }
      console.log("set", set);
      discountSets.push(set);
    })

    it("Set discount datas : interval weeks is 26 weeks ", async () => {

      let discountRate = 0.06 ;

      let set = setDiscountRate(discountRate,  26);

      let tx = await discountRateLockUp.connect(admin1).createDiscountRates(
        set.intervalWeeks,
        set.rates
      );
      await tx.wait();

      const receipt = await tx.wait();
      let _function ="CreatedDiscountRates(uint256,uint8,uint16[])";
      let interface = discountRateLockUp.interface;

      for(let i=0; i< receipt.events.length; i++){
          if(receipt.events[i].topics[0] == interface.getEventTopic(_function)){
              let data = receipt.events[i].data;
              let topics = receipt.events[i].topics;
              let log = interface.parseLog(
              {  data,  topics } );
              // console.log(log.args);
              set.id = log.args._id;
          }
      }
      console.log("set", set);
      discountSets.push(set);
    })
  })


  describe("Set TOSv2 phase 1.5 ", () => {

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

  describe("Upgrade BondDepository to BondDepositoryV1_5", () => {

    it("deploy BondDepositoryV1_5 ", async () => {

      let factory = await ethers.getContractFactory("BondDepositoryV1_5")
      bondDepositoryV1_5 = await factory.deploy();
      await bondDepositoryV1_5.deployed()

      console.log("bondDepositoryV1_5 ", bondDepositoryV1_5.address)

      let code = await ethers.provider.getCode(bondDepositoryV1_5.address);
      expect(code).to.not.eq("0x");
    })

    it("upgrade BondDepositoryProxy's logic to BondDepositoryV1_5 ", async () => {

      let tx = await bondDepositoryProxy.connect(_TosV2Admin).upgradeTo(bondDepositoryV1_5.address);
      await tx.wait();

      expect(await bondDepositoryProxy.implementation()).to.be.eq(bondDepositoryV1_5.address);
    })

    it("get Contract", async () => {
      bondDepository = new ethers.Contract(deployed.BondDepositoryProxy, BondDepositoryV1_5ABI.abi, ethers.provider);
      console.log("bondDepository ", bondDepository.address)
    })

  })

  describe("#1. bondDepositoryV1_5 : create bond 1.5 market ", async () => {

    it("#1-1. create : fail when caller is not an policy admin", async () => {
      const block = await ethers.provider.getBlock('latest')
      let discountSetsIndex = 0;
      let bondInfo =  _.cloneDeep(bondInfoEther_sample);
      bondInfo.market.startTime = block.timestamp + (60*5);
      bondInfo.market.closeTime = bondInfo.market.startTime + bondInfo.market.salePeriod;

      await expect(
        bondDepository.connect(user1).create(
          bondInfo.token,
          [
            bondInfo.market.capacity,
            ethers.constants.Zero,
            bondInfo.market.lowerPriceLimit,
            bondInfo.market.initialMaxPayout,
            bondInfo.market.capacityUpdatePeriod
          ],
          discountSets[discountSetsIndex].address,
          discountSets[discountSetsIndex].id,
          bondInfo.market.startTime,
          bondInfo.market.closeTime
        )
      ).to.be.revertedWith("Accessible: Caller is not an policy admin")
    })

    it("#1-1. create : onlyPolicy can call create", async () => {
      const block = await ethers.provider.getBlock('latest')
      viewMarketlength = await stakingV2.marketIdCounter();

      let bondInfo =  _.cloneDeep(bondInfoEther_sample);
      bondInfo.market.startTime = block.timestamp + (60*5);
      bondInfo.market.closeTime = bondInfo.market.startTime + bondInfo.market.salePeriod;


      const tx = await bondDepository.connect(_TosV2Admin).create(
        bondInfo.token,
          [
            bondInfo.market.capacity,
            ethers.constants.Zero,
            bondInfo.market.lowerPriceLimit,
            bondInfo.market.initialMaxPayout,
            bondInfo.market.capacityUpdatePeriod
          ],
          discountSets[discountSetsIndex].address,
          discountSets[discountSetsIndex].id,
          bondInfo.market.startTime,
          bondInfo.market.closeTime
      );
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      // console.log('receipt',receipt);

      const interface = new ethers.utils.Interface(["event CreatedMarket(uint256 marketId, address token, uint256[5] marketInfos, address discountRatesAddress, uint256 discountRatesId, uint32 startTime, uint32 endTime, address[] pools)"]);
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


});