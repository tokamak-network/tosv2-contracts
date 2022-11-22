const { ethers } = require("hardhat");

let config = {
    adminAddress: "0x15280a52E79FD4aB35F4B9Acbb376DCD72b44Fd1",
    epochLength: 28800,
    epochEnd: 1668682800,
    basicBondPeriod : 432000,
    RebasePerEpoch : ethers.BigNumber.from("87045050000000"),
    index : ethers.BigNumber.from("1000000000000000000"),
    mintRate : ethers.BigNumber.from("125000000000000000000000"),
    mintRateDenominator : ethers.BigNumber.from("1000000000000000000")
}

let deployed = {
    LockTOSv2Logic0: "0xdc2df172f16BBa295689Bbaa1f354ED794De0dfF",
    LockTOSv2Proxy: "0x3883F75b2BE639F9236eD230dD7202f31eaf38d5",
    TOSValueCalculator: "0xD062C01b317933EAabd8F64e3f59141a79C3f95c",
    BondDepository: "0xe3ECA73384Bcfcc16ECd7894C5cA5b6DD64Ce39F",
    LibStaking: "0xC17c09a48793Bff31e7F8CC465DF6451CC9d9fB0",
    StakingV2: "0xC42698D87c95dCB9aaE9aaBE8c70a4d52b243847",
    LibTreasury: "0x2c77067900f1544345552f0A12d0bDf4EaE6fE04",
    Treasury: "0x0bA799B755017a5E148A4De63DD65e816B15BC9E",
    BondDepositoryProxy: "0xbf715e63d767D8378102cdD3FFE3Ce2BF1E02c91",
    StakingV2Proxy: "0x14fb0933Ec45ecE75A431D10AFAa1DDF7BfeE44C",
    TreasuryProxy: "0xD27A68a457005f822863199Af0F817f672588ad6"
  }

let uniswapInfo_mainnet  = {
    poolfactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    npm: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    swapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    wethUsdcPool: "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8",
    wtonWethPool: "0xc29271e3a68a7647fd1399298ef18feca3879f59",
    wtonTosPool: "0x1c0ce9aaa0c12f53df3b4d8d77b82d6ad343b4e4",
    tosethPool: "0x2ad99c938471770da0cd60e08eaf29ebff67a92a",
    wton: "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2",
    tos: "0x409c4D8cd5d2924b9bc5509230d16a61289c8153",
    weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    fee: ethers.BigNumber.from("3000"),
    NonfungibleTokenPositionDescriptor: "0x91ae842A5Ffd8d12023116943e72A606179294f3",
    UniswapV3Staker: "0xe34139463bA50bD61336E0c446Bd8C0867c6fE65",
    ton: "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5",
    lockTOSaddr: "0x69b4A202Fa4039B42ab23ADB725aA7b1e9EEBD79"
}

let networkName = "mainnet";
let uniswapInfo = uniswapInfo_mainnet;

async function getUniswapInfo() {
    const { chainId } = await ethers.provider.getNetwork();

    if(chainId == 1) {
        networkName = "mainnet";
        uniswapInfo = uniswapInfo_mainnet;
    }

    return {chainId, networkName, uniswapInfo, config, deployed };
}

module.exports = {
    getUniswapInfo
}