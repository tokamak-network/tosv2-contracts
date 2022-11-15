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
    const stakingV2LogicAddress = loadDeployed(networkName, "StakingV2");

    //StakingProxy Deploy
    const stakingProxy = await (await ethers.getContractFactory("StakingV2Proxy"))
        .connect(deployer)
        .deploy();
    tx = await stakingProxy.deployed();

    await stakingProxy.connect(deployer).upgradeTo(stakingV2LogicAddress);

    console.log("stakingProxy: ", stakingProxy.address);

    deployInfo = {
      name: "StakingV2Proxy",
      address: stakingProxy.address
    }

    save(networkName, deployInfo);

    printGasUsedOfUnits(chainId, 'stakingProxy Deploy', tx);


    // if(chainId == 1 || chainId == 4 || chainId == 5) {
    //   await run("verify", {
    //     address: stakingProxy.address,
    //     constructorArgsParams: [],
    //   });
    // }

    // console.log("stakingProxy verified");

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });