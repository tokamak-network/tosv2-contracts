const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");
const {getUniswapInfo} = require("../holesky_info");

let treasuryLogicAbi = require('../../artifacts/contracts/Treasury.sol/Treasury.json');
let bondDepositoryLogicAbi = require('../../artifacts/contracts/BondDepository.sol/BondDepository.json');
let stakingV2LogicAbi = require('../../artifacts/contracts/StakingV2.sol/StakingV2.json');

let calculatorAbi = require('../../artifacts/contracts/TOSValueCalculator.sol/TOSValueCalculator.json');

let treasuryProxyAbi = require('../../artifacts/contracts/TreasuryProxy.sol/TreasuryProxy.json');
let bondDepositoryProxyAbi = require('../../artifacts/contracts/BondDepositoryProxy.sol/BondDepositoryProxy.json');
let stakingV2ProxyAbi = require('../../artifacts/contracts/StakingV2Proxy.sol/StakingV2Proxy.json');
let stakingV2Abi = require('../../artifacts/contracts/StakingV2.sol/StakingV2.json');


const adminAddress1 = "0x43700f09B582eE2BFcCe4b5Db40ee41B4649D977" //(Suah)
const adminAddress2 = "0xf0B595d10a92A5a9BC3fFeA7e79f5d266b6035Ea" //(Harvey)
const adminAddress3 = "0xc1eba383D94c6021160042491A5dfaF1d82694E6" //(zena)


async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);
    let {chainId, networkName, uniswapInfo, config } = await getUniswapInfo();


    const tosCalculatorAddress = loadDeployed(networkName, "TOSValueCalculator");
    const treasuryProxyAddress = loadDeployed(networkName, "TreasuryProxy");
    const stakingProxyAddress = loadDeployed(networkName, "StakingV2Proxy");
    const bondDepositoryProxyAddress = loadDeployed(networkName, "BondDepositoryProxy");

    // 1. StakingV2Setting addPolicy
    const stakingProxyContract = new ethers.Contract( stakingProxyAddress, stakingV2ProxyAbi.abi, ethers.provider);

    let tx = await stakingProxyContract.connect(deployer).addPolicy(adminAddress1);
    console.log("stakingProxyContract addPolicy ", adminAddress1);
    await tx.wait();

    tx = await stakingProxyContract.connect(deployer).addPolicy(adminAddress2);
    console.log("stakingProxyContract addPolicy ", adminAddress2);
    await tx.wait();

    tx = await stakingProxyContract.connect(deployer).addPolicy(adminAddress3);
    console.log("stakingProxyContract addPolicy ", adminAddress3);
    await tx.wait();


    let isPolicy = await stakingProxyContract.isPolicy(adminAddress1);
    console.log("stakingProxyContract isPolicy ", isPolicy, adminAddress1);

    isPolicy = await stakingProxyContract.isPolicy(adminAddress2);
    console.log("stakingProxyContract isPolicy ", isPolicy, adminAddress2);

    isPolicy = await stakingProxyContract.isPolicy(adminAddress3);
    console.log("stakingProxyContract isPolicy ", isPolicy, adminAddress3);

    tx = await stakingProxyContract.connect(deployer).addPolicy(deployer.address);
    console.log("stakingProxyContract addPolicy ", deployer.address);
    await tx.wait();

    isPolicy = await stakingProxyContract.isPolicy(deployer.address);
    console.log("stakingProxyContract isPolicy ", isPolicy, deployer.address);

    // 2. StakingV2Setting config.RebasePerEpoch , config.index
    const stakingContract = new ethers.Contract(stakingProxyAddress, stakingV2Abi.abi, ethers.provider);

    tx = await stakingContract.connect(deployer).setRebasePerEpoch(config.RebasePerEpoch);
    console.log("stakingContract setRebasePerEpoch ", config.RebasePerEpoch);
    await tx.wait();

    // tx = await stakingContract.connect(deployer).setIndex(config.index);
    // console.log("stakingContract setIndex ", config.index);
    // await tx.wait();

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });