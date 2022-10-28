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
let lockTOSProxyabi = require('../abis/LockTOSProxy.json').abi;
let lockTOSProxy2abi = require('../abis/LockTOSv2Proxy.json');
let lockTOSLogic2abi = require('../abis/LockTOSv2Logic0.json');
const { id } = require("@ethersproject/hash");

let treasuryLogicAbi = require('../artifacts/contracts/Treasury.sol/Treasury.json');
let bondDepositoryLogicAbi = require('../artifacts/contracts/BondDepository.sol/BondDepository.json');
let stakingV2LogicAbi = require('../artifacts/contracts/StakingV2.sol/StakingV2.json');

let UniswapV3LiquidityChangerAddress = "0xa839a0e64b27a34ed293d3d81e1f2f8b463c3514";
let totalTosSupplyTarget = ethers.utils.parseEther("1000000");

let tosAdmin = "0x12a936026f072d4e97047696a9d11f97eae47d21";
let lockTosAdmin = "0x15280a52E79FD4aB35F4B9Acbb376DCD72b44Fd1";
let burnTosContractList = [
  "0xbede575486e1f103fbe258a00d046f09e837fa17",
  "0xa13eec91b9e0ee4cf96d8040b3ecc729a37882be",
  "0x14de03d4629c9c4d3bfc38f222b03ada675f64b1",
  "0xb9845e926256dcd54de112e06daa49f53b4f4830",
  "0xe8960d506fec3ec3e2736bf72b495f1ec5a63cc6",
 // "0x0620492babe0a2ce13688025f8b783b8d6c28955" // airdrop 용, 아직 결정 안됨.
]

let burnTosAddressList = [
  "0x70115ba3b49d60776aaa2976adffb5cfabf31689",
  "0x065fb9cc1bc59c9ed74e504e0491e8bc08b9a960",
  "0xa615864e084e369ab2bbe226077f4ae376bb9205",
  "0x9d60f292b049a7655f0b48a2a8d4d27ee66a9329",
  "0x178c2037d085ec47dee56cd16e603202a8b9dd62",
  "0x7c514f4a08ab59d90a1262595d57a69870584568",
  "0xa7c1767c2dd44d34eace5adbb7ed0bd1db61c1b9",
  "0x31a8da16f83d2a155981df1e41f77b823439c8b5",
  "0x18e622d66c63d395720fbabebcba62a560fe49a2",
  "0x3ccfbbc2eebdc793a88db0f824f6bef7f7ee12d5",
  "0xa63b141a6834c05cc3c9fae478661ed18e8fdea5",
  "0x1e26634945a6e756098585335a88882b13d0ad67",
  "0xd213118151117445f8c4c8447fa533213f2f80e8",
  "0xcb585d90c047f5f39b52a96154e02948db0a3178"
]

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

  let _lockTosAdmin;
  let _tosAdmin;

  // mainnet
  let firstEpochNumber = 0;
  let firstEndEpochTime
  let epochLength = 28800; //  8시간
  let mintRate = ethers.BigNumber.from("11261000000000000000000");
  let constRebasePerEpoch = ethers.BigNumber.from("87045050000000")
  let basicBondPeriod = 60*60*24*5 ;  // 본드를 사고, 락업없을때, 기본 락업기간 5일
  let sendAmountEthToTreasury = ethers.utils.parseEther("2000"); //초기에 트래저리에 넣는 이더 량

  let lockTOSProxy2;
  let lockTOSLogic2;

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

  let unstakingAmount = ethers.utils.parseUnits("500", 18);

  let minter_role = "0xf0887ba65ee2024ea881d91b74c2450ef19e1557f03bed3ea9f16b037cbe2dc9";
  let burner_role = "0x9667e80708b6eeeb0053fa0cca44e028ff548e2a9f029edfeac87c118b08b7c8";

  /*
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
  */

  // mainnet
  let wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  let testAddress = ""
  let lockTOSProxyAddress = "0x69b4A202Fa4039B42ab23ADB725aA7b1e9EEBD79"
  let lockTOSProxy2Address = ""
  let lockTOSLogic2Address = ""
  let etherUint = ethers.utils.parseUnits("1", 18);
  // let wtonUint = ethers.utils.parseUnits("1", 27);



  let firstExcute = false;

  let firstMarketlength;
  let checkMarketLength;

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
    console.log('admin1',admin1.address);
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

    await hre.ethers.provider.send("hardhat_impersonateAccount",[tosAdmin]);
    _tosAdmin = await ethers.getSigner(tosAdmin);

  });

  describe("#0. lockTOSContract update", () => {

    it("deploy lockToslogic2Contract ", async () => {

        let factory = new ethers.ContractFactory(lockTOSLogic2abi.abi , lockTOSLogic2abi.bytecode , _lockTosAdmin)
        lockTOSLogic2 = await factory.deploy();
        await lockTOSLogic2.deployed()
        lockTOSLogic2Address = lockTOSLogic2.address;

        let code = await ethers.provider.getCode(lockTOSLogic2.address);
        expect(code).to.not.eq("0x");
      })

      it("deploy lockTOSProxy2 ", async () => {
        let factory = new ethers.ContractFactory(lockTOSProxy2abi.abi , lockTOSProxy2abi.bytecode , _lockTosAdmin)
        lockTOSProxy2 = await factory.deploy();
        await lockTOSProxy2.deployed()
        lockTOSProxy2Address = lockTOSProxy2.address;

        let code = await ethers.provider.getCode(lockTOSProxy2.address);
        expect(code).to.not.eq("0x");
      })

      it("upgrade LockTOSProxy's logic to lockTOSProxy2 ", async () => {
        lockTosContract = new ethers.Contract(lockTOSProxyAddress, lockTOSProxyabi, _lockTosAdmin);
        let tx = await lockTosContract.connect(_lockTosAdmin).upgradeTo(lockTOSProxy2Address);
        await tx.wait();
        expect(await lockTosContract.implementation()).to.be.eq(lockTOSProxy2Address);
      })

      it("set lockTOSProxy2's logic to lockToslogic2Contract ", async () => {
        lockTosContract = new ethers.Contract(lockTOSProxyAddress, lockTOSProxy2abi.abi, _lockTosAdmin);
        let tx = await lockTosContract.connect(_lockTosAdmin).setImplementation2(lockTOSLogic2Address, 0, true);
        await tx.wait();
        expect(await lockTosContract.implementation2(0)).to.be.eq(lockTOSLogic2Address);
      })

      it("lockTOS isAdmin", async () => {
        console.log("_lockTosAdmin.address : ",_lockTosAdmin.address);
        let tx = await lockTosContract.isAdmin(_lockTosAdmin.address);
        console.log("lockTos Admin : ",tx);
      })

      it("bring the newlogic", async () => {
        lockTosContract = new ethers.Contract( lockTOSProxyAddress, lockTOSLogic2abi.abi, ethers.provider);
      })

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
      tosContract = new ethers.Contract( uniswapInfo.tos, tosabi.abi, ethers.provider );
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
      //
      // it("#0-2-2. initialize TreasuryProxy", async () => {
      //   await treasuryProxy.connect(admin1).initialize(
      //     tosContract.address,
      //     TOSValueCalculator.address,
      //     wethAddress
      //   );

      //   let calculAddrCheck = await treasuryProxy.calculator();
      //   expect(calculAddrCheck).to.be.equal(TOSValueCalculator.address);
      //   expect(await treasuryProxy.wethAddress()).to.be.equal(wethAddress);
      //   expect(await treasuryProxy.TOS()).to.be.equal(tosContract.address);
      // })
      //

      it("#0-2-3. TreasuryProxyLogic set", async () => {
        treasuryProxylogic = new ethers.Contract( treasuryProxy.address, treasuryLogicAbi.abi, ethers.provider);
        // console.log(treasuryProxylogic);

      })
    })


    describe("#0-5-1. burn TOS of Contracts", () => {
      it("#0-5-1-1. grantRole: give the burnRole to tosAdmin ", async () => {
        await tosContract.connect(_tosAdmin).grantRole(burner_role, tosAdmin);

        let tx = await tosContract.hasRole(burner_role,tosAdmin);
        expect(tx).to.be.equal(true);
      })

      it("#0-5-1-2. burn TOS of Contracts  ", async () => {

        let totalSupplyPrev = await tosContract.totalSupply();
        console.log('TOS totalSupply before burnning',totalSupplyPrev);

        let burnTosAmount = ethers.constants.Zero;
        for (let i = 0; i < burnTosContractList.length; i++){
          let balance = await tosContract.balanceOf(burnTosContractList[i]);
          let tx = await tosContract.connect(_tosAdmin).burn(burnTosContractList[i], balance);
          await tx.wait();
          burnTosAmount = burnTosAmount.add(balance);
        }

        let totalSuppley = await tosContract.totalSupply();
        console.log('TOS totalSupply after burnning',totalSuppley);

        expect(totalSuppley).to.be.equal(totalSupplyPrev.sub(burnTosAmount));
      })


      it("#0-5-1-3. burn TOS of EOA ", async () => {

        let totalSupplyPrev = await tosContract.totalSupply();
        console.log('TOS totalSupply before burnning',totalSupplyPrev);

        let burnTosAmount = ethers.constants.Zero;
        for (let i = 0; i < burnTosAddressList.length; i++){
          let balance = await tosContract.balanceOf(burnTosAddressList[i]);
          let tx = await tosContract.connect(_tosAdmin).burn(burnTosAddressList[i], balance);
          await tx.wait();
          burnTosAmount = burnTosAmount.add(balance);
        }

        let totalSuppley = await tosContract.totalSupply();
        console.log('TOS totalSupply after burnning',totalSuppley);

        expect(totalSuppley).to.be.equal(totalSupplyPrev.sub(burnTosAmount));
      })



    });


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

      // it("#0-3-2. initialize StakingProxy", async () => {
      //   const block = await ethers.provider.getBlock('latest')
      //   firstEndEpochTime = block.timestamp + epochLength;

      //   await stakingProxy.connect(admin1).initialize(
      //     uniswapInfo.tos,
      //     [epochLength, firstEndEpochTime],
      //     lockTosContract.address,
      //     treasuryProxy.address,
      //     basicBondPeriod
      //   );

      //   expect(await stakingProxy.treasury()).to.be.equal(treasuryProxy.address);
      //   expect(await stakingProxy.basicBondPeriod()).to.be.equal(basicBondPeriod);
      //   expect(await stakingProxy.lockTOS()).to.be.equal(lockTosContract.address);
      //   let epochInfo = await stakingProxy.epoch();
      //   expect(epochInfo.length_).to.be.equal(epochLength);
      //   expect(epochInfo.number).to.be.equal(firstEpochNumber);
      //   expect(epochInfo.end).to.be.eq(firstEndEpochTime);
      // })

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

      // it("#0-4-2. initialize : initialize bondDepositoryProxy", async () => {
      //   await bondDepositoryProxy.connect(admin1).initialize(
      //     uniswapInfo.tos,
      //     stakingProxy.address,
      //     treasuryProxy.address,
      //     TOSValueCalculator.address,
      //     uniswapInfo.poolfactory
      //   )

      //   expect(await bondDepositoryProxy.calculator()).to.be.equal(TOSValueCalculator.address);
      //   expect(await bondDepositoryProxy.tos()).to.be.equal(uniswapInfo.tos);
      //   expect(await bondDepositoryProxy.staking()).to.be.equal(stakingProxy.address);
      //   expect(await bondDepositoryProxy.treasury()).to.be.equal(treasuryProxy.address);
      //   expect(await bondDepositoryProxy.uniswapV3Factory()).to.be.equal(uniswapInfo.poolfactory);

      // })

      it("#0-4-3. stakingProxyLogic set", async () => {
        bondDepositoryProxylogic = new ethers.Contract(bondDepositoryProxy.address, bondDepositoryLogicAbi.abi, ethers.provider);
      })
    })

  })


  describe("#1. setting the contract", () => {

    it("grantRole: give the mintRole to treasury", async () => {
      await tosContract.connect(_tosAdmin).grantRole(minter_role, tosAdmin);

      let tx = await tosContract.hasRole(minter_role,tosAdmin);
      expect(tx).to.be.equal(true);
    })

    it("for test : tos admin mint tos ", async () => {
      await tosContract.connect(_tosAdmin).mint(tosAdmin, ethers.utils.parseEther("10000","Ether"));

    })

    it("grantRole: give the mintRole to treasury", async () => {
      await tosContract.connect(_tosAdmin).grantRole(minter_role,treasuryProxy.address);

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

      // it("#1-1-3. policy can call enable (for create market in bondDepository)", async () => {
      //   expect(await treasuryProxylogic.isPolicy(admin1.address)).to.be.equal(true)
      //   expect(await treasuryProxylogic.isAdmin(admin1.address)).to.be.equal(true)
      //   expect(await treasuryProxylogic.isProxyAdmin(admin1.address)).to.be.equal(true)

      //   expect(
      //     await treasuryProxylogic.permissions(STATUS.BONDER, bondDepositoryProxy.address)
      //   ).to.be.equal(false)

      //   await treasuryProxylogic.connect(admin1).enable(STATUS.BONDER, bondDepositoryProxy.address);

      //   expect(
      //     await treasuryProxylogic.permissions(STATUS.BONDER, bondDepositoryProxy.address)
      //   ).to.be.equal(true)
      // })

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

        let amount = sendAmountEthToTreasury;

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
        // bondInfoEther.market.closeTime = finishTime;

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

          // bondInfoEther.market.closeTime = finishTime;

          await bondDepositoryProxylogic.connect(admin1).create(
              bondInfoEther.token,
              [
                bondInfoEther.market.capAmountOfTos,
                bondInfoEther.market.closeTime,
                bondInfoEther.market.priceTosPerToken,
                bondInfoEther.market.purchasableTOSAmountAtOneTime
              ]
          )

          firstMarketlength = firstMarketlength.add(ethers.constants.One);
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

  describe("#3-1. bondDepository function test", async () => {

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

  });

  describe("#4. Check Used Gas Of Functions ", async () => {

    it("#4-1. Basic Bond  : 첫번째 기본 본딩 ", async () => {

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

    it("#4-2. LTOS Stake : 최초 스테이킹 ", async () => {
    });

    it("#4-3. LTOS Stake : 두번째 스테이킹 ", async () => {
    });

    it("#4-4. Basic Bond  : 두번째 기본 본딩 ", async () => {
    });

    it("#4-5. Lockup Bond  : 기간 락업 본딩 ", async () => {
    });

    it("#4-6. Lockup Stake : 기간 락업 스테이킹 ", async () => {

    })

    it("#4-7. LTOS Stake Unstake : LTOS 언스테이킹 ", async () => {


    })

    it("#4-8. Lockup Stake Manage : 물량증가 ", async () => {

    })

    it("#4-9. Lockup Stake Manage : 기간증가 ", async () => {

    })

    it("#4-10. Lockup Stake Manage : 물량과 기간 동시 증가 ", async () => {

    })
    it("#4-11. Lockup Bond Manage : 물량증가 ", async () => {

    })

    it("#4-12. Lockup Bond Manage : 기간증가 ", async () => {

    })

    it("#4-13. Lockup Bond Manage : 물량과 기간 동시 증가 ", async () => {

    })

    it("#4-14. Relock : 토스추가 & 기간설정  ", async () => {

    })

    it("#4-15. Relock : 추가 토스없이 기간설정  ", async () => {

    })

  })

});
