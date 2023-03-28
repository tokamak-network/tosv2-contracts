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
const { FeeAmount, encodePath } = require("./utils");

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
  let bonusRateLockUp;

  let _TosV2Admin;
  let _tosAdmin;

  let markets = [];
  let viewMarketlength;

  //[팔려고 하는 tos의 목표치,tos token의 가격,_capacityUpdatePeriod]
  // 이더상품.
  //0. uint256 _capacity,
  //1. uint256 _lowerPriceLimit,
  //2. uint256 _capacityUpdatePeriod

  let bondInfoEther_sample = {
    marketId : null,
    check: true,
    token: ethers.constants.AddressZero,
    market: {
      startTime: 0,
      closeTime: 1669852800,
      capacity: ethers.BigNumber.from("19402097498000000000000"),
      lowerPriceLimit: ethers.BigNumber.from("1616841458170000000000"),
      capacityUpdatePeriod: 60*60*24,
      salePeriod : 60*60*24*7*156 ,
      pathes : [
        encodePath(
          [uniswapInfo.weth, uniswapInfo.tos],
          [FeeAmount.MEDIUM]
        ),
        encodePath(
          [uniswapInfo.weth, uniswapInfo.wton, uniswapInfo.tos],
          [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
        )
      ]
    },
    stakeId: 0,
    tosValuation: 0,
    mintAmount: 0,
    stosId: 0
  }

  let bonusSets = [ ];
  let bonusMaxWeek = 156;

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


  function setBonusRate(bonusRate,  intervalWeeks) {
    let set = {
      address: '',
      id: 0,
      intervalWeeks : intervalWeeks,
      rates : []
    }

    let maxIndex = parseInt(bonusMaxWeek / set.intervalWeeks);

    for (i = 0; i < maxIndex; i++){
      let rate = parseInt((bonusRate * i) * 10000);
      // console.log(i, '<= weeks <' ,i * set.intervalWeeks, rate);
      set.rates.push(rate);
    }

    if ((set.rates.length-1) * set.intervalWeeks == bonusMaxWeek) {
      let rate = parseInt((bonusRate * maxIndex) * 10000);
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

  describe("Deploy OracleLibrary and BonusRateLockUp ", () => {

    it("deploy OracleLibrary ", async () => {
      let factory = await ethers.getContractFactory("OracleLibrary")
      oracleLibrary = await factory.deploy();
      await oracleLibrary.deployed();
      console.log("oracleLibrary ", oracleLibrary.address)
      let code = await ethers.provider.getCode(oracleLibrary.address);
      expect(code).to.not.eq("0x");
    })

    it("deploy BonusRateLockUp ", async () => {
      let factory = await ethers.getContractFactory("BonusRateLockUp")
      bonusRateLockUp = await factory.deploy();
      await bonusRateLockUp.deployed()
      // console.log("bonusRateLockUp ", bonusRateLockUp.address)
      let code = await ethers.provider.getCode(bonusRateLockUp.address);
      expect(code).to.not.eq("0x");
    })

  })

  describe("Set BonusRateLockUp ", () => {
    it("Set bonus datas : interval weeks is 13 weeks ", async () => {

      let bonusRate = 0.06 ;

      let set = setBonusRate(bonusRate,  13);
      set.address = bonusRateLockUp.address;
      let tx = await bonusRateLockUp.connect(admin1).createBonusRates(
        set.intervalWeeks,
        set.rates
      );
      await tx.wait();

      const receipt = await tx.wait();
      let _function ="CreatedBonusRates(uint256,uint8)";
      let interface = bonusRateLockUp.interface;

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
      // console.log("set", set);
      bonusSets.push(set);
    })
    it("Set bonus datas : interval weeks is 3 weeks ", async () => {

      let bonusRate = 0.06 ;

      let set = setBonusRate(bonusRate,  3);
      set.address = bonusRateLockUp.address;
      let tx = await bonusRateLockUp.connect(admin1).createBonusRates(
        set.intervalWeeks,
        set.rates
      );
      await tx.wait();

      const receipt = await tx.wait();
      let _function ="CreatedBonusRates(uint256,uint8)";
      let interface = bonusRateLockUp.interface;

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
      // console.log("set", set);
      bonusSets.push(set);
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

    it("changeOracleLibrary of BondDepositoryV1_5 ", async () => {

      let tx = await bondDepository.connect(_TosV2Admin).changeOracleLibrary(
        oracleLibrary.address,
        uniswapInfo.poolfactory
      );
      await tx.wait();

      expect(await bondDepository.oracleLibrary()).to.be.eq(oracleLibrary.address);
      expect(await bondDepository.uniswapV3Factory()).to.be.eq(uniswapInfo.poolfactory);
    })

  })

  describe("#1. bondDepositoryV1_5 : create bond 1.5 market ", async () => {

    it("#1-1. create : fail when caller is not an policy admin", async () => {
      const block = await ethers.provider.getBlock('latest')
      let bonusSetsIndex = 0;
      let bondInfo =  _.cloneDeep(bondInfoEther_sample);
      bondInfo.market.startTime = block.timestamp + (60*5);
      bondInfo.market.closeTime = bondInfo.market.startTime + bondInfo.market.salePeriod;

      // console.log(bondInfo);

      await expect(
        bondDepository.connect(user1).create(
          bondInfo.token,
          [
            bondInfo.market.capacity,
            bondInfo.market.lowerPriceLimit,
            bondInfo.market.capacityUpdatePeriod
          ],
          bonusSets[bonusSetsIndex].address,
          bonusSets[bonusSetsIndex].id,
          bondInfo.market.startTime,
          bondInfo.market.closeTime,
          bondInfo.market.pathes
        )
      ).to.be.revertedWith("Accessible: Caller is not an policy admin")
    })

    it("#1-1. create : onlyPolicy can call create", async () => {
      let bonusSetsIndex = 0;
      const block = await ethers.provider.getBlock('latest')
      viewMarketlength = await stakingV2.marketIdCounter();

      let bondInfo =  _.cloneDeep(bondInfoEther_sample);
      bondInfo.market.startTime = block.timestamp + (60*5);
      bondInfo.market.closeTime = bondInfo.market.startTime + bondInfo.market.salePeriod;

      const tx = await bondDepository.connect(_TosV2Admin).create(
          bondInfo.token,
          [
            bondInfo.market.capacity,
            bondInfo.market.lowerPriceLimit,
            bondInfo.market.capacityUpdatePeriod
          ],
          bonusSets[bonusSetsIndex].address,
          bonusSets[bonusSetsIndex].id,
          bondInfo.market.startTime,
          bondInfo.market.closeTime,
          bondInfo.market.pathes
      );
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      // console.log('receipt',receipt);

      const interface = new ethers.utils.Interface(["event CreatedMarket(uint256 marketId, address token, uint256[3] marketInfos, address bonusRatesAddress, uint256 bonusRatesId, uint32 startTime, uint32 endTime, bytes[] pathes)"]);
      const data = receipt.logs[0].data;
      const topics = receipt.logs[0].topics;
      const event = interface.decodeEventLog("CreatedMarket", data, topics);
      // console.log('event',event);
      // console.log('event.pathes',event.pathes);
      // console.log('bondInfo.market.pathes',bondInfo.market.pathes);

      expect(event.token).to.equal(bondInfo.token);
      expect(event.marketInfos.length).to.equal(3);
      expect(event.marketInfos[0]).to.equal(bondInfo.market.capacity);
      expect(event.marketInfos[1]).to.equal(bondInfo.market.lowerPriceLimit);
      expect(event.marketInfos[2]).to.equal(bondInfo.market.capacityUpdatePeriod);
      expect(event.startTime).to.equal(bondInfo.market.startTime);
      expect(event.endTime).to.equal(bondInfo.market.closeTime);
      expect(event.bonusRatesAddress).to.equal(bonusSets[bonusSetsIndex].address);
      expect(event.bonusRatesId).to.equal(bonusSets[bonusSetsIndex].id);
      expect(event.pathes.length).to.equal(bondInfo.market.pathes.length);
      // console.log('event.pathes.length',event.pathes.length);

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
      let bonusSetsIndex = 0;
      const block = await ethers.provider.getBlock('latest')

      let bondInfo = _.cloneDeep(bondInfoEther_sample);
      bondInfo.market.startTime = block.timestamp + (60*5);
      bondInfo.market.closeTime = bondInfo.market.startTime + bondInfo.market.salePeriod;

      await expect(
        bondDepository.connect(_TosV2Admin).create(
          bondInfo.token,
          [
            bondInfo.market.capacity,
            bondInfo.market.lowerPriceLimit,
            ethers.constants.Zero
          ],
          bonusSets[bonusSetsIndex].address,
          bonusSets[bonusSetsIndex].id,
          bondInfo.market.startTime,
          bondInfo.market.closeTime,
          bondInfo.market.pathes
        )
      ).to.be.revertedWith("BondDepository: zero uint")
    })
  })

  describe("#2~8. bondDepositoryV1_5 : VIEW FUNCTIONS", async () => {

    it("#2-1. salePeriod : Before the start time, the 0th day is returned.", async () => {

      let marketId = markets[markets.length-1].id ;
      let market = markets[markets.length-1].info.market ;

      let days_ = await bondDepository.connect(_TosV2Admin).salePeriod(
        market.startTime,
        market.closeTime,
        market.capacityUpdatePeriod
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

    it("   evm_increaseTime ", async () => {
      const block = await ethers.provider.getBlock('latest')

      let passTime = markets[markets.length-1].info.market.startTime - block.timestamp ;
      // console.log('passTime',passTime );
      ethers.provider.send("evm_increaseTime", [passTime+100])
      ethers.provider.send("evm_mine")
    });

    it("#2-2. salePeriod : During the sales period, it is returned as 1 on the first cycle. ", async () => {
      let marketId = markets[markets.length-1].id ;
      let market = markets[markets.length-1].info.market ;
      let days_ = await bondDepository.connect(_TosV2Admin).salePeriod(
        market.startTime,
        market.closeTime,
        market.capacityUpdatePeriod
      );

      expect(days_[1]).to.be.equal(ethers.constants.One);
    })

    it("#3-2. possibleMaxCapacity", async () => {

      let marketId = markets[markets.length-1].id ;
      let bondInfo = markets[markets.length-1].info ;
      let market = markets[markets.length-1].info.market ;
      let days_ = await bondDepository.connect(_TosV2Admin).salePeriod(
        market.startTime,
        market.closeTime,
        market.capacityUpdatePeriod
      );
      expect(days_[1]).to.be.equal(ethers.constants.One);

      let capacity = await bondDepository.connect(_TosV2Admin).possibleMaxCapacity(
        marketId
      );

      let currentCapacity = bondInfo.market.capacity.mul(days_[1]).div(days_[0])

      expect(capacity[1]).to.be.equal(currentCapacity);
    })


    it("   evm_increaseTime ", async () => {
      let bondInfo = markets[markets.length-1].info ;
      ethers.provider.send("evm_increaseTime", [bondInfo.market.capacityUpdatePeriod])
      ethers.provider.send("evm_mine")
    });

    it("#2-3. salePeriod : During the sales period, it returns to 2 for the second cycle.", async () => {
      let marketId = markets[markets.length-1].id ;
      let market = markets[markets.length-1].info.market ;
      let days_ = await bondDepository.connect(_TosV2Admin).salePeriod(
        market.startTime,
        market.closeTime,
        market.capacityUpdatePeriod
      );

      expect(days_[1]).to.be.equal(ethers.constants.Two);
    })

    it("#3-2. possibleMaxCapacity", async () => {

      let marketId = markets[markets.length-1].id ;
      let bondInfo = markets[markets.length-1].info ;
      let market = markets[markets.length-1].info.market ;
      let days_ = await bondDepository.connect(_TosV2Admin).salePeriod(
        market.startTime,
        market.closeTime,
        market.capacityUpdatePeriod
      );

      expect(days_[1]).to.be.equal(ethers.constants.Two);

      let capacity = await bondDepository.connect(_TosV2Admin).possibleMaxCapacity(
        marketId
      );

      let currentCapacity = bondInfo.market.capacity.mul(days_[1]).div(days_[0])

      expect(capacity[1]).to.be.equal(currentCapacity.toString());
    })

    it("#4. viewMarket", async () => {

      let marketId = markets[markets.length-1].id ;
      let bondInfo = markets[markets.length-1].info ;

      let viewMarket = await bondDepository.viewMarket(
        marketId
      );

      let market = viewMarket[0]
      let marketInfo = viewMarket[1]
      let bonusRateInfo = viewMarket[2]
      let pricePathes = viewMarket[3]

      // console.log('marketInfo',marketInfo);
      // console.log('bonusRateInfo',bonusRateInfo);
      // console.log('pricePathes',pricePathes);

      // expect(marketInfo.startTime).to.equal(bondInfo.token);
      // expect(info.capacity).to.equal(bondInfo.market.capAmountOfTos);
      // expect(info.endSaleTime).to.equal(bondInfo.market.closeTime);
      // expect(info.tosPrice).to.equal(bondInfo.market.priceTosPerToken);
      // expect(info.maxPayout).to.equal(bondInfo.market.purchasableTOSAmountAtOneTime);

      expect(market.quoteToken).to.equal(bondInfo.token);
      expect(market.capacity).to.equal(bondInfo.market.capacity);
      expect(market.endSaleTime).to.be.gt(bondInfo.market.startTime);
      expect(market.maxPayout).to.equal(ethers.constants.Zero);
      expect(market.tosPrice).to.equal(bondInfo.market.lowerPriceLimit);

      expect(marketInfo.bondType).to.equal(1);
      expect(marketInfo.startTime).to.equal(bondInfo.market.startTime);
      expect(marketInfo.closed).to.equal(false);
      expect(marketInfo.capacityUpdatePeriod).to.equal(bondInfo.market.capacityUpdatePeriod);
      expect(marketInfo.totalSold).to.equal(ethers.constants.Zero);

      expect(bonusRateInfo.bonusRatesAddress).to.equal(bonusSets[0].address);
      expect(bonusRateInfo.bonusRatesId).to.equal(bonusSets[0].id);

      expect(pricePathes.length).to.equal(bondInfo.market.pathes.length);
      // console.log('pricePathes', pricePathes);
    })

    it("#5-1. getUniswapPrice  ", async () => {
      let marketId = markets[markets.length-1].id ;
      // console.log('marketId', marketId);

      let price = await bondDepository.getUniswapPrice(
        marketId
      );
      // console.log('price', price);

      let bondInfo = markets[markets.length-1].info ;

      if(bondInfo.market.pathes.length > 0){
        for (i =0; i< bondInfo.market.pathes.length; i++){
          let uniswapPrice = await oracleLibrary.getOutAmountsCurTick(
            uniswapInfo.poolfactory,
            bondInfo.market.pathes[i],
            ethers.utils.parseEther("1")
          );
          expect(price).to.lte(uniswapPrice);
        }
      }

    })

    it("#5-2. getBasePrice ", async () => {
      let marketId = markets[markets.length-1].id ;

      let uniswapPrice = await bondDepository.getUniswapPrice(
        marketId
      );
      // console.log('uniswapPrice', uniswapPrice.toString());

      let basePriceInfo = await bondDepository.getBasePrice(
        marketId
      );
      // console.log('basePriceInfo', basePriceInfo);
      expect(basePriceInfo[0]).to.lte(uniswapPrice);
    })


    it("#5-3. getBondingPrice : As the lock-up period increases, the bonding price (the amount of TOS that can be received) increases.", async () => {
      let marketId = markets[markets.length-1].id ;

      let basePriceInfo = await bondDepository.getBasePrice(
        marketId
      );
      let bondingPrice_10weeks = await bondDepository.getBondingPrice(
        marketId, 10, basePriceInfo[0]
      );

      let bondingPrice_20weeks = await bondDepository.getBondingPrice(
        marketId, 20, basePriceInfo[0]
      );
      expect(bondingPrice_10weeks).to.be.lt(bondingPrice_20weeks);
    })

    it("#6-1. salePeriod  ", async () => {
      let marketId = markets[markets.length-1].id ;
      let market = markets[markets.length-1].info.market ;
      let salePeriod = await bondDepository.salePeriod(
        market.startTime,
        market.closeTime,
        market.capacityUpdatePeriod
      );

      // console.log("totalSaleDays",salePeriod[0].toString())
      // console.log("curWhatDays",salePeriod[1].toString())

      let capacity = await bondDepository.possibleMaxCapacity(
        marketId
      );

      // console.log("dailyCapacity",capacity[0].toString())
      // console.log("currentCapacity",capacity[1].toString())
      expect(capacity[1]).to.be.eq(capacity[0].mul(salePeriod[1]));
    })

    it("#7. getBonds", async () => {

      let marketId = markets[markets.length-1].id ;

      let bondsList = await bondDepository.getBonds();

      expect(bondsList[0].length).to.gt(ethers.constants.Zero);
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

    it("#9-1. ETHDeposit : fail when minimumTosPrice is greater than bonding price", async () => {

      let marketId = markets[markets.length-1].id;

      let amount = ethers.utils.parseEther("1");

      let basePriceInfo = await bondDepository.getBasePrice(
        marketId
      );

      let bondingPrice_10weeks = await bondDepository.getBondingPrice(
        marketId, 0, basePriceInfo[0]
      );

      let minimumTosPrice = bondingPrice_10weeks.add(ethers.BigNumber.from("1"))

      await expect(
        bondDepository.connect(user1).ETHDeposit(
          marketId,
          amount,
          minimumTosPrice,
          {
            value: amount
          }
        )
      ).to.be.revertedWith("The bonding amount is less than the minimum amount.")
    })

    it("#9-2. ETHDeposit : fail when amount exceed currentCapacityLimit", async () => {

      let marketId = markets[markets.length-1].id;

      let capacity = await bondDepository.possibleMaxCapacity(
        marketId
      );
      let basePriceInfo = await bondDepository.getBasePrice(
        marketId
      );

      let bondingPrice_10weeks = await bondDepository.getBondingPrice(
        marketId, 0, basePriceInfo[0]
      );
      let minimumTosPrice = bondingPrice_10weeks.sub(ethers.BigNumber.from("1"))

      let amount = capacity[1]
                    .mul(ethers.utils.parseEther("1"))
                    .div(bondingPrice_10weeks)
                    .add(ethers.BigNumber.from("100"));

      await expect(
        bondDepository.connect(user1).ETHDeposit(
          marketId,
          amount,
          minimumTosPrice,
          {
            value: amount
          }
        )
      ).to.be.revertedWith("exceed currentCapacityLimit")
    })

    it("#9-3. ETHDeposit  ", async () => {

      let skipIndex = 1;
      let lockupWeeks = 0;
      let stakingIdCounter = await stakingV2.stakingIdCounter();
      let possibleIndex = await stakingV2.possibleIndex();

      let marketId = markets[markets.length-skipIndex].id;
      let bondInfo = markets[markets.length-skipIndex].info ;

      let basePriceInfo = await bondDepository.getBasePrice(
        marketId
      );

      let bondingPrice = await bondDepository.getBondingPrice(
        marketId, lockupWeeks, basePriceInfo[0]
      );

      let minimumTosPrice = bondingPrice.sub(ethers.BigNumber.from("1"))

      let capacity = await bondDepository.possibleMaxCapacity(
        marketId
       );

      let amount = capacity[1]
                    .mul(ethers.utils.parseEther("1"))
                    .div(bondingPrice) ;


      const tx = await bondDepository.connect(user1).ETHDeposit(
        markets[markets.length-skipIndex].id,
        amount,
        minimumTosPrice,
        {
          value: amount
        }
      );

      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);

      const abi = require("../../artifacts/contracts/BondDepositoryV1_5.sol/BondDepositoryV1_5.json").abi;
      const interface   = new ethers.utils.Interface(abi);

      const StakingV2abi = require("../../artifacts/contracts/StakingV2.sol/StakingV2.json").abi;
      const StakingV2Interface   = new ethers.utils.Interface(StakingV2abi);

      let funcNameDeposited = "Deposited(address,uint256,uint256,uint256,bool,uint256)";
      let funcETHDeposited = "ETHDeposited(address,uint256,uint256,uint256,uint256,uint256)";
      let funcStakedByBond = "StakedByBond(address,uint256,uint256,uint256,uint256,uint256)";

      let TopicStakedByBond = Web3EthAbi.encodeEventSignature(funcStakedByBond);
      let TopicDeposited = Web3EthAbi.encodeEventSignature(funcNameDeposited);
      let TopicETHDeposited = Web3EthAbi.encodeEventSignature(funcETHDeposited);

      // console.log('funcNameDeposited',funcNameDeposited);
      // console.log('TopicDeposited',TopicDeposited);

      let stakeId = ethers.constants.Zero;
      let stakedAmount = ethers.constants.Zero;

      let tosAmount = amount.mul(bondingPrice).div(ethers.utils.parseEther("1"));

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
          expect(event0.tosPrice).to.gte(bondInfo.market.lowerPriceLimit);
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

      let capacityAfter = await bondDepository.possibleMaxCapacity(
        marketId
      )
      expect(capacityAfter[1]).to.be.lt(capacity[1]);

      // let isOpened = await bondDepository.isOpened(
      //   marketId
      // )
      // console.log("isOpened", isOpened);

      let viewMarket = await bondDepository.viewMarket(marketId);
      expect(viewMarket[1].totalSold).to.be.eq(capacity[1].sub(capacityAfter[1]));
    })

    it("3-4. possibleMaxCapacity : As time has passed, sale capacity is increased.", async () => {

      let marketId = markets[markets.length-1].id ;
      let bondInfo = markets[markets.length-1].info ;

      let isOpened = await bondDepository.isOpened(marketId)
      expect(isOpened).to.be.eq(true);

      let capacity = await bondDepository.possibleMaxCapacity(marketId)
      // console.log("capacity", capacity[1].toString());

      let block = await ethers.provider.getBlock();
      let passTime =  bondInfo.market.capacityUpdatePeriod + 60;
      ethers.provider.send("evm_increaseTime", [passTime])
      ethers.provider.send("evm_mine")

      let capacityAfter = await bondDepository.possibleMaxCapacity(marketId)
      // console.log("capacityAfter", capacityAfter[1].toString());

      expect(capacityAfter[1]).to.be.gt(capacity[1]);

    })

  })

  describe("#10. bondDepositoryV1_1 : ETHDepositedWithSTOS ", async () => {


    it("#10-1. ETHDepositWithSTOS : fail when minimumTosPrice is greater than bonding price", async () => {

      let marketId = markets[markets.length-1].id;
      let lockupWeeks = 30;
      let capacity = await bondDepository.possibleMaxCapacity(
        marketId
      );
      let basePriceInfo = await bondDepository.getBasePrice(
        marketId
      );

      let bondingPrice = await bondDepository.getBondingPrice(
        marketId, lockupWeeks, basePriceInfo[0]
      );
      let minimumTosPrice = bondingPrice.add(ethers.BigNumber.from("1"))

      let amount = capacity[1]
                    .mul(ethers.utils.parseEther("1"))
                    .div(bondingPrice)
                    .add(ethers.BigNumber.from("100"));

      await expect(
        bondDepository.connect(user1).ETHDepositWithSTOS(
          marketId,
          amount,
          minimumTosPrice,
          lockupWeeks,
          {
            value: amount
          }
        )
      ).to.be.revertedWith("The bonding amount is less than the minimum amount.")
    })

    it("#10-2. ETHDepositWithSTOS : fail when amount exceed currentCapacityLimit", async () => {

      let marketId = markets[markets.length-1].id;
      let lockupWeeks = 15;
      let capacity = await bondDepository.possibleMaxCapacity(
        marketId
      );
      let basePriceInfo = await bondDepository.getBasePrice(
        marketId
      );

      let bondingPrice = await bondDepository.getBondingPrice(
        marketId, lockupWeeks, basePriceInfo[0]
      );
      let minimumTosPrice = bondingPrice.sub(ethers.BigNumber.from("1"))


      let amount = capacity[1]
                    .mul(ethers.utils.parseEther("1"))
                    .div(bondingPrice)
                    .add(ethers.BigNumber.from("100"));

      await expect(
        bondDepository.connect(user1).ETHDepositWithSTOS(
          marketId,
          amount,
          minimumTosPrice,
          lockupWeeks,
          {
            value: amount
          }
        )
      ).to.be.revertedWith("exceed currentCapacityLimit")
    })

    it("#10-3. ETHDepositWithSTOS  ", async () => {

      let skipIndex = 1;
      let lockupWeeks = 15;
      let lockWeeks = ethers.BigNumber.from("15");
      let stakingIdCounter = await stakingV2.stakingIdCounter();
      let possibleIndex = await stakingV2.possibleIndex();

      let marketId = markets[markets.length-skipIndex].id;
      let bondInfo = markets[markets.length-skipIndex].info ;
      let viewMarketBefore = await bondDepository.viewMarket(marketId);

      let basePriceInfo = await bondDepository.getBasePrice(
        marketId
      );

      let bondingPrice = await bondDepository.getBondingPrice(
        marketId, lockupWeeks, basePriceInfo[0]
      );

      let minimumTosPrice = bondingPrice.sub(ethers.BigNumber.from("1"))

      let capacity = await bondDepository.possibleMaxCapacity(
        marketId
      );

      let amount = capacity[1]
       .mul(ethers.utils.parseEther("1"))
       .div(bondingPrice) ;

      const tx = await bondDepository.connect(user1).ETHDepositWithSTOS(
        marketId,
        amount,
        minimumTosPrice,
        lockWeeks,
        {
          value: amount
        }
      );
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);

      const abi = require("../../artifacts/contracts/BondDepositoryV1_5.sol/BondDepositoryV1_5.json").abi;
      const interface   = new ethers.utils.Interface(abi);

      const StakingV2abi = require("../../artifacts/contracts/StakingV2.sol/StakingV2.json").abi;
      const StakingV2Interface   = new ethers.utils.Interface(StakingV2abi);


      let funcNameDeposited = "Deposited(address,uint256,uint256,uint256,bool,uint256)";
      let funcETHDepositedWithSTOS = "ETHDepositedWithSTOS(address,uint256,uint256,uint256,uint256,uint8,uint256)";

      let funcStakedGetStosByBond = "StakedGetStosByBond(address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)";

      let TopicDeposited = Web3EthAbi.encodeEventSignature(funcNameDeposited);
      let TopicETHDepositedWithSTOS = Web3EthAbi.encodeEventSignature(funcETHDepositedWithSTOS);

      let TopicStakedGetStosByBond = Web3EthAbi.encodeEventSignature(funcStakedGetStosByBond);

      let stakeId = ethers.constants.Zero;
      let stosId = ethers.constants.Zero;
      let stakedAmount = ethers.constants.Zero;
      let tosAmount = amount.mul(bondingPrice).div(ethers.utils.parseEther("1"));

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
          expect(event0.tosPrice).to.gte(bondInfo.market.lowerPriceLimit);
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


      let capacityAfter = await bondDepository.possibleMaxCapacity(
        marketId
      )
      expect(capacityAfter[1]).to.be.lt(capacity[1]);

      let viewMarket = await bondDepository.viewMarket(marketId);
      expect(viewMarket[1].totalSold).to.be.eq(viewMarketBefore[1].totalSold.add(bondInfo.tosValuation));

    })

  })
});