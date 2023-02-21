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
const { FeeAmount, encodePath } = require("./utils");

let tosAdmin = "0x12a936026f072d4e97047696a9d11f97eae47d21";
let TosV2Admin = "0x15280a52E79FD4aB35F4B9Acbb376DCD72b44Fd1";

describe("Price Calculate with uniswap pools", function () {

  let provider;

  let tosContract;
  let pricePathes, oracleLibrary;

  let _TosV2Admin;
  let _tosAdmin;

  let choice = 0; // max, min,average
  let pricePathInfos = [];


  async function indexEpochPass(_stakingProxylogic, passNextEpochCount) {
      let block = await ethers.provider.getBlock();
      let epochInfo = await _stakingProxylogic.epoch();
      let passTime =  epochInfo.end - block.timestamp + (epochInfo.length_ * passNextEpochCount) + 60;
      ethers.provider.send("evm_increaseTime", [passTime])
      ethers.provider.send("evm_mine")
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

  describe("OracleLibrary ", () => {

    it("deploy OracleLibrary ", async () => {
      let factory = await ethers.getContractFactory("OracleLibrary")
      oracleLibrary = await factory.deploy();
      await oracleLibrary.deployed();
      console.log("oracleLibrary ", oracleLibrary.address)
      let code = await ethers.provider.getCode(oracleLibrary.address);
      expect(code).to.not.eq("0x");
    })

    it("getOutAmountsCurTick 1", async () => {

      const amountIn = ethers.utils.parseEther("1");
      // const path = encodePath(
      //   [uniswapInfo.weth, uniswapInfo.wton, uniswapInfo.tos],
      //   [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
      // );

      const path = encodePath(
        [uniswapInfo.weth, uniswapInfo.tos],
        [FeeAmount.MEDIUM]
      );

      let result = await oracleLibrary.connect(admin1).getOutAmountsCurTick(
          uniswapInfo.poolfactory,
          path,
          amountIn
        );

      console.log("result", result.toString())
    })

    it("getOutAmountsCurTick 2", async () => {

      const amountIn = ethers.utils.parseEther("1");
      const path = encodePath(
        [uniswapInfo.weth, uniswapInfo.wton, uniswapInfo.tos],
        [FeeAmount.MEDIUM, FeeAmount.MEDIUM]
      );

      let result = await oracleLibrary.connect(admin1).getOutAmountsCurTick(
          uniswapInfo.poolfactory,
          path,
          amountIn
        );

      console.log("result", result.toString())
    })


  })
})