const { ethers } = require("hardhat");

let config = {
    epochLength: 28800,
    basicBondPeriod : 432000,
    RebasePerEpoch : ethers.BigNumber.from("87045050000000"),
    index : ethers.BigNumber.from("1000000000000000000"),
    mintRate : ethers.BigNumber.from("242427000000000000000000000"),
    mintRateDenominator : ethers.BigNumber.from("1000000000000000000")
}

// holesky
let uniswapInfo_holesky = {
    poolfactory: "",
    npm: "",
    swapRouter: "",
    wethUsdcPool: "",
    wtonWethPool: "",
    wtonTosPool: "",
    tosethPool: "",
    wton: "0xe86fCf5213C785AcF9a8BFfEeDEfA9a2199f7Da6",
    tos: "0x68c1F9620aeC7F2913430aD6daC1bb16D8444F00",
    weth: "",
    usdc: "",
    fee: ethers.BigNumber.from("3000"),
    NonfungibleTokenPositionDescriptor: "",
    UniswapV3Staker: "",
    ton: "0x3d15587A41851749982CDcB2880B0D3C380F84c9",
    lockTOSaddr: "0x8Fb966Bfb690a8304a5CdE54d9Ed6F7645b26576"
}

let networkName = "holesky";
let uniswapInfo = uniswapInfo_holesky;

async function getUniswapInfo() {
    const { chainId } = await ethers.provider.getNetwork();

    if(chainId == 5) {
        networkName = "goerli";
        uniswapInfo = uniswapInfo_goerli;
    }else if(chainId == 17000) {
        networkName = "holesky";
        uniswapInfo = uniswapInfo_holesky;
    }


    return {chainId, networkName, uniswapInfo, config};
}


module.exports = {
    getUniswapInfo
}