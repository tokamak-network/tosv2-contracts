const chai = require("chai");
const { solidity } = require("ethereum-waffle");
const { expect, assert } = chai;

const JSBI = require('jsbi');

//chai.use(require("chai-bn")(BN));
chai.use(solidity);
require("chai").should();
const univ3prices = require('@thanpolas/univ3prices');
const utils = require("./utils");

const {
  calculateBalanceOfLock,
  calculateBalanceOfUser,
  createLockWithPermit,
  calculateCompound,
} = require("./helpers/lock-tos-helper");

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
} = require("./uniswap-v3/uniswap-v3-contracts");

let NonfungiblePositionManager = require('../abis/NonfungiblePositionManager.json');
let UniswapV3Pool = require('../abis/UniswapV3Pool.json');
let UniswapV3LiquidityChanger = require('../abis/UniswapV3LiquidityChanger.json');
let tosabi = require('../abis/TOS.json');
let lockTOSProxyabi = require('../abis/LockTOSProxy_ABI.json');
let lockTOSProxy2abi = require('../abis/LockTOSv2Proxy.json').abi;
let lockTOSLogic2abi = require('../abis/LockTOSv2Logic0.json').abi;
const { id } = require("@ethersproject/hash");

let treasuryLogicAbi = require('../artifacts/contracts/Treasury.sol/Treasury.json');
let bondDepositoryLogicAbi = require('../artifacts/contracts/BondDepository.sol/BondDepository.json');
let stakingV2LogicAbi = require('../artifacts/contracts/StakingV2.sol/StakingV2.json');

let UniswapV3LiquidityChangerAddress = "0xa839a0e64b27a34ed293d3d81e1f2f8b463c3514";
let totalTosSupplyTarget = ethers.utils.parseEther("1000000");

