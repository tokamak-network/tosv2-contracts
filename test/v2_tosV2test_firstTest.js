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
let lockTOSLogic2abi = require('../abis/LockTOSLogic2_ABI.json');;

let UniswapV3LiquidityChangerAddress = "0xa839a0e64b27a34ed293d3d81e1f2f8b463c3514";


describe("price test", function () {
  //시나리오
  //팔려고하는 tos 목표치 = 10,000 -> 10ETH 받으면 판매 종료
  //받는 token(ETH)의 가격 = 1,000,000
  //TOS의 가격 = 1,000
  //1ETH = 1,000TOS
  //실제 ETH 가격 = 1,500,000, TOS의 가격 = 1,000 -> 1ETH = 1,500 TOS
  //500개의 tos만 더 생산되어도됨
  //mintRate = 10 -> ex) 1ETH가 들어오면 1000TOS * 10 -> 10,000TOS mint -> 1,000개는 유저에게, 9,000개는 treasury에 있음
  
  //mintingRate => 1ETH당 발행되는 TOS 물량이 mintingRate -> 10000 이여야함
  //dTOS 물량 users에 dTOS쓴 물량 넣기
  //한 tx당 살 수 있는 TOS물량이 정해져있음, 마켓만들때 세팅 가능하게 함 (공격을 막을려고 쓰는거임)
  
  //staking index가 증가되는 조건
  //staking index 증가시키는 시점
  //LTOS lockup 기간, TOS -> LTOS, TOS랑 이자는 Treasury에서 나오게함 돌려줌
  let provider;
  let nonfungiblePositionManager, uniswapV3Pool, uniswapV3LiquidityChanger ;

  let tosCalculator;
  let TOSValueCalculator;

  let treasurycont;
  let treasuryContract;

  let stakingcont;
  let stakingContract;

  let tosContract;
  let lockTosContract;
  let lockTos2Contract;
  let lockToslogic2Contract;

  let bondDepositorycont;
  let bondDepositoryContract;

  let firstEpochNumber = 0;
  let firstEndEpochTime
  let epochLength = 20;
  let epochUnit = 60;

  let depositTime;
  let depositTime2;
  let unstakingTime;

  let sellingTime = 120;

  let sellTosAmount = ethers.utils.parseUnits("10000", 18); //1ETH = 1000TOS 라서 10ETH받으면 끝임
  let depositAmount = ethers.utils.parseUnits("5", 18);         //5ETH를 deposit하면 500LTOS를받음 (index가 10일때) -> 50000TOS가 생기고 5000TOS가 스테이킹됨 -> 45000TOS가 treasury에 있음// 5000TOS는 stakingContract에 있음
  let depositAmount2 = ethers.utils.parseUnits("3", 18);        //3ETH를 deposit하면 300LTOS를 받음 (index가 10일때) index가 19면? -> 157.89~를 받음

  let beforetosAmount;
  let aftertosAmount;

  //let mintRate = 10;
  let mintRate = 10000;

  let unstakingAmount = ethers.utils.parseUnits("500", 18); 

  let ETHPrice = 1000000
  let TOSPrice = 1000

  let minter_role = "0xf0887ba65ee2024ea881d91b74c2450ef19e1557f03bed3ea9f16b037cbe2dc9";

  let testAddress = "0xcc0E10d30EeF023D98E6B73c019A9Ed617f1007C"
  let lockTOSProxyAddress = "0x5adc7de3a0B4A4797f02C3E99265cd7391437568"
  let lockTOSProxy2Address = "0x5FA8C7673B6693cCE8991C10fCd2b9A1bA775b7B"
  let lockTOSLogic2Address = "0x50b8Ee0cCc76f66fFA669aA56218B3964dae4E78"
  let etherUint = ethers.utils.parseUnits("1", 18);     
  // let wtonUint = ethers.utils.parseUnits("1", 27);     


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
    [admin1, admin2, user1, user2, minter1, minter2, proxyAdmin, proxyAdmin2 ] = accounts;
    console.log('admin1',admin1.address);

    provider = ethers.provider;
    // poolInfo.admin = admin1;
    // tokenInfo.admin = admin1;

    await hre.ethers.provider.send("hardhat_setBalance", [
      admin1.address,
      "0x56BC75E2D63100000",
    ]);

  });

  describe("#0. lockTOSContract update", async () => {
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

  })

  describe("#1. Deploy the contract", async () => {
    it("deploy TOSValueCalculator", async function () {
      tosCalculator = await ethers.getContractFactory("TOSValueCalculator");
      TOSValueCalculator = await tosCalculator.deploy();
      await TOSValueCalculator.deployed();
  
      let code = await ethers.provider.getCode(TOSValueCalculator.address);
      expect(code).to.not.eq("0x");
      // console.log(TOSValueCalculator.address);
    });

    it("deploy Treasury", async () => {
      treasurycont = await ethers.getContractFactory("Treasury");
      treasuryContract = await treasurycont.connect(admin1).deploy(uniswapInfo.tos,TOSValueCalculator.address);
      await treasuryContract.deployed();
  
      let code = await ethers.provider.getCode(treasuryContract.address);
      console.log("treasuryContract.address : ", treasuryContract.address)
      expect(code).to.not.eq("0x");
    })

    it("bring the TOS function", async () => {
      tosContract = new ethers.Contract( uniswapInfo.tos, tosabi, ethers.provider );
      // console.log(tosContract.address);
      let code = await ethers.provider.getCode(tosContract.address);
      expect(code).to.not.eq("0x");
    })

    it("deploy Staking", async () => {
      const block = await ethers.provider.getBlock('latest')
      // console.log(block)
      firstEndEpochTime = block.timestamp + epochLength;
      console.log(firstEndEpochTime)
      stakingcont = await ethers.getContractFactory("StakingV2");
      //10초마다 rebase함
      stakingContract = await stakingcont.deploy(
          uniswapInfo.tos,
          [epochLength,firstEpochNumber,firstEndEpochTime,epochUnit],
          lockTosContract.address,
          treasuryContract.address
      );
      await stakingContract.deployed();
  
  
      let code = await ethers.provider.getCode(stakingContract.address);
      expect(code).to.not.eq("0x");
    })

    it("deploy bondDepository", async () => {
      bondDepositorycont = await ethers.getContractFactory("BondDepository");
      bondDepositoryContract = await bondDepositorycont.deploy(
          uniswapInfo.tos,
          uniswapInfo.wton,
          stakingContract.address,
          treasuryContract.address,
          TOSValueCalculator.address
      )
      await bondDepositoryContract.deployed();
  
      let code = await ethers.provider.getCode(bondDepositoryContract.address);
      expect(code).to.not.eq("0x");
    })
  
  })

  describe("#2. setting the contract", async () => {
    it("initialize TOSCalculator", async () => {
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

    it("treasury admin, proxyAdmin check", async () => {
      expect(await treasuryContract.isAdmin(admin1.address)).to.be.equal(true)
      expect(await treasuryContract.isProxyAdmin(admin1.address)).to.be.equal(true)
    })

    it("treasury add policyAdmin", async () => {
      await treasuryContract.connect(admin1).addPolicy(admin1.address)
      expect(await treasuryContract.isPolicy(admin1.address)).to.be.equal(true)
    })

    it("give the mintRole to treasury", async () => {
      await tosContract.connect(admin1).grantRole(minter_role,treasuryContract.address);
  
      let tx = await tosContract.hasRole(minter_role,treasuryContract.address);
      expect(tx).to.be.equal(true);
    })

    it("setting the staking", async () => {
      let epochtestbefore = await stakingContract.epoch();
      console.log(epochtestbefore);
  
      expect(epochtestbefore.length_).to.be.equal(20);
  
  
      let index = ethers.utils.parseUnits("10", 18)
      await stakingContract.setindex(index);
      expect((await stakingContract.index_())).to.be.equal(index)
      
      let rebasePerEpoch = ethers.utils.parseUnits("1", 17) //index가 0.1크기만큼 증가
      await stakingContract.setRebasePerepoch(rebasePerEpoch);
      expect((await stakingContract.rebasePerEpoch())).to.be.equal(rebasePerEpoch)
    })

    it("nextIndex test", async () => {
      let nextIndex = await stakingContract.nextIndex();
      console.log(nextIndex);
    })

    it("bondDepository add policyAdmin", async () => {
      await bondDepositoryContract.addPolicy(admin1.address);
      expect(await bondDepositoryContract.isPolicy(admin1.address)).to.be.equal(true)
    })
  
    it("treasury set the mint possible the bondDepository", async () => {
      //enable의 마지막 admin1.address는 쓸데없는 값이다.
      await treasuryContract.connect(admin1).enable(7,bondDepositoryContract.address,admin1.address);
      let checkPermission = await treasuryContract.permissions(7,bondDepositoryContract.address);
      expect(checkPermission).to.be.equal(true)
    })
  
    it("treasury set the mint possible the staking", async () => {
      await treasuryContract.connect(admin1).enable(7,stakingContract.address,admin1.address);
      let checkPermission = await treasuryContract.permissions(7,stakingContract.address);
      expect(checkPermission).to.be.equal(true)
    })

    it("setting MintRate on BondDepository", async () => {
      await bondDepositoryContract.setMR(mintRate);
    })
  })

  describe("#3 create Market and deposit test", async () => {
    it("create the ETH market", async () => {
      const block = await ethers.provider.getBlock('latest')
      let finishTime = block.timestamp + sellingTime  //2분
      let marketbefore = await bondDepositoryContract.marketsLength();
      console.log(marketbefore)
      await bondDepositoryContract.connect(admin1).create(
          true,
          admin1.address,
          0,
          [sellTosAmount,finishTime,ETHPrice,TOSPrice]
      )
      let marketafter = await bondDepositoryContract.marketsLength();
      console.log(marketafter)
    })

    it("deposit ETHmarket", async() => {
      let beforeindex = await stakingContract.index_()

      const block = await ethers.provider.getBlock('latest')
      depositTime = block.timestamp

      let epoch = await stakingContract.epoch();
      console.log("1deposit epoch.end : ", epoch.end);
      console.log("1deposit blocktimeStamp : ", block.timestamp)

      let beforetosTreasuryAmount = await tosContract.balanceOf(treasuryContract.address)
      console.log(beforetosTreasuryAmount)
      expect(beforetosTreasuryAmount).to.be.equal(0)

      await bondDepositoryContract.connect(admin1).ETHDeposit(
          0,
          depositAmount,
          10,
          false,
          {value: depositAmount}
      );

      let afterindex = await stakingContract.index_()

      expect(afterindex).to.be.equal(beforeindex)

      //45000TOS가 treasury에 있음
      let aftertosTreasuryAmount = await tosContract.balanceOf(treasuryContract.address)
      console.log(aftertosTreasuryAmount)

      expect(aftertosTreasuryAmount).to.above(0)
    })

    it("unstaking before endTime", async() => {
      let amount =  await stakingContract.connect(admin1).userInfo(admin1.address);
      console.log(amount.LTOS);

      beforetosAmount = await tosContract.connect(admin1).balanceOf(admin1.address);

      await expect(
          stakingContract.connect(admin1).unstake(
              admin1.address,
              amount.LTOS,
              false,
              false
          )
      ).to.be.revertedWith("need the endPeriod");
    })

    it("deposit2 ETHmarket", async() => {
      depositTime2 = depositTime + 25;
      await ethers.provider.send('evm_setNextBlockTimestamp', [depositTime2]);
      await ethers.provider.send('evm_mine');
      
      let beforeindex = await stakingContract.index_()
      console.log(beforeindex)
        
      const block = await ethers.provider.getBlock('latest')
      let epoch = await stakingContract.epoch();
      console.log("epoch.end : ", epoch.end);
      console.log("blocktimeStamp : ", block.timestamp)

      let nextindex = await stakingContract.nextIndex()
      console.log("nextindex : ", nextindex);

      let enableStaking = await treasuryContract.enableStaking();
      let nextLTOSinterrest = await stakingContract.nextLTOSinterest()

      console.log("enableStaking : ", enableStaking);
      console.log("nextLTOSinterrest : ", nextLTOSinterrest)

      await bondDepositoryContract.connect(admin1).ETHDeposit(
          0,
          depositAmount,
          10,
          false,
          {value: depositAmount}
      );

      let afterindex = await stakingContract.index_()
      console.log(afterindex)

      expect(afterindex).to.not.equal(beforeindex)
      expect(afterindex).to.above(beforeindex)
    })

    it("unstaking after endTime", async() => {
      unstakingTime = depositTime2 + 15;
      await ethers.provider.send('evm_setNextBlockTimestamp', [unstakingTime]);
      await ethers.provider.send('evm_mine');

      beforetosAmount = await tosContract.connect(admin1).balanceOf(admin1.address);
      console.log(beforetosAmount)

      let index = await stakingContract.index_()
      console.log("index :" , index)

      //500LTOS unstaking함 -> 5500TOS 받아야함
      await stakingContract.connect(admin1).unstake(
          admin1.address,
          unstakingAmount,
          false,
          false
      )    
      
      let getTOSAmount = (unstakingAmount * index) / etherUint;

      aftertosAmount = await tosContract.connect(admin1).balanceOf(admin1.address);
      console.log(aftertosAmount)
      let tosdiffAmount = aftertosAmount - beforetosAmount;
      console.log("tosdiffAmount", tosdiffAmount)
      console.log("getTOSAmount :", getTOSAmount)
      // expect(aftertosAmount).to.be.equal(getTOSAmount)
    })
  })


});
