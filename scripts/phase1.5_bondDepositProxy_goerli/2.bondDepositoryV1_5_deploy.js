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

    let uniswapPoolFactory = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
    let bondDepositoryV1_5

    //BondDepositoryV1_5 Deploy
    factory = await ethers.getContractFactory("BondDepositoryV1_5")
    bondDepositoryV1_5 = await factory.deploy();
    await bondDepositoryV1_5.deployed()

    console.log("BondDepositoryV1_5: ", bondDepositoryV1_5.address);

    deployInfo = {
        name: "BondDepositoryV1_5",
        address: bondDepositoryV1_5.address
    }

    save(networkName, deployInfo);

    if(chainId == 1 || chainId == 4 || chainId == 5) {

      await run("verify", {
        address: bondDepositoryV1_5.address,
        constructorArgsParams: [],
      });
    }

    console.log("BondDepositoryV1_5 verified");

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });