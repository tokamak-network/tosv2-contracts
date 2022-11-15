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
    const treasuryLogicAddress = loadDeployed(networkName, "Treasury");


    //TreasuryProxy Deploy
    const treasuryProxy = await (await ethers.getContractFactory("TreasuryProxy"))
        .connect(deployer)
        .deploy();
    tx = await treasuryProxy.deployed();

    await treasuryProxy.connect(deployer).upgradeTo(treasuryLogicAddress);

    console.log("treasuryProxy: ", treasuryProxy.address);

    deployInfo = {
      name: "TreasuryProxy",
      address: treasuryProxy.address
    }

    save(networkName, deployInfo);

    printGasUsedOfUnits(chainId, 'treasuryProxy Deploy',  tx);


    // if(chainId == 1 || chainId == 4 || chainId == 5) {
    //   await run("verify", {
    //     address: treasuryProxy.address,
    //     constructorArgsParams: [],
    //   });
    // }

    // console.log("treasuryProxy verified");

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });