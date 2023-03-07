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

    // BonusRateLockUpA Deploy
    let factory = await ethers.getContractFactory("BonusRateLockUpA")
    bonusRateLockUpA = await factory.deploy();
    await bonusRateLockUpA.deployed()

    console.log("BonusRateLockUpA: ", bonusRateLockUpA.address);

    deployInfo = {
        name: "BonusRateLockUpA",
        address: bonusRateLockUpA.address
    }

    save(networkName, deployInfo);

    // BonusRateLockUp Deploy
    let BonusRateLockUp = await ethers.getContractFactory("BonusRateLockUp")
    bonusRateLockUp = await BonusRateLockUp.deploy();
    await bonusRateLockUp.deployed()

    console.log("BonusRateLockUp: ", bonusRateLockUp.address);

    deployInfo = {
        name: "BonusRateLockUp",
        address: bonusRateLockUp.address
    }

    save(networkName, deployInfo);


    // BonusRateLockUpBytes Deploy
    let BonusRateLockUpBytes = await ethers.getContractFactory("BonusRateLockUpBytes")
    bonusRateLockUpBytes = await BonusRateLockUpBytes.deploy();
    await bonusRateLockUpBytes.deployed()

    console.log("BonusRateLockUpBytes: ", bonusRateLockUpBytes.address);

    deployInfo = {
        name: "BonusRateLockUpBytes",
        address: bonusRateLockUpBytes.address
    }

    save(networkName, deployInfo);

    if(chainId == 1 || chainId == 4 || chainId == 5) {

      await run("verify", {
        address: bonusRateLockUpA.address,
        constructorArgsParams: [],
      });

      await run("verify", {
        address: bonusRateLockUp.address,
        constructorArgsParams: [],
      });

      await run("verify", {
        address: bonusRateLockUpBytes.address,
        constructorArgsParams: [],
      });


    }

    console.log("BonusRateLockUpA verified");

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });