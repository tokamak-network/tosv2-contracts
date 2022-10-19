const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");
const {getUniswapInfo} = require("../mainnet_info");

let treasuryLogicAbi = require('../../artifacts/contracts/Treasury.sol/Treasury.json');
let bondDepositoryLogicAbi = require('../../artifacts/contracts/BondDepository.sol/BondDepository.json');
let stakingV2LogicAbi = require('../../artifacts/contracts/StakingV2.sol/StakingV2.json');

let calculatorAbi = require('../../artifacts/contracts/TOSValueCalculator.sol/TOSValueCalculator.json');

let treasuryProxyAbi = require('../../artifacts/contracts/TreasuryProxy.sol/TreasuryProxy.json');
let treasuryAbi = require('../../artifacts/contracts/Treasury.sol/Treasury.json');

let bondDepositoryProxyAbi = require('../../artifacts/contracts/BondDepositoryProxy.sol/BondDepositoryProxy.json');
let stakingV2ProxyAbi = require('../../artifacts/contracts/StakingV2Proxy.sol/StakingV2Proxy.json');

const BONDER = 9;
const STAKER = 10;

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);
    let {chainId, networkName, uniswapInfo, config } = await getUniswapInfo();

    const bondDepositoryProxyAddress = loadDeployed(networkName, "BondDepositoryProxy");
    const treasuryProxyAddress = loadDeployed(networkName, "TreasuryProxy");
    const stakingProxyAddress = loadDeployed(networkName, "StakingV2Proxy");

    const terasuryProxyContract = new ethers.Contract( treasuryProxyAddress, treasuryProxyAbi.abi, ethers.provider);

    // 1. TreasurySetting addPolicy
    let tx = await terasuryProxyContract.connect(deployer).addPolicy(config.adminAddress);
    console.log("terasuryProxyContract addPolicy ", config.adminAddress);
    await tx.wait();

    let isPolicy = await terasuryProxyContract.isPolicy(config.adminAddress);
    console.log("terasuryProxyContract isPolicy ", isPolicy, config.adminAddress);

    tx = await terasuryProxyContract.connect(deployer).addPolicy(deployer.address);
    console.log("deployer terasuryProxyContract addPolicy ", deployer.address);
    await tx.wait();

    isPolicy = await terasuryProxyContract.isPolicy(deployer.address);
    console.log("deployer terasuryProxyContract isPolicy ", isPolicy, deployer.address);

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

    // 3. TreasurySetting setMR , config.mintRateDenominator
    tx = await terasuryContract.connect(deployer).setMintRateDenominator(config.mintRateDenominator);
    console.log("terasuryContract setMintRateDenominator ", config.mintRateDenominator );
    await tx.wait();

    tx = await terasuryContract.connect(deployer).setMR(config.mintRate, ethers.BigNumber.from("0"), false);
    console.log("terasuryContract setMR ", config.mintRate );
    await tx.wait();

    const _mintRateDenominator = await terasuryContract.mintRateDenominator();
    console.log("terasuryProxyContract mintRateDenominator ", _mintRateDenominator.toString());

    const _mintRate = await terasuryContract.mintRate();
    console.log("terasuryProxyContract mintRate ", _mintRate.toString());

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });