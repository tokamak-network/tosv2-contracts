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

    const bondDepositoryLogic = await (await ethers.getContractFactory("BondDepository"))
        .connect(deployer)
        .deploy();

    let tx = await bondDepositoryLogic.deployed();

    console.log("bondDepositoryLogic: ", bondDepositoryLogic.address);

    deployInfo = {
        name: "BondDepository",
        address: bondDepositoryLogic.address
    }

    save(networkName, deployInfo);

    printGasUsedOfUnits('bondDepositoryLogic Deploy',tx);


    const bondDepositoryProxy = await (await ethers.getContractFactory("BondDepositoryProxy"))
        .connect(deployer)
        .deploy();
    tx = await bondDepositoryProxy.deployed();

    await bondDepositoryProxy.connect(deployer).upgradeTo(bondDepositoryLogic.address);

    console.log("bondDepositoryProxy: ", bondDepositoryProxy.address);

    deployInfo = {
      name: "BondDepositoryProxy",
      address: bondDepositoryProxy.address
    }

    save(networkName, deployInfo);

    printGasUsedOfUnits('bondDepositoryProxy Deploy',tx);

    if(chainId == 1 || chainId == 4) {
      await run("verify", {
        address: bondDepositoryLogic.address,
        constructorArgsParams: [],
      });
    }

    if(chainId == 1 || chainId == 4) {
      await run("verify", {
        address: bondDepositoryProxy.address,
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