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

    const LibStakingAddress = loadDeployed(networkName, "LibStaking");
    const stakingProxyAddress = loadDeployed(networkName, "StakingV2Proxy");

    const stakingV2Address = loadDeployed(networkName, "StakingV2");

    //StakingLogic Deploy
    const stakingLogic = await (await ethers.getContractFactory("StakingV2", {
      libraries: {
        LibStaking: LibStakingAddress
      }
    })).connect(deployer).deploy();

    tx = await stakingLogic.deployed();

    console.log("stakingLogic: ", stakingLogic.address);

    deployInfo = {
        name: "StakingV2",
        address: stakingLogic.address
    }

    save(networkName, deployInfo);

    printGasUsedOfUnits('stakingLogic Deploy',tx);


    //StakingProxy
    const stakingProxyContract = new ethers.Contract(stakingProxyAddress, stakingV2ProxyAbi.abi, ethers.provider);
    await stakingProxyContract.connect(deployer).upgradeTo(stakingLogic.address);

    console.log("stakingProxy: upgradeTo ", stakingLogic.address);


    if(chainId == 1 || chainId == 4) {
      await run("verify", {
        address: stakingLogic.address,
        constructorArgsParams: [],
      });
    }

    console.log("stakingLogic verified");

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });