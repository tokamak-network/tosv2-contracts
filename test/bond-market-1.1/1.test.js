const chai = require("chai");
const { solidity } = require("ethereum-waffle");
const { expect, assert } = chai;

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

// let eventCreatedMarket ="CreatedMarket(uint256,address,uint256[4])";
// let eventETHDeposited ="ETHDeposited(address,uint256,uint256,uint256,uint256)";
// let eventETHDepositWithSTOS ="ETHDepositedWithSTOS(address,uint256,uint256,uint256,uint256,uint256)";
// let eventDeposited ="Deposited(address,uint256,uint256,uint256,bool,uint256)";

// let eventStakedGetStosByBond ="StakedGetStosByBond(address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)";

// let eventStaked ="Staked(address,uint256,uint256)";
// let eventStakedGetStos ="StakedGetStos(address,uint256,uint256,uint256,uint256,uint256)";
// let eventIncreasedAmountForSimpleStake ="IncreasedAmountForSimpleStake(address,uint256,uint256)";
// let eventResetStakedGetStosAfterLock ="ResetStakedGetStosAfterLock(address,uint256,uint256,uint256,uint256,uint256,uint256)";
// let eventIncreasedBeforeEndOrNonEnd ="IncreasedBeforeEndOrNonEnd(address,uint256,uint256,uint256,uint256,uint256)";

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
      initialCapacity: 0,
      initialMaxPayout: 0,
      capacityUpdatePeriod: 60*60*24,
      availableBasicBond: true,
      availableLockupBond: false,
      salePeriod : 60*60*24*7 // 7일
    },
    tosValuationSimple: 0,
    tosValuationLock: 0
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
      initialCapacity: 0,
      initialMaxPayout: 0,
      capacityUpdatePeriod: 60*60*24,
      availableBasicBond: false,
      availableLockupBond: true,
      salePeriod : 60*60*24*7 // 7일
    },
    tosValuationSimple: 0,
    tosValuationLock: 0
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
      stakingV2 = new ethers.Contract(deployed.StakingV2, StakingV2ABI.abi, _TosV2Admin)

      let code = await ethers.provider.getCode(deployed.StakingV2Proxy);
      expect(code).to.not.eq("0x");
    })

    it("Treasury", async () => {
      treasury = new ethers.Contract(deployed.TreasuryProxy, TreasuryABI.abi, _TosV2Admin)

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
      console.log("libBondDepositoryV1_1 ", libBondDepositoryV1_1.address)
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

      console.log("bondDepositoryV1_1 ", bondDepositoryV1_1.address)

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
      console.log("bondDepository ", bondDepository.address)
    })

  })

  describe("#1. bondDepositoryV1_1 : create", async () => {

    it("#1-3-3. create  ", async () => {
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
          bondInfo.market.initialCapacity,
          bondInfo.market.initialMaxPayout,
          bondInfo.market.capacityUpdatePeriod,
          bondInfo.market.availableBasicBond,
          bondInfo.market.availableLockupBond
        )
      ).to.be.revertedWith("Accessible: Caller is not an policy admin")
    })


    it("#1-3-3. create : onlyPolicy can call create", async () => {
      const block = await ethers.provider.getBlock('latest')

      let bondInfo = bondInfoEther_5days;
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
          bondInfo.market.initialCapacity,
          bondInfo.market.initialMaxPayout,
          bondInfo.market.capacityUpdatePeriod,
          bondInfo.market.availableBasicBond,
          bondInfo.market.availableLockupBond
        )
      ).to.be.revertedWith("Accessible: Caller is not an policy admin")

      const block = await ethers.provider.getBlock('latest')
      let finishTime = block.timestamp + sellingTime  //2주
      firstMarketlength = await stakingProxylogic.marketIdCounter();

      // bondInfoEther.market.closeTime = finishTime;

      await bondDepositoryProxylogic.connect(admin1).create(
          bondInfoEther.token,
          [
            bondInfoEther.market.capAmountOfTos,
            bondInfoEther.market.closeTime,
            bondInfoEther.market.priceTosPerToken,
            bondInfoEther.market.purchasableTOSAmountAtOneTime
          ],

      )

      firstMarketlength = firstMarketlength.add(ethers.constants.One);
      expect(await stakingProxylogic.marketIdCounter()).to.be.equal(firstMarketlength);
  })

  })

  /*

  describe("#1. bondDepository function test", async () => {

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
        let finishTime = block.timestamp + (epochLength * 3); //10주

        bondInfoEther.market.closeTime = finishTime;

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


    it("#3-1-3. ETHDeposit : overDeposit situation, fail", async () => {

        let purchasableAssetAmountAtOneTime
            = bondInfoEther.market.purchasableTOSAmountAtOneTime
              .mul(ethers.utils.parseEther("1"))
              .div(bondInfoEther.market.priceTosPerToken);

        let amount = purchasableAssetAmountAtOneTime.add(ethers.utils.parseEther("1"));

        await expect(
          bondDepositoryProxylogic.connect(user1).ETHDeposit(
            bondInfoEther.marketId,
            amount,
            {value: amount}
          )
        ).to.be.revertedWith("Depository : over maxPay");

    })

    it("#3-1-4. setMR : fail, if checkTosSolvencyAfterTOSMint is false.", async () => {

      let _mr = ethers.BigNumber.from("1000");

      let checkTosSolvencyAfterTOSMint = await treasuryProxylogic.checkTosSolvencyAfterTOSMint(
        _mr, ethers.utils.parseEther("0")
      );
      expect(checkTosSolvencyAfterTOSMint).to.be.eq(false);

      await expect(
        treasuryProxylogic.connect(admin1).setMR( _mr, ethers.utils.parseEther("0"), false)
      ).to.be.revertedWith("unavailable mintRate");

    })

    // it("#3-1-4. ETHDeposit : fail, The minting amount cannot be less than the staking amount (TOS evaluation amount).", async () => {

    //     let _mr = ethers.BigNumber.from("242426000000000000000000");

    //     await treasuryProxylogic.connect(admin1).setMR( _mr, ethers.utils.parseEther("0"))

    //     let amount = ethers.utils.parseEther("0.0001");

    //     await expect(
    //       bondDepositoryProxylogic.connect(user1).ETHDeposit(
    //         bondInfoEther.marketId,
    //         amount,
    //         {value: amount}
    //       )
    //     ).to.be.reverted;

    //     await  treasuryProxylogic.connect(admin1).setMR(mintRate, ethers.utils.parseEther("0"));
    // })

    it("#3-1-5. ETHDeposit  ", async () => {

      let depositor = user1;
      let depositorUser = "user1";

      let foundationTotalPercentage = await treasuryProxylogic.foundationTotalPercentage();
      let foundationAmountPrev = await treasuryProxylogic.foundationAmount();

      let balanceEtherPrevTreasury = await ethers.provider.getBalance(treasuryProxylogic.address);
      let balanceEtherPrevDepositor = await ethers.provider.getBalance(depositor.address);

      let balanceTOSPrevStaker = await tosContract.balanceOf(treasuryProxylogic.address);

      let block = await ethers.provider.getBlock();

      let purchasableAssetAmountAtOneTime = bondInfoEther.market.purchasableTOSAmountAtOneTime
        .mul(ethers.utils.parseEther("1"))
        .div(bondInfoEther.market.priceTosPerToken);


      let purchasableAssetAmountAtOneTime_
        = await bondDepositoryProxylogic.purchasableAssetAmountAtOneTime(
          bondInfoEther.market.priceTosPerToken,
          bondInfoEther.market.purchasableTOSAmountAtOneTime
          );

      let amount = purchasableAssetAmountAtOneTime ;

      let tx = await bondDepositoryProxylogic.connect(depositor).ETHDeposit(
          bondInfoEther.marketId,
          amount,
          {value: amount}
        );

      const receipt = await tx.wait();

      let tosValuation = 0;
      let mintAmount = 0;
      let interface = bondDepositoryProxylogic.interface;
      for (let i = 0; i < receipt.events.length; i++){
          if(receipt.events[i].topics[0] == interface.getEventTopic(eventETHDeposited)){
              let data = receipt.events[i].data;
              let topics = receipt.events[i].topics;
              let log = interface.parseLog({data, topics});
              // console.log('log.args',log.args)
              tosValuation = log.args.tosValuation;

              // console.log('tosValuation', tosValuation);
              bondInfoEther.tosValuationSimple = tosValuation;

              deposits[depositorUser+""].push(
                {
                  marketId: log.args.marketId,
                  stakeId: log.args.stakeId,
                  lockId: ethers.constants.Zero
                }
              );

              expect(amount).to.be.eq(log.args.amount);
              // console.log('amount', amount);
          }
          if(receipt.events[i].topics[0] == interface.getEventTopic(eventDeposited)){
            let data = receipt.events[i].data;
            let topics = receipt.events[i].topics;
            let log = interface.parseLog({data, topics});

            mintAmount = log.args.mintAmount;
            expect(mintAmount).to.be.gt(ethers.constants.Zero);
            expect(mintAmount).to.be.gt(tosValuation);
          }
      }

      let depositData = getUserLastData(depositorUser);

      expect(depositData.marketId).to.be.eq(bondInfoEther.marketId);

      expect(
        await ethers.provider.getBalance(depositor.address)
      ).to.be.lte(balanceEtherPrevDepositor.sub(amount));

      expect(
        await ethers.provider.getBalance(treasuryProxylogic.address)
      ).to.be.eq(balanceEtherPrevTreasury.add(amount));

      expect(
        await tosContract.balanceOf(treasuryProxylogic.address)
      ).to.be.gte(balanceTOSPrevStaker.add(tosValuation));

      let basicBondPeriod = await stakingProxylogic.basicBondPeriod();

      let ltosAmount =  await stakingProxylogic.getTosToLtos(tosValuation);
      // console.log('ltosAmount', ltosAmount);
      let stakeInfo = await stakingProxylogic.stakeInfo(depositData.stakeId);
      // console.log('stakeInfo', stakeInfo);
        // console.log('basicBondPeriod.add(block.timestamp)',basicBondPeriod.add(block.timestamp));

      expect(stakeInfo.endTime).to.be.gt(basicBondPeriod.add(block.timestamp));
      expect(stakeInfo.endTime).to.be.lt(basicBondPeriod.add(block.timestamp+13));

      expect(stakeInfo.staker).to.be.eq(depositor.address);
      expect(stakeInfo.deposit).to.be.eq(tosValuation);


      expect(stakeInfo.marketId).to.be.eq(depositData.marketId);
      expect(stakeInfo.ltos).to.be.eq(ltosAmount);

      // let stakeIdList = await stakingProxylogic.stakingOf(depositor.address);
      // console.log('stakeIdList',stakeIdList);

      let foundationAmountAfter = await treasuryProxylogic.foundationAmount();
      let addFoundationAmount = mintAmount.sub(tosValuation);

      if (foundationTotalPercentage.gt(ethers.constants.Zero)) {
        let addAmountToFoundation = addFoundationAmount.mul(foundationTotalPercentage).div(ethers.BigNumber.from("10000"));
        // let addAmountToFoundation = mintAmount.mul(foundationTotalPercentage).div(ethers.BigNumber.from("10000"));
        expect(foundationAmountAfter).to.be.eq(foundationAmountPrev.add(addAmountToFoundation));

      } else {
        expect(foundationAmountAfter).to.be.eq(foundationAmountPrev);
      }

    })

    it("      pass blocks", async function () {
      ethers.provider.send("evm_increaseTime", [(60*60)])
      ethers.provider.send("evm_mine")
    });

    it("#3-2-3-11. increaseBeforeEndOrNonEnd: if the 5-day bonding lock-up, the amount cannot be increased.  ", async () => {
      let depositor = user1;
      let depositorUser = "user1";
      let depositData = getUserLastData(depositorUser);
      let amount = ethers.utils.parseEther("100");
      let periodWeeks = ethers.constants.One;
      await expect(
        stakingProxylogic.connect(depositor)["increaseBeforeEndOrNonEnd(uint256,uint256)"](depositData.stakeId, amount))
      .to.be.revertedWith("basicBond");
    });

    it("#3-2-3-11. increaseBeforeEndOrNonEnd: if the 5-day bonding lock-up, the period and amount cannot be increased.  ", async () => {
      let depositor = user1;
      let depositorUser = "user1";
      let depositData = getUserLastData(depositorUser);
      let amount = ethers.utils.parseEther("100");
      let periodWeeks = ethers.constants.One;
      await expect(
        stakingProxylogic.connect(depositor)["increaseBeforeEndOrNonEnd(uint256,uint256,uint256)"](depositData.stakeId, amount, periodWeeks))
      .to.be.revertedWith("basicBond");
    });

    it("#3-1-12. ETHDepositWithSTOS:  the lock-up period must be greater than 1 week.  ", async () => {

      let depositor = user1;

      let purchasableAssetAmountAtOneTime = bondInfoEther.market.purchasableTOSAmountAtOneTime
        .mul(ethers.utils.parseEther("1"))
        .div(bondInfoEther.market.priceTosPerToken);

      let amount = purchasableAssetAmountAtOneTime ;
      let lockPeriod = ethers.constants.One;

      await expect(
        bondDepositoryProxylogic.connect(depositor).ETHDepositWithSTOS(
          bondInfoEther.marketId,
          amount,
          lockPeriod,
          {value: amount}
        )
      ).to.be.revertedWith("_lockWeeks must be greater than 1 week.");

    })

    it("      pass blocks", async function () {
      await indexEpochPass(stakingProxylogic, 0);
    });

    it("#3-1-6. rebaseIndex   ", async () => {
        let depositor = user1;
        // let depositorUser = "user1";

        // let depositData = getUserLastData(depositorUser);
        let block = await ethers.provider.getBlock();
        let runwayTos = await stakingProxylogic.runwayTos();
        // expect(runwayTos).to.be.gt(ethers.constants.Zero);

        // let remainedLTOSBefore = await stakingProxylogic.remainedLtos(depositData.stakeId);
        // let remainedLTOSToTosBefore = await stakingProxylogic.getLtosToTos(remainedLTOSBefore);
        let totalLtos = await stakingProxylogic.totalLtos();
        let indexBefore = await stakingProxylogic.getIndex();
        let epochBefore = await stakingProxylogic.epoch();
        // console.log('indexBefore', indexBefore)

        let rebasePerEpoch = await stakingProxylogic.rebasePerEpoch();

        let possibleIndex = await stakingProxylogic.possibleIndex();
        let idealNumberRebases = Math.floor((block.timestamp - epochBefore.end)/epochBefore.length_)+1;
        let idealIndex= await libStaking.compound(indexBefore, rebasePerEpoch, idealNumberRebases);
        let needTos = totalLtos.mul(idealIndex.sub(indexBefore)).div(ethers.constants.WeiPerEther);

        // expect(possibleIndex).to.be.eq(idealIndex);

        await stakingProxylogic.connect(depositor).rebaseIndex();

        let indexAfter = await stakingProxylogic.getIndex();

        console.log('updated index', indexAfter)
        expect(indexAfter).to.be.eql(possibleIndex);

        if (needTos.lte(runwayTos)) {

          expect(indexAfter).to.be.gt(indexBefore);
          let epochAfter = await stakingProxylogic.epoch();
          expect(epochAfter.end).to.be.gte(epochBefore.end.add(epochBefore.length_));

      } else {
          console.log('updated index as much as the treasury can')
          expect(indexAfter).to.be.eq(possibleIndex);
          let epochAfter = await stakingProxylogic.epoch();
          expect(epochAfter.end).to.be.gte(epochBefore.end.add(epochBefore.length_));

      }

    });

    it("      pass blocks", async function () {
      await indexEpochPass(stakingProxylogic, 0);
    });

    it("#3-1-7. ETHDepositWithSTOS : deposit ETH with locking, get sTOS", async () => {

        let depositor = user1;
        let depositorUser = "user1";

        let foundationTotalPercentage = await treasuryProxylogic.foundationTotalPercentage();
        let foundationAmountPrev = await treasuryProxylogic.foundationAmount();

        let balanceEtherPrevTreasury = await ethers.provider.getBalance(treasuryProxylogic.address);
        let balanceEtherPrevDepositor = await ethers.provider.getBalance(depositor.address);
        let balanceTOSPrevStaker = await tosContract.balanceOf(treasuryProxylogic.address);

        let balanceSTOSPrevDepositor = await lockTosContract.balanceOf(depositor.address);
        //balanceOfLock(uint256 _lockId)
        let purchasableAssetAmountAtOneTime = bondInfoEther.market.purchasableTOSAmountAtOneTime
        .mul(ethers.utils.parseEther("1"))
        .div(bondInfoEther.market.priceTosPerToken);

        let indexBefore = await stakingProxylogic.getIndex();
        let epochBefore = await stakingProxylogic.epoch();

        let amount = purchasableAssetAmountAtOneTime;
        let lockPeriod = ethers.constants.Two;
        // console.log('purchasableAssetAmountAtOneTime',purchasableAssetAmountAtOneTime) ;

        let tx = await bondDepositoryProxylogic.connect(depositor).ETHDepositWithSTOS(
            bondInfoEther.marketId,
            amount,
            lockPeriod,
            {value: amount}
        );

        const receipt = await tx.wait();

        let tosValuation = 0;
        let mintAmount = 0;
        let stosId = 0;
        let stosPrincipal = 0;
        let interface = bondDepositoryProxylogic.interface;
        let interfaceStaking = stakingProxylogic.interface;

        for (let i = 0; i < receipt.events.length; i++){
            if(receipt.events[i].topics[0] == interface.getEventTopic(eventETHDepositWithSTOS)){
                let data = receipt.events[i].data;
                let topics = receipt.events[i].topics;
                let log = interface.parseLog({data, topics});
                // console.log('ETHDepositWithSTOS log.args',log.args)

                tosValuation = log.args.tosValuation;

                bondInfoEther.tosValuationLock = tosValuation;

                stosId = await stakingProxylogic.connectId(log.args.stakeId);

                deposits[depositorUser+""].push(
                  {
                    marketId: log.args.marketId,
                    stakeId: log.args.stakeId,
                    lockId: stosId
                  }
                );

                expect(amount).to.be.eq(log.args.amount);
                expect(lockPeriod).to.be.eq(log.args.lockWeeks);
                expect(stosId).to.be.gt(ethers.constants.Zero);
            }

            if(receipt.events[i].topics[0] == interface.getEventTopic(eventDeposited)){
              let data = receipt.events[i].data;
              let topics = receipt.events[i].topics;
              let log = interface.parseLog({data, topics});
              // console.log('Deposited log.args',log.args)
              mintAmount = log.args.mintAmount;
              expect(mintAmount).to.be.gt(ethers.constants.Zero);
              expect(mintAmount).to.be.gt(tosValuation);
            }

            if(receipt.events[i].topics[0] == interfaceStaking.getEventTopic(eventStakedGetStosByBond)){
              let data = receipt.events[i].data;
              let topics = receipt.events[i].topics;
              let log = interfaceStaking.parseLog({data, topics});
              // console.log('StakedGetStosByBond log.args',log.args)
              stosPrincipal = log.args.stosPrincipal;

              // console.log('stosPrincipal',stosPrincipal)

              expect(stosPrincipal).to.be.gt(ethers.constants.Zero);
              expect(stosPrincipal).to.be.gt(tosValuation);
            }
        }

        let depositList = deposits[depositorUser+""];
        let depositData = depositList[depositList.length-1];
        // let depositData = getUserLastData(depositorUser);

        expect(depositData.marketId).to.be.eq(bondInfoEther.marketId);

        expect(
          await ethers.provider.getBalance(depositor.address)
        ).to.be.lte(balanceEtherPrevDepositor.sub(amount));

        expect(
          await ethers.provider.getBalance(treasuryProxylogic.address)
        ).to.be.eq(balanceEtherPrevTreasury.add(amount));

        expect(
          await tosContract.balanceOf(treasuryProxylogic.address)
        ).to.be.gte(balanceTOSPrevStaker.add(tosValuation));

        let ltosAmount =  await stakingProxylogic.getTosToLtos(tosValuation);

        let stakeInfo = await stakingProxylogic.stakeInfo(depositData.stakeId);

        expect(stakeInfo.staker).to.be.eq(depositor.address);
        expect(stakeInfo.deposit).to.be.eq(tosValuation);
        expect(stakeInfo.marketId).to.be.eq(depositData.marketId);
        expect(stakeInfo.ltos).to.be.eq(ltosAmount);

        let epochAfter = await stakingProxylogic.epoch();
        expect(epochAfter.end).to.be.gte(epochBefore.end.add(epochBefore.length_));

        expect(await stakingProxylogic.getIndex()).to.be.gt(indexBefore);

        let balanceSTOSAfterDepositor = await lockTosContract.balanceOf(depositor.address);

        let lockTosId = await stakingProxylogic.connectId(depositData.stakeId);
        let addSTOSAmount = await lockTosContract.balanceOfLock(lockTosId);
        // console.log('depositData.stakeId',depositData.stakeId)
        // console.log('lockTosId',lockTosId)

        let rebasePerEpoch = await stakingProxylogic.rebasePerEpoch();

        let currentTime1 = await lockTosContract.getCurrentTime();
        currentTime1 = currentTime1.add(ethers.BigNumber.from("12"));

        let stosEpochInfo = await stakingProxylogic.getUnlockTime(lockTosContract.address, currentTime1, lockPeriod)
        let stosEpochUnit = stosEpochInfo[0];
        let unlockTime = stosEpochInfo[1];
        let n = unlockTime.sub(currentTime1).div(epochAfter.length_);

        let bnAmountCompound = await calculateCompound({tosValuation, rebasePerEpoch, n});

        // console.log('bnAmountCompound',bnAmountCompound, bnAmountCompound.toString())
        let amountCompound = ethers.BigNumber.from(bnAmountCompound.toString());
        // console.log('amountCompound',amountCompound.toString())
        // console.log('tosValuation',tosValuation.toString())

        let gweiStosPrincipal = Math.floor(parseFloat(ethers.utils.formatUnits(stosPrincipal, "gwei")));
        let gweiAmountCompound = Math.floor(parseFloat(ethers.utils.formatUnits(amountCompound, "gwei")));

        // console.log('stosPrincipal gwei',gweiStosPrincipal)
        // console.log('amountCompound gwei',gweiAmountCompound)

        // 자바스크립트 계산과 솔리디티 계산에 약간 오차가 있습니다. 오차없는 정보를 얻으려면 컨트랙에서 조회하는것이 나을것 같습니다.
        expect(gweiStosPrincipal).to.be.eq(gweiAmountCompound);

        // let amountCalculatedStos = amountCompound.div(ethers.BigNumber.from("156"));
        // console.log('amountCalculatedStos',amountCalculatedStos)

        const currentTime = await lockTosContract.getCurrentTime();
        // console.log('currentTime',currentTime)

        const estimate = await calculateBalanceOfLock({
          lockId: stosId,
          lockTOS: lockTosContract,
          timestamp: currentTime,
        });

        const balance = parseInt(await lockTosContract.balanceOfLock(stosId));

        // console.log('depositData.stakeId',depositData.stakeId)
        // console.log('lockTosId',lockTosId)
        // console.log('stosId',stosId)
        // console.log('estimate',estimate)
        // console.log('balance',balance)
        // console.log('addSTOSAmount',addSTOSAmount)

        expect(lockTosId).to.be.eq(stosId);

        // 자바스크립트 계산과 솔리디티 계산에 약간 오차가 있습니다. 오차없는 정보를 얻으려면 컨트랙에서 조회하는것이 나을것 같습니다.
        // 기준이 되는 주수는 해당 목요일 0시 기준이므로, 2주를 설정하였다고 하더라도, 실제 2주의 이자를 모두 가져가지 못할 수 있습니다.
        // LockTOS에서 계산되는 방법으로 화면에 보여주어야 합니다.
        expect(Math.floor(balance/1000000)).to.be.eq(Math.floor(estimate/1000000));

        // 자바스크립트 계산과 솔리디티 계산에 약간 오차가 있습니다. 오차없는 정보를 얻으려면 컨트랙에서 조회하는것이 나을것 같습니다.
        let gweiStosBalance = Math.floor(parseFloat(ethers.utils.formatUnits(balance+"", "gwei")));
        let gweiAddSTOSAmount = Math.floor(parseFloat(ethers.utils.formatUnits(addSTOSAmount.toString(), "gwei")));
        expect(gweiStosBalance).to.be.eq(gweiAddSTOSAmount);

        expect(balanceSTOSAfterDepositor).to.be.gt(balanceSTOSPrevDepositor);
        expect(balanceSTOSAfterDepositor).to.be.eq(balanceSTOSPrevDepositor.add(addSTOSAmount));

        // let stakeIdList = await stakingProxylogic.stakingOf(depositor.address);
        // console.log('stakeIdList',stakeIdList);
        let foundationAmountAfter = await treasuryProxylogic.foundationAmount();

        let addFoundationAmount = mintAmount.sub(tosValuation);

        if (foundationTotalPercentage.gt(ethers.constants.Zero)) {
          // let addAmountToFoundation = mintAmount.mul(foundationTotalPercentage).div(ethers.BigNumber.from("10000"));
          let addAmountToFoundation = addFoundationAmount.mul(foundationTotalPercentage).div(ethers.BigNumber.from("10000"));
          expect(foundationAmountAfter).to.be.eq(foundationAmountPrev.add(addAmountToFoundation));

        } else {
          expect(foundationAmountAfter).to.be.eq(foundationAmountPrev);
        }

        // LTOS의 end 와 lockId의 end 가 같은지 확인
        const lockIdInfo = await lockTosContract.locksInfo(lockTosId);
        // let lockEnd = lockIdInfo[1];
        const stakeIdInfo = await stakingProxylogic.stakeInfo(depositData.stakeId);
        // let stakeEnd = stakeIdInfo[3];
        expect(lockIdInfo[1]).to.be.eq(stakeIdInfo[3]);
    });

    it("#3-1-8. close :  user can't close the bond market.", async () => {

      await expect(
        bondDepositoryProxylogic.connect(user1).close(
          bondInfoEther.marketId
        )
      ).to.be.revertedWith("Accessible: Caller is not an policy admin");
    })

    it("#3-1-9. close : admin can clsoe the bond market.", async () => {
      expect(await bondDepositoryProxylogic.isOpened(bondInfoEther.marketId)).to.be.eq(true);

      await bondDepositoryProxylogic.connect(admin1).close(
        bondInfoEther.marketId
      )
      expect(await bondDepositoryProxylogic.isOpened(bondInfoEther.marketId)).to.be.eq(false);

    })

    it("#3-1-10. increaseCapacitychangeCloseTime : admin can change the close time of bond market. ", async () => {

      let block = await ethers.provider.getBlock();

      await bondDepositoryProxylogic.connect(admin1).changeCloseTime(
          bondInfoEther.marketId,
          block.timestamp + (60 * 60 * 24 * 7)
      );
    })


    it("#3-1-11. changeCapacity : admin can change the capacity of bond market. ", async () => {

      // capAmountOfTos: ethers.BigNumber.from("30400000000000000000000")

      let newCapacity = ethers.BigNumber.from("40400000000000000000000");
      await bondDepositoryProxylogic.connect(admin1).changeCapacity(
          bondInfoEther.marketId,
          newCapacity
      );

      let _market = await bondDepositoryProxylogic.viewMarket(bondInfoEther.marketId);
      expect(_market[1]).to.be.eq(newCapacity);

    })

    // it("#3-1-11. increaseCapacity : admin can increase the capacity of bond market. ", async () => {

    //   await bondDepositoryProxylogic.connect(admin1).increaseCapacity(
    //       bondInfoEther.marketId,
    //       ethers.utils.parseEther("100")
    //   );
    // })

    // it("#3-1-12. foundationDistribute :  user can't call foundationDistribute ", async () => {

    //   await expect(
    //     treasuryProxylogic.connect(user1).foundationDistribute()
    //   ).to.be.revertedWith("Accessible: Caller is not an policy admin");
    // })

    it("#3-1-13. foundationDistribute :  policy admin can call foundationDistribute ", async () => {

      for (let i=0; i < foundations.address.length; i++){
        foundations.balances[i] = await tosContract.balanceOf(foundations.address[i]);
      }

      let balanceOfPrev = await tosContract.balanceOf(treasuryProxylogic.address);
      let foundationAmount = await treasuryProxylogic.foundationAmount()
      let foundationTotalPercentage = await treasuryProxylogic.foundationTotalPercentage()

      expect(await treasuryProxy.isPolicy(admin1.address)).to.be.equal(true)

      await treasuryProxylogic.connect(admin1).foundationDistribute();

      let totalDistributedAmount = ethers.constants.Zero;
      for (let i = 0; i < foundations.address.length; i++){
        let distributedAmount = foundationAmount.mul(foundations.percentages[i]).div(foundationTotalPercentage);
        totalDistributedAmount = totalDistributedAmount.add(distributedAmount);

        expect(await tosContract.balanceOf(foundations.address[i])).to.be.equal(
          foundations.balances[i].add(distributedAmount)
        )
      }

      let foundationAmountAfter = await treasuryProxylogic.foundationAmount()

      expect(await tosContract.balanceOf(treasuryProxylogic.address)).to.be.equal(balanceOfPrev.sub(totalDistributedAmount))
      expect(foundationAmountAfter).to.be.equal(foundationAmount.sub(totalDistributedAmount))

    })

  });
  */
});
