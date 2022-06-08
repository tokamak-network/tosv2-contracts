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

  let bondDepositorycont;
  let bondDepositoryContract;

  let firstEpochNumber = 0;
  let firstEndEpochTime
  let epochLength = 60;

  let sellingTime = 120;

  let sellTosAmount = ethers.utils.parseUnits("10000", 18); //1ETH = 1000TOS 라서 10ETH받으면 끝임
  let mintRate = 100;

  let ETHPrice = 1000000
  let TOSPrice = 1000

  let minter_role = "0xf0887ba65ee2024ea881d91b74c2450ef19e1557f03bed3ea9f16b037cbe2dc9";

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
  });

  it("deploy TOSValueCalculator", async function () {
    tosCalculator = await ethers.getContractFactory("TOSValueCalculator");
    TOSValueCalculator = await tosCalculator.deploy();
    await TOSValueCalculator.deployed();

    let code = await ethers.provider.getCode(TOSValueCalculator.address);
    expect(code).to.not.eq("0x");
    // console.log(TOSValueCalculator.address);
  });

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

  it("deploy Treasury", async () => {
    treasurycont = await ethers.getContractFactory("Treasury");
    treasuryContract = await treasurycont.connect(admin1).deploy(uniswapInfo.tos,TOSValueCalculator.address);
    await treasuryContract.deployed();

    let code = await ethers.provider.getCode(treasuryContract.address);
    expect(code).to.not.eq("0x");
  })

  it("treasury admin, proxyAdmin check", async () => {
    expect(await treasuryContract.isAdmin(admin1.address)).to.be.equal(true)
    expect(await treasuryContract.isProxyAdmin(admin1.address)).to.be.equal(true)
  })

  it("treasury add policyAdmin", async () => {
      await treasuryContract.connect(admin1).addPolicy(admin1.address)
      expect(await treasuryContract.isPolicy(admin1.address)).to.be.equal(true)
  })

  it("bring the TOS function", async () => {
    tosContract = new ethers.Contract( uniswapInfo.tos, tosabi, ethers.provider );
    console.log(tosContract.address);
    let code = await ethers.provider.getCode(tosContract.address);
    expect(code).to.not.eq("0x");
  })

  it("give the mintRole to treasury", async () => {
    await tosContract.connect(admin1).grantRole(minter_role,treasuryContract.address);

    let tx = await tosContract.hasRole(minter_role,treasuryContract.address);
    expect(tx).to.be.equal(true);
  })
  
  it("deploy Staking", async () => {
    const block = await ethers.provider.getBlock('latest')
    // console.log(block)
    firstEndEpochTime = block.timestamp + epochLength;
    console.log(firstEndEpochTime)
    stakingcont = await ethers.getContractFactory("StakingV2");
    stakingContract = await stakingcont.deploy(
        uniswapInfo.tos,
        epochLength,
        firstEpochNumber,
        firstEndEpochTime,
        treasuryContract.address
    );
    await stakingContract.deployed();


    let code = await ethers.provider.getCode(stakingContract.address);
    expect(code).to.not.eq("0x");
  })

  it("setting the staking", async () => {
    let epochtestbefore = await stakingContract.epoch();
    console.log(epochtestbefore);

    expect(epochtestbefore.length_).to.be.equal(60);


    let apy = 10
    await stakingContract.setAPY(apy);
    expect((await stakingContract.APY())).to.be.equal(apy)
    
    let rebasePerday = 2160 //epoch.length = 40 나오길 기대
    await stakingContract.setRebasePerday(rebasePerday);
    expect((await stakingContract.rebasePerday())).to.be.equal(rebasePerday)
    
    let epochtestafter = await stakingContract.epoch();
    console.log(epochtestafter.length_);

    expect(epochtestafter.length_).to.be.equal(40);
  })

  it("deploy bondDepository", async () => {
    bondDepositorycont = await ethers.getContractFactory("BondDepository");
    bondDepositoryContract = await bondDepositorycont.deploy(
        uniswapInfo.tos,
        uniswapInfo.wton,
        stakingContract.address,
        treasuryContract.address
    )
    await bondDepositoryContract.deployed();

    let code = await ethers.provider.getCode(bondDepositoryContract.address);
    expect(code).to.not.eq("0x");
  })

  it("bondDepository add policyAdmin", async () => {
    await bondDepositoryContract.addPolicy(admin1.address);
    expect(await bondDepositoryContract.isPolicy(admin1.address)).to.be.equal(true)
  })

  it("treasury set the mint possible the bondDepository", async () => {
    await treasuryContract.connect(admin1).enable(7,bondDepositoryContract.address,admin1.address);
    let checkPermission = await treasuryContract.permissions(7,bondDepositoryContract.address);
    expect(checkPermission).to.be.equal(true)
  })

  it("setting MintRate on BondDepository", async () => {
    await bondDepositoryContract.setMR(mintRate);
  })

  it("create the ETH market", async () => {
    const block = await ethers.provider.getBlock('latest')
    let finishTime = block.timestamp + sellingTime
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

});
