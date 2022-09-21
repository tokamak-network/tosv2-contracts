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

    let stakingV2ProxyAbi = require('../../artifacts/contracts/StakingV2Proxy.sol/StakingV2Proxy.json');
    let stakingV2Abi = require('../../artifacts/contracts/StakingV2.sol/StakingV2.json');

    const stakingProxyAddress = loadDeployed(networkName, "StakingV2Proxy");

    let block = await ethers.provider.getBlock();
    console.log('block', block.timestamp);

    let epochLength = 28800;
    let endTime = block.timestamp + 28800 ;

    //StakingProxy
    const stakingProxyContract = new ethers.Contract(stakingProxyAddress, stakingV2Abi.abi, ethers.provider);
    let tx = await stakingProxyContract.connect(deployer).setEpochInfo(
      epochLength, endTime
    );

    console.log('epochLength', epochLength , 'endTime',endTime, 'tx.hash',tx.hash);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });