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
let UniswapV3LiquidityChanger= require('../abis/UniswapV3LiquidityChanger.json');

let UniswapV3LiquidityChangerAddress = "0xa839a0e64b27a34ed293d3d81e1f2f8b463c3514";


describe("price test", function () {
  let provider;
  let nonfungiblePositionManager, uniswapV3Pool, uniswapV3LiquidityChanger ;

  let tosCalculator;
  let TOSValueCalculator;

  let etherUint = ethers.utils.parseUnits("1", 18);     
  // let wtonUint = ethers.utils.parseUnits("1", 27);   
  
  let tokenIdtoseth = 19654;


  // rinkeby
  let uniswapInfo={
      poolfactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      npm: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
      swapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      wethUsdcPool: "0xfbDc20aEFB98a2dD3842023f21D17004eAefbe68",
      tosethPool: "0x7715dF692fb4031DC51C53b35eFC2b65d9e752c0",
      wtonWethPool: "0xE032a3aEc591fF1Ca88122928161eA1053a098AC",
      wtonTosPool: "0x516e1af7303a94f81e91e4ac29e20f4319d4ecaf",
      tosDOCPool: "",
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
    //console.log('admin1',admin1.address);

    provider = ethers.provider;
    // poolInfo.admin = admin1;
    // tokenInfo.admin = admin1;
  });

  it("deploy TOSValueCalculator", async function () {
    tosCalculator = await ethers.getContractFactory("TOSValueCalculator");
    TOSValueCalculator = await tosCalculator.deploy();
    await TOSValueCalculator.deployed();

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

  it("getPriceToken0 Price", async () => {
    let price1 = await TOSValueCalculator.getPriceToken0(uniswapInfo.tosethPool)
    console.log(price1);
    let uintETHprice = price1/etherUint;
    console.log(uintETHprice);
  })

  it("getPriceToken1 Price", async () => {
    let price2 = await TOSValueCalculator.getPriceToken1(uniswapInfo.tosethPool)
    console.log(price2);
    let uintETHprice2 = price2/etherUint;
    console.log(uintETHprice2);
  })

  // 1TOS = ? ETH
  it("get TOS-WETHPool TOSPrice", async () => {
    let tosprice = await TOSValueCalculator.getWETHPoolTOSPrice();
    console.log("ETH/TOS Price:", Number(tosprice))
    console.log("real ETH/TOS Price :", (Number(tosprice)/1e18))
  })

  // 1ETH = ? TOS
  it("get TOS-WETHPool TOSPrice", async () => {
    let tosprice = await TOSValueCalculator.getTOSERC20PoolERC20Price(uniswapInfo.weth,uniswapInfo.tosethPool,3000);
    console.log("TOS/ETH Price:", Number(tosprice))
    console.log("real TOS/ETH Price :", (Number(tosprice)/1e18))
  })

  // // 1TOS = ? WTON
  // it("get TOS-WTONPool WTON/TOS Price", async () => {
  //   let price = await TOSValueCalculator.getTOSERC20PoolTOSPrice(uniswapInfo.wton,uniswapInfo.wtonTosPool,3000);
  //   let decimal = await TOSValueCalculator.getDecimals(uniswapInfo.wton,uniswapInfo.tos)
  //   let priceDecimal = ethers.utils.parseUnits("1", decimal.token0Decimals);     

  //   console.log("WTON/TOS Price:", Number(price))
  //   console.log("real WTON/TOS Price:", Number(price)/1e18)
  //   // let uintWTONprice = Number(price)/Number(priceDecimal);
  //   // console.log("realWTON/TOS Price:",uintWTONprice);
  // })

  // 1WTON = ?TOS
  it("get TOS-WTONPool TOS/WTON Price", async () => {
    let tosprice = await TOSValueCalculator.getTOSERC20PoolERC20Price(uniswapInfo.wton,uniswapInfo.wtonTosPool,3000);
    let decimal = await TOSValueCalculator.getDecimals(uniswapInfo.wton,uniswapInfo.tos)
    let priceDecimal = ethers.utils.parseUnits("1", decimal.token1Decimals);   

    console.log("TOS/WTON Price:", Number(tosprice));
    console.log("real TOS/WTON Price:", Number(tosprice)/1e18);
    // let uintETHprice = tosprice/priceDecimal;
    // console.log(uintETHprice);
  })

  it("getTokenIdAmount test", async () => {
    let amount = await TOSValueCalculator.getTokenIdAmount(uniswapInfo.tosethPool,tokenIdtoseth);
    // console.log(amount);
    console.log("amount0 : ", Number(amount.amount0) ); // 1ETH = ? TOS -> ?TOS/1ETH
    console.log("amount1 : ", Number(amount.amount1) ); // 1TOS = ? ETH -> ?ETH/TOS
  })

  it("getTOkenIdETHVaule eth-tosPool test", async () => {
    let amount = await TOSValueCalculator.getTokenIdETHValue(uniswapInfo.tosethPool,tokenIdtoseth);
    console.log("ETH Value : ", Number(amount) );
  })

  it("ETHVaule calculation test", async () => {
    let tosNum = await TOSValueCalculator.getTOStoken(uniswapInfo.tosethPool)
    console.log("tosNum : ", tosNum);
    let amount = await TOSValueCalculator.getTokenIdAmount(uniswapInfo.tosethPool,tokenIdtoseth);
    let tosprice = await TOSValueCalculator.getWETHPoolTOSPrice();
    let tosprice2 = await TOSValueCalculator.getTOSERC20PoolERC20Price(uniswapInfo.weth,uniswapInfo.tosethPool,3000);

    //amount0 -> 1ETH = ? TOS의 비율임
    //amount1 -> 1TOS = ? ETH의 비율임


    let ethValueSum;
    if(tosNum == 0){
      console.log("1")
      ethValueSum = (Number(amount.amount0) * Number(tosprice))/1e18
      console.log("ethValueSum tos-> eth :", ethValueSum);
      ethValueSum = ethValueSum + ((Number(amount.amount1)*Number(tosprice)*Number(tosprice2))/1e18/1e18)
      console.log("ethValueSum2 eth :", ethValueSum);
    } else if (tosNum == 1){
      console.log("2")
      ethValueSum = (Number(amount.amount1) * Number(tosprice))
      ethValueSum = ethValueSum + ((Number(amount.amount0)* Number(tosprice) * Number(tosprice2))/1e36) 
    }

    console.log("ethValueSum : ", ethValueSum)
  })

  it("tickCheck test", async () => {
    let tick = await TOSValueCalculator.tickCheck(tokenIdtoseth);
    console.log(tick);
  })

});
