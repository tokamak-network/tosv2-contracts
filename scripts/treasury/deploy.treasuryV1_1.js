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

    let LibTreasury = "0x2c77067900f1544345552f0A12d0bDf4EaE6fE04";
    if (chainId == 1) {
      LibTreasury = "0x2c77067900f1544345552f0A12d0bDf4EaE6fE04";
    } else if(chainId == 4) {
      LibTreasury = "0x45864F1fBFDa1Ddeb62Bbbdc28Fa6A022095E679";
    } else if(chainId == 5) {
      LibTreasury = "0x35f1cc098d14dE8C79806B6A8aDDe56a23fc5f57";
    }

    let treasuryProxyAbi = require('../../artifacts/contracts/TreasuryProxy.sol/TreasuryProxy.json');

    //TreasuryLogic Deploy
    const treasuryLogic = await (await ethers.getContractFactory("TreasuryV1_1", {
      libraries: {
        LibTreasury: LibTreasury
      }
    })).connect(deployer).deploy();

    tx = await treasuryLogic.deployed();

    console.log("treasuryLogic: ", treasuryLogic.address);

    deployInfo = {
        name: "TreasuryV1_1",
        address: treasuryLogic.address
    }

    save(networkName, deployInfo);

    if(chainId == 1 || chainId == 4 || chainId == 5) {
      await run("verify", {
        address: treasuryLogic.address,
        constructorArgsParams: [],
      });
    }

    console.log("treasuryLogic verified");

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });