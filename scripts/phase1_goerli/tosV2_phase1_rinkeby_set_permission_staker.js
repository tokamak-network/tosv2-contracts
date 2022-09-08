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
let stakingV2Abi = require('../../artifacts/contracts/StakingV2.sol/StakingV2.json');

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

//rinkeby
const adminAddress1 = "0x43700f09B582eE2BFcCe4b5Db40ee41B4649D977" //(Suah)
const adminAddress2 = "0xf0B595d10a92A5a9BC3fFeA7e79f5d266b6035Ea" //(Harvey)
const RebasePerEpoch = ethers.BigNumber.from("87045050000000")
const index = ethers.BigNumber.from("1000000000000000000")

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
    if(chainId == 5) networkName = "goerli";

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

    let isPolicy = await stakingProxyContract.isPolicy(adminAddress1);
    console.log("stakingProxyContract isPolicy ", isPolicy, adminAddress1);

    isPolicy = await stakingProxyContract.isPolicy(adminAddress2);
    console.log("stakingProxyContract isPolicy ", isPolicy, adminAddress2);

    tx = await stakingProxyContract.connect(deployer).addPolicy(deployer.address);
    console.log("stakingProxyContract addPolicy ", deployer.address);
    await tx.wait();

    isPolicy = await stakingProxyContract.isPolicy(deployer.address);
    console.log("stakingProxyContract isPolicy ", isPolicy, deployer.address);

    // 2. StakingV2Setting RebasePerEpoch , index
    const stakingContract = new ethers.Contract(stakingProxyAddress, stakingV2Abi.abi, ethers.provider);

    tx = await stakingContract.connect(deployer).setRebasePerEpoch(RebasePerEpoch);
    console.log("stakingContract setRebasePerEpoch ", RebasePerEpoch);
    await tx.wait();

    tx = await stakingContract.connect(deployer).setIndex(index);
    console.log("stakingContract setIndex ", index);
    await tx.wait();

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });