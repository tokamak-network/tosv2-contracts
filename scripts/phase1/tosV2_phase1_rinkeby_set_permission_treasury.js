const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");

let treasuryLogicAbi = require('../../artifacts/contracts/Treasury.sol/Treasury.json');
let bondDepositoryLogicAbi = require('../../artifacts/contracts/BondDepository.sol/BondDepository.json');
let stakingV2LogicAbi = require('../../artifacts/contracts/StakingV2.sol/StakingV2.json');

let calculatorAbi = require('../../artifacts/contracts/TOSValueCalculator.sol/TOSValueCalculator.json');

let treasuryProxyAbi = require('../../artifacts/contracts/TreasuryProxy.sol/TreasuryProxy.json');
let treasuryAbi = require('../../artifacts/contracts/Treasury.sol/Treasury.json');


let bondDepositoryProxyAbi = require('../../artifacts/contracts/BondDepositoryProxy.sol/BondDepositoryProxy.json');
let stakingV2ProxyAbi = require('../../artifacts/contracts/StakingV2Proxy.sol/StakingV2Proxy.json');


//rinkeby
let rinkeby_address = {
    poolfactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    npm: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    wton: "0x709bef48982Bbfd6F2D4Be24660832665F53406C",
    tos: "0x73a54e5C054aA64C1AE7373C2B5474d8AFEa08bd",
    weth: "0xc778417e063141139fce010982780140aa0cd5ab",
    tosethPool: "0x7715dF692fb4031DC51C53b35eFC2b65d9e752c0",
    wtonWethPool: "0xE032a3aEc591fF1Ca88122928161eA1053a098AC",
    wtonTosPool: "0x516e1af7303a94f81e91e4ac29e20f4319d4ecaf",
    tosDOCPool: "0x831a1f01ce17b6123a7d1ea65c26783539747d6d"
}

//rinkeby
// let lockTOSaddr = "0x5adc7de3a0B4A4797f02C3E99265cd7391437568"
let lockTOSaddr = "0x89F137913Eb8214A2c91e71009438415BBEF0fD6"

//mainnet
// let lockTOSaddr = "0x69b4A202Fa4039B42ab23ADB725aA7b1e9EEBD79"


//rinkeby
const adminAddress1 = "0x43700f09B582eE2BFcCe4b5Db40ee41B4649D977" //(Suah)
const adminAddress2 = "0xf0B595d10a92A5a9BC3fFeA7e79f5d266b6035Ea" //(Harvey)
const BONDER = 9;
const STAKER = 10;
const mintRate = ethers.BigNumber.from("242427000000000000000000000")
const mintRateDenominator = ethers.BigNumber.from("1000000000000000000")

//mainnet
// const adminAddress1 =

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);

    const { chainId } = await ethers.provider.getNetwork();
    let networkName = "local";
    if(chainId == 1) networkName = "mainnet";
    if(chainId == 4) networkName = "rinkeby";

    const bondDepositoryProxyAddress = loadDeployed(networkName, "BondDepositoryProxy");
    const treasuryProxyAddress = loadDeployed(networkName, "TreasuryProxy");
    const stakingProxyAddress = loadDeployed(networkName, "StakingV2Proxy");

    const terasuryProxyContract = new ethers.Contract( treasuryProxyAddress, treasuryProxyAbi.abi, ethers.provider);

    // 1. TreasurySetting addPolicy
    let tx = await terasuryProxyContract.connect(deployer).addPolicy(adminAddress1);
    console.log("terasuryProxyContract addPolicy ", adminAddress1);
    await tx.wait();

    tx = await terasuryProxyContract.connect(deployer).addPolicy(adminAddress2);
    console.log("terasuryProxyContract addPolicy ", adminAddress2);
    await tx.wait();

    let isPolicy = await terasuryProxyContract.isPolicy(adminAddress1);
    console.log("terasuryProxyContract isPolicy ", isPolicy, adminAddress1);

    isPolicy = await terasuryProxyContract.isPolicy(adminAddress2);
    console.log("terasuryProxyContract isPolicy ", isPolicy, adminAddress2);

    tx = await terasuryProxyContract.connect(deployer).addPolicy(deployer.address);
    console.log("terasuryProxyContract addPolicy ", deployer.address);
    await tx.wait();

    isPolicy = await terasuryProxyContract.isPolicy(deployer.address);
    console.log("terasuryProxyContract isPolicy ", isPolicy, deployer.address);

    // 2. TreasurySetting enable to staker, bonder
    const terasuryContract = new ethers.Contract( treasuryProxyAddress, treasuryAbi.abi, ethers.provider);

    tx = await terasuryContract.connect(deployer).enable(BONDER, bondDepositoryProxyAddress);
    console.log("terasuryContract enable ", BONDER, bondDepositoryProxyAddress );
    await tx.wait();

    const isBonder = await terasuryContract.isBonder(bondDepositoryProxyAddress);
    console.log("terasuryProxyContract isBonder ", isBonder, bondDepositoryProxyAddress);

    tx = await terasuryContract.connect(deployer).enable(STAKER, stakingProxyAddress);
    console.log("terasuryContract enable ", STAKER, stakingProxyAddress );
    await tx.wait();

    const isStaker = await terasuryContract.isStaker(stakingProxyAddress);
    console.log("terasuryProxyContract isStaker ", isStaker, stakingProxyAddress);

    // 3. TreasurySetting setMR , mintRateDenominator
    tx = await terasuryContract.connect(deployer).setMintRateDenominator(mintRateDenominator);
    console.log("terasuryContract setMintRateDenominator ", mintRateDenominator );
    await tx.wait();

    tx = await terasuryContract.connect(deployer).setMR(mintRate, ethers.BigNumber.from("0"));
    console.log("terasuryContract setMR ", mintRate );
    await tx.wait();

    const _mintRateDenominator = await terasuryContract.mintRateDenominator();
    console.log("terasuryProxyContract mintRateDenominator ", _mintRateDenominator);

    const _mintRate = await terasuryContract.mintRate();
    console.log("terasuryProxyContract mintRate ", _mintRate);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });