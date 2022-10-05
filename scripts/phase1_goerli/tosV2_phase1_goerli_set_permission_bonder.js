const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");
const {getUniswapInfo} = require("../goerli_info");

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

    const adminAddress1 = "0x43700f09B582eE2BFcCe4b5Db40ee41B4649D977" //(Suah)
    const adminAddress2 = "0xf0B595d10a92A5a9BC3fFeA7e79f5d266b6035Ea" //(Harvey)

    // 1. BondDepositorySetting addPolicy
    const bondProxyContract = new ethers.Contract( bondDepositoryProxyAddress, bondDepositoryProxyAbi.abi, ethers.provider);

    let tx = await bondProxyContract.connect(deployer).addPolicy(adminAddress1);
    console.log("bondDepository addPolicy ", adminAddress1);
    await tx.wait();

    tx = await bondProxyContract.connect(deployer).addPolicy(adminAddress2);
    console.log("bondDepository addPolicy ", adminAddress2);
    await tx.wait();

    let isPolicy = await bondProxyContract.isPolicy(adminAddress1);
    console.log("bondDepository isPolicy ", isPolicy, adminAddress1);

    isPolicy = await bondProxyContract.isPolicy(adminAddress2);
    console.log("bondDepository isPolicy ", isPolicy, adminAddress2);

    tx = await bondProxyContract.connect(deployer).addPolicy(deployer.address);
    console.log("bondDepository addPolicy ", deployer.address);
    await tx.wait();

    isPolicy = await bondProxyContract.isPolicy(deployer.address);
    console.log("bondDepository isPolicy ", isPolicy, deployer.address);


}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });