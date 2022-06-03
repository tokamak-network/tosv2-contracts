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
  let provider;
  let nonfungiblePositionManager, uniswapV3Pool, uniswapV3LiquidityChanger ;

  let tosCalculator;
  let TOSValueCalculator;

  let treasurycont;
  let treasurycontract;

  let stakingcont;
  let stakingContract;

  let tosContract;

  let bondDepositorycont;
  let bondDepositoryContract;

  let firstEpochNumber = 0;
  let firstEndEpochTime
  let epochLength = 60;

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
    treasurycontract = await treasurycont.deploy(uniswapInfo.tos,TOSValueCalculator.address);
    await treasurycontract.deployed();

    let code = await ethers.provider.getCode(treasurycontract.address);
    expect(code).to.not.eq("0x");
  })

  it("bring the TOS function", async () => {
    tosContract = new ethers.Contract( uniswapInfo.tos, tosabi, ethers.provider );
    console.log(tosContract.address);
    let code = await ethers.provider.getCode(tosContract.address);
    expect(code).to.not.eq("0x");
  })

  it("give the mintRole to treasury", async () => {
    await tosContract.connect(admin1).grantRole(minter_role,treasurycontract.address);

    let tx = await tosContract.hasRole(minter_role,treasurycontract.address);
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
        0,
        firstEndEpochTime,
        treasurycontract.address
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
        treasurycontract.address
    )
    await bondDepositoryContract.deployed();

    let code = await ethers.provider.getCode(bondDepositoryContract.address);
    expect(code).to.not.eq("0x");
  })

  

});
