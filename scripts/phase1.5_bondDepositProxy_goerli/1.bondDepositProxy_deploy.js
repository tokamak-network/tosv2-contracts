const { ethers, run } = require("hardhat");
const save = require("../save_deployed");
const { printGasUsedOfUnits } = require("../log_tx");
const loadDeployed = require("../load_deployed");
const {getUniswapInfo} = require("../goerli_info");

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);
    let {chainId, networkName, uniswapInfo, config } = await getUniswapInfo();

    let deployInfo = {
        name: "",
        address: ""
    }
    // const bondDepositoryLogic = loadDeployed(networkName, "BondDepository");

    const bondDepositoryProxy = await (await ethers.getContractFactory("BondDepositoryProxy"))
        .connect(deployer)
        .deploy();
    tx = await bondDepositoryProxy.deployed();

    // await bondDepositoryProxy.connect(deployer).upgradeTo(bondDepositoryLogic);

    console.log("bondDepositoryProxy: ", bondDepositoryProxy.address);

    deployInfo = {
      name: "BondDepositoryProxy",
      address: bondDepositoryProxy.address
    }

    save(networkName, deployInfo);

    if(chainId == 1 || chainId == 4 || chainId == 5) {
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