const chai = require("chai");
const { solidity } = require("ethereum-waffle");
const { expect, assert } = chai;
const _ = require("lodash");
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
  //3. uint256 _capacityUpdatePeriod

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
      salePeriod : 60*60*24*7*4 // 7일 * 4
    },
    stakeId: 0,
    tosValuation: 0,
    mintAmount: 0,
    stosId: 0
  }

  let discountSets = [ ];
  let discountMaxWeek = 156;

  function setDiscountRate(bonusRate,  intervalWeeks) {
    let set = {
      address: '',
      id: 0,
      intervalWeeks : intervalWeeks,
      rates : [],
      encoded : ''
    }
    const RATE_SIZE = 2;
    let encoded = "0x";
    let maxIndex = parseInt(discountMaxWeek / set.intervalWeeks);

    for (i = 0; i < maxIndex; i++){
      let rate = parseInt((bonusRate * i) * 10000);
      // console.log(i, '<= weeks <' ,i * set.intervalWeeks, rate);
      set.rates.push(rate);

      encoded += rate.toString(16).padStart(2 * RATE_SIZE, "0");
    }

    if ((set.rates.length-1) * set.intervalWeeks == discountMaxWeek) {
      let rate = parseInt((bonusRate * maxIndex) * 10000);
      // console.log(  'weeks <' ,maxIndex * set.intervalWeeks, rate);
      set.rates.push(rate);
      encoded += rate.toString(16).padStart(2 * RATE_SIZE, "0");
    }

    set.encoded = encoded.toLowerCase();
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

      let set = setDiscountRate(discountRate,  26);
      set.address = discountRateLockUp.address;

      console.log("set 1 ", set);

      let tx = await discountRateLockUp.connect(admin1).createDiscountRates(
        set.intervalWeeks,
        set.encoded
      );
      await tx.wait();

      const receipt = await tx.wait();
      let _function ="CreatedDiscountRates(uint256,uint8)";
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
      // console.log("set", set);
      discountSets.push(set);

    })
    /*
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
    */

    it("getRatesInfo", async () => {

      let index = 0;

      let DiscountedRates = await discountRateLockUp.connect(admin1).getRatesInfo(
        discountSets[index].id
      );
      // console.log("DiscountedRates", DiscountedRates);
      // expect(DiscountedRates.intervalWeeks).to.be.eq(discountSets[index].intervalWeeks);

      // if (DiscountedRates.rates.length > 0 ){
      //   for (i=0; i< DiscountedRates.rates.length; i++){
      //     // console.log("DiscountedRates", DiscountedRates.rates[i], discountSets[index].rates[i]);
      //     expect(DiscountedRates.rates[i]).to.be.eq(discountSets[index].rates[i]);
      //   }
      // }
    })


    it("getRatesByIndex :  ", async () => {

      let index = 0;
      let weeks = 13;
      let weekIndex = parseInt(weeks/discountSets[index].intervalWeeks);
      console.log('weekIndex',weekIndex)
      console.log('discountSets[index].rate[weekIndex]',discountSets[index].rates[weekIndex])

      let rate = await discountRateLockUp.connect(admin1).getRatesByIndex(
        discountSets[index].id, weekIndex
      );
      console.log('rate',rate)

      // expect(rate).to.be.eq(discountSets[index].rates[weekIndex]);

    })


    it("getRatesByWeeks", async () => {

      let index = 0;
      let weeks = 30;
      let weekIndex = parseInt(weeks/discountSets[index].intervalWeeks);
      console.log('weekIndex',weekIndex)
      console.log('discountSets[index].rate[weekIndex]',discountSets[index].rates[weekIndex])

      let rate = await discountRateLockUp.connect(admin1).getRatesByWeeks(
        discountSets[index].id, weeks
      );
      console.log('rate',rate)

      // expect(rate).to.be.eq(discountSets[index].rates[weekIndex]);

    })

    /*
    it("getRatesByWeeks : interval weeks is 26 weeks", async () => {

      let index = 1;
      let weeks = 30;
      let weekIndex = parseInt(weeks/discountSets[index].intervalWeeks);
      console.log('weekIndex',weekIndex)
      console.log('discountSets[index].rate[weekIndex]',discountSets[index].rates[weekIndex])

      let rate = await discountRateLockUp.connect(admin1).getRatesByWeeks(
        discountSets[index].id, weeks
      );
      console.log('rate',rate)
      expect(rate).to.be.eq(discountSets[index].rates[weekIndex]);

    })
    */
  })


});