let tosAdmin = "0x5b6e72248b19F2c5b88A4511A6994AD101d0c287";
let lockTosAdmin = "0x5b6e72248b19F2c5b88A4511A6994AD101d0c287";

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


  // rinkeby
  let firstEpochNumber = 0;
  let firstEndEpochTime
  let epochLength = 600; // 10분
  // let epochUnit = 60;   //test epochUnit
  let epochUnit = 604800;   //rinkeby epochUnit


  // mainnet


  let depositTime;
  let depositTime2;
  let unstakingTime;

  let stakeIdcheck;
  let balanceOfLTOS;
  let stakingBalanceLTOS;
  let totalLTOS;

  let sellingTime = 604800 * 20;

  let beforetosAmount;
  let aftertosAmount;

  //let mintRate = 10;
  //let mintRate = 1000000; // 0.0001
  let mintRate = ethers.BigNumber.from("442427000000000000000000000");
  //4124960000000
  let priceLimitTOSETH = {
    minimumTOSPricePerETH: ethers.utils.parseEther("0.00001"),
    minimumETHPricePerTOS: ethers.utils.parseEther("1000"),
    maximumTOSPricePerETH: ethers.utils.parseEther("1"),
    maximumETHPricePerTOS: ethers.utils.parseEther("1000000")
  }

  let unstakingAmount = ethers.utils.parseUnits("500", 18);

  let ETHPrice = 1000000
  let TOSPrice = 1000

  let minter_role = "0xf0887ba65ee2024ea881d91b74c2450ef19e1557f03bed3ea9f16b037cbe2dc9";

  ///
  let basicBondPeriod = 1800 ;
  //let basicBondPeriod = 60*60*24*5 ;  // 본드를 사고, 락업없을때, 기본 락업기간 5일

  // rinkeby
  let wethAddress = "0xc778417E063141139Fce010982780140Aa0cD5Ab";
  let testAddress = "0xcc0E10d30EeF023D98E6B73c019A9Ed617f1007C"
  let lockTOSProxyAddress = "0x5adc7de3a0B4A4797f02C3E99265cd7391437568"
  let lockTOSProxy2Address = "0x5FA8C7673B6693cCE8991C10fCd2b9A1bA775b7B"
  // let lockTOSLogic2Address = "0x50b8Ee0cCc76f66fFA669aA56218B3964dae4E78"
  let lockTOSLogic2Address = "0x2835Ac44185091368858948dc791A364E5fb7733"
  let etherUint = ethers.utils.parseUnits("1", 18);
  // let wtonUint = ethers.utils.parseUnits("1", 27);
  let constRebasePerEpoch = ethers.BigNumber.from("87045050000000") // 0.00001
  /*
  // mainnet
  let wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  let testAddress = " "
  let lockTOSProxyAddress = " "
  let lockTOSProxy2Address = " "
  // let lockTOSLogic2Address = " "
  let lockTOSLogic2Address = " "
  let etherUint = ethers.utils.parseUnits("1", 18);
  // let wtonUint = ethers.utils.parseUnits("1", 27);
  */

  let firstExcute = false;

  let firstMarketlength;
  let checkMarketLength;

  // rinkeby
  let uniswapInfo={
      poolfactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      npm: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
      swapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      wethUsdcPool: "0xfbDc20aEFB98a2dD3842023f21D17004eAefbe68",
      tosethPool: "0x7715dF692fb4031DC51C53b35eFC2b65d9e752c0",
      wtonWethPool: "0xE032a3aEc591fF1Ca88122928161eA1053a098AC",
      wtonTosPool: "0x516e1af7303a94f81e91e4ac29e20f4319d4ecaf",
      tosDOCPool: "0x831a1f01ce17b6123a7d1ea65c26783539747d6d",
      wton: "0x709bef48982Bbfd6F2D4Be24660832665F53406C",
      tos: "0x73a54e5C054aA64C1AE7373C2B5474d8AFEa08bd",
      weth: "0xc778417e063141139fce010982780140aa0cd5ab",
      usdc: "0x4dbcdf9b62e891a7cec5a2568c3f4faf9e8abe2b",
      doc: "",
      _fee: ethers.BigNumber.from("3000"),
      NonfungibleTokenPositionDescriptor: "0x91ae842A5Ffd8d12023116943e72A606179294f3"
  }

  let STATUS = {
      NONE: 0,
      RESERVEDEPOSITOR: 1,
      RESERVESPENDER: 2,
      RESERVETOKEN: 3,
      RESERVEMANAGER: 4,
      LIQUIDITYDEPOSITOR: 5,
      LIQUIDITYTOKEN: 6,
      LIQUIDITYMANAGER: 7,
      REWARDMANAGER: 8,
      BONDER: 9,
      STAKER: 10
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
      capAmountOfTos: ethers.utils.parseEther("10000"),
      closeTime: 0,
      priceTokenPerTos: ethers.BigNumber.from("4124960000000"),
      priceTosPerToken: ethers.BigNumber.from("242427000000000000000000"),
      purchasableTOSAmountAtOneTime: ethers.utils.parseEther("100")
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

  let deposits = {user1 : [], user2: []};
  let depositor, depositorUser, index, depositData;

  let foundations = {
    address: [
      "0x5b6e72248b19F2c5b88A4511A6994AD101d0c287",
      "0x3b9878Ef988B086F13E5788ecaB9A35E74082ED9"
    ],
    percentages: [
      ethers.BigNumber.from("100"),
      ethers.BigNumber.from("50"),
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
    if( index < depositList.length) return depositList[index];
    else return null;
  }



  before(async () => {
    accounts = await ethers.getSigners();
    [admin1, admin2, user1, user2, user3, user4, user5, user6 ] = accounts;
    //console.log('admin1',admin1.address);

    provider = ethers.provider;
    // poolInfo.admin = admin1;
    // tokenInfo.admin = admin1;

    // await hre.ethers.provider.send("hardhat_setBalance", [
    //   admin1.address,
    //   "0x56BC75E2D63100000",
    // ]);

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

    await hre.ethers.provider.send("hardhat_impersonateAccount",[lockTosAdmin]);

    _lockTosAdmin = await ethers.getSigner(lockTosAdmin);

  });

  describe("#0. lockTOSContract update", () => {
    if(firstExcute == false) {
      it("bring the LockTOSProxyContract", async () => {
        lockTosContract = new ethers.Contract( lockTOSProxyAddress, lockTOSProxyabi, _lockTosAdmin);

        let code = await ethers.provider.getCode(lockTosContract.address);
        expect(code).to.not.eq("0x");
      })
      /*
      it("bring the lockTOSProxy2Contract", async () => {
        lockTos2Contract = new ethers.Contract( lockTOSProxy2Address, lockTOSProxy2abi, ethers.provider);

        let code = await ethers.provider.getCode(lockTos2Contract.address);
        expect(code).to.not.eq("0x");
      })


      it("bring the lockTOSLogic2Contract", async () => {
        lockToslogic2Contract = new ethers.Contract( lockTOSLogic2Address, lockTOSLogic2abi, ethers.provider);

        let code = await ethers.provider.getCode(lockToslogic2Contract.address);
        expect(code).to.not.eq("0x");
      })
      */

      // it("lockTOSProxy upgrade", async () => {

      //   await lockTosContract.connect(_lockTosAdmin).upgradeTo(lockTOSProxy2Address);

      // })

      it("bring the newLockTOSProxyContract", async () => {
        lockTosContract = new ethers.Contract( lockTOSProxyAddress, lockTOSProxy2abi, _lockTosAdmin);
      })
      it("lockTOS isAdmin", async () => {
        console.log("_lockTosAdmin.address : ",_lockTosAdmin.address);
        let tx = await lockTosContract.isAdmin(_lockTosAdmin.address);
        console.log("lockTos Admin : ",tx);
      })

      it("lockTOSProxy2 set impletation", async () => {
        await lockTosContract.connect(_lockTosAdmin).setImplementation2(lockTOSLogic2Address, 0, true);
      })


      it("bring the newlogic", async () => {
        lockTosContract = new ethers.Contract( lockTOSProxyAddress, lockTOSLogic2abi, ethers.provider);
      })

    } else {

      it("bring the newlogic", async () => {
        lockTosContract = new ethers.Contract( lockTOSProxyAddress, lockTOSLogic2abi, ethers.provider);
      })

    }
  })

  describe("#0. Deploy the contract", () => {
    it("#0-0. Deploy TOSValueCalculator", async function () {
      tosCalculator = await ethers.getContractFactory("TOSValueCalculator");
      TOSValueCalculator = await tosCalculator.connect(admin1).deploy();
      await TOSValueCalculator.connect(admin1).deployed();

      let code = await ethers.provider.getCode(TOSValueCalculator.address);
      expect(code).to.not.eq("0x");
      // console.log(TOSValueCalculator.address);
    });

    it("#0-0-1. initialize TOSCalculator", async () => {
      await TOSValueCalculator.connect(admin1).initialize(
        uniswapInfo.tos,
        uniswapInfo.weth,
        uniswapInfo.npm,
        uniswapInfo.tosethPool,
        uniswapInfo.poolfactory
      );

      let tosaddress = await TOSValueCalculator.tos()
      // console.log(tosaddress);
      expect(tosaddress).to.be.equal(uniswapInfo.tos);
    })

    it("#0-1. bring the TOS function", async () => {
      tosContract = new ethers.Contract( uniswapInfo.tos, tosabi, ethers.provider );
      // console.log(tosContract.address);
      let code = await ethers.provider.getCode(tosContract.address);
      expect(code).to.not.eq("0x");
    })

    describe("#0-2. Deploy treasuryLibrary ", () => {

      it("#0-2-0-1. Deploy LibTreasury ", async function () {
        const LibTreasury = await ethers.getContractFactory("LibTreasury");
        libTreasury = await LibTreasury.connect(admin1).deploy();
      });

      it("#0-2-0. Deploy Treasury Logic", async () => {
        treasurycont = await ethers.getContractFactory("Treasury",{
          libraries: {
            LibTreasury: libTreasury.address
          }
        });

        treasuryContract = await treasurycont.connect(admin1).deploy();
        await treasuryContract.deployed();

        let code = await ethers.provider.getCode(treasuryContract.address);
        // console.log("treasuryContract.address : ", treasuryContract.address)
        expect(code).to.not.eq("0x");
      })

      it("#0-2-1. Deploy Treasury Proxy", async () => {
        treasurycont = await ethers.getContractFactory("TreasuryProxy");
        treasuryProxy = await treasurycont.connect(admin1).deploy();
        await treasuryProxy.deployed();

        await treasuryProxy.connect(admin1).upgradeTo(treasuryContract.address);
      })
      /*
      it("#0-2-2. initialize TreasuryProxy", async () => {
        await treasuryProxy.connect(admin1).initialize(
          tosContract.address,
          TOSValueCalculator.address,
          wethAddress
        );

        let calculAddrCheck = await treasuryProxy.calculator();
        expect(calculAddrCheck).to.be.equal(TOSValueCalculator.address);
        expect(await treasuryProxy.wethAddress()).to.be.equal(wethAddress);
        expect(await treasuryProxy.TOS()).to.be.equal(tosContract.address);
      })
      */

      it("#0-2-3. TreasuryProxyLogic set", async () => {
        treasuryProxylogic = new ethers.Contract( treasuryProxy.address, treasuryLogicAbi.abi, ethers.provider);
        // console.log(treasuryProxylogic);

      })
    })

    describe("#0-3. Deploy Staking", () => {

      it("#0-2-0-1. Deploy LibStaking ", async function () {
        const LibStaking = await ethers.getContractFactory("LibStaking");
        libStaking = await LibStaking.connect(admin1).deploy();
      });

      it("#0-3-0. Deploy Staking Logic", async () => {
        const StakingV2 = await ethers.getContractFactory("StakingV2", {
          libraries: {
            LibStaking: libStaking.address
          }
        });

        stakingContract = await StakingV2.connect(admin1).deploy();
        await stakingContract.connect(admin1).deployed();

        let code = await ethers.provider.getCode(stakingContract.address);
        expect(code).to.not.eq("0x");
      })

      it("#0-3-1. Deploy Staking Proxy", async () => {
        stakingcont = await ethers.getContractFactory("StakingV2Proxy");
        stakingProxy = await stakingcont.connect(admin1).deploy();
        await stakingProxy.connect(admin1).deployed();

        await stakingProxy.connect(admin1).upgradeTo(stakingContract.address);
      })
      /*
      it("#0-3-2. initialize StakingProxy", async () => {
        const block = await ethers.provider.getBlock('latest')
        firstEndEpochTime = block.timestamp + epochLength;

        await stakingProxy.connect(admin1).initialize(
          uniswapInfo.tos,
          [epochLength, firstEndEpochTime],
          lockTosContract.address,
          treasuryProxy.address,
          basicBondPeriod
        );

        expect(await stakingProxy.treasury()).to.be.equal(treasuryProxy.address);
        expect(await stakingProxy.basicBondPeriod()).to.be.equal(basicBondPeriod);
        expect(await stakingProxy.lockTOS()).to.be.equal(lockTosContract.address);
        let epochInfo = await stakingProxy.epoch();
        expect(epochInfo.length_).to.be.equal(epochLength);
        expect(epochInfo.number).to.be.equal(firstEpochNumber);
        expect(epochInfo.end).to.be.eq(firstEndEpochTime);
      })
      */
      it("#0-3-3. stakingProxyLogic set", async () => {
        stakingProxylogic = new ethers.Contract( stakingProxy.address, stakingV2LogicAbi.abi, ethers.provider);
      })
    })

    describe("#0-4. Deploy BondDepository", () => {
      it("#0-4-0. Deploy BondDepository logic", async () => {
        bondDepositorycont = await ethers.getContractFactory("BondDepository");
        bondDepositoryContract = await bondDepositorycont.connect(admin1).deploy();
        await bondDepositoryContract.connect(admin1).deployed();

        let code = await ethers.provider.getCode(bondDepositoryContract.address);
        // console.log("bondDepositoryContract.address : ", bondDepositoryContract.address)
        expect(code).to.not.eq("0x");
      })

      it("#0-4-1. upgradeTo: Deploy BondDepository Proxy", async () => {
        bondDepositorycont = await ethers.getContractFactory("BondDepositoryProxy");
        bondDepositoryProxy = await bondDepositorycont.connect(admin1).deploy();
        await bondDepositoryProxy.connect(admin1).deployed();

        await bondDepositoryProxy.connect(admin1).upgradeTo(bondDepositoryContract.address);
      })
      /*
      it("#0-4-2. initialize : initialize bondDepositoryProxy", async () => {
        await bondDepositoryProxy.connect(admin1).initialize(
          uniswapInfo.tos,
          stakingProxy.address,
          treasuryProxy.address,
          TOSValueCalculator.address,
          uniswapInfo.poolfactory
        )

        expect(await bondDepositoryProxy.calculator()).to.be.equal(TOSValueCalculator.address);
        expect(await bondDepositoryProxy.tos()).to.be.equal(uniswapInfo.tos);
        expect(await bondDepositoryProxy.staking()).to.be.equal(stakingProxy.address);
        expect(await bondDepositoryProxy.treasury()).to.be.equal(treasuryProxy.address);
        expect(await bondDepositoryProxy.uniswapV3Factory()).to.be.equal(uniswapInfo.poolfactory);

      })
      */
      it("#0-4-3. stakingProxyLogic set", async () => {
        bondDepositoryProxylogic = new ethers.Contract(bondDepositoryProxy.address, bondDepositoryLogicAbi.abi, ethers.provider);
      })
    })

  })


  describe("#1. setting the contract", () => {
    it("grantRole: give the mintRole to treasury", async () => {
      await tosContract.connect(_lockTosAdmin).grantRole(minter_role,treasuryProxy.address);

      let tx = await tosContract.hasRole(minter_role,treasuryProxy.address);
      expect(tx).to.be.equal(true);
    })

    describe("#1-1. treasury setting", () => {
      it("1-1. treasury admin, proxyAdmin, policyAdmin check", async () => {
        // console.log(treasuryProxy);
        expect(await treasuryProxy.isAdmin(admin1.address)).to.be.equal(true)
        expect(await treasuryProxy.isProxyAdmin(admin1.address)).to.be.equal(true)

        expect(await treasuryProxy.isPolicy(admin1.address)).to.be.equal(false)
      })

      it("#1-1-1.addPolicy : user can't call addPolicy", async () => {
        await expect(
          treasuryProxy.connect(user1).addPolicy(admin1.address)
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-1-1. addPolicy : onlyProxyAdmin can call addPolicy", async () => {
        await treasuryProxy.connect(admin1).addPolicy(admin1.address)
        expect(await treasuryProxy.isPolicy(admin1.address)).to.be.equal(true)
      })

      it("#1-1-2. user can't call initialize", async () => {
        await expect(
          treasuryProxy.connect(user1).initialize(
            tosContract.address,
            TOSValueCalculator.address,
            wethAddress,
            uniswapInfo.poolfactory,
            stakingProxy.address,
            uniswapInfo.wtonTosPool
          )
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-1-2. initialize : onlyProxyAdmin can call initialize", async () => {
        await treasuryProxy.connect(admin1).initialize(
          tosContract.address,
          TOSValueCalculator.address,
          wethAddress,
          uniswapInfo.poolfactory,
          stakingProxy.address,
          uniswapInfo.wtonTosPool
        )

        expect(await treasuryProxylogic.calculator()).to.be.equal(TOSValueCalculator.address);
        expect(await treasuryProxylogic.tos()).to.be.equal(tosContract.address);
        expect(await treasuryProxylogic.wethAddress()).to.be.equal(wethAddress);
      })

      it("#1-1-3. enable : user can't call enable (for mint)", async () => {
        await expect(
          treasuryProxylogic.connect(user1).enable(
            STATUS.REWARDMANAGER,
            bondDepositoryProxy.address
          )
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-1-3. setMintRateDenominator  ", async () => {

        await treasuryProxylogic.connect(admin1).setMintRateDenominator(ethers.utils.parseEther("1"));

      })


      /*
      it("#1-1-3. policy can call enable (for create market in bondDepository)", async () => {
        expect(await treasuryProxylogic.isPolicy(admin1.address)).to.be.equal(true)
        expect(await treasuryProxylogic.isAdmin(admin1.address)).to.be.equal(true)
        expect(await treasuryProxylogic.isProxyAdmin(admin1.address)).to.be.equal(true)

        expect(
          await treasuryProxylogic.permissions(STATUS.BONDER, bondDepositoryProxy.address)
        ).to.be.equal(false)

        await treasuryProxylogic.connect(admin1).enable(STATUS.BONDER, bondDepositoryProxy.address);

        expect(
          await treasuryProxylogic.permissions(STATUS.BONDER, bondDepositoryProxy.address)
        ).to.be.equal(true)
      })
      */
      it("#1-1-3. enable : policy can call enable (for mint staking)", async () => {

        let stakingProxyREWARDMANAGER =  await treasuryProxylogic.permissions(STATUS.STAKER, stakingProxy.address)

        expect(
          await treasuryProxylogic.permissions(STATUS.STAKER, stakingProxy.address)
        ).to.be.equal(false)

        await treasuryProxylogic.connect(admin1).enable(STATUS.STAKER, stakingProxy.address);

        expect(
          await treasuryProxylogic.permissions(STATUS.STAKER, stakingProxy.address)
        ).to.be.equal(true)
      })

      it("#1-1-4. setFoundationDistributeInfo : user can't call setFoundationDistributeInfo ", async () => {
        expect(await treasuryProxy.isPolicy(user1.address)).to.be.equal(false)

        await expect(
          treasuryProxylogic.connect(user1).setFoundationDistributeInfo(
            foundations.address, foundations.percentages
          )
        ).to.be.revertedWith("Accessible: Caller is not an policy admin")
      })

      it("#1-1-4. setFoundationDistributeInfo : policy can call setFoundationDistributeInfo", async () => {


        expect(await treasuryProxy.isPolicy(admin1.address)).to.be.equal(true)

        await treasuryProxylogic.connect(admin1).setFoundationDistributeInfo(
          foundations.address, foundations.percentages
        );

        let totalPercantage = ethers.BigNumber.from("0");
        for (let i=0; i< foundations.percentages.length; i++) {
          totalPercantage = totalPercantage.add(foundations.percentages[i]);
        }


        expect(await treasuryProxylogic.foundationTotalPercentage()).to.be.equal(totalPercantage)

      })


      it("#1-1-5. disable : user can't call disable", async () => {
        await expect(
          treasuryProxylogic.connect(user1).disable(
            STATUS.REWARDMANAGER,
            stakingProxy.address        )
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-1-5. disable : policy can call disable", async () => {

          expect(
            await treasuryProxylogic.permissions(STATUS.STAKER, stakingProxy.address)
          ).to.be.equal(true)

          await treasuryProxylogic.connect(admin1).disable(STATUS.STAKER, stakingProxy.address);

          expect(
            await treasuryProxylogic.permissions(STATUS.STAKER, stakingProxy.address)
          ).to.be.equal(false)

          await treasuryProxylogic.connect(admin1).enable(STATUS.STAKER, stakingProxy.address);
      })

      it("#1-1-6. setMR : user can't call setMR(mintRate)", async () => {
        await expect(
          treasuryProxylogic.connect(user1).setMR(mintRate,
            ethers.utils.parseEther("100"),
            false
            )
        ).to.be.revertedWith("Accessible: Caller is not an policy admin")
      })

      it("#1-1-6. setMR : setMR(mintRate) fail: TOS is insufficient for backing", async () => {

        await expect(
          treasuryProxylogic.connect(admin1).setMR(
            mintRate,
            ethers.utils.parseEther("100"),
            false)
        ).to.be.revertedWith("unavailable mintRate")

      })

      // it(" burn TOS in TOSAdmin", async () => {
      //     let tosAdminBalance = await tosContract.balanceOf(tosAdmin);
      //     console.log('tosAdminBalance', tosAdminBalance);

      //     let tosTotalSupply = await tosContract.totalSupply();
      //     console.log('tosTotalSupply', tosTotalSupply.toString());
      // })

      it(" send ETH to treasury", async () => {
        let balanceEthPrev =  await ethers.provider.getBalance(treasuryProxylogic.address);

        let amount = ethers.utils.parseEther("5");

        let transaction = {
          to: treasuryProxylogic.address,
          from: admin1.address,
          data: "0x",
          value:amount
        }

       // await admin1.signTransaction( transaction );
        await admin1.sendTransaction( transaction );

        let balanceEthAfter =  await ethers.provider.getBalance(treasuryProxylogic.address);
        expect(balanceEthAfter).to.be.equal(balanceEthPrev.add(amount));

      })

      it("#1-1-6. setMR : onlyPolicyAdmin can call setMR(mintRate)", async () => {
        await treasuryProxylogic.connect(admin1).setMR(
          mintRate,
          ethers.utils.parseEther("0"),
          false
          );

        expect(await treasuryProxylogic.mintRate()).to.be.equal(mintRate);
      })

    })

    describe("#1-2. Staking setting", async () => {
      it("#1-2. Staking admin, proxyAdmin, policyAdmin check", async () => {
        expect(await stakingProxy.isAdmin(admin1.address)).to.be.equal(true)
        expect(await stakingProxy.isProxyAdmin(admin1.address)).to.be.equal(true)

        expect(await stakingProxy.isPolicy(admin1.address)).to.be.equal(false)
      })

      it("#1-2-1. addPolicy : user can't call addPolicy", async () => {
        await expect(
          stakingProxy.connect(user1).addPolicy(admin1.address)
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-2-1. addPolicy : onlyProxyAdmin can call addPolicy", async () => {
        await stakingProxy.connect(admin1).addPolicy(admin1.address)
        expect(await stakingProxy.isPolicy(admin1.address)).to.be.equal(true)
      })

      it("#1-2-2. initialize : user can't call initialize", async () => {
        const block = await ethers.provider.getBlock('latest')
        firstEndEpochTime = block.timestamp + epochLength;

        await expect(
          stakingProxy.connect(user1).initialize(
            uniswapInfo.tos,
            [epochLength, firstEndEpochTime],
            lockTosContract.address,
            treasuryProxy.address,
            basicBondPeriod
          )
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-2-2. initialize : onlyProxyAdmin can call initialize", async () => {
        const block = await ethers.provider.getBlock('latest')
        firstEndEpochTime = block.timestamp + epochLength;
        // console.log("firstEndEpochTime :", firstEndEpochTime);

        await stakingProxy.connect(admin1).initialize(
          uniswapInfo.tos,
          [epochLength,firstEndEpochTime],
          lockTosContract.address,
          treasuryProxy.address,
          basicBondPeriod
        )

        expect(await stakingProxy.treasury()).to.be.equal(treasuryProxy.address);
        expect(await stakingProxy.basicBondPeriod()).to.be.equal(basicBondPeriod);
        expect(await stakingProxy.lockTOS()).to.be.equal(lockTosContract.address);
        let epochInfo = await stakingProxy.epoch();
        expect(epochInfo.length_).to.be.equal(epochLength);
        // expect(epochInfo.number).to.be.equal(firstEpochNumber);
        expect(epochInfo.end).to.be.eq(firstEndEpochTime);

      })


      it("#1-2-3. setAddressInfos : user can't call setAddressInfos", async () => {

        await expect(
          stakingProxylogic.connect(user1).setAddressInfos(
            treasuryContract.address,
            treasuryContract.address,
            treasuryContract.address
          )
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })


      it("#1-2-3. setAddressInfos : admin can call setAddressInfos", async () => {

        expect(await stakingProxylogic.tos()).to.be.eq(uniswapInfo.tos);
        expect(await stakingProxylogic.lockTOS()).to.be.eq(lockTosContract.address);
        expect(await stakingProxylogic.treasury()).to.be.eq(treasuryProxy.address);

        await  stakingProxylogic.connect(admin1).setAddressInfos(
            treasuryContract.address,
            treasuryContract.address,
            treasuryProxy.address
        );

        expect(await stakingProxylogic.tos()).to.be.eq(treasuryContract.address);
        expect(await stakingProxylogic.lockTOS()).to.be.eq(treasuryContract.address);
        expect(await stakingProxylogic.treasury()).to.be.eq(treasuryProxy.address);

        await  stakingProxylogic.connect(admin1).setAddressInfos(
            uniswapInfo.tos,
            lockTosContract.address,
            treasuryProxy.address
        );

        expect(await stakingProxylogic.tos()).to.be.eq(uniswapInfo.tos);
        expect(await stakingProxylogic.lockTOS()).to.be.eq(lockTosContract.address);
        expect(await stakingProxylogic.treasury()).to.be.eq(treasuryProxy.address);

      })


      it("#1-2-3. setRebasePerEpoch : user can't call setRebasePerEpoch", async () => {
        let rebasePerEpoch = constRebasePerEpoch;
        await expect(
          stakingProxylogic.connect(user1).setRebasePerEpoch(rebasePerEpoch)
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-2-3. setRebasePerEpoch : onlyPolicyAdmin can call setRebasePerEpoch", async () => {
        let rebasePerEpoch = constRebasePerEpoch
        await stakingProxylogic.connect(admin1).setRebasePerEpoch(rebasePerEpoch);
        expect((await stakingProxylogic.rebasePerEpoch())).to.be.equal(rebasePerEpoch)
      })

      it("#1-2-4. setIndex : user can't call setIndex", async () => {
        let index = ethers.utils.parseUnits("10", 18)
        await expect(
          stakingProxylogic.connect(user1).setIndex(index)
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-2-4. setIndex : onlyPolicyAdmin can call setIndex", async () => {
        let epochtestbefore = await stakingProxylogic.epoch();

        expect(epochtestbefore.length_).to.be.equal(epochLength);

        let index = ethers.utils.parseUnits("10", 18)
        await stakingProxylogic.connect(admin1).setIndex(index);
        expect((await stakingProxylogic.index_())).to.be.equal(index)
      })

      it("#1-2-5. setBasicBondPeriod : user can't call setBasicBondPeriod", async () => {
        await expect(
          stakingProxylogic.connect(user1).setBasicBondPeriod(basicBondPeriod)
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-2-5. setBasicBondPeriod : onlyPolicyAdmin can call setBasicBondPeriod", async () => {
        await stakingProxylogic.connect(admin1).setBasicBondPeriod(basicBondPeriod + 100)
        expect((await stakingProxylogic.basicBondPeriod())).to.be.equal(basicBondPeriod+ 100);

        await stakingProxylogic.connect(admin1).setBasicBondPeriod(basicBondPeriod)
      })

      it("#1-2-6. addAdmin : user can't call addAdmin", async () => {
        await expect(
          stakingProxylogic.connect(user1).addAdmin(user1.address)
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-2-6. addAdmin : onlyProxyAdmin can call addAdmin", async () => {
        await stakingProxylogic.connect(admin1).addAdmin(bondDepositoryProxylogic.address)
        expect(await stakingProxylogic.isAdmin(bondDepositoryProxylogic.address)).to.be.equal(true);
      })

    })

    describe("#1-3. BondDepository setting", async () => {
      it("#1-3. BondDepository admin, proxyAdmin, policyAdmin check", async () => {
        expect(await bondDepositoryProxy.isAdmin(admin1.address)).to.be.equal(true)
        expect(await bondDepositoryProxy.isProxyAdmin(admin1.address)).to.be.equal(true)

        expect(await bondDepositoryProxy.isPolicy(admin1.address)).to.be.equal(false)
      })

      it("#1-3-1. addPolicy : user can't call addPolicy", async () => {
        await expect(
          bondDepositoryProxy.connect(user1).addPolicy(admin1.address)
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-3-1. addPolicy : onlyProxyAdmin can call addPolicy", async () => {
        await bondDepositoryProxy.connect(admin1).addPolicy(admin1.address)
        expect(await bondDepositoryProxy.isPolicy(admin1.address)).to.be.equal(true)
      })

      it("#1-3-2. initialize : user can't call initialize", async () => {
        await expect(
          bondDepositoryProxy.connect(user1).initialize(
            uniswapInfo.tos,
            stakingProxy.address,
            treasuryProxy.address,
            TOSValueCalculator.address,
            uniswapInfo.poolfactory
          )
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")
      })

      it("#1-3-2. initialize : onlyProxyAdmin can call initialize", async () => {
        await bondDepositoryProxy.connect(admin1).initialize(
            uniswapInfo.tos,
            stakingProxy.address,
            treasuryProxy.address,
            TOSValueCalculator.address,
            uniswapInfo.poolfactory
          )

        expect(await bondDepositoryProxy.calculator()).to.be.equal(TOSValueCalculator.address);
        expect(await bondDepositoryProxy.tos()).to.be.equal(uniswapInfo.tos);
        expect(await bondDepositoryProxy.staking()).to.be.equal(stakingProxy.address);
        expect(await bondDepositoryProxy.treasury()).to.be.equal(treasuryProxy.address);
        expect(await bondDepositoryProxy.uniswapV3Factory()).to.be.equal(uniswapInfo.poolfactory);


        let treasuryAddr = await bondDepositoryProxylogic.treasury();
        expect(treasuryAddr).to.be.equal(treasuryProxy.address);
      })

      it("#1-3-3. create : user can't call create", async () => {
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


      it("#1-3-3. create : create market : If you do not register the bond with the treasury, fail ", async () => {
        const block = await ethers.provider.getBlock('latest')
        let finishTime = block.timestamp + sellingTime  //2주
        bondInfoEther.market.closeTime = finishTime;

        await expect(
          bondDepositoryProxylogic.connect(admin1).create(
            bondInfoEther.token,
            [
              bondInfoEther.market.capAmountOfTos,
              bondInfoEther.market.closeTime,
              bondInfoEther.market.priceTosPerToken,
              bondInfoEther.market.purchasableTOSAmountAtOneTime
            ]
          )
        ).to.be.revertedWith("sender is not a bonder")
      })


      it("#1-1-3. enable : policy can call enable (for create market in bondDepository)", async () => {
        expect(await treasuryProxylogic.isPolicy(admin1.address)).to.be.equal(true)
        expect(await treasuryProxylogic.isAdmin(admin1.address)).to.be.equal(true)
        expect(await treasuryProxylogic.isProxyAdmin(admin1.address)).to.be.equal(true)

        expect(
          await treasuryProxylogic.permissions(STATUS.BONDER, bondDepositoryProxy.address)
        ).to.be.equal(false)

        await treasuryProxylogic.connect(admin1).enable(STATUS.BONDER, bondDepositoryProxy.address);

        expect(
          await treasuryProxylogic.permissions(STATUS.BONDER, bondDepositoryProxy.address)
        ).to.be.equal(true)
      })

      it("#1-3-3. create : onlyPolicy can call create", async () => {
          const block = await ethers.provider.getBlock('latest')
          let finishTime = block.timestamp + sellingTime  //2주
          firstMarketlength = await stakingProxylogic.marketIdCounter();

          bondInfoEther.market.closeTime = finishTime;

          await bondDepositoryProxylogic.connect(admin1).create(
              bondInfoEther.token,
              [
                bondInfoEther.market.capAmountOfTos,
                bondInfoEther.market.closeTime,
                bondInfoEther.market.priceTosPerToken,
                bondInfoEther.market.purchasableTOSAmountAtOneTime
              ]
          )
          firstMarketlength = firstMarketlength.add(ethers.constants.One)
          expect(await stakingProxylogic.marketIdCounter()).to.be.equal(firstMarketlength);
      })

      it("#1-3-4. close : user can't call close", async () => {
        await expect(
          bondDepositoryProxylogic.connect(user1).close(firstMarketlength)
        ).to.be.revertedWith("Accessible: Caller is not an policy admin")
      })

      it("#1-3-4. close : onlyPolicy can call close", async () => {
        await bondDepositoryProxylogic.connect(admin1).close(firstMarketlength);

        let marketcapacity = await bondDepositoryProxylogic.markets(firstMarketlength);
        expect(marketcapacity.capacity).to.be.equal(0);
      })

    })

  })


  describe("#2. lockTOS setting", async () => {
    it("#2-1-1. user can't set the stakingContarct", async () => {
      await expect(
        lockTosContract.connect(user1).setStaker(stakingProxylogic.address)
      ).to.be.revertedWith("Accessible: Caller is not an admin")
    })

    it("#2-1-1. onlyLockTOSContract admin set the stakingContarct", async () => {
      await lockTosContract.connect(_lockTosAdmin).setStaker(stakingProxylogic.address);

      let staker = await lockTosContract.staker();
      expect(staker).to.be.equal(stakingProxylogic.address);
    })
  })

  describe("#3. admin test", async () => {
      it("#3-1. addPolicy test", async () => {
        await treasuryProxy.connect(admin1).addPolicy(user6.address)
        expect(await treasuryProxy.isPolicy(user6.address)).to.be.equal(true)
      })

      it("#3-2. deletePolicy test", async () => {
        await treasuryProxy.connect(admin1).deletePolicy(user6.address)
        expect(await treasuryProxy.isPolicy(user6.address)).to.be.equal(false)
      })

      it("#3-3. isAdmin check", async () => {
        expect(await treasuryProxy.isAdmin(admin1.address)).to.be.equal(true)
      })

      it("#3-4. isProxyAdmin check", async () => {
        expect(await treasuryProxy.isProxyAdmin(admin1.address)).to.be.equal(true)
      })

      it("#3-5. addProxyAdmin test", async () => {
        await treasuryProxy.connect(admin1).addProxyAdmin(user5.address);
        expect(await treasuryProxy.isProxyAdmin(user5.address)).to.be.equal(true)
        expect(await treasuryProxy.isAdmin(user5.address)).to.be.equal(false)
      })

      it("#3-5. addPolicy test", async () => {
        await treasuryProxy.connect(user5).addPolicy(user4.address);
        expect(await treasuryProxy.isPolicy(user4.address)).to.be.equal(true)
      })

      it("#3-6. deletePolicy test", async () => {
        await treasuryProxy.connect(user5).deletePolicy(user4.address)
        expect(await treasuryProxy.isPolicy(user4.address)).to.be.equal(false)
      })

  })



});
