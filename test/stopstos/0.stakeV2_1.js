const chai = require("chai");
const { solidity } = require("ethereum-waffle");
const { expect, assert } = chai;

const JSBI = require('jsbi');

//chai.use(require("chai-bn")(BN));
chai.use(solidity);
require("chai").should();
const univ3prices = require('@thanpolas/univ3prices');
const utils = require("../utils");

const {
  calculateBalanceOfLock,
  calculateBalanceOfUser,
  createLockWithPermit,
  calculateCompound,
} = require("../helpers/lock-tos-helper");

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
} = require("../uniswap-v3/uniswap-v3-contracts");

let NonfungiblePositionManager = require('../../abis/NonfungiblePositionManager.json');
let UniswapV3Pool = require('../../abis/UniswapV3Pool.json');
let UniswapV3LiquidityChanger = require('../../abis/UniswapV3LiquidityChanger.json');
let tosabi = require('../../abis/TOS.json');
let lockTOSProxyabi = require('../../abis/LockTOSProxy.json').abi;
let lockTOSProxy2abi = require('../../abis/LockTOSv2Proxy.json');
let lockTOSLogic2abi = require('../../abis/LockTOSv2Logic0.json');
const { id } = require("@ethersproject/hash");

let treasuryLogicAbi = require('../../artifacts/contracts/Treasury.sol/Treasury.json');
let bondDepositoryLogicAbi = require('../../artifacts/contracts/BondDepository.sol/BondDepository.json');
let stakingV2LogicAbi = require('../../artifacts/contracts/StakingV2.sol/StakingV2.json');

let UniswapV3LiquidityChangerAddress = "0xa839a0e64b27a34ed293d3d81e1f2f8b463c3514";
let totalTosSupplyTarget = ethers.utils.parseEther("1000000");


let eventCreatedMarket ="CreatedMarket(uint256,address,uint256[4])";
let eventETHDeposited ="ETHDeposited(address,uint256,uint256,uint256,uint256)";
let eventETHDepositWithSTOS ="ETHDepositedWithSTOS(address,uint256,uint256,uint256,uint256,uint256)";
let eventDeposited ="Deposited(address,uint256,uint256,uint256,bool,uint256)";

let eventStakedGetStosByBond ="StakedGetStosByBond(address,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)";

let eventStaked ="Staked(address,uint256,uint256)";
let eventStakedGetStos ="StakedGetStos(address,uint256,uint256,uint256,uint256,uint256)";
let eventIncreasedAmountForSimpleStake ="IncreasedAmountForSimpleStake(address,uint256,uint256)";
let eventResetStakedGetStosAfterLock ="ResetStakedGetStosAfterLock(address,uint256,uint256,uint256,uint256,uint256,uint256)";
let eventIncreasedBeforeEndOrNonEnd ="IncreasedBeforeEndOrNonEnd(address,uint256,uint256,uint256,uint256,uint256)";

// address infos .
let tosAdmin = "0x12a936026f072d4e97047696a9d11f97eae47d21";
let lockTosAdmin = "0x15280a52E79FD4aB35F4B9Acbb376DCD72b44Fd1";
let bondAdmin = "0x15280a52E79FD4aB35F4B9Acbb376DCD72b44Fd1";
let treasuryAdmin = "0x15280a52E79FD4aB35F4B9Acbb376DCD72b44Fd1";
let testerAddress = "0x0c4a118Cd6aAffA1dC3e18A86D1f3c1218a3451d";
let tester ;

describe("TOSv2 Phase1", function () {
  //시나리오 : https://www.notion.so/onther/BondDepository-StakingV2-scenario-Suah-497853d6e65f48a390255f3bca29fa36

  let deployed

  let libTreasury, libStaking;

  let tosContract;
  let lockTosContract;

  let _tosAdmin;

  // mainnet
  let firstEpochNumber = 0;
  let firstEndEpochTime
  let epochLength = 28800; //  8시간
  let mintRate = ethers.BigNumber.from("11261000000000000000000");
  let constRebasePerEpoch = ethers.BigNumber.from("87045050000000")
  let basicBondPeriod = 60*60*24*5 ;  // 본드를 사고, 락업없을때, 기본 락업기간 5일
  let sendAmountEthToTreasury = ethers.utils.parseEther("2000"); //초기에 트래저리에 넣는 이더 량

  let sellingTime = 604800 * 20;

  let unstakingAmount = ethers.utils.parseUnits("500", 18);


  // mainnet
  let wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  let testAddress = ""
  let lockTOSProxyAddress = "0x69b4A202Fa4039B42ab23ADB725aA7b1e9EEBD79"
  let lockTOSProxy2Address = ""
  let lockTOSLogic2Address = ""
  let etherUint = ethers.utils.parseUnits("1", 18);
  // let wtonUint = ethers.utils.parseUnits("1", 27);



  // main-net
  let uniswapInfo={
    poolfactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    npm: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    swapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    wethUsdcPool: "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8",
    tosethPool: "0x2ad99c938471770da0cd60e08eaf29ebff67a92a",
    wtonWethPool: "0xc29271e3a68a7647fd1399298ef18feca3879f59",
    wtonTosPool: "0x1c0ce9aaa0c12f53df3b4d8d77b82d6ad343b4e4",
    tosDOCPool: "0x369bca127b8858108536b71528ab3befa1deb6fc",
    wton: "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2",
    tos: "0x409c4D8cd5d2924b9bc5509230d16a61289c8153",
    weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    doc: "0x0e498afce58de8651b983f136256fa3b8d9703bc",
    _fee: ethers.BigNumber.from("3000"),
    NonfungibleTokenPositionDescriptor: "0x91ae842A5Ffd8d12023116943e72A606179294f3"
  }

  // mainnet
  let TOSV2Addresses = {
    StakingV2: "0x081fB1858664B160f24234916b732376b92A1c6C",
    StakingV2Proxy: "0x14fb0933Ec45ecE75A431D10AFAa1DDF7BfeE44C",
    BondDepository: "0xe3ECA73384Bcfcc16ECd7894C5cA5b6DD64Ce39F",
    BondDepositoryProxy: "0xbf715e63d767D8378102cdD3FFE3Ce2BF1E02c91",
    Treasury: "0x0bA799B755017a5E148A4De63DD65e816B15BC9E",
    TreasuryProxy: "0xD27A68a457005f822863199Af0F817f672588ad6",
    LibStaking: "0xC17c09a48793Bff31e7F8CC465DF6451CC9d9fB0"
  }

  //[팔려고 하는 tos의 목표치, 판매 끝나는 시간, 받는 token의 가격, tos token의 가격, 한번에 구매 가능한 TOS물량]
  // 이더상품.
  let bondInfoEther = {
    marketId : null,
    check: true,
    token: ethers.constants.AddressZero,
    poolAddress: uniswapInfo.tosethPool,
    fee: 0,
    market: {
      capAmountOfTos: ethers.BigNumber.from("30400000000000000000000"),
      closeTime: 1669852800,
      // priceTokenPerTos: ethers.BigNumber.from("4121790000000"),
      priceTosPerToken: ethers.BigNumber.from("3015716000000000000000"),
      purchasableTOSAmountAtOneTime: ethers.BigNumber.from("822468000000000000000")
    },
    tosValuationSimple: 0,
    tosValuationLock: 0
  }

  let bondInfoWTON = {
    marketId : null,
    check: true,
    token: ethers.constants.AddressZero,
    poolAddress: uniswapInfo.tosethPool,
    fee: 0,
    market: {
      capAmountOfTos: ethers.utils.parseEther("1000"),
      closeTime: 0,
      priceTokenPerTos: ethers.BigNumber.from("4124960000000"),
      priceTosPerToken: ethers.BigNumber.from("242427000000000000000000"),
      purchasableTOSAmountAtOneTime: ethers.utils.parseEther("100")
    }
  }

  let bondInfoLP = {
    marketId : null,
    check: true,
    token: ethers.constants.AddressZero,
    poolAddress: uniswapInfo.tosethPool,
    fee: 0,
    market: {
      capAmountOfTos: ethers.utils.parseEther("1000"),
      closeTime: 0,
      priceTosPerToken: ethers.BigNumber.from("242427000000000000000000"),
      purchasableTOSAmountAtOneTime: ethers.utils.parseEther("100")
    }
  }

  let deposits = {user1 : [], user2: [], tester: []};
  let depositor, depositorUser, index, depositData;

  let foundations = {
    address: [
      "0x15280a52E79FD4aB35F4B9Acbb376DCD72b44Fd1",
      "0xBedE575486e1F103fbe258a00D046F09e837fA17",
      "0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303"
    ],

    percentages: [
      ethers.BigNumber.from("1500"),
      ethers.BigNumber.from("500"),
      ethers.BigNumber.from("100"),
    ],

    balances : [
      ethers.BigNumber.from("0"),
      ethers.BigNumber.from("0")
    ]
  }

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

    // console.log('depositList', depositList)

    if( index < depositList.length) return depositList[index];
    else return null;
  }

  async function setDeployedContracts(account) {
    let deployed = {
      BondDepository: null,
      StakingV2: null,
      StakingV2_1: null,
      StakingV2Proxy: null,
      Treasury: null,
      TreasuryProxy: null
    }

    deployed.BondDepository = await ethers.getContractAt("BondDepository", TOSV2Addresses.BondDepositoryProxy, account)
    deployed.StakingV2 = await ethers.getContractAt("StakingV2", TOSV2Addresses.StakingV2Proxy, account)
    deployed.StakingV2Proxy = await ethers.getContractAt("StakingV2Proxy", TOSV2Addresses.StakingV2Proxy, account)
    deployed.Treasury = await ethers.getContractAt("Treasury", TOSV2Addresses.TreasuryProxy, account)
    deployed.TreasuryProxy = await ethers.getContractAt("TreasuryProxy", TOSV2Addresses.TreasuryProxy, account)

    const StakingV2_1_dep = await ethers.getContractFactory("StakingV2_1", {
        libraries : {
          LibStaking: TOSV2Addresses.LibStaking
        }
      });
    deployed.StakingV2_1 = await StakingV2_1_dep.deploy();
    await deployed.StakingV2_1.deployed()

    return deployed;
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

    deployed = await setDeployedContracts(admin1)

    tosContract = await ethers.getContractAtFromArtifact(
      tosabi,
      uniswapInfo.tos,
      admin1
    );

    lockTosContract = await ethers.getContractAtFromArtifact(
      lockTOSLogic2abi,
      lockTOSProxyAddress,
      admin1
    );

    libStaking = await ethers.getContractAt("LibStaking", TOSV2Addresses.LibStaking, admin1);

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

    await hre.ethers.provider.send("hardhat_setBalance", [
      lockTosAdmin,
      "0x4EE2D6D415B85ACEF8100000000",
    ]);
    await hre.ethers.provider.send("hardhat_impersonateAccount",[lockTosAdmin]);

    _lockTosAdmin = await ethers.getSigner(lockTosAdmin);

    await hre.ethers.provider.send("hardhat_impersonateAccount",[tosAdmin]);
    _tosAdmin = await ethers.getSigner(tosAdmin);

    //====== tester
    await hre.ethers.provider.send("hardhat_setBalance", [
      testerAddress,
      "0x4EE2D6D415B85ACEF8100000000",
    ]);
    await hre.ethers.provider.send("hardhat_impersonateAccount",[testerAddress]);
    tester = await ethers.getSigner(testerAddress);

    await (await tosContract.connect(_tosAdmin).addMinter(tosAdmin)).wait()
    await (await tosContract.connect(_tosAdmin).mint(tosAdmin, ethers.utils.parseEther("10000"))).wait()
    // upgrade StakeV2

    console.log('deployed.StakingV2_1.address', deployed.StakingV2_1.address)

    await (await deployed.StakingV2Proxy.connect(_lockTosAdmin).upgradeTo(deployed.StakingV2_1.address)).wait()
    deployed.StakingV2 = await ethers.getContractAt("StakingV2_1", TOSV2Addresses.StakingV2Proxy, _lockTosAdmin)

  });

  describe("#3-1. bondDepository function test", async () => {

    it("#3-1-1. create : user don't create the ETH market", async () => {
      const block = await ethers.provider.getBlock('latest')
      let finishTime = block.timestamp + sellingTime  //2주

      bondInfoEther.market.closeTime = finishTime;

      await expect(
        deployed.BondDepository.connect(user1).create(
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

        let marketbefore = await deployed.StakingV2.marketIdCounter();

        let tx = await deployed.BondDepository.connect(_lockTosAdmin).create(
            bondInfoEther.token,
            [
              bondInfoEther.market.capAmountOfTos,
              bondInfoEther.market.closeTime,
              bondInfoEther.market.priceTosPerToken,
              bondInfoEther.market.purchasableTOSAmountAtOneTime
            ]
        )

        const receipt = await tx.wait();

        let interface = deployed.BondDepository.interface;
        for(let i=0; i< receipt.events.length; i++){

            if(receipt.events[i].topics[0] == interface.getEventTopic(eventCreatedMarket)){
                let data = receipt.events[i].data;
                let topics = receipt.events[i].topics;
                let log = interface.parseLog(
                {  data,  topics } );

                bondInfoEther.marketId = log.args.marketId;
            }
        }

        let marketIdCounter = await deployed.StakingV2.marketIdCounter();
        expect(marketIdCounter).to.be.eq(marketbefore.add(ethers.constants.One));
        expect(bondInfoEther.marketId).to.be.eq(marketIdCounter);

        let market = await deployed.BondDepository.viewMarket(bondInfoEther.marketId);

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
          deployed.BondDepository.connect(_lockTosAdmin).ETHDeposit(
            bondInfoEther.marketId,
            amount,
            {value: amount}
          )
        ).to.be.revertedWith("Depository : over maxPay");

    })

    it("#3-1-4. setMR : fail, if checkTosSolvencyAfterTOSMint is false.", async () => {

      let _mr = ethers.BigNumber.from("1000");

      let checkTosSolvencyAfterTOSMint = await deployed.Treasury.checkTosSolvencyAfterTOSMint(
        _mr, ethers.utils.parseEther("0")
      );
      expect(checkTosSolvencyAfterTOSMint).to.be.eq(false);

      await expect(
        deployed.Treasury.connect(_lockTosAdmin).setMR( _mr, ethers.utils.parseEther("0"), false)
      ).to.be.revertedWith("unavailable mintRate");

    })

    it("#3-1-5. ETHDeposit  ", async () => {

      let depositor = tester;
      let depositorUser = "tester";

      let foundationTotalPercentage = await deployed.Treasury.foundationTotalPercentage();
      let foundationAmountPrev = await deployed.Treasury.foundationAmount();

      let balanceEtherPrevTreasury = await ethers.provider.getBalance(deployed.Treasury.address);
      let balanceEtherPrevDepositor = await ethers.provider.getBalance(depositor.address);

      let balanceTOSPrevStaker = await tosContract.balanceOf(deployed.Treasury.address);

      let block = await ethers.provider.getBlock();

      let purchasableAssetAmountAtOneTime = bondInfoEther.market.purchasableTOSAmountAtOneTime
        .mul(ethers.utils.parseEther("1"))
        .div(bondInfoEther.market.priceTosPerToken);


      let purchasableAssetAmountAtOneTime_ = await deployed.BondDepository.purchasableAssetAmountAtOneTime(
          bondInfoEther.market.priceTosPerToken,
          bondInfoEther.market.purchasableTOSAmountAtOneTime
          );

      let amount = purchasableAssetAmountAtOneTime ;

      let tx = await deployed.BondDepository.connect(depositor).ETHDeposit(
          bondInfoEther.marketId,
          amount,
          {value: amount}
        );

      const receipt = await tx.wait();

      let tosValuation = 0;
      let mintAmount = 0;
      let interface = deployed.BondDepository.interface;
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
        await ethers.provider.getBalance(deployed.Treasury.address)
      ).to.be.eq(balanceEtherPrevTreasury.add(amount));

      expect(
        await tosContract.balanceOf(deployed.Treasury.address)
      ).to.be.gte(balanceTOSPrevStaker.add(tosValuation));

      let basicBondPeriod = await deployed.StakingV2.basicBondPeriod();

      let ltosAmount =  await deployed.StakingV2.getTosToLtos(tosValuation);
      // console.log('ltosAmount', ltosAmount);
      let stakeInfo = await deployed.StakingV2.stakeInfo(depositData.stakeId);
      // console.log('stakeInfo', stakeInfo);
        // console.log('basicBondPeriod.add(block.timestamp)',basicBondPeriod.add(block.timestamp));

      expect(stakeInfo.endTime).to.be.gt(basicBondPeriod.add(block.timestamp));
      expect(stakeInfo.endTime).to.be.lt(basicBondPeriod.add(block.timestamp+13));

      expect(stakeInfo.staker).to.be.eq(depositor.address);
      expect(stakeInfo.deposit).to.be.eq(tosValuation);


      expect(stakeInfo.marketId).to.be.eq(depositData.marketId);
      expect(stakeInfo.ltos).to.be.eq(ltosAmount);

      // let stakeIdList = await deployed.StakingV2.stakingOf(depositor.address);
      // console.log('stakeIdList',stakeIdList);

      let foundationAmountAfter = await deployed.Treasury.foundationAmount();
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

    it("#3-2-3-11. increaseBeforeEndOrNonEnd(uint256,uint256): if the 5-day bonding lock-up, the amount cannot be increased.  ", async () => {
      let depositor = tester;
      let depositorUser = "tester";
      let depositData = getUserLastData(depositorUser);
      let amount = ethers.utils.parseEther("100");
      let periodWeeks = ethers.constants.One;
      await expect(
        deployed.StakingV2.connect(depositor)["increaseBeforeEndOrNonEnd(uint256,uint256)"](depositData.stakeId, amount))
      .to.be.revertedWith("basicBond");
    });

    it("#3-2-3-11. increaseBeforeEndOrNonEnd(uint256,uint256,uint256): deprecated function", async () => {
      let depositor = tester;
      let depositorUser = "tester";
      let depositData = getUserLastData(depositorUser);
      let amount = ethers.utils.parseEther("100");
      let periodWeeks = ethers.constants.One;
      let errBool = false;
      try{
        deployed.StakingV2.connect(depositor)["increaseBeforeEndOrNonEnd(uint256,uint256,uint256)"](depositData.stakeId, amount, periodWeeks)
      } catch(e) {
        errBool = true
      }

      expect(errBool).to.be.eq(true)

    });

    it("#3-1-12. ETHDepositWithSTOS:  the lock-up period must be greater than 1 week.  ", async () => {

      let depositor = user1;

      let purchasableAssetAmountAtOneTime = bondInfoEther.market.purchasableTOSAmountAtOneTime
        .mul(ethers.utils.parseEther("1"))
        .div(bondInfoEther.market.priceTosPerToken);

      let amount = purchasableAssetAmountAtOneTime ;
      let lockPeriod = ethers.constants.One;

      await expect(
        deployed.BondDepository.connect(depositor).ETHDepositWithSTOS(
          bondInfoEther.marketId,
          amount,
          lockPeriod,
          {value: amount}
        )
      ).to.be.revertedWith("_lockWeeks must be greater than 1 week.");

    })

    it("      pass blocks", async function () {
      await indexEpochPass(deployed.StakingV2, 0);
    });

    it("#3-1-6. rebaseIndex   ", async () => {
        let depositor = tester;
        // let depositorUser = "tester";

        // let depositData = getUserLastData(depositorUser);
        let block = await ethers.provider.getBlock();
        let runwayTos = await deployed.StakingV2.runwayTos();
        // expect(runwayTos).to.be.gt(ethers.constants.Zero);

        // let remainedLTOSBefore = await deployed.StakingV2.remainedLtos(depositData.stakeId);
        // let remainedLTOSToTosBefore = await deployed.StakingV2.getLtosToTos(remainedLTOSBefore);
        let totalLtos = await deployed.StakingV2.totalLtos();
        let indexBefore = await deployed.StakingV2.getIndex();
        let epochBefore = await deployed.StakingV2.epoch();
        // console.log('indexBefore', indexBefore)

        let rebasePerEpoch = await deployed.StakingV2.rebasePerEpoch();

        let possibleIndex = await deployed.StakingV2.possibleIndex();
        let idealNumberRebases = Math.floor((block.timestamp - epochBefore.end)/epochBefore.length_)+1;
        let idealIndex= await libStaking.compound(indexBefore, rebasePerEpoch, idealNumberRebases);
        let needTos = totalLtos.mul(idealIndex.sub(indexBefore)).div(ethers.constants.WeiPerEther);

        // expect(possibleIndex).to.be.eq(idealIndex);

        await deployed.StakingV2.connect(depositor).rebaseIndex();

        let indexAfter = await deployed.StakingV2.getIndex();

        console.log('updated index', indexAfter)
        expect(indexAfter).to.be.eql(possibleIndex);

        if (needTos.lte(runwayTos)) {

          expect(indexAfter).to.be.gt(indexBefore);
          let epochAfter = await deployed.StakingV2.epoch();
          expect(epochAfter.end).to.be.gte(epochBefore.end.add(epochBefore.length_));

      } else {
          console.log('updated index as much as the treasury can')
          expect(indexAfter).to.be.eq(possibleIndex);
          let epochAfter = await deployed.StakingV2.epoch();
          expect(epochAfter.end).to.be.gte(epochBefore.end.add(epochBefore.length_));

      }

    });

    it("      pass blocks", async function () {
      await indexEpochPass(deployed.StakingV2, 0);
    });

    it("#3-1-7. ETHDepositWithSTOS : deposit ETH with locking, but you can\'t get sTOS ", async () => {

        let depositor = tester;
        let depositorUser = "tester";

        let foundationTotalPercentage = await deployed.Treasury.foundationTotalPercentage();
        let foundationAmountPrev = await deployed.Treasury.foundationAmount();

        let balanceEtherPrevTreasury = await ethers.provider.getBalance(deployed.Treasury.address);
        let balanceEtherPrevDepositor = await ethers.provider.getBalance(depositor.address);
        let balanceTOSPrevStaker = await tosContract.balanceOf(deployed.Treasury.address);

        let balanceSTOSPrevDepositor = await lockTosContract.balanceOf(depositor.address);
        //balanceOfLock(uint256 _lockId)
        let purchasableAssetAmountAtOneTime = bondInfoEther.market.purchasableTOSAmountAtOneTime
        .mul(ethers.utils.parseEther("1"))
        .div(bondInfoEther.market.priceTosPerToken);

        let indexBefore = await deployed.StakingV2.getIndex();
        let epochBefore = await deployed.StakingV2.epoch();

        let amount = purchasableAssetAmountAtOneTime;
        let lockPeriod = ethers.constants.Two;
        // console.log('purchasableAssetAmountAtOneTime',purchasableAssetAmountAtOneTime) ;

        let tx = await deployed.BondDepository.connect(depositor).ETHDepositWithSTOS(
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
        let interface =  deployed.BondDepository.interface;
        let interfaceStaking =  deployed.StakingV2.interface;

        for (let i = 0; i < receipt.events.length; i++){
            if(receipt.events[i].topics[0] == interface.getEventTopic(eventETHDepositWithSTOS)){
                let data = receipt.events[i].data;
                let topics = receipt.events[i].topics;
                let log = interface.parseLog({data, topics});
                // console.log('ETHDepositWithSTOS log.args',log.args)

                tosValuation = log.args.tosValuation;

                bondInfoEther.tosValuationLock = tosValuation;

                stosId = await deployed.StakingV2.connectId(log.args.stakeId);

                deposits[depositorUser+""].push(
                  {
                    marketId: log.args.marketId,
                    stakeId: log.args.stakeId,
                    lockId: stosId
                  }
                );

                expect(amount).to.be.eq(log.args.amount);
                expect(lockPeriod).to.be.eq(log.args.lockWeeks);

                // lockTos id 가 만들어지지 않음.
                expect(stosId).to.be.eq(ethers.constants.Zero);
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
              stosPrincipal = log.args.stosPrincipal;

              expect(stosPrincipal).to.be.eq(ethers.constants.Zero);
            }
        }

        let depositList = deposits[depositorUser+""];
        let depositData = depositList[depositList.length-1];

        expect(depositData.marketId).to.be.eq(bondInfoEther.marketId);

        expect(
          await ethers.provider.getBalance(depositor.address)
        ).to.be.lte(balanceEtherPrevDepositor.sub(amount));

        expect(
          await ethers.provider.getBalance(deployed.Treasury.address)
        ).to.be.eq(balanceEtherPrevTreasury.add(amount));

        expect(
          await tosContract.balanceOf(deployed.Treasury.address)
        ).to.be.gte(balanceTOSPrevStaker.add(tosValuation));

        let ltosAmount =  await deployed.StakingV2.getTosToLtos(tosValuation);

        let stakeInfo = await deployed.StakingV2.stakeInfo(depositData.stakeId);

        expect(stakeInfo.staker).to.be.eq(depositor.address);
        expect(stakeInfo.deposit).to.be.eq(tosValuation);
        expect(stakeInfo.marketId).to.be.eq(depositData.marketId);
        expect(stakeInfo.ltos).to.be.eq(ltosAmount);

        let balanceSTOSAfterDepositor = await lockTosContract.balanceOf(depositor.address);

        let lockTosId = await deployed.StakingV2.connectId(depositData.stakeId);
        expect(lockTosId).to.be.eq(ethers.constants.Zero)

        expect(balanceSTOSAfterDepositor).to.be.lt(balanceSTOSPrevDepositor);

        let foundationAmountAfter = await deployed.Treasury.foundationAmount();

        let addFoundationAmount = mintAmount.sub(tosValuation);

        if (foundationTotalPercentage.gt(ethers.constants.Zero)) {
          let addAmountToFoundation = addFoundationAmount.mul(foundationTotalPercentage).div(ethers.BigNumber.from("10000"));
          expect(foundationAmountAfter).to.be.eq(foundationAmountPrev.add(addAmountToFoundation));

        } else {
          expect(foundationAmountAfter).to.be.eq(foundationAmountPrev);
        }
    });

    it("#3-1-8. close :  user can't close the bond market.", async () => {

      await expect(
        deployed.BondDepository.connect(user1).close(
          bondInfoEther.marketId
        )
      ).to.be.revertedWith("Accessible: Caller is not an policy admin");
    })

    it("#3-1-9. close : admin can clsoe the bond market.", async () => {
      expect(await deployed.BondDepository.isOpened(bondInfoEther.marketId)).to.be.eq(true);

      await deployed.BondDepository.connect(_lockTosAdmin).close(
        bondInfoEther.marketId
      )
      expect(await deployed.BondDepository.isOpened(bondInfoEther.marketId)).to.be.eq(false);

    })

    it("#3-1-10. increaseCapacitychangeCloseTime : admin can change the close time of bond market. ", async () => {

      let block = await ethers.provider.getBlock();

      await deployed.BondDepository.connect(_lockTosAdmin).changeCloseTime(
          bondInfoEther.marketId,
          block.timestamp + (60 * 60 * 24 * 7)
      );
    })

    it("#3-1-11. changeCapacity : admin can change the capacity of bond market. ", async () => {

      // capAmountOfTos: ethers.BigNumber.from("30400000000000000000000")

      let newCapacity = ethers.BigNumber.from("40400000000000000000000");
      await deployed.BondDepository.connect(_lockTosAdmin).changeCapacity(
          bondInfoEther.marketId,
          true,
          newCapacity
      );

      let _market = await deployed.BondDepository.viewMarket(bondInfoEther.marketId);
      expect(_market[1]).to.be.eq(newCapacity);

    })

    it("#3-1-13. foundationDistribute :  policy admin can call foundationDistribute ", async () => {

      for (let i=0; i < foundations.address.length; i++){
        foundations.balances[i] = await tosContract.balanceOf(foundations.address[i]);
      }

      let balanceOfPrev = await tosContract.balanceOf(deployed.Treasury.address);
      let foundationAmount = await deployed.Treasury.foundationAmount()
      let foundationTotalPercentage = await deployed.Treasury.foundationTotalPercentage()

      expect(await deployed.TreasuryProxy.isPolicy(_lockTosAdmin.address)).to.be.equal(true)

      await deployed.Treasury.connect(_lockTosAdmin).foundationDistribute();

      let totalDistributedAmount = ethers.constants.Zero;
      for (let i = 0; i < foundations.address.length; i++){
        let distributedAmount = foundationAmount.mul(foundations.percentages[i]).div(foundationTotalPercentage);
        totalDistributedAmount = totalDistributedAmount.add(distributedAmount);

        expect(await tosContract.balanceOf(foundations.address[i])).to.be.equal(
          foundations.balances[i].add(distributedAmount)
        )
      }

      let foundationAmountAfter = await deployed.Treasury.foundationAmount()

      expect(await tosContract.balanceOf(deployed.Treasury.address)).to.be.equal(balanceOfPrev.sub(totalDistributedAmount))
      expect(foundationAmountAfter).to.be.equal(foundationAmount.sub(totalDistributedAmount))

    })

  });

  describe("#3-2. StakingV2 function test", async () => {

    describe("#3-2-1. simple stake product case ", async () => {

      before(function() {
        depositor = tester;
        depositorUser = "tester";
        // depositData = getUserLastDataByIndex(depositorUser, 0);
        // console.log(depositData);
      });

      it("#3-2-1-1. stake : if sender didn't approve in advance, fail ", async () => {

        let balanceOfPrev = await tosContract.balanceOf(depositor.address);
        let amount = ethers.utils.parseEther("100");
        if (balanceOfPrev.lt(amount)) {
          await tosContract.connect(_tosAdmin).transfer(depositor.address, amount);
        }
        balanceOfPrev = await tosContract.balanceOf(depositor.address);
        expect(balanceOfPrev).to.be.gte(amount);

        await expect(deployed.StakingV2.connect(depositor).stake(amount))
        .to.be.revertedWith("TRANSFER_FROM_FAILED");

      })

      it("#3-2-1-2. stake : 100 TOS ", async () => {

        let balanceOfPrev = await tosContract.balanceOf(depositor.address);
        let balanceOfPrevStakeContract = await tosContract.balanceOf(deployed.Treasury.address);

        let amount = ethers.utils.parseEther("100");
        if (balanceOfPrev.lt(amount)) {
          await tosContract.connect(_tosAdmin).transfer(depositor.address, amount);
        }
        balanceOfPrev = await tosContract.balanceOf(depositor.address);
        expect(balanceOfPrev).to.be.gte(amount);

        let allowance = await tosContract.allowance(depositor.address, deployed.StakingV2.address);
        if (allowance < amount) {
          await tosContract.connect(depositor).approve(deployed.StakingV2.address, amount);
        }

        let tx = await deployed.StakingV2.connect(depositor).stake(amount);
        const receipt = await tx.wait();
        let stakeId = ethers.constants.Zero;

        let interface = deployed.StakingV2.interface;
        for (let i = 0; i < receipt.events.length; i++){
            if(receipt.events[i].topics[0] == interface.getEventTopic(eventStaked)){
                let data = receipt.events[i].data;
                let topics = receipt.events[i].topics;
                let log = interface.parseLog({data, topics});
                // console.log('log.args',log.args)
                deposits[depositorUser+""].push(
                  {
                    marketId: ethers.constants.Zero,
                    stakeId: log.args.stakeId,
                    lockId: ethers.constants.Zero
                  }
                );
                expect(amount).to.be.eq(log.args.amount);
                expect(depositor.address).to.be.eq(log.args.to);
                stakeId = log.args.stakeId
            }
        }

        expect(await tosContract.balanceOf(depositor.address)).to.be.eq(balanceOfPrev.sub(amount));
        expect(await tosContract.balanceOf(deployed.Treasury.address)).to.be.gte(balanceOfPrevStakeContract.add(amount));

        // let allStakings = await deployed.StakingV2.allStakings(stakeId)

        // console.log('allStakings', stakeId, allStakings)

        // let stakeIdList = await deployed.StakingV2.stakingOf(depositor.address);
        // console.log('stakeIdList',stakeIdList);

      })

      it("      pass blocks", async function () {
        await indexEpochPass(deployed.StakingV2, 0);
      });

      it("#3-2-1-3. rebaseIndex   ", async () => {

          let block = await ethers.provider.getBlock();
          let runwayTos = await deployed.StakingV2.runwayTos();
          let totalLtos = await deployed.StakingV2.totalLtos();
          let indexBefore = await deployed.StakingV2.getIndex();
          let epochBefore = await deployed.StakingV2.epoch();
          let rebasePerEpoch = await deployed.StakingV2.rebasePerEpoch();

          let possibleIndex = await deployed.StakingV2.possibleIndex();
          let idealNumberRebases = Math.floor((block.timestamp - epochBefore.end)/epochBefore.length_)+1;
          let idealIndex= await libStaking.compound(indexBefore, rebasePerEpoch, idealNumberRebases);
          let needTos = totalLtos.mul(idealIndex.sub(indexBefore)).div(ethers.constants.WeiPerEther);

          await deployed.StakingV2.connect(depositor).rebaseIndex();
          let indexAfter = await deployed.StakingV2.getIndex();
          console.log('updated index', indexAfter)
          expect(indexAfter).to.be.eql(possibleIndex);

          if (needTos.lte(runwayTos)) {
              expect(indexAfter).to.be.gt(indexBefore);
              let epochAfter = await deployed.StakingV2.epoch();
              expect(epochAfter.end).to.be.gte(epochBefore.end.add(epochBefore.length_));
          } else {
              console.log('updated index as much as the treasury can')
              expect(indexAfter).to.be.eq(possibleIndex);
              let epochAfter = await deployed.StakingV2.epoch();
              expect(epochAfter.end).to.be.gte(epochBefore.end.add(epochBefore.length_));
          }
      });

      it("#3-2-1-4. increaseAmountForSimpleStake  : when caller is not staker, it's fail ", async () => {

        let depositData = getUserLastData(depositorUser);

        let amount = ethers.utils.parseEther("10");
        await expect(
          deployed.StakingV2.connect(user1).increaseAmountForSimpleStake(depositData.stakeId, amount))
        .to.be.revertedWith("caller is not staker");
      });

      it("#3-2-1-6. increaseAmountForSimpleStake : 10 TOS ", async () => {

        let depositData = getUserLastData(depositorUser);
        let amount = ethers.utils.parseEther("10");

        let stakedOf = await deployed.StakingV2.stakedOf(depositData.stakeId);
        let balanceOfId = await deployed.StakingV2.remainedLtos(depositData.stakeId);

        let totalLtos = await deployed.StakingV2.totalLtos();
        let balanceOfPrev = await tosContract.balanceOf(depositor.address);
        let balanceOfPrevStakeContract = await tosContract.balanceOf(deployed.Treasury.address);
        if (balanceOfPrev.lt(amount)) {
          await tosContract.connect(_tosAdmin).transfer(depositor.address, amount);
        }
        balanceOfPrev = await tosContract.balanceOf(depositor.address);
        expect(balanceOfPrev).to.be.gte(amount);

        let allowance = await tosContract.allowance(depositor.address, deployed.StakingV2.address);
        if (allowance < amount) {
          await tosContract.connect(depositor).approve(deployed.StakingV2.address, amount);
        }

        await deployed.StakingV2.connect(depositor).increaseAmountForSimpleStake(depositData.stakeId, amount);

        expect(await tosContract.balanceOf(depositor.address)).to.be.eq(balanceOfPrev.sub(amount));
        expect(await tosContract.balanceOf(deployed.Treasury.address)).to.be.gte(balanceOfPrevStakeContract.add(amount));

        expect(await deployed.StakingV2.remainedLtos(depositData.stakeId)).to.be.gt(balanceOfId);

        expect(await deployed.StakingV2.totalLtos()).to.be.gt(totalLtos);

        let lockTosId = await deployed.StakingV2.connectId(depositData.stakeId);

        expect(await lockTosContract.balanceOfLock(lockTosId)).to.be.eq(ethers.constants.Zero)

      });

      it("      pass blocks", async function () {
        await indexEpochPass(deployed.StakingV2, 0);
      });

      it("#3-2-1-3. rebaseIndex   ", async () => {

        let block = await ethers.provider.getBlock();
        let runwayTos = await deployed.StakingV2.runwayTos();
        let totalLtos = await deployed.StakingV2.totalLtos();
        let indexBefore = await deployed.StakingV2.getIndex();
        let epochBefore = await deployed.StakingV2.epoch();
        let rebasePerEpoch = await deployed.StakingV2.rebasePerEpoch();
        let possibleIndex = await deployed.StakingV2.possibleIndex();

        let idealNumberRebases = Math.floor((block.timestamp - epochBefore.end)/epochBefore.length_)+1;
        let idealIndex= await libStaking.compound(indexBefore, rebasePerEpoch, idealNumberRebases);
        let needTos = totalLtos.mul(idealIndex.sub(indexBefore)).div(ethers.constants.WeiPerEther);

        await deployed.StakingV2.connect(depositor).rebaseIndex();
        let indexAfter = await deployed.StakingV2.getIndex();
        console.log('updated index', indexAfter)
        expect(indexAfter).to.be.eql(possibleIndex);

        if (needTos.lte(runwayTos)) {
          expect(indexAfter).to.be.gt(indexBefore);
          let epochAfter = await deployed.StakingV2.epoch();
          expect(epochAfter.end).to.be.gte(epochBefore.end.add(epochBefore.length_));
        } else {
            console.log('updated index as much as the treasury can')
            expect(indexAfter).to.be.eq(possibleIndex);
            let epochAfter = await deployed.StakingV2.epoch();
            expect(epochAfter.end).to.be.gte(epochBefore.end.add(epochBefore.length_));
        }

      });



      it("#3-2-1-4. add stakeIds to dataset", async () => {

        let stakingOf = await deployed.StakingV2.stakingOf(depositor.address);
        // console.log('stakingOf', stakingOf )

        if(stakingOf.length > 2) {
          for(let i = 2; i < stakingOf.length; i++ ){
            let data = await deployed.StakingV2.allStakings(stakingOf[i])
            let lockId = await deployed.StakingV2.connectId(stakingOf[i])
            deposits[depositorUser+""].push(
              {
                marketId: data.marketId,
                stakeId: stakingOf[i],
                lockId: lockId
              }
            )
          }
        }
      });

      it("#3-2-1-7. resetStakeGetStosAfterLock(uint256,uint256,uint256,uint256) :  deprecated function ", async () => {

          let depositData = getUserLastData(depositorUser);
          let amount = ethers.utils.parseEther("100");
          let errBool = false;
          try{
            await deployed.StakingV2.connect(depositor)["resetStakeGetStosAfterLock(uint256,uint256,uint256,uint256)"](
              depositData.stakeId,
              amount,
              ethers.utils.parseEther("10"),
              ethers.constants.One
            )
          } catch(e) {
            errBool = true
          }

          expect(errBool).to.be.eq(true)

      });

      it("#3-2-1-8. increaseBeforeEndOrNonEnd(uint256,uint256,uint256) :  deprecated function ", async () => {

          let depositData = getUserLastData(depositorUser);
          let amount = ethers.utils.parseEther("100");
          let errBool = false;
          try {
            await deployed.StakingV2.connect(depositor)["increaseBeforeEndOrNonEnd(uint256,uint256,uint256)"](
              depositData.stakeId,
              amount,
              ethers.constants.One
            )
          } catch(e) {
            errBool = true
          }

          expect(errBool).to.be.eq(true)
      });

      it("#3-2-1-10. claimForSimpleType  : claim 10 TOS ", async () => {

        let depositData = getUserLastDataByIndex(depositorUser, 2);

        let amount = ethers.utils.parseEther("10");
        let amountLtos = await deployed.StakingV2.getTosToLtos(amount);
        let possibleIndex = await deployed.StakingV2.possibleIndex();
        let amountTos = amountLtos.mul(possibleIndex).div(ethers.utils.parseEther("1"));

        let totalLtos = await deployed.StakingV2.totalLtos();
        let stakingPrincipal = await deployed.StakingV2.stakingPrincipal();

        let balanceOfStakeContract = await tosContract.balanceOf(deployed.Treasury.address);

        expect(stakingPrincipal).to.be.lte(balanceOfStakeContract);

        let balanceOfTOSPrev = await tosContract.balanceOf(depositor.address);
        let balanceOfId = await deployed.StakingV2.remainedLtos(depositData.stakeId);

        await deployed.StakingV2.connect(depositor).claimForSimpleType(
            depositData.stakeId,
            amountLtos
          );

        expect(await deployed.StakingV2.remainedLtos(depositData.stakeId)).to.be.lt(balanceOfId);
        expect(await tosContract.balanceOf(depositor.address)).to.be.eq(balanceOfTOSPrev.add(amountTos));

        expect(await deployed.StakingV2.totalLtos()).to.be.lt(totalLtos);

        expect(await deployed.StakingV2.stakingPrincipal())
        .to.be.lte(await tosContract.balanceOf(deployed.Treasury.address));

      });

      it("#3-2-1-11. unstake : you can claim at anytime ", async () => {

        let depositData = getUserLastDataByIndex(depositorUser, 2);
        let totalLtos = await deployed.StakingV2.totalLtos();

        let balanceOfTOSPrev = await tosContract.balanceOf(depositor.address);
        let balanceOfId = await deployed.StakingV2.remainedLtos(depositData.stakeId);

        let stakedOf = await deployed.StakingV2.stakedOf(depositData.stakeId);

        await deployed.StakingV2.connect(depositor).unstake(
            depositData.stakeId
        );

        expect(await deployed.StakingV2.remainedLtos(depositData.stakeId)).to.be.eq(ethers.constants.Zero);

        let balanceTosUser = await tosContract.balanceOf(depositor.address);

        expect(balanceTosUser).to.be.gte(balanceOfTOSPrev.add(stakedOf));
        if (balanceOfId.gt(ethers.constants.Zero))
          expect(await deployed.StakingV2.totalLtos()).to.be.lt(totalLtos);
      });

    });

    describe("#3-2-2. stakeGetStos product case ", async () => {

      it("      pass blocks", async function () {
        await indexEpochPass(deployed.StakingV2, 2);
      });

      it("#3-2-2-1. stakeGetStos(uint256,uint256) : deprecated function ", async () => {
        let balanceOfPrev = await tosContract.balanceOf(depositor.address);
        let amount = ethers.utils.parseEther("100");
        let periodWeeks = ethers.constants.One;

        if (balanceOfPrev.lt(amount)) {
          await tosContract.connect(_tosAdmin).transfer(depositor.address, amount);
        }
        balanceOfPrev = await tosContract.balanceOf(depositor.address);
        expect(balanceOfPrev).to.be.gte(amount);

        let errBool = false;
        try {
          await deployed.StakingV2.connect(depositor).stakeGetStos(amount, periodWeeks)
        } catch(e) {
          errBool = true
        }

        expect(errBool).to.be.eq(true)
      })


      it("#3-2-2-2. stakeGetStos(uint256,uint256) : deprecated function  ", async () => {

        let indexBefore = await deployed.StakingV2.getIndex();
        let epochBefore = await deployed.StakingV2.epoch();

        let balanceOfPrev = await tosContract.balanceOf(depositor.address);
        let balanceOfPrevStakeContract = await tosContract.balanceOf(deployed.Treasury.address);
        // let balanceTOSPrevStaker = await tosContract.balanceOf(deployed.Treasury.address);
        let balanceSTOSPrevDepositor = await lockTosContract.balanceOf(depositor.address);

        let amount = ethers.utils.parseEther("100");
        let periodWeeks = ethers.constants.One;

        let block = await ethers.provider.getBlock();

        if (balanceOfPrev.lt(amount)) {
          await tosContract.connect(_tosAdmin).transfer(depositor.address, amount);
        }
        balanceOfPrev = await tosContract.balanceOf(depositor.address);
        expect(balanceOfPrev).to.be.gte(amount);

        let allowance = await tosContract.allowance(depositor.address, deployed.StakingV2.address);
        if (allowance < amount) {
          await tosContract.connect(depositor).approve(deployed.StakingV2.address, amount);
        }

        let balanceOfLTOSPrev = await deployed.StakingV2.balanceOf(depositor.address);

        //---
        let errBool = false;
        try {
          await deployed.StakingV2.connect(depositor).stakeGetStos(amount, periodWeeks)
        } catch(e) {
          errBool = true
        }

        expect(errBool).to.be.eq(true)

      })

      it("      pass blocks", async function () {
        await indexEpochPass(deployed.StakingV2, 0);
      });

      it("#3-2-2-8. rebaseIndex   ", async () => {

        let depositData = getUserLastData(depositorUser);

        let runwayTos = await deployed.StakingV2.runwayTos();
        expect(runwayTos).to.be.gt(ethers.constants.Zero);

        let remainedLTOSBefore = await deployed.StakingV2.remainedLtos(depositData.stakeId);
        let remainedLTOSToTosBefore = await deployed.StakingV2.getLtosToTos(remainedLTOSBefore);
        let indexBefore = await deployed.StakingV2.getIndex();
        let epochBefore = await deployed.StakingV2.epoch();

        let rebasePerEpoch = await deployed.StakingV2.rebasePerEpoch();
        let indexCompound = await libStaking.compound(indexBefore, rebasePerEpoch, 1) ;

        let block = await ethers.provider.getBlock();
        let idealNumberRebases = Math.floor((block.timestamp - epochBefore.end)/epochBefore.length_)+1;
        let idealIndex= await libStaking.compound(indexBefore, rebasePerEpoch, idealNumberRebases);
        let nextIndexContract = await deployed.StakingV2.possibleIndex();

        let totalLtos = await deployed.StakingV2.totalLtos();
        let needTos = totalLtos.mul(idealIndex.sub(indexBefore)).div(ethers.constants.WeiPerEther);

        await deployed.StakingV2.connect(depositor).rebaseIndex();

        let indexAfter = await deployed.StakingV2.getIndex();


        if (needTos.lte(runwayTos)) {

          expect(indexAfter).to.be.gte(nextIndexContract);
          expect(indexAfter).to.be.gt(indexBefore);
          let epochAfter = await deployed.StakingV2.epoch();
          expect(epochAfter.end).to.be.gte(epochBefore.end.add(epochBefore.length_));

        } else {
            console.log('didn\'t run rebase Index')
            expect(indexAfter).to.be.lte(nextIndexContract);
            expect(indexAfter).to.be.eq(indexBefore);
            let epochAfter = await deployed.StakingV2.epoch();
            expect(epochAfter.end).to.be.gte(epochBefore.end.add(epochBefore.length_));

        }

      });


      it("#3-2-2-10. resetStakeGetStosAfterLock(uint256,uint256,uint256) : deprecated function ", async () => {

        let depositData = getUserLastData(depositorUser);
        let amount = ethers.utils.parseEther("100");
        let claimAmount = ethers.utils.parseEther("0");
        let periodWeeks = ethers.constants.Zero;

        let index = await deployed.StakingV2.getIndex();
        console.log('index',index);

        let totalLtos = await deployed.StakingV2.totalLtos();
        let balanceOfPrev = await tosContract.balanceOf(depositor.address);
        let balanceOfPrevStakeContract = await tosContract.balanceOf(deployed.Treasury.address);

        if (balanceOfPrev.lt(amount)) {
          await tosContract.connect(_tosAdmin).transfer(depositor.address, amount);
        }
        balanceOfPrev = await tosContract.balanceOf(depositor.address);
        expect(balanceOfPrev).to.be.gte(amount);

        let allowance = await tosContract.allowance(depositor.address, deployed.StakingV2.address);
        if (allowance < amount) {
          await tosContract.connect(depositor).approve(deployed.StakingV2.address, amount);
        }


        let errBool = false;
        try {
          await deployed.StakingV2.connect(depositor)["resetStakeGetStosAfterLock(uint256,uint256,uint256)"](
            depositData.stakeId,
            amount,
            periodWeeks
          )
        } catch(e) {
          errBool = true
        }

        expect(errBool).to.be.eq(true)

      });

      it("#3-2-2-16. unstake : if the lockup is not over, staker can not unstake.", async () => {
        let depositData = getUserLastData(depositorUser);

        let totalLtos = await deployed.StakingV2.totalLtos();
        let balanceOfPrev = await tosContract.balanceOf(depositor.address);
        let balanceOfPrevStakeContract = await tosContract.balanceOf(deployed.TreasuryProxy.address);

        await expect(
          deployed.StakingV2.connect(depositor).unstake(
            depositData.stakeId
          ))
        .to.be.revertedWith("end time hasn't passed.");

      });

      it("      pass blocks to end time of stakeId ", async function () {
        let depositData = getUserLastData(depositorUser);
        let info = await deployed.StakingV2.stakeInfo(depositData.stakeId)
        let block = await ethers.provider.getBlock();
        let passTime =  info.endTime - block.timestamp  + 60;
        ethers.provider.send("evm_increaseTime", [passTime])
        ethers.provider.send("evm_mine")

      });

      it("#3-2-2-17. unstake : if the lockup is over, staker can unstake.", async () => {

        let depositData = getUserLastData(depositorUser);

        let depositData1 = getUserLastDataByIndex(depositorUser, 1);
        // console.log("depositData",depositData);
        // console.log("depositData1",depositData1);


        let totalLtos = await deployed.StakingV2.totalLtos();
        let balanceOfPrev = await tosContract.balanceOf(depositor.address);
        let balanceOfPrevStakeContract = await tosContract.balanceOf(deployed.TreasuryProxy.address);

        let balanceOfId = await deployed.StakingV2.remainedLtos(depositData.stakeId);
        let stakedOf = await deployed.StakingV2.stakedOf(depositData.stakeId);

        await deployed.StakingV2.connect(depositor).unstake(
            depositData.stakeId
        );

        expect(await deployed.StakingV2.remainedLtos(depositData.stakeId)).to.be.eq(ethers.constants.Zero);
        expect(await tosContract.balanceOf(depositor.address)).to.be.gte(balanceOfPrev.add(stakedOf));
        if (balanceOfId.gt(ethers.constants.Zero))
          expect(await deployed.StakingV2.totalLtos()).to.be.lt(totalLtos);

      });

    });

  });

});
