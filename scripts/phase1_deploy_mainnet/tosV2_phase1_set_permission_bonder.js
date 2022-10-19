const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");
const {getUniswapInfo} = require("../mainnet_info");

let treasuryLogicAbi = require('../../artifacts/contracts/Treasury.sol/Treasury.json');
let bondDepositoryLogicAbi = require('../../artifacts/contracts/BondDepository.sol/BondDepository.json');
let stakingV2LogicAbi = require('../../artifacts/contracts/StakingV2.sol/StakingV2.json');

let calculatorAbi = require('../../artifacts/contracts/TOSValueCalculator.sol/TOSValueCalculator.json');

let treasuryProxyAbi = require('../../artifacts/contracts/TreasuryProxy.sol/TreasuryProxy.json');
let bondDepositoryProxyAbi = require('../../artifacts/contracts/BondDepositoryProxy.sol/BondDepositoryProxy.json');
let stakingV2ProxyAbi = require('../../artifacts/contracts/StakingV2Proxy.sol/StakingV2Proxy.json');


async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);
    let {chainId, networkName, uniswapInfo, config } = await getUniswapInfo();

    const tosCalculatorAddress = loadDeployed(networkName, "TOSValueCalculator");
    const treasuryProxyAddress = loadDeployed(networkName, "TreasuryProxy");
    const stakingProxyAddress = loadDeployed(networkName, "StakingV2Proxy");
    const bondDepositoryProxyAddress = loadDeployed(networkName, "BondDepositoryProxy");

    // 1. BondDepositorySetting addPolicy
    const bondProxyContract = new ethers.Contract( bondDepositoryProxyAddress, bondDepositoryProxyAbi.abi, ethers.provider);

    let tx = await bondProxyContract.connect(deployer).addPolicy(config.adminAddress);
    console.log("bondDepository addPolicy ", config.adminAddress);
    await tx.wait();

    let isPolicy = await bondProxyContract.isPolicy(config.adminAddress);
    console.log("bondDepository isPolicy ", isPolicy, config.adminAddress);

    tx = await bondProxyContract.connect(deployer).addPolicy(deployer.address);
    console.log("deployer bondDepository addPolicy ", deployer.address);
    await tx.wait();

    isPolicy = await bondProxyContract.isPolicy(deployer.address);
    console.log("deployer bondDepository isPolicy ", isPolicy, deployer.address);


}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });