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

// sepolia
let uniswapInfo_sepolia = {
    poolfactory: "0x0227628f3F023bb0B980b67D528571c95c6DaC1c",
    npm: "0x1238536071E1c677A632429e3655c799b22cDA52",
    swapRouter: "",
    wethUsdcPool: "0x41918979de21d907c72ccfEd77f66582aA2d2475",
    wtonWethPool: "0x8eF564856dC3f3dcaF581f6110AFd3B69d1d1cCe",
    wtonTosPool: "0x9ADc572464A2A83055DC0789d94298635fa8385b",
    tosethPool: "0x41E5AeDE3181C11BD69F2932D8afb6DA9756FE01",
    wton: "0x79e0d92670106c85e9067b56b8f674340dca0bbd",
    tos: "0xff3ef745d9878afe5934ff0b130868afddbc58e8",
    weth: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    usdc: "0x693a591A27750eED2A0e14BC73bB1F313116a1cb",
    fee: ethers.BigNumber.from("3000"),
    NonfungibleTokenPositionDescriptor: "",
    UniswapV3Staker: "",
    ton: "0xa30fe40285b8f5c0457dbc3b7c8a280373c40044",
    lockTOSaddr: "0x8Fb966Bfb690a8304a5CdE54d9Ed6F7645b26576"
}


let networkName = "sepolia";
let uniswapInfo = uniswapInfo_sepolia;

async function getUniswapInfo() {
    const { chainId } = await ethers.provider.getNetwork();

    if(chainId == 5) {
        networkName = "goerli";
        uniswapInfo = uniswapInfo_goerli;
    }else if(chainId == 17000) {
        networkName = "holesky";
        uniswapInfo = uniswapInfo_holesky;
    }else if(chainId == 11155111) {
        networkName = "sepolia";
        uniswapInfo = uniswapInfo_sepolia;
    }

    return {chainId, networkName, uniswapInfo, config};
}



module.exports = {
    getUniswapInfo
}