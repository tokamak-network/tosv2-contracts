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
    if(chainId == 5) networkName = "goerli";

    let deployInfo = {
        name: "",
        address: ""
    }

    const tosCalculator = await (await ethers.getContractFactory("TOSValueCalculator"))
            .connect(deployer)
            .deploy();
    let tx = await tosCalculator.deployed();
    console.log("tosCalculator: ", tosCalculator.address);

    deployInfo = {
        name: "TOSValueCalculator",
        address: tosCalculator.address
    }

    save(networkName, deployInfo);

    printGasUsedOfUnits('tosCalculator Deploy',tx);

    if(chainId == 1 || chainId == 4) {
      await run("verify", {
        address: tosCalculator.address,
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