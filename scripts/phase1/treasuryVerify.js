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

    const treasuryLibAddress = loadDeployed(networkName, "LibTreasury");
    const treasuryLogicAddress = loadDeployed(networkName, "Treasury");
    const treasuryProxyAddress = loadDeployed(networkName, "TreasuryProxy");

    // if(chainId == 1 || chainId == 4) {
    //   await run("verify", {
    //     address: treasuryLibAddress,
    //     constructorArgsParams: [],
    //   });
    // }

    // console.log("libTreasury verified");


    if(chainId == 1 || chainId == 4) {
      await run("verify", {
        address: treasuryLogicAddress,
        constructorArgsParams: [],
      });
    }

    console.log("treasuryLogic verified");

    if(chainId == 1 || chainId == 4) {
      await run("verify", {
        address: treasuryProxyAddress,
        constructorArgsParams: [],
      });
    }

    console.log("treasuryProxy verified");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });