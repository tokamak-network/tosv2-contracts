const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const loadDeployed = require("../load_deployed");
const { printGasUsedOfUnits } = require("../log_tx");
const {getUniswapInfo} = require("../mainnet_info");

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);
    let {chainId, networkName, uniswapInfo, config } = await getUniswapInfo();

    let deployInfo = {
        name: "",
        address: ""
    }


    //libStaking Deploy
    const LibStaking = await ethers.getContractFactory("LibStaking");
    let libStaking = await LibStaking.connect(deployer).deploy();
    let tx = await libStaking.deployed();

    console.log("libStaking: ", libStaking.address);

    deployInfo = {
      name: "LibStaking",
      address: libStaking.address
    }

    save(networkName, deployInfo);

    printGasUsedOfUnits(chainId,  'LibStaking Deploy', tx);

    // StakingLogic Deploy
    const stakingLogic = await (await ethers.getContractFactory("StakingV2", {
      libraries: {
        LibStaking: libStaking.address
      }
    })).connect(deployer).deploy();


    tx = await stakingLogic.deployed();

    console.log("stakingLogic: ", stakingLogic.address);

    deployInfo = {
        name: "StakingV2",
        address: stakingLogic.address
    }

    save(networkName, deployInfo);

    printGasUsedOfUnits(chainId, 'stakingLogic Deploy',  tx);

    //StakingProxy Deploy
    const stakingProxy = await (await ethers.getContractFactory("StakingV2Proxy"))
        .connect(deployer)
        .deploy();
    tx = await stakingProxy.deployed();

    await stakingProxy.connect(deployer).upgradeTo(stakingLogic.address);

    console.log("stakingProxy: ", stakingProxy.address);

    deployInfo = {
      name: "StakingV2Proxy",
      address: stakingProxy.address
    }

    save(networkName, deployInfo);

    printGasUsedOfUnits(chainId, 'stakingProxy Deploy', tx);

    if(chainId == 1 || chainId == 4 || chainId == 5) {
      await run("verify", {
        address: libStaking.address,
        constructorArgsParams: [],
      });
    }

    console.log("libStaking verified");


    if(chainId == 1 || chainId == 4 || chainId == 5) {
      await run("verify", {
        address: stakingLogic.address,
        constructorArgsParams: [],
      });
    }

    console.log("stakingLogic verified");


    if(chainId == 1 || chainId == 4 || chainId == 5) {
      await run("verify", {
        address: stakingProxy.address,
        constructorArgsParams: [],
      });
    }

    console.log("stakingProxy verified");

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });