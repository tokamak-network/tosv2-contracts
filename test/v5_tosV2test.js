// const { expect } = require("chai");
// const { ethers } = require("hardhat");

const chai = require("chai");
const { solidity } = require("ethereum-waffle");
const { expect, assert } = chai;

const JSBI = require('jsbi');

//chai.use(require("chai-bn")(BN));
chai.use(solidity);
require("chai").should();
const univ3prices = require('@thanpolas/univ3prices');
const utils = require("./utils");

// const { expect } = require("chai");
const { ethers } = require("hardhat");
const Web3EthAbi = require('web3-eth-abi');
const {
  keccak256,
} = require("web3-utils");
const bn = require('bignumber.js');

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
let lockTOSProxy2abi = require('../abis/LockTOSProxy2_ABI.json');;
let lockTOSLogic2abi = require('../abis/LockTOSLogic2_ABI.json');
const { id } = require("@ethersproject/hash");

let treasuryLogicAbi = require('../artifacts/contracts/Treasury.sol/Treasury.json');
let bondDepositoryLogicAbi = require('../artifacts/contracts/BondDepository.sol/BondDepository.json');
let stakingV2LogicAbi = require('../artifacts/contracts/StakingV2.sol/StakingV2.json');

let UniswapV3LiquidityChangerAddress = "0xa839a0e64b27a34ed293d3d81e1f2f8b463c3514";


describe("price test", function () {
  //시나리오 : https://www.notion.so/onther/BondDepository-StakingV2-scenario-Suah-497853d6e65f48a390255f3bca29fa36

  let provider;
  let nonfungiblePositionManager, uniswapV3Pool, uniswapV3LiquidityChanger ;

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

  let firstEpochNumber = 0;
  let firstEndEpochTime
  let epochLength = 28800;  //8시간
  // let epochUnit = 60;   //test epochUnit
  let epochUnit = 604800;   //rinkeby epochUnit

  let depositTime;
  let depositTime2;
  let unstakingTime;

  let stakeIdcheck;
  let balanceOfLTOS;
  let stakingBalanceLTOS;
  let totalLTOS;

  let sellingTime = 604800 * 2;

  let sellTosAmount = ethers.utils.parseUnits("10000", 18); //1ETH = 1000TOS 라서 10ETH받으면 끝임
  let overdepositAmount = ethers.utils.parseUnits("5", 18);     //over deposit상황
  let depositAmount = ethers.utils.parseUnits("2", 18);         //2ETH를 deposit하면 200LTOS를받음 (index가 10일때) -> 20000TOS가 생기고 2000TOS가 스테이킹됨 -> 18000TOS가 treasury에 있음// 2000TOS는 stakingContract에 있음
  let depositAmount2 = ethers.utils.parseUnits("3", 18);        //3ETH를 deposit하면 300LTOS를 받음 (index가 10일때) index가 19면? -> 157.89~를 받음
  let onePayout = ethers.utils.parseUnits("3000", 18);    //한번에 3000TOS 이상 살수 없음

  let unstakingLTOS = ethers.utils.parseUnits("100", 18);    //100LTOS unstaking
  let user1TOSstaking = ethers.utils.parseUnits("20", 18);    //20TOS staking
  let user3TOSstaking = ethers.utils.parseUnits("5", 18);    //5TOS staking
  let user3UnstakingLTOS = ethers.utils.parseUnits("5", 16); //0.05LTOS unstaking
  let user4TOSstaking = ethers.utils.parseUnits("1", 18);    //1TOS staking
  let user4UnstakingLTOS = ethers.utils.parseUnits("1", 16); //0.01LTOS unstaking

  let beforetosAmount;
  let aftertosAmount;

  //let mintRate = 10;
  let mintRate = 1000000;

  let unstakingAmount = ethers.utils.parseUnits("500", 18); 

  let ETHPrice = 1000000
  let TOSPrice = 1000

  let minter_role = "0xf0887ba65ee2024ea881d91b74c2450ef19e1557f03bed3ea9f16b037cbe2dc9";

  let testAddress = "0xcc0E10d30EeF023D98E6B73c019A9Ed617f1007C"
  let lockTOSProxyAddress = "0x5adc7de3a0B4A4797f02C3E99265cd7391437568"
  let lockTOSProxy2Address = "0x5FA8C7673B6693cCE8991C10fCd2b9A1bA775b7B"
  // let lockTOSLogic2Address = "0x50b8Ee0cCc76f66fFA669aA56218B3964dae4E78"
  let lockTOSLogic2Address = "0x2835Ac44185091368858948dc791A364E5fb7733"
  let etherUint = ethers.utils.parseUnits("1", 18);     
  // let wtonUint = ethers.utils.parseUnits("1", 27);     

  let firstExcute = true;

  let firstMarketlength;

  // let basicBondPeriod = 86400 * 5;
  let basicBondPeriod = 300;

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
  
  before(async () => {
    accounts = await ethers.getSigners();
    [admin1, admin2, user1, user2, user3, user4, user5, user6 ] = accounts;
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
      "0x8ac7230489e80000",
    ]);
    await hre.ethers.provider.send("hardhat_setBalance", [
      user1.address,
      "0x8ac7230489e80000",
    ]);
    await hre.ethers.provider.send("hardhat_setBalance", [
      user2.address,
      "0x8ac7230489e80000",
    ]);

  });

  describe("#0. lockTOSContract update", () => {
    if(firstExcute == false) {
      it("bring the LockTOSProxyContract", async () => {
        lockTosContract = new ethers.Contract( lockTOSProxyAddress, lockTOSProxyabi, ethers.provider);
    
        let code = await ethers.provider.getCode(lockTosContract.address);
        expect(code).to.not.eq("0x");
      })
  
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
  
      it("lockTOSProxy upgrade", async () => {
        await lockTosContract.connect(admin1).upgradeTo(lockTos2Contract.address);
  
        let tx = lockTosContract.connect(admin1).upgradeTo(lockTos2Contract.address);
        await expect(tx).to.be.revertedWith('LockTOSProxy: same');
      })
  
      it("bring the newLockTOSProxyContract", async () => {
        lockTosContract = new ethers.Contract( lockTOSProxyAddress, lockTOSProxy2abi, ethers.provider);
      })
  
      it("lockTOSProxy2 setimpletation", async () => {
        await lockTosContract.connect(admin1).setImplementation2(lockToslogic2Contract.address,0,true);
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
      TOSValueCalculator = await tosCalculator.deploy();
      await TOSValueCalculator.deployed();
  
      let code = await ethers.provider.getCode(TOSValueCalculator.address);
      expect(code).to.not.eq("0x");
      // console.log(TOSValueCalculator.address);
    });

    it("#0-0-1. initialize TOSCalculator", async () => {
      await TOSValueCalculator.initialize(
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

    describe("#0-2. Deploy Treasury", () => {
      it("#0-2-0. Deploy Treasury Logic", async () => {
        treasurycont = await ethers.getContractFactory("Treasury");
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

      it("#0-2-2. initialize TreasuryProxy", async () => {
        await treasuryProxy.connect(admin1).initialize(
          tosContract.address,
          TOSValueCalculator.address
        );

        let calculAddrCheck = await treasuryProxy.calculator();
        expect(calculAddrCheck).to.be.equal(TOSValueCalculator.address);
      })

      it("#0-2-3. TreasuryProxyLogic set", async () => {
        treasuryProxylogic = new ethers.Contract( treasuryProxy.address, treasuryLogicAbi.abi, ethers.provider);
        // console.log(treasuryProxylogic);
      })
    })

    describe("#0-3. Deploy Staking", () => {
      it("#0-3-0. Deploy Staking Logic", async () => {
        stakingcont = await ethers.getContractFactory("StakingV2");
        stakingContract = await stakingcont.deploy();
        await stakingContract.deployed();


        let code = await ethers.provider.getCode(treasuryContract.address);
        // console.log("treasuryContract.address : ", treasuryContract.address)
        expect(code).to.not.eq("0x");
      })

      it("#0-3-1. Deploy Staking Proxy", async () => {
        stakingcont = await ethers.getContractFactory("StakingV2Proxy");
        stakingProxy = await stakingcont.connect(admin1).deploy();
        await stakingProxy.deployed();

        await stakingProxy.connect(admin1).upgradeTo(stakingContract.address);
      })

      it("#0-3-2. initialize StakingProxy", async () => {
        const block = await ethers.provider.getBlock('latest')
        firstEndEpochTime = block.timestamp + epochLength;
        // console.log(firstEndEpochTime);
        await stakingProxy.connect(admin1).initialize(
          uniswapInfo.tos,
          [epochLength,firstEpochNumber,firstEndEpochTime,epochUnit],
          lockTosContract.address,
          treasuryProxy.address
        )

        let treasuryAddr = await stakingProxy.treasury();
        expect(treasuryAddr).to.be.equal(treasuryProxy.address);
      })

      it("#0-3-3. stakingProxyLogic set", async () => {
        stakingProxylogic = new ethers.Contract( stakingProxy.address, stakingV2LogicAbi.abi, ethers.provider);
      })
    })

    describe("#0-4. Deploy BondDepository", () => {
      it("#0-4-0. Deploy BondDepository logic", async () => {
        bondDepositorycont = await ethers.getContractFactory("BondDepository");
        bondDepositoryContract = await bondDepositorycont.deploy();
        await bondDepositoryContract.deployed();

        let code = await ethers.provider.getCode(bondDepositoryContract.address);
        // console.log("bondDepositoryContract.address : ", bondDepositoryContract.address)
        expect(code).to.not.eq("0x");
      })

      it("#0-4-1. Deploy BondDepository Proxy", async () => {
        bondDepositorycont = await ethers.getContractFactory("BondDepositoryProxy");
        bondDepositoryProxy = await bondDepositorycont.connect(admin1).deploy();
        await bondDepositoryProxy.deployed();

        await bondDepositoryProxy.connect(admin1).upgradeTo(bondDepositoryContract.address);
      })

      it("#0-4-2. initialize bondDepositoryProxy", async () => {
        await bondDepositoryProxy.connect(admin1).initialize(
          uniswapInfo.tos,
          uniswapInfo.wton,
          stakingProxy.address,
          treasuryProxy.address,
          TOSValueCalculator.address
        )

        let calculAddrCheck = await bondDepositoryProxy.calculator();
        expect(calculAddrCheck).to.be.equal(TOSValueCalculator.address);
      })

      it("#0-4-3. stakingProxyLogic set", async () => {
        bondDepositoryProxylogic = new ethers.Contract( bondDepositoryProxy.address, bondDepositoryLogicAbi.abi, ethers.provider);
      })
    })
  
  })

  describe("#1. setting the contract", () => {
    it("give the mintRole to treasury", async () => {
      await tosContract.connect(admin1).grantRole(minter_role,treasuryProxy.address);
  
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
  
      it("#1-1-1. user can't call addPolicy", async () => {
        await expect(
          treasuryProxy.connect(user1).addPolicy(admin1.address)
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")      
      })
  
      it("#1-1-1. onlyProxyAdmin can call addPolicy", async () => {
        await treasuryProxy.connect(admin1).addPolicy(admin1.address)
        expect(await treasuryProxy.isPolicy(admin1.address)).to.be.equal(true)
      })
  
      it("#1-1-2. user can't call initialize", async () => {
        await expect(
          treasuryProxy.connect(user1).initialize(
            tosContract.address,
            TOSValueCalculator.address
          )
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")      
      })
  
      it("#1-1-2. onlyProxyAdmin can call initialize", async () => {
        await treasuryProxy.connect(admin1).initialize(
          tosContract.address,
          TOSValueCalculator.address  
        )
  
        let calculAddrCheck = await treasuryProxylogic.calculator();
        expect(calculAddrCheck).to.be.equal(TOSValueCalculator.address);
      })
      
      it("#1-1-3. user can't call enable (for mint)", async () => {
        await expect(
          treasuryProxylogic.connect(user1).enable(
            7,
            bondDepositoryProxy.address
          )
        ).to.be.revertedWith("Accessible: Caller is not an policy admin")      
      })
  
      it("#1-1-3. policy can call enable (for mint bondDepository)", async () => {
        expect(await treasuryProxylogic.isPolicy(admin1.address)).to.be.equal(true)
        expect(await treasuryProxylogic.isAdmin(admin1.address)).to.be.equal(true)
        expect(await treasuryProxylogic.isProxyAdmin(admin1.address)).to.be.equal(true)

        await treasuryProxylogic.connect(admin1).enable(7,bondDepositoryProxy.address);

        let checkPermission = await treasuryProxylogic.permissions(7,bondDepositoryProxy.address);

        expect(checkPermission).to.be.equal(true)
      })
  
      it("#1-1-3. policy can call enable (for mint staking)", async () => {
        let checkPermission1 = await treasuryProxylogic.permissions(7,stakingProxy.address);
        expect(checkPermission1).to.be.equal(false)
  
        await treasuryProxylogic.connect(admin1).enable(7,stakingProxy.address);
  
        let checkPermission2 = await treasuryProxylogic.permissions(7,stakingProxy.address);
        expect(checkPermission2).to.be.equal(true)
      })
  
      it("#1-1-4. user can't call approve (stakingV2)", async () => {
        await expect(
          treasuryProxylogic.connect(user1).approve(
            stakingProxy.address
          )
        ).to.be.revertedWith("Accessible: Caller is not an policy admin")      
      })
  
      it("#1-1-4. policy can call approve (stakingV2)", async () => {
        let beforeApprove = await tosContract.allowance(treasuryProxy.address, stakingProxy.address);
        expect(beforeApprove).to.be.equal(0)
        await treasuryProxylogic.connect(admin1).approve(stakingProxy.address)
  
        let afterApprove = await tosContract.allowance(treasuryProxy.address, stakingProxy.address);
        expect(afterApprove).to.be.above(0)
      })
  
      it("#1-1-5. user can't call disable", async () => {
        await expect(
          treasuryProxylogic.connect(user1).disable(
            7,
            stakingProxy.address        )
        ).to.be.revertedWith("Accessible: Caller is not an policy admin")  
      })
  
      it("#1-1-5. policy can call disable", async () => {
          let checkPermission1 = await treasuryProxylogic.permissions(7,stakingProxy.address);
          expect(checkPermission1).to.be.equal(true)
  
          await treasuryProxylogic.connect(admin1).disable(7,stakingProxy.address);
  
          let checkPermission2 = await treasuryProxylogic.permissions(7,stakingProxy.address);
          expect(checkPermission2).to.be.equal(false)
  
          await treasuryProxylogic.connect(admin1).enable(7,stakingProxy.address);
      })
    })

    describe("#1-2. Staking setting", async () => {
      it("#1-2. Staking admin, proxyAdmin, policyAdmin check", async () => {
        expect(await stakingProxy.isAdmin(admin1.address)).to.be.equal(true)
        expect(await stakingProxy.isProxyAdmin(admin1.address)).to.be.equal(true)
  
        expect(await stakingProxy.isPolicy(admin1.address)).to.be.equal(false)
      })

      it("#1-2-1. user can't call addPolicy", async () => {
        await expect(
          stakingProxy.connect(user1).addPolicy(admin1.address)
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")      
      })
  
      it("#1-2-1. onlyProxyAdmin can call addPolicy", async () => {
        await stakingProxy.connect(admin1).addPolicy(admin1.address)
        expect(await stakingProxy.isPolicy(admin1.address)).to.be.equal(true)
      })

      it("#1-2-2. user can't call initialize", async () => {
        await expect(
          stakingProxy.connect(user1).initialize(
            uniswapInfo.tos,
            [epochLength,firstEpochNumber,firstEndEpochTime,epochUnit],
            lockTosContract.address,
            treasuryProxy.address
          )
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")      
      })
  
      it("#1-2-2. onlyProxyAdmin can call initialize", async () => {
        const block = await ethers.provider.getBlock('latest')
        firstEndEpochTime = block.timestamp + epochLength;
        console.log("firstEndEpochTime :", firstEndEpochTime);

        await stakingProxy.connect(admin1).initialize(
          uniswapInfo.tos,
          [epochLength,firstEpochNumber,firstEndEpochTime,epochUnit],
          lockTosContract.address,
          treasuryProxy.address
        )

        let treasuryAddr = await stakingProxylogic.treasury();
        expect(treasuryAddr).to.be.equal(treasuryProxy.address);
      })

      it("#1-2-3. user can't call setRebasePerepoch", async () => {
        let rebasePerEpoch = ethers.utils.parseUnits("1", 17) //index가 0.1크기만큼 증가
        await expect(
          stakingProxylogic.connect(user1).setRebasePerepoch(rebasePerEpoch)
        ).to.be.revertedWith("Accessible: Caller is not an policy admin")
      })

      it("#1-2-3. onlyPolicyAdmin can call setRebasePerepoch", async () => {
        let rebasePerEpoch = ethers.utils.parseUnits("1", 17) //index가 0.1크기만큼 증가
        await stakingProxylogic.connect(admin1).setRebasePerepoch(rebasePerEpoch);
        expect((await stakingProxylogic.rebasePerEpoch())).to.be.equal(rebasePerEpoch)
      })

      it("#1-2-4. user can't call setindex", async () => {
        let index = ethers.utils.parseUnits("10", 18)
        await expect(
          stakingProxylogic.connect(user1).setindex(index)
        ).to.be.revertedWith("Accessible: Caller is not an policy admin")
      })

      it("#1-2-4. onlyPolicyAdmin can call setindex", async () => {
        let epochtestbefore = await stakingProxylogic.epoch();
  
        expect(epochtestbefore.length_).to.be.equal(28800); 

        let index = ethers.utils.parseUnits("10", 18)
        await stakingProxylogic.connect(admin1).setindex(index);
        expect((await stakingProxylogic.index_())).to.be.equal(index)
      })

      it("#1-2-5. user can't call setBasicBondPeriod", async () => {
        await expect(
          stakingProxylogic.connect(user1).setBasicBondPeriod(basicBondPeriod)
        ).to.be.revertedWith("Accessible: Caller is not an policy admin")
      })

      it("#1-2-5. onlyPolicyAdmin can call setBasicBondPeriod", async () => {
        await stakingProxylogic.connect(admin1).setBasicBondPeriod(basicBondPeriod)
        expect((await stakingProxylogic.basicBondPeriod())).to.be.equal(basicBondPeriod);
      })

    })

    describe("#1-3. BondDepository setting", async () => {
      it("#1-3. BondDepository admin, proxyAdmin, policyAdmin check", async () => {
        expect(await bondDepositoryProxy.isAdmin(admin1.address)).to.be.equal(true)
        expect(await bondDepositoryProxy.isProxyAdmin(admin1.address)).to.be.equal(true)
  
        expect(await bondDepositoryProxy.isPolicy(admin1.address)).to.be.equal(false)
      })

      it("#1-3-1. user can't call addPolicy", async () => {
        await expect(
          bondDepositoryProxy.connect(user1).addPolicy(admin1.address)
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")      
      })
  
      it("#1-3-1. onlyProxyAdmin can call addPolicy", async () => {
        await bondDepositoryProxy.connect(admin1).addPolicy(admin1.address)
        expect(await bondDepositoryProxy.isPolicy(admin1.address)).to.be.equal(true)
      })

      it("#1-3-2. user can't call initialize", async () => {
        await expect(
          bondDepositoryProxy.connect(user1).initialize(
            uniswapInfo.tos,
          uniswapInfo.wton,
          stakingProxy.address,
          treasuryProxy.address,
          TOSValueCalculator.address
          )
        ).to.be.revertedWith("Accessible: Caller is not an proxy admin")      
      })
  
      it("#1-3-2. onlyProxyAdmin can call initialize", async () => {
        await bondDepositoryProxy.connect(admin1).initialize(
          uniswapInfo.tos,
          uniswapInfo.wton,
          stakingProxy.address,
          treasuryProxy.address,
          TOSValueCalculator.address
        )

        let treasuryAddr = await bondDepositoryProxylogic.treasury();
        expect(treasuryAddr).to.be.equal(treasuryProxy.address);
      })

      it("#1-3-3. user can't call setMR(mintRate)", async () => {
        await expect(
          bondDepositoryProxylogic.connect(user1).setMR(mintRate)
        ).to.be.revertedWith("Accessible: Caller is not an policy admin") 
      })

      it("#1-3-3. onlyPolicyAdmin can call setMR(mintRate)", async () => {
        await bondDepositoryProxylogic.connect(admin1).setMR(mintRate);

        let checkMR = await bondDepositoryProxylogic.mintRate();
        expect(checkMR).to.be.equal(mintRate);
      })

      it("#1-3-4. user can't call addTranser", async () => {
        await expect(
          bondDepositoryProxylogic.connect(user1).addTransfer(user1.address,3)
        ).to.be.revertedWith("Accessible: Caller is not an policy admin") 
      })

      it("#1-3-4. onlyPolicyAdmin can call addTranser", async () => {
        //3%
        let inputPercent = 3
        await bondDepositoryProxylogic.connect(admin1).addTransfer(user1.address,inputPercent);
        
        let checkPercent = await bondDepositoryProxylogic.totalPercents();
        expect(checkPercent).to.be.equal(inputPercent);
      })

      it("#1-3-5. user can't call transferChange", async () => {
        await expect(
          bondDepositoryProxylogic.connect(user1).transferChange(0,user2.address,5)
        ).to.be.revertedWith("Accessible: Caller is not an policy admin") 
      })

      it("#1-3-5. onlyPolicyAdmin can call transferChange", async () => {
        let inputPercent = 5
        await bondDepositoryProxylogic.connect(admin1).transferChange(0,user2.address,inputPercent);

        let checkPercent = await bondDepositoryProxylogic.totalPercents();
        expect(checkPercent).to.be.equal(inputPercent);
      })

      it("#1-3-6. user can't call create", async () => {
        const block = await ethers.provider.getBlock('latest')
        let finishTime = block.timestamp + sellingTime  //2주
        await expect(
          bondDepositoryProxylogic.connect(user1).create(
            true,
            admin1.address,
            uniswapInfo.tosethPool,
            0,
            [sellTosAmount,finishTime,ETHPrice,TOSPrice,onePayout]
          )
        ).to.be.revertedWith("Accessible: Caller is not an policy admin")
      })

      it("#1-3-6. onlyPolicy can call create", async () => {
        const block = await ethers.provider.getBlock('latest')
        let finishTime = block.timestamp + sellingTime  //2주
        firstMarketlength = await bondDepositoryProxylogic.marketsLength();

        await bondDepositoryProxylogic.connect(admin1).create(
            true,
            admin1.address,
            uniswapInfo.tosethPool,
            0,
            [sellTosAmount,finishTime,ETHPrice,TOSPrice,onePayout]
        )
      })

      it("#1-3-7. user can't call close", async () => {
        await expect(
          bondDepositoryProxylogic.connect(user1).close(firstMarketlength)
        ).to.be.revertedWith("Accessible: Caller is not an policy admin")
      })

      it("#1-3-7. onlyPolicy can call close", async () => {
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
      await lockTosContract.connect(admin1).setStaker(stakingProxylogic.address);
  
      let staker = await lockTosContract.staker();
      expect(staker).to.be.equal(stakingProxylogic.address);
    })
  })

  describe("#3-1. bondDepository function test", async () => {
    it("#3-1-1. user don't create the ETH market", async () => {
      const block = await ethers.provider.getBlock('latest')
      let finishTime = block.timestamp + sellingTime  //2주
      let marketbefore = await bondDepositoryProxylogic.marketsLength();
      console.log(marketbefore)
      await bondDepositoryProxylogic.connect(admin1).create(
          true,
          admin1.address,
          uniswapInfo.tosethPool,
          0,
          [sellTosAmount,finishTime,ETHPrice,TOSPrice,onePayout]
      )
      let marketafter = await bondDepositoryProxylogic.marketsLength();
      console.log(marketafter)
      expect(Number(marketbefore)+1).to.be.equal(marketafter);
    })

    it("#3-1-1. create the ETH market", async () => {
      const block = await ethers.provider.getBlock('latest')
      let finishTime = block.timestamp + sellingTime  //2주
      let marketbefore = await bondDepositoryProxylogic.marketsLength();
      console.log(marketbefore)
      await bondDepositoryProxylogic.connect(admin1).create(
          true,
          admin1.address,
          uniswapInfo.tosethPool,
          0,
          [sellTosAmount,finishTime,ETHPrice,TOSPrice,onePayout]
      )
      let marketafter = await bondDepositoryProxylogic.marketsLength();
      console.log(marketafter)
      expect(Number(marketbefore)+1).to.be.equal(marketafter);
    })

    it("#3-1-2. overDeposit situration", async () => {
      const block = await ethers.provider.getBlock('latest')
      depositTime = block.timestamp

      let beforetosTreasuryAmount = await tosContract.balanceOf(treasuryProxylogic.address)
      expect(beforetosTreasuryAmount).to.be.equal(0)

      let marketlength = await bondDepositoryProxylogic.marketsLength();
      
      await expect(
        bondDepositoryProxylogic.connect(admin1).ETHDeposit(
          (marketlength-1),
          overdepositAmount,
          1,
          false,
          {value: overdepositAmount}
        )
      ).to.be.revertedWith("Depository : over maxPay");


      let aftertosTreasuryAmount = await tosContract.balanceOf(treasuryProxylogic.address)

      expect(aftertosTreasuryAmount).to.be.equal(0)
    })

    it("#3-1-3. deposit ETHmarket with sTOS and index increase test", async () => {
      let beforeindex = await stakingProxylogic.index_()
      console.log("beforeindex : ", beforeindex)

      const block = await ethers.provider.getBlock('latest')
      depositTime = block.timestamp
      
      let epoch = await stakingProxylogic.epoch();
      console.log("block.timestamp :", block.timestamp);
      console.log("epoch.end1 :", epoch.end);

      if(block.timestamp < epoch.end) {
        console.log("in update blockTime");
        await ethers.provider.send('evm_setNextBlockTimestamp', [Number(epoch.end) + 10]);
        await ethers.provider.send('evm_mine');
      }

      let beforetosTreasuryAmount = await tosContract.balanceOf(treasuryProxylogic.address)
      let beforetosUser2Amount = await tosContract.balanceOf(user2.address)

      let marketlength = await bondDepositoryProxylogic.marketsLength();
      console.log("marketlength : ", marketlength);

      expect(beforetosTreasuryAmount).to.be.equal(0)
      
      await bondDepositoryProxylogic.connect(admin1).ETHDeposit(
        (marketlength-1),
        depositAmount,
        1,
        true,
        {value: depositAmount}
      );

      let epochtime = await stakingProxylogic.epoch();
      console.log("epoch.end2 :", epochtime.end)
      let afterindex = await stakingProxylogic.index_()
      console.log("beforeindex :", beforeindex)
      console.log("afterindex :", afterindex)
      // expect(afterindex).to.be.above(beforeindex)

      //18000TOS가 treasury에 있음
      let aftertosTreasuryAmount = await tosContract.balanceOf(treasuryProxylogic.address)
      let aftertosUser2Amount = await tosContract.balanceOf(user2.address)
      // console.log("aftertosTreasuryAmount : ", aftertosTreasuryAmount)

      expect(aftertosTreasuryAmount).to.above(0)
      expect(aftertosUser2Amount).to.above(beforetosUser2Amount)
    })

    it("#3-1-4. user can deposit without sTOS", async () => {
      let marketlength = await bondDepositoryProxylogic.marketsLength();
      console.log("marketlength : ", marketlength);

      const block = await ethers.provider.getBlock('latest')
      depositTime = block.timestamp

      await bondDepositoryProxylogic.connect(user1).ETHDeposit(
        (marketlength-1),
        depositAmount2,
        0,
        false,
        {value: depositAmount2}
      )

      let arrayCheck = await stakingProxylogic.stakinOf(user1.address);
      console.log("stakinOf :", arrayCheck);
      let LTOScheck = await stakingProxylogic.balanceOfId(Number(arrayCheck[1]));
      expect(Number(LTOScheck)).to.be.above(0);
    })

    it("#3-1-5. user1 is not unstaking for basicBondPeriod", async () => {
      let arrayCheck = await stakingProxylogic.stakinOf(user1.address);

      let beforeBalance = await stakingProxylogic.balanceOfId(Number(arrayCheck[1]));

      await expect(
        stakingProxylogic.connect(user1).unstake(Number(arrayCheck[1]),unstakingLTOS)
      ).to.be.revertedWith("need the endPeriod");

      let stakeInfo = await stakingProxylogic.stakingBalances(user1.address,Number(arrayCheck[1]))
      console.log("depositTime : ",depositTime);
      console.log("stakeInfo.endTime : ",stakeInfo.endTime);

      await stakingProxylogic.connect(user1).unstakeId(Number(arrayCheck[1]));
      let afterBalance = await stakingProxylogic.balanceOfId(Number(arrayCheck[1]));

      expect(beforeBalance).to.be.equal(afterBalance);
    }) 

    it("#3-1-6. user1 can unstaking after basicBondPeriod", async () => {
      let arrayCheck = await stakingProxylogic.stakinOf(user1.address);
      let stakeInfo = await stakingProxylogic.stakingBalances(user1.address,Number(arrayCheck[1]))
      
      await ethers.provider.send('evm_setNextBlockTimestamp', [Number(stakeInfo.endTime) + 5]);
      await ethers.provider.send('evm_mine');

      let beforeBalance = await stakingProxylogic.balanceOfId(Number(arrayCheck[1]));
      console.log("beforeBalance :", beforeBalance);

      let beforeTOS = await tosContract.balanceOf(user1.address);
      console.log("beforeTOS :", beforeTOS);
      await stakingProxylogic.connect(user1).unstakeId(Number(arrayCheck[1]));

      let newStakeInfo = await stakingProxylogic.allStakings(Number(arrayCheck[1]))
      console.log("newStakeInfo.LTOS :",newStakeInfo.LTOS)
      console.log("newStakeInfo.getLTOS :",newStakeInfo.getLTOS)

      let afterBalance = await stakingProxylogic.balanceOfId(Number(arrayCheck[1]));
      console.log(afterBalance);
      let afterTOS = await tosContract.balanceOf(user1.address);

      expect(beforeBalance).to.be.above(afterBalance);
      expect(afterTOS).to.be.above(beforeTOS);
    })

    it("#3-1-7. user can't deposit 0 amount", async () => {
      let marketlength = await bondDepositoryProxylogic.marketsLength();

      await expect(
        bondDepositoryProxylogic.connect(user2).ETHDeposit(
          (marketlength-1),
          0,
          1,
          true,
          {value: 0}
        )
      ).to.be.revertedWith("Depository : need the amount");
    })

    it("#3-1-8. user can't input sametime lockTOS is true, time = 0", async () => {
      let marketlength = await bondDepositoryProxylogic.marketsLength();

      await expect(
        bondDepositoryProxylogic.connect(user2).ETHDeposit(
          (marketlength-1),
          depositAmount2,
          0,
          true,
          {value: depositAmount2}
        )
      ).to.be.revertedWith("Depository : sTOS need the time");
    })

    it("#3-1-9. user can't deposit over marketAmount", async () => {
      let marketlength = await bondDepositoryProxylogic.marketsLength();
      console.log("marketlength : ", marketlength);

      await bondDepositoryProxylogic.connect(user1).ETHDeposit(
        (marketlength-1),
        depositAmount2,
        0,
        false,
        {value: depositAmount2}
      )

      await expect(
        bondDepositoryProxylogic.connect(user2).ETHDeposit(
          (marketlength-1),
          depositAmount2,
          0,
          false,
          {value: depositAmount2}
        )
      ).to.be.revertedWith("Depository : sold out");
    })

    it("#3-1-10. user can't deposit after market sale Amount is over", async () => {
      let marketlength = await bondDepositoryProxylogic.marketsLength();
      console.log("marketlength : ", marketlength);

      await bondDepositoryProxylogic.connect(user3).ETHDeposit(
        (marketlength-1),
        depositAmount,
        0,
        false,
        {value: depositAmount}
      )
      
      let marketInfo = await bondDepositoryProxylogic.markets((marketlength-1));
      console.log(marketInfo.capacity);
      expect(Number(marketInfo.capacity)).to.be.equal(0);

      await expect(
        bondDepositoryProxylogic.connect(user2).ETHDeposit(
          (marketlength-1),
          depositAmount2,
          0,
          false,
          {value: depositAmount2}
        )
      ).to.be.revertedWith("Depository : sold out");
    })

    it("#3-1-11. user can't deposit after marketSaleTime is over", async () => {
      const block = await ethers.provider.getBlock('latest')
      let finishTime = block.timestamp + 10

      await bondDepositoryProxylogic.connect(admin1).create(
        true,
        admin1.address,
        uniswapInfo.tosethPool,
        0,
        [sellTosAmount,finishTime,ETHPrice,TOSPrice,onePayout]
      )

      await ethers.provider.send('evm_setNextBlockTimestamp', [Number(finishTime) + 5]);
      await ethers.provider.send('evm_mine');

      let marketlength = await bondDepositoryProxylogic.marketsLength();

      await expect(
        bondDepositoryProxylogic.connect(user2).ETHDeposit(
          (marketlength-1),
          depositAmount,
          0,
          false,
          {value: depositAmount}
        )
      ).to.be.revertedWith("Depository : market end");

    })

    it("#3-1-12. user can't close the market", async () => {
      const block = await ethers.provider.getBlock('latest')
      let finishTime = block.timestamp + 30  

      await bondDepositoryProxylogic.connect(admin1).create(
        true,
        admin1.address,
        uniswapInfo.tosethPool,
        0,
        [sellTosAmount,finishTime,ETHPrice,TOSPrice,onePayout]
      )

      checkMarketLength = await bondDepositoryProxylogic.marketsLength();
      
      await expect(
        bondDepositoryProxylogic.connect(user1).close(
          (checkMarketLength-1)
        )
      ).to.be.revertedWith("Accessible: Caller is not an policy admin");
    })

    it("#3-1-13. admin can close the market", async () => {
      console.log(checkMarketLength);
      await bondDepositoryProxylogic.connect(admin1).close(
        (checkMarketLength-1)
      )

      let marketInfo = await bondDepositoryProxylogic.markets((checkMarketLength-1));
      console.log(marketInfo.capacity);
      expect(Number(marketInfo.capacity)).to.be.equal(0);
    })

    it("#3-1-14. user can't deposit to closed market", async () => {
      await expect(
        bondDepositoryProxylogic.connect(user2).ETHDeposit(
          (checkMarketLength-1),
          depositAmount,
          0,
          false,
          {value: depositAmount}
        )
      ).to.be.revertedWith("Depository : market end");
    })

    it("#3-1-15. user can't create market", async () => {
      const block = await ethers.provider.getBlock('latest')
      let finishTime = block.timestamp + 30 

      await expect(
        bondDepositoryProxylogic.connect(user1).create(
          true,
          admin1.address,
          uniswapInfo.tosethPool,
          0,
          [sellTosAmount,finishTime,ETHPrice,TOSPrice,onePayout]
        )
      ).to.be.revertedWith("Accessible: Caller is not an policy admin");
    })

    it("#3-1-16. user can Deposit for period without sTOSStaking", async () => {
      const block = await ethers.provider.getBlock('latest')
      let finishTime = block.timestamp + 30  //2분

      await bondDepositoryProxylogic.connect(admin1).create(
        true,
        admin1.address,
        uniswapInfo.tosethPool,
        0,
        [sellTosAmount,finishTime,ETHPrice,TOSPrice,onePayout]
      )

      let marketlength = await bondDepositoryProxylogic.marketsLength();
      console.log("marketlength : ", marketlength);

      await bondDepositoryProxylogic.connect(user3).ETHDeposit(
        (marketlength-1),
        depositAmount,
        5,
        false,
        {value: depositAmount}
      )

    })

  })

  describe("#3-2. stakingV2 function test", async () => {
    it("#3-2-1. user can staking", async () => {
      let user1tosBalance = await tosContract.balanceOf(user1.address);
      console.log("user1tosBalance :",user1tosBalance);

      await tosContract.connect(user1).approve(stakingProxylogic.address,user1TOSstaking);

      await stakingProxylogic.connect(user1).stake(
        user1.address,
        user1TOSstaking,
        0,
        0,
        false
      )
    })

    it("#3-2-2. stakinOf view test", async () => {
      stakeIdcheck = await stakingProxylogic.connect(admin1).stakinOf(user1.address);
      console.log("stakeId :", stakeIdcheck); 
      console.log("stakeId :", Number(stakeIdcheck[0])); 
    })

    it("#3-2-3. balanceOfId and balanceOf view test", async () => {
      balanceOfLTOS = await stakingProxylogic.connect(admin1).balanceOfId(Number(stakeIdcheck[0]));
      console.log("id LTOS balance : ", balanceOfLTOS);

      totalLTOS = await stakingProxylogic.connect(admin1).balanceOf(user1.address);
      console.log("totaluserLTOS : ", totalLTOS);

      expect(totalLTOS).to.be.above(balanceOfLTOS);
    })
    
    it("#3-2-4. stakingBalances storage and balanceOf view test", async () => {
      stakingBalanceLTOS = await stakingProxylogic.connect(admin1).stakingBalances(user1.address,Number(stakeIdcheck[0]));
      console.log("LTOS : ", stakingBalanceLTOS.LTOS);

      totalLTOS = await stakingProxylogic.connect(admin1).balanceOf(user1.address);
      console.log("totaluserLTOS : ", totalLTOS);

      expect(totalLTOS).to.be.above(stakingBalanceLTOS.LTOS);
    })

    it("#3-2-5. user can stake the TOS without a lockup", async () => {
      let user3TOSbalance = await tosContract.balanceOf(user3.address);
      console.log(user3TOSbalance);

      stakeIdcheck = await stakingProxylogic.connect(admin1).stakinOf(user3.address);
      console.log(stakeIdcheck)

      await tosContract.connect(user1).transfer(user3.address,user3TOSstaking);

      await tosContract.connect(user3).approve(stakingProxylogic.address,user3TOSstaking);
      let index = await stakingProxylogic.index_();
      console.log("index : ", index);

      await stakingProxylogic.connect(user3).stake(
        user3.address,
        user3TOSstaking,
        0,
        0,
        false
      )
      let totalstakingIdCounter = await stakingProxylogic.stakingIdCounter();
      stakeIdcheck = await stakingProxylogic.connect(admin1).stakinOf(user3.address);

      let getsTOSid = await stakingProxylogic.connectId(Number(stakeIdcheck[0]));
      console.log("getsTOSid :", getsTOSid);
      expect(Number(getsTOSid)).to.be.equal(0);


      expect(Number(totalstakingIdCounter)).to.be.equal(Number(stakeIdcheck[0]));
    })

    it("#3-2-6. owner of stakeId without a lockup can increase Amount", async () => {
      stakingBalanceLTOS = await stakingProxylogic.stakingBalances(user3.address,Number(stakeIdcheck[0]));
      console.log("LTOS : ", stakingBalanceLTOS.LTOS);

      await tosContract.connect(user1).transfer(user3.address,user3TOSstaking);

      await tosContract.connect(user3).approve(stakingProxylogic.address,user3TOSstaking);

      await stakingProxylogic.connect(user3).increaseAmountStake(
        user3.address,
        Number(stakeIdcheck[0]),
        user3TOSstaking
      )

      let stakingBalanceLTOS2 = await stakingProxylogic.stakingBalances(user3.address,Number(stakeIdcheck[0]));
      console.log("LTOS2 : ", stakingBalanceLTOS2.LTOS);

      expect(Number(stakingBalanceLTOS2.LTOS)).to.be.above(Number(stakingBalanceLTOS.LTOS));
    })

    it("#3-2-7. owner of stakeId without a lockup can't increase period", async () => {
      await expect(
        stakingProxylogic.connect(user3).increasePeriodStake(
          Number(stakeIdcheck[0]),
          user3TOSstaking
        )
      ).to.be.revertedWith("need the have sTOS");
    })

    it("#3-2-8. owner of stakeId without a lockup can't call increaseAmountAndPeriodStake", async () => {
      await expect(
        stakingProxylogic.connect(user3).increaseAmountAndPeriodStake(
          user3.address,
          Number(stakeIdcheck[0]),
          user3TOSstaking,
          1
        )
      ).to.be.revertedWith("need the have sTOS");
    })

    it("#3-2-9. owenr of stakeId without a lockup can call unstake anyTime", async () => {
      stakingBalanceLTOS = await stakingProxylogic.balanceOfId(Number(stakeIdcheck[0]));
      console.log("LTOS : ", stakingBalanceLTOS);

      await stakingProxylogic.connect(user3).unstake(
        Number(stakeIdcheck[0]),
        user3UnstakingLTOS
      )

      let stakingBalanceLTOS2 = await stakingProxylogic.balanceOfId(Number(stakeIdcheck[0]));
      console.log("LTOS2 : ", stakingBalanceLTOS2);

      expect(Number(stakingBalanceLTOS)).to.be.above(Number(stakingBalanceLTOS2));
    })

    it("#3-2-10. owner of stakeId without a lockup can call unstakeId anyTime", async () => {
      stakingBalanceLTOS = await stakingProxylogic.balanceOfId(Number(stakeIdcheck[0]));
      console.log("LTOS : ", stakingBalanceLTOS);

      await stakingProxylogic.connect(user3).unstakeId(
        Number(stakeIdcheck[0])
      )

      let stakingBalanceLTOS2 = await stakingProxylogic.balanceOfId(Number(stakeIdcheck[0]));
      console.log("LTOS2 : ", stakingBalanceLTOS2);

      expect(Number(stakingBalanceLTOS)).to.be.above(Number(stakingBalanceLTOS2));
    })

    it("#3-2-11. user can stake the TOS with a lockup period and sTOS", async () => {
      stakeIdcheck = await stakingProxylogic.connect(admin1).stakinOf(user4.address);
      // console.log(stakeIdcheck)
      
      await tosContract.connect(user1).transfer(user4.address,user4TOSstaking);
      
      await tosContract.connect(user4).approve(stakingProxylogic.address,user4TOSstaking);
      let index = await stakingProxylogic.index_();
      console.log("index : ", index);
      
      let user4TOSbalance = await tosContract.balanceOf(user4.address);
      console.log(user4TOSbalance);
      await stakingProxylogic.connect(user4).stake(
        user4.address,
        user4TOSstaking,
        1,
        0,
        true
      )

      user4TOSbalance = await tosContract.balanceOf(user4.address);
      console.log(user4TOSbalance);

      let totalstakingIdCounter = await stakingProxylogic.stakingIdCounter();
      stakeIdcheck = await stakingProxylogic.connect(admin1).stakinOf(user4.address);
      console.log(stakeIdcheck)

      expect(Number(totalstakingIdCounter)).to.be.equal(Number(stakeIdcheck[1]));

      let getsTOSid = await stakingProxylogic.connectId(Number(stakeIdcheck[1]));
      let sTOSamount = await lockTosContract.balanceOfLock(Number(getsTOSid));
      console.log("sTOSamount :", sTOSamount);
      expect(Number(sTOSamount)).to.be.above(0);
    })

    it("#3-2-12. You can increase the amount of stakeID with lockup period and stos.", async () => {
      stakingBalanceLTOS = await stakingProxylogic.stakingBalances(user4.address,Number(stakeIdcheck[1]));
      console.log("LTOS : ", stakingBalanceLTOS.LTOS);

      await tosContract.connect(user1).transfer(user4.address,user4TOSstaking);

      await tosContract.connect(user4).approve(stakingProxylogic.address,user4TOSstaking);

      await stakingProxylogic.connect(user4).increaseAmountStake(
        user4.address,
        Number(stakeIdcheck[1]),
        user4TOSstaking
      )

      let stakingBalanceLTOS2 = await stakingProxylogic.stakingBalances(user4.address,Number(stakeIdcheck[1]));
      console.log("LTOS2 : ", stakingBalanceLTOS2.LTOS);

      expect(Number(stakingBalanceLTOS2.LTOS)).to.be.above(Number(stakingBalanceLTOS.LTOS));
    })

    it("#3-2-13. You can increase the period of stakeID with lockup period and stos.", async () => {
      stakingBalanceLTOS = await stakingProxylogic.stakingBalances(user4.address,Number(stakeIdcheck[1]));
      console.log("endTime : ", stakingBalanceLTOS.endTime);


      let getsTOSid = await stakingProxylogic.connectId(Number(stakeIdcheck[1]));
      let sTOSInfo = await lockTosContract.locksInfo(Number(getsTOSid));
      console.log("sTOSInfo.end :", sTOSInfo.end);

      await stakingProxylogic.connect(user4).increasePeriodStake(
        Number(stakeIdcheck[1]),
        1
      )

      let stakingBalanceLTOS2 = await stakingProxylogic.stakingBalances(user4.address,Number(stakeIdcheck[1]));
      console.log("endTime2 : ", stakingBalanceLTOS2.endTime);

      let sTOSInfo2 = await lockTosContract.locksInfo(Number(getsTOSid));
      console.log("sTOSInfo2.end :", sTOSInfo2.end);
      
      expect(Number(stakingBalanceLTOS2.endTime)).to.be.above(Number(stakingBalanceLTOS.endTime))
      expect(Number(sTOSInfo2.end)).to.be.above(Number(sTOSInfo.end))
    })

    it("#3-2-14. You can increase the amount and period of the stakeID with the lockup period and the stos.", async () => {
      stakingBalanceLTOS = await stakingProxylogic.stakingBalances(user4.address,Number(stakeIdcheck[1]));
      console.log("LTOS : ", stakingBalanceLTOS.LTOS);

      let getsTOSid = await stakingProxylogic.connectId(Number(stakeIdcheck[1]));
      let sTOSInfo = await lockTosContract.locksInfo(Number(getsTOSid));
      console.log("sTOSInfo.end :", sTOSInfo.end);

      await tosContract.connect(user1).transfer(user4.address,user4TOSstaking);
      await tosContract.connect(user4).approve(stakingProxylogic.address,user4TOSstaking);

      await stakingProxylogic.connect(user4).increaseAmountAndPeriodStake(
        user4.address,
        Number(stakeIdcheck[1]),
        user4TOSstaking,
        1
      )

      let stakingBalanceLTOS2 = await stakingProxylogic.stakingBalances(user4.address,Number(stakeIdcheck[1]));
      console.log("LTOS2 : ", stakingBalanceLTOS2.LTOS);
      console.log("endTime2 : ", stakingBalanceLTOS2.endTime);

      let sTOSInfo2 = await lockTosContract.locksInfo(Number(getsTOSid));
      console.log("sTOSInfo2.end :", sTOSInfo2.end);

      expect(Number(stakingBalanceLTOS2.LTOS)).to.be.above(Number(stakingBalanceLTOS.LTOS));
      expect(Number(stakingBalanceLTOS2.endTime)).to.be.above(Number(stakingBalanceLTOS.endTime))
      expect(Number(sTOSInfo2.end)).to.be.above(Number(sTOSInfo.end))
    })

    it("#3-2-15. After the end of the lockup period, the amount of StakeID can be increased (STOS does not increase)", async () => {
      stakingBalanceLTOS = await stakingProxylogic.stakingBalances(user4.address,Number(stakeIdcheck[1]));
      console.log("endTime : ", stakingBalanceLTOS.endTime);

      let getsTOSid = await stakingProxylogic.connectId(Number(stakeIdcheck[1]));

      await ethers.provider.send('evm_setNextBlockTimestamp', [Number(stakingBalanceLTOS.endTime) + 5]);
      await ethers.provider.send('evm_mine');
      
      await tosContract.connect(user1).transfer(user4.address,user4TOSstaking);
      
      await tosContract.connect(user4).approve(stakingProxylogic.address,user4TOSstaking);

      let sTOSInfo = await lockTosContract.locksInfo(Number(getsTOSid));
      console.log("sTOSInfo.amount :", sTOSInfo.amount);

      await stakingProxylogic.connect(user4).increaseAmountStake(
        user4.address,
        Number(stakeIdcheck[1]),
        user4TOSstaking
      )
      
      let stakingBalanceLTOS2 = await stakingProxylogic.stakingBalances(user4.address,Number(stakeIdcheck[1]));
      // console.log("LTOS2 : ", stakingBalanceLTOS2.LTOS);
      // console.log("endTime2 : ", stakingBalanceLTOS2.endTime);

      let sTOSInfo2 = await lockTosContract.locksInfo(Number(getsTOSid));
      console.log("sTOSInfo2.amount :", sTOSInfo2.amount);

      expect(Number(sTOSInfo2.amount)).to.be.equal(Number(sTOSInfo.amount));
      expect(Number(stakingBalanceLTOS2.LTOS)).to.be.above(Number(stakingBalanceLTOS.LTOS));
      // expect(Number(stakingBalanceLTOS2.endTime)).to.be.above(Number(stakingBalanceLTOS.endTime))
    })

    it("#3-2-16. After the end of the lockup period, the period of StakeID can be increased. (Receive a new Stosid, the period of time increases based on the current time)", async () => {
      stakingBalanceLTOS = await stakingProxylogic.stakingBalances(user4.address,Number(stakeIdcheck[1]));
      console.log("endTime : ", stakingBalanceLTOS.endTime);

      let getsTOSid = await stakingProxylogic.connectId(Number(stakeIdcheck[1]));
      console.log("getsTOSid : ", Number(getsTOSid));

      let sTOSInfo = await lockTosContract.locksInfo(Number(getsTOSid));
      console.log("sTOSInfo.end :", sTOSInfo.end);

      await stakingProxylogic.connect(user4).increasePeriodStake(
        Number(stakeIdcheck[1]),
        1
      )

      let stakingBalanceLTOS2 = await stakingProxylogic.stakingBalances(user4.address,Number(stakeIdcheck[1]));

      let getsTOSid2 = await stakingProxylogic.connectId(Number(stakeIdcheck[1]));
      console.log("getsTOSid2 : ",Number(getsTOSid2));

      let sTOSInfo2 = await lockTosContract.locksInfo(Number(getsTOSid2));
      console.log("sTOSInfo2.end :", sTOSInfo2.end);

      expect(Number(stakingBalanceLTOS2.endTime)).to.be.above(Number(stakingBalanceLTOS.endTime))
      expect(Number(sTOSInfo2.end)).to.be.above(Number(sTOSInfo.end))
      expect(Number(getsTOSid2)).to.be.above(Number(getsTOSid));
    })

    it("#3-2-17. After the end of the lockup period, the amount and period of StakeID can be increased.", async () =>{
      stakingBalanceLTOS = await stakingProxylogic.stakingBalances(user4.address,Number(stakeIdcheck[1]));
      console.log("LTOS : ", stakingBalanceLTOS.LTOS);
      console.log("endTime : ", stakingBalanceLTOS.endTime);

      let getsTOSid = await stakingProxylogic.connectId(Number(stakeIdcheck[1]));
      let sTOSInfo = await lockTosContract.locksInfo(Number(getsTOSid));
      console.log("sTOSInfo.end :", sTOSInfo.end);

      await ethers.provider.send('evm_setNextBlockTimestamp', [Number(stakingBalanceLTOS.endTime) + 5]);
      await ethers.provider.send('evm_mine');

      await tosContract.connect(user1).transfer(user4.address,user4TOSstaking);
      await tosContract.connect(user4).approve(stakingProxylogic.address,user4TOSstaking);
      
      const block = await ethers.provider.getBlock('latest')
      let endTime = Number(block.timestamp) + Number(epochUnit);
      console.log("block.timestamp :", Number(block.timestamp));
      console.log("epochUnit :", Number(epochUnit));
      console.log("endTime :", Number(endTime));
      let endTime2 = Math.floor(Number(endTime)/Number(epochUnit))
      let endTime3 = Number(endTime2)*Number(epochUnit);
      console.log("endTime2 :", Number(endTime2));
      console.log("endTime3 :", Number(endTime3));

      await stakingProxylogic.connect(user4).increaseAmountAndPeriodStake(
        user4.address,
        Number(stakeIdcheck[1]),
        user4TOSstaking,
        1
      )

      let stakingBalanceLTOS2 = await stakingProxylogic.stakingBalances(user4.address,Number(stakeIdcheck[1]));
      console.log("LTOS2 : ", stakingBalanceLTOS2.LTOS);
      console.log("endTime2 : ", stakingBalanceLTOS2.endTime);

      getsTOSid = await stakingProxylogic.connectId(Number(stakeIdcheck[1]));
      let sTOSInfo2 = await lockTosContract.locksInfo(Number(getsTOSid));
      console.log("sTOSInfo2.end :", Number(sTOSInfo2.end));

      expect(Number(endTime3)).to.be.equal(Number(sTOSInfo2.end));
      expect(Number(stakingBalanceLTOS2.LTOS)).to.be.above(Number(stakingBalanceLTOS.LTOS));
      expect(Number(stakingBalanceLTOS2.endTime)).to.be.above(Number(stakingBalanceLTOS.endTime))
      expect(Number(sTOSInfo2.end)).to.be.above(Number(sTOSInfo.end))
    })
  })

});
