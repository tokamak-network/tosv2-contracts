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

describe("BonusRateLockUp test ", function () {

  let provider;

  let bonusRateLockUp;

  let bonusSets = [ ];
  let bonusMaxWeek = 156;

  function setBonusRate(bonusRate,  intervalWeeks) {
    let set = {
      address: '',
      id: 0,
      intervalWeeks : intervalWeeks,
      rates : [],
      encoded : ''
    }
    const RATE_SIZE = 2;
    let encoded = "0x";
    let maxIndex = parseInt(bonusMaxWeek / set.intervalWeeks);

    for (i = 0; i < maxIndex; i++){
      let rate = parseInt((bonusRate * i) * 10000);
      // console.log(i, '<= weeks <' ,i * set.intervalWeeks, rate);
      set.rates.push(rate);

      encoded += rate.toString(16).padStart(2 * RATE_SIZE, "0");
    }

    if ((set.rates.length-1) * set.intervalWeeks == bonusMaxWeek) {
      let rate = parseInt((bonusRate * maxIndex) * 10000);
      // console.log(  'weeks <' ,maxIndex * set.intervalWeeks, rate);
      set.rates.push(rate);
      encoded += rate.toString(16).padStart(2 * RATE_SIZE, "0");
    }

    set.encoded = encoded.toLowerCase();
    console.log(set.rates);

    return set;
  }

  before(async () => {
    accounts = await ethers.getSigners();
    [admin1, admin2, user1, user2, user3, user4, user5, user6 ] = accounts;

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

  describe("Deploy BonusRateLockUp ", () => {

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

      let set = setBonusRate(bonusRate,  26);
      set.address = bonusRateLockUp.address;

      console.log("set 1 ", set);

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
    /*
    it("Set discount datas : interval weeks is 13 weeks ", async () => {

      let discountRate = 0.06 ;

      let set = setDiscountRate(discountRate,  13);
      set.address = bonusRateLockUp.address;
      let tx = await bonusRateLockUp.connect(admin1).createDiscountRates(
        set.intervalWeeks,
        set.rates
      );
      await tx.wait();

      const receipt = await tx.wait();
      let _function ="CreatedDiscountRates(uint256,uint8,uint16[])";
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
      console.log("set", set);
      bonusSets.push(set);
    })

    it("Set discount datas : interval weeks is 26 weeks ", async () => {

      let discountRate = 0.06 ;

      let set = setDiscountRate(discountRate,  26);

      let tx = await bonusRateLockUp.connect(admin1).createDiscountRates(
        set.intervalWeeks,
        set.rates
      );
      await tx.wait();

      const receipt = await tx.wait();
      let _function ="CreatedDiscountRates(uint256,uint8,uint16[])";
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
      console.log("set", set);
      bonusSets.push(set);
    })
    */

    it("getRatesInfo", async () => {

      let index = 0;

      let BonusRates = await bonusRateLockUp.connect(admin1).getRatesInfo(
        bonusSets[index].id
      );

      expect(BonusRates.intervalWeeks).to.be.eq(bonusSets[index].intervalWeeks);

      if (BonusRates.rates.length > 0 ){
        for (i=0; i< BonusRates.rates.length; i++){
          // console.log("DiscountedRates", DiscountedRates.rates[i], bonusSets[index].rates[i]);
          expect(BonusRates.rates[i]).to.be.eq(bonusSets[index].rates[i]);
        }
      }
    })


    it("getRatesByIndex :  ", async () => {

      let index = 0;
      let weeks = 30;
      let weekIndex = parseInt(weeks/bonusSets[index].intervalWeeks);

      let rate = await bonusRateLockUp.connect(admin1).getRatesByIndex(
        bonusSets[index].id, weekIndex
      );

      expect(rate).to.be.eq(bonusSets[index].rates[weekIndex]);

    })


    it("getRatesByWeeks", async () => {

      let index = 0;
      let weeks = 156;
      let weekIndex = parseInt(weeks/bonusSets[index].intervalWeeks);

      let rate = await bonusRateLockUp.connect(admin1).getRatesByWeeks(
        bonusSets[index].id, weeks
      );
      console.log('rate',rate)

      expect(rate).to.be.eq(bonusSets[index].rates[bonusSets[index].rates.length-1]);

    })

    /*
    it("getRatesByWeeks : interval weeks is 26 weeks", async () => {

      let index = 1;
      let weeks = 30;
      let weekIndex = parseInt(weeks/bonusSets[index].intervalWeeks);
      console.log('weekIndex',weekIndex)
      console.log('bonusSets[index].rate[weekIndex]',bonusSets[index].rates[weekIndex])

      let rate = await bonusRateLockUp.connect(admin1).getRatesByWeeks(
        bonusSets[index].id, weeks
      );
      console.log('rate',rate)
      expect(rate).to.be.eq(bonusSets[index].rates[weekIndex]);

    })
    */
  })


});