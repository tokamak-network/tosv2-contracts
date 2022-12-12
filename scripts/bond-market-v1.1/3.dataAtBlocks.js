const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");
const { printGasUsedOfUnits } = require("../log_tx");

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);

    const { chainId } = await ethers.provider.getNetwork();
    let networkName = "local";
    if(chainId == 1) networkName = "mainnet";
    if(chainId == 4) networkName = "rinkeby";
    if(chainId == 5) networkName = "goerli";

    let deployInfo = {
        name: "",
        address: ""
    }

    // let bondDepositoryProxyAbi = require('../../artifacts/contracts/BondDepositoryProxy.sol/BondDepositoryProxy.json');
    let stakingV2Abi = require('../../artifacts/contracts/StakingV2.sol/StakingV2.json');
    let treasuryAbi = require('../../artifacts/contracts/Treasury.sol/Treasury.json');


    const stakingV2Address = "0x14fb0933Ec45ecE75A431D10AFAa1DDF7BfeE44C";
    const treasuryAddress = "0xD27A68a457005f822863199Af0F817f672588ad6";
    console.log("stakingV2Address",stakingV2Address)
    console.log("treasuryAddress",treasuryAddress)

    // const bondDepositoryProxyContract = new ethers.Contract(bondDepositoryProxyAddress, bondDepositoryProxyAbi.abi, ethers.provider);
    const stakingV2Contract = new ethers.Contract(stakingV2Address, stakingV2Abi.abi, ethers.provider);
    const treasuryContract = new ethers.Contract(treasuryAddress, treasuryAbi.abi, ethers.provider);

    let totalLtos = await stakingV2Contract.totalLtos();
    let possibleIndex = await stakingV2Contract.possibleIndex();
    let enableStaking = await treasuryContract.enableStaking();
    let rebasePerEpoch = await stakingV2Contract.rebasePerEpoch();
    console.log( totalLtos.toString() ,", ", possibleIndex.toString() ,", ", enableStaking.toString() ,", ", rebasePerEpoch.toString() );

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });