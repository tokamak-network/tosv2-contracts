const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");

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

    const { chainId } = await ethers.provider.getNetwork();
    let networkName = "mainnet";
    if(chainId == 1) networkName = "mainnet";
    if(chainId == 4) networkName = "rinkeby";
    if(chainId == 5) networkName = "goerli";
    //  deployer removePolicy

    const tosCalculatorAddress = loadDeployed(networkName, "TOSValueCalculator");
    const treasuryProxyAddress = loadDeployed(networkName, "TreasuryProxy");
    const stakingProxyAddress = loadDeployed(networkName, "StakingV2Proxy");
    const bondDepositoryProxyAddress = loadDeployed(networkName, "BondDepositoryProxy");

    // bondDepository
    const bondProxyContract = new ethers.Contract(bondDepositoryProxyAddress, bondDepositoryProxyAbi.abi, ethers.provider);

    let tx = await bondProxyContract.connect(deployer).removePolicy()
    await tx.wait();
    isPolicy = await bondProxyContract.isPolicy(deployer.address);
    console.log("bondProxyContract isPolicy ", isPolicy, deployer.address);

    tx = await bondProxyContract.connect(deployer).removeAdmin()
    await tx.wait();
    isAdmin = await bondProxyContract.isAdmin(deployer.address);
    console.log("bondProxyContract isAdmin ", isAdmin, deployer.address);

    tx = await bondProxyContract.connect(deployer).removeProxyAdmin()
    await tx.wait();
    isProxyAdmin = await bondProxyContract.isProxyAdmin(deployer.address);
    console.log("terasuryProxyContract isProxyAdmin ", isProxyAdmin, deployer.address);


    // terasuryProxyContract
    const terasuryProxyContract = new ethers.Contract( treasuryProxyAddress, treasuryProxyAbi.abi, ethers.provider);

    tx = await terasuryProxyContract.connect(deployer).removePolicy()
    await tx.wait();
    isPolicy = await terasuryProxyContract.isPolicy(deployer.address);
    console.log("terasuryProxyContract isPolicy ", isPolicy, deployer.address);

    tx = await terasuryProxyContract.connect(deployer).removeAdmin()
    await tx.wait();
    isAdmin = await terasuryProxyContract.isAdmin(deployer.address);
    console.log("terasuryProxyContract isAdmin ", isAdmin, deployer.address);


    tx = await terasuryProxyContract.connect(deployer).removeProxyAdmin()
    await tx.wait();
    isProxyAdmin = await terasuryProxyContract.isProxyAdmin(deployer.address);
    console.log("terasuryProxyContract isProxyAdmin ", isProxyAdmin, deployer.address);

    // terasuryProxyContract
    const stakingProxyContract = new ethers.Contract( stakingProxyAddress, stakingV2ProxyAbi.abi, ethers.provider);
    tx = await stakingProxyContract.connect(deployer).removePolicy()
    await tx.wait();
    isPolicy = await stakingProxyContract.isPolicy(deployer.address);
    console.log("stakingProxyContract isPolicy ", isPolicy, deployer.address);


    tx = await stakingProxyContract.connect(deployer).removeAdmin()
    await tx.wait();
    isAdmin = await stakingProxyContract.isAdmin(deployer.address);
    console.log("stakingProxyContract isAdmin ", isAdmin, deployer.address);


    tx = await stakingProxyContract.connect(deployer).removeProxyAdmin()
    await tx.wait();
    isProxyAdmin = await stakingProxyContract.isProxyAdmin(deployer.address);
    console.log("stakingProxyContract isProxyAdmin ", isProxyAdmin, deployer.address);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });