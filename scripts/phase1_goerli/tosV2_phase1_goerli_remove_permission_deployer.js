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

//goerli :
let rinkeby_address = {
  poolfactory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  npm: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  wton: "",
  tos: "0x67F3bE272b1913602B191B3A68F7C238A2D81Bb9",
  weth: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
  tosethPool: "0x3b466f5d9b49aedd65f6124d5986a9f30b1f5442",
  wtonWethPool: "",
  wtonTosPool: "",
  tosDOCPool: ""
}

let lockTOSaddr = "0x63689448AbEaaDb57342D9e0E9B5535894C35433"

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);

    const { chainId } = await ethers.provider.getNetwork();
    let networkName = "local";
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

    let tx = await terasuryProxyContract.connect(deployer).removePolicy()
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