const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const { printGasUsedOfUnits } = require("../log_tx");

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);

    const { chainId } = await ethers.provider.getNetwork();
    let networkName = "local";
    if(chainId == 1) networkName = "mainnet";
    if(chainId == 4) networkName = "rinkeby"; 

    let deployInfo = {
        name: "",
        address: ""
    }

    const stakingLogic = await (await ethers.getContractFactory("StakingV2"))
        .connect(deployer)
        .deploy();
    let tx = await stakingLogic.deployed();

    console.log("stakingLogic: ", stakingLogic.address);

    deployInfo = {
        name: "StakingV2",
        address: stakingLogic.address
    }

    save(networkName, deployInfo);

    printGasUsedOfUnits('stakingLogic Deploy',tx);

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

    printGasUsedOfUnits('stakingProxy Deploy',tx);

    if(chainId == 1 || chainId == 4) {
      await run("verify", {
        address: stakingLogic.address,
        constructorArgsParams: [],
      });
    }

    if(chainId == 1 || chainId == 4) {
      await run("verify", {
        address: stakingProxy.address,
        constructorArgsParams: [],
      });
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });