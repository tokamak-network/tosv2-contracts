const { ethers, run } = require("hardhat");
const loadDeployed = require("../load_deployed");

async function main() {
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];
    console.log("deployer: ", deployer.address);

    const { chainId } = await ethers.provider.getNetwork();
    let networkName = "local";
    if(chainId == 1) networkName = "mainnet";
    if(chainId == 4) networkName = "rinkeby"; 

    const bondDepositLogicAddress = loadDeployed(networkName, "BondDepository");
    const bondDepositProxyAddress = loadDeployed(networkName, "BondDepositoryProxy");


    if(chainId == 1 || chainId == 4) {
      await run("verify", {
        address: bondDepositLogicAddress,
        constructorArgsParams: [],
      });
    }

    console.log("BondDepositoryLogic verified");

    if(chainId == 1 || chainId == 4) {
      await run("verify", {
        address: bondDepositProxyAddress,
        constructorArgsParams: [],
      });
    }

    console.log("bondDepositProxy verified");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